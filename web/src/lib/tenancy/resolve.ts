import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { runWithTenant } from "./context";

/**
 * Resolves the tenant for an operation, in order of priority (same as the legacy
 * ResolveTenant middleware):
 * 1. A tenant slug (public routes, e.g. the future booking page).
 * 2. The tenant of the authenticated user.
 * Returns null when neither yields a tenant (no session, unknown slug, super_admin).
 */
export async function resolveTenantId(options: {
  slug?: string | null;
  user?: { tenantId: number | null } | null;
}): Promise<number | null> {
  if (options.slug) {
    const tenant = await db.tenant.findUnique({ where: { slug: options.slug }, select: { id: true } });
    return tenant?.id ?? null;
  }
  return options.user?.tenantId ?? null;
}

/**
 * Runs `fn` with the tenant of the current request in context. Without a resolved
 * tenant, `fn` still runs, and any tenant-scoped query inside it fails closed
 * with TenantContextMissingError. Callers decide how to respond (e.g. 401/404).
 */
export async function withRequestTenant<T>(
  fn: () => T | PromiseLike<T>,
  options: { slug?: string | null } = {},
): Promise<T> {
  const user = options.slug ? null : await getCurrentUser();
  const tenantId = await resolveTenantId({ slug: options.slug, user });
  return tenantId === null ? await fn() : runWithTenant(tenantId, fn);
}
