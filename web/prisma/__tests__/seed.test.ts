// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { unscopedDb as db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { truncateAll } from "../../tests/db";
import { SEED_PASSWORD, seed } from "../seed-data";

async function counts() {
  return {
    users: await db.user.count(),
    credentialAccounts: await db.account.count({ where: { providerId: "credential" } }),
    plans: await db.plan.count(),
    tenants: await db.tenant.count(),
    professionals: await db.professional.count(),
    services: await db.service.count(),
    products: await db.product.count(),
    customers: await db.customer.count(),
    professionalServices: await db.professionalService.count(),
    workingHours: await db.workingHour.count(),
  };
}

describe("development seed", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(db);
  });
  afterAll(() => db.$disconnect());

  test("creates the same data set as the legacy seeders", async () => {
    expect(await counts()).toEqual({
      users: 7, // 1 super_admin + per tenant: 1 admin + 2 professionals
      credentialAccounts: 7,
      plans: 2,
      tenants: 2,
      professionals: 4,
      services: 8,
      products: 6,
      customers: 12,
      professionalServices: 16,
      workingHours: 20,
    });
  });

  test("is idempotent", async () => {
    const before = await counts();
    await seed(db);
    expect(await counts()).toEqual(before);
  });

  test("keeps the legacy logins and roles", async () => {
    const superAdmin = await db.user.findUniqueOrThrow({ where: { email: "superadmin@agenda.com" } });
    const admin = await db.user.findUniqueOrThrow({
      where: { email: "admin@barbearia-centro.com" },
      include: { tenant: true, accounts: true },
    });

    expect(superAdmin.role).toBe("super_admin");
    expect(superAdmin.tenantId).toBeNull();
    expect(admin.role).toBe("admin");
    expect(admin.tenant?.slug).toBe("barbearia-centro");
    expect(admin.accounts).toHaveLength(1);
    expect(admin.accounts[0].providerId).toBe("credential");
    expect(await verifyPassword(SEED_PASSWORD, admin.accounts[0].password!)).toBe(true);
  });

  test("gives each professional a weekday schedule in their own tenant", async () => {
    const professional = await db.professional.findFirstOrThrow({
      where: { user: { email: "bruno@barbearia-zona-sul.com" } },
      include: { workingHours: true, tenant: true, user: true },
    });

    expect(professional.user.role).toBe("professional");
    expect(professional.user.tenantId).toBe(professional.tenantId);
    expect(professional.tenant.slug).toBe("barbearia-zona-sul");
    expect(professional.workingHours.map((h) => h.weekday).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
