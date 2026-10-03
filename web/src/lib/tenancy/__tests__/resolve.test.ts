// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db, unscopedDb } from "@/lib/db";
import { currentTenantId } from "@/lib/tenancy/context";
import { resolveTenantId, withRequestTenant } from "@/lib/tenancy/resolve";
import { truncateAll } from "../../../../tests/db";

let tenantId: number;
let otherTenantId: number;

describe("tenant resolution", () => {
  beforeAll(async () => {
    await truncateAll();
    const plan = await unscopedDb.plan.create({ data: { name: "Basic", monthlyPrice: "10.00" } });
    tenantId = (await unscopedDb.tenant.create({ data: { planId: plan.id, name: "Centro", slug: "centro" } })).id;
    otherTenantId = (await unscopedDb.tenant.create({ data: { planId: plan.id, name: "Sul", slug: "sul" } })).id;
    await unscopedDb.service.create({ data: { tenantId, name: "Corte", durationMinutes: 30, price: "40.00" } });
  });
  afterAll(() => unscopedDb.$disconnect());

  test("resolves from the authenticated user's tenant", async () => {
    expect(await resolveTenantId({ user: { tenantId } })).toBe(tenantId);
  });

  test("resolves from a slug, which takes priority over the user", async () => {
    expect(await resolveTenantId({ slug: "sul", user: { tenantId } })).toBe(otherTenantId);
  });

  test("resolves nothing without a user, for super_admin, or for an unknown slug", async () => {
    expect(await resolveTenantId({})).toBeNull();
    expect(await resolveTenantId({ user: { tenantId: null } })).toBeNull();
    expect(await resolveTenantId({ slug: "does-not-exist" })).toBeNull();
  });

  test("withRequestTenant runs the callback inside the resolved tenant", async () => {
    const names = await withRequestTenant(
      async () => {
        expect(currentTenantId()).toBe(tenantId);
        return db.service.findMany({ select: { name: true } });
      },
      { slug: "centro" },
    );

    expect(names.map((s) => s.name)).toEqual(["Corte"]);
  });

  test("withRequestTenant without a resolved tenant still fails closed", async () => {
    await expect(withRequestTenant(() => db.service.findMany(), { slug: "does-not-exist" })).rejects.toThrow(
      /No tenant resolved/,
    );
  });
});
