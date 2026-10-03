// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { db, unscopedDb } from "@/lib/db";
import { runWithTenant, TenantContextMissingError } from "@/lib/tenancy/context";
import { truncateAll } from "../../../../tests/db";

type Fixture = {
  tenantA: number;
  tenantB: number;
  professionalA: number;
  professionalB: number;
  serviceA: number;
  serviceB: number;
  workingHourB: number;
  orderB: number;
};

let fx: Fixture;

async function createTenantWithData(slug: string, serviceName: string) {
  const plan = await unscopedDb.plan.create({ data: { name: `Plan ${slug}`, monthlyPrice: "10.00" } });
  const tenant = await unscopedDb.tenant.create({ data: { planId: plan.id, name: slug, slug } });
  const user = await unscopedDb.user.create({
    data: { name: `Pro ${slug}`, email: `pro@${slug}.com`, role: "professional", tenantId: tenant.id },
  });
  const professional = await unscopedDb.professional.create({ data: { tenantId: tenant.id, userId: user.id } });
  const service = await unscopedDb.service.create({
    data: { tenantId: tenant.id, name: serviceName, durationMinutes: 30, price: "40.00" },
  });
  const customer = await unscopedDb.customer.create({ data: { tenantId: tenant.id, name: `Cliente ${slug}`, phone: "1" } });
  const workingHour = await unscopedDb.workingHour.create({
    data: {
      professionalId: professional.id,
      weekday: 1,
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T18:00:00Z"),
    },
  });
  const order = await unscopedDb.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      professionalId: professional.id,
      items: { create: { type: "service", serviceId: service.id, unitPrice: "40.00", totalPrice: "40.00" } },
    },
  });
  return { tenant, professional, service, workingHour, order };
}

describe("tenant scope", () => {
  beforeEach(async () => {
    await truncateAll();
    const a = await createTenantWithData("tenant-a", "Corte");
    const b = await createTenantWithData("tenant-b", "Barba");
    fx = {
      tenantA: a.tenant.id,
      tenantB: b.tenant.id,
      professionalA: a.professional.id,
      professionalB: b.professional.id,
      serviceA: a.service.id,
      serviceB: b.service.id,
      workingHourB: b.workingHour.id,
      orderB: b.order.id,
    };
  });
  afterAll(() => unscopedDb.$disconnect());

  test("queries are isolated per tenant", async () => {
    const namesA = await runWithTenant(fx.tenantA, () => db.service.findMany({ select: { name: true } }));
    const namesB = await runWithTenant(fx.tenantB, () => db.service.findMany({ select: { name: true } }));

    expect(namesA.map((s) => s.name)).toEqual(["Corte"]);
    expect(namesB.map((s) => s.name)).toEqual(["Barba"]);
    expect(await runWithTenant(fx.tenantA, () => db.customer.count())).toBe(1);
  });

  test("querying a scoped model without a tenant fails closed", async () => {
    await expect(db.service.findMany()).rejects.toThrow(TenantContextMissingError);
    await expect(db.customer.count()).rejects.toThrow(TenantContextMissingError);
    await expect(
      db.service.create({ data: { name: "X", durationMinutes: 10, price: "1.00" } as never }),
    ).rejects.toThrow(TenantContextMissingError);
  });

  test("models without a tenant are not scoped", async () => {
    expect(await db.tenant.count()).toBe(2);
    expect(await db.user.count()).toBe(2);
  });

  test("creating without tenantId uses the current tenant", async () => {
    const created = await runWithTenant(fx.tenantA, () =>
      db.product.create({ data: { name: "Pomada", price: "30.00" } as never }),
    );

    expect(created.tenantId).toBe(fx.tenantA);
  });

  test("refuses to create or move a record into another tenant", async () => {
    await runWithTenant(fx.tenantA, async () => {
      await expect(
        db.product.create({ data: { tenantId: fx.tenantB, name: "Pomada", price: "30.00" } }),
      ).rejects.toThrow(/outside the current tenant/);
      await expect(
        db.service.update({ where: { id: fx.serviceA }, data: { tenantId: fx.tenantB } }),
      ).rejects.toThrow(/outside the current tenant/);
    });
  });

  test("another tenant's record is invisible by id (equivalent to 404)", async () => {
    await runWithTenant(fx.tenantA, async () => {
      expect(await db.service.findUnique({ where: { id: fx.serviceB } })).toBeNull();
      await expect(db.service.update({ where: { id: fx.serviceB }, data: { name: "Hack" } })).rejects.toThrow();
      await expect(db.service.delete({ where: { id: fx.serviceB } })).rejects.toThrow();
      expect((await db.service.updateMany({ where: { id: fx.serviceB }, data: { name: "Hack" } })).count).toBe(0);
    });

    const untouched = await unscopedDb.service.findUniqueOrThrow({ where: { id: fx.serviceB } });
    expect(untouched.name).toBe("Barba");
  });

  test("keeps the caller's own conditions", async () => {
    const found = await runWithTenant(fx.tenantA, () =>
      db.service.findMany({ where: { AND: [{ name: "Barba" }] } }),
    );

    expect(found).toEqual([]);
  });

  test("working hours are scoped through the professional", async () => {
    await runWithTenant(fx.tenantA, async () => {
      expect(await db.workingHour.count()).toBe(1);
      expect(await db.workingHour.findUnique({ where: { id: fx.workingHourB } })).toBeNull();
      await expect(
        db.workingHour.update({ where: { id: fx.workingHourB }, data: { weekday: 3 } }),
      ).rejects.toThrow();
      await expect(
        db.workingHour.create({
          data: {
            professionalId: fx.professionalB,
            weekday: 2,
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T12:00:00Z"),
          },
        }),
      ).rejects.toThrow(/outside the current tenant/);
    });

    const hourB = await unscopedDb.workingHour.findUniqueOrThrow({ where: { id: fx.workingHourB } });
    expect(hourB.weekday).toBe(1);
  });

  test("order items are scoped through the order", async () => {
    await runWithTenant(fx.tenantA, async () => {
      expect(await db.orderItem.count()).toBe(1);
      await expect(
        db.orderItem.create({ data: { orderId: fx.orderB, type: "product", unitPrice: "1.00", totalPrice: "1.00" } }),
      ).rejects.toThrow(/outside the current tenant/);
    });
  });

  test("concurrent operations keep their own tenant", async () => {
    const [a, b] = await Promise.all([
      runWithTenant(fx.tenantA, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return db.service.findMany({ select: { name: true } });
      }),
      runWithTenant(fx.tenantB, () => db.service.findMany({ select: { name: true } })),
    ]);

    expect(a.map((s) => s.name)).toEqual(["Corte"]);
    expect(b.map((s) => s.name)).toEqual(["Barba"]);
  });

  test("unscopedDb sees every tenant", async () => {
    expect(await unscopedDb.service.count()).toBe(2);
  });
});
