-- Every user belongs to a tenant, except super_admin (ADR-0008).
-- Prisma does not model CHECK constraints, so this lives only in SQL; schema
-- diffs ignore it. Note: deleting a tenant that still has users now fails,
-- since users.tenant_id is ON DELETE SET NULL.
ALTER TABLE "users"
  ADD CONSTRAINT "users_tenant_required_check"
  CHECK ("role" = 'super_admin' OR "tenant_id" IS NOT NULL);
