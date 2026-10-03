import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { tenantScopeExtension } from "@/lib/tenancy/scope";

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reuse a single client across hot reloads in development (each reload would
// otherwise open a new connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Client WITHOUT tenant isolation. Only for intentionally cross-tenant work:
 * auth internals, seeds, test setup, super_admin features. Never use it to
 * serve data for a tenant's request (ADR-0005).
 */
export const unscopedDb = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = unscopedDb;
}

/**
 * Default client for app code. Queries on tenant-scoped models are filtered by
 * the tenant in context and throw TenantContextMissingError when there is none
 * (ADR-0005). Models without tenant (users, plans, tenants, auth tables) pass through.
 */
export const db = unscopedDb.$extends(tenantScopeExtension(unscopedDb));
