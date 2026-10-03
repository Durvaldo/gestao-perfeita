import { AsyncLocalStorage } from "node:async_hooks";

// Tenant of the current request/operation (equivalent of the legacy
// App\Tenancy\CurrentTenant singleton). Stored per async call chain, so
// concurrent requests never see each other's tenant.
const storage = new AsyncLocalStorage<{ tenantId: number }>();

export class TenantContextMissingError extends Error {
  constructor() {
    super(
      "No tenant resolved for this operation. Tenant-scoped models require running inside " +
        "runWithTenant() (or withRequestTenant()), or using unscopedDb for intentionally " +
        "cross-tenant queries (e.g. super_admin, seeds).",
    );
    this.name = "TenantContextMissingError";
  }
}

/**
 * Runs `fn` with `tenantId` as the current tenant.
 *
 * The result is awaited inside the context on purpose: Prisma queries are lazy
 * and only execute when awaited, so `runWithTenant(id, () => db.x.findMany())`
 * would otherwise run the query after the context is gone.
 */
export function runWithTenant<T>(tenantId: number, fn: () => T | PromiseLike<T>): Promise<T> {
  return storage.run({ tenantId }, async () => await fn());
}

export function currentTenantId(): number | null {
  return storage.getStore()?.tenantId ?? null;
}

export function requireTenantId(): number {
  const tenantId = currentTenantId();
  if (tenantId === null) {
    throw new TenantContextMissingError();
  }
  return tenantId;
}
