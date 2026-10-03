// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb as db } from "@/lib/db";
import { truncateAll } from "../../../tests/db";

async function createTenant() {
  const plan = await db.plan.create({ data: { name: "Basic", monthlyPrice: "49.90" } });
  return db.tenant.create({ data: { planId: plan.id, name: "Barbearia Centro", slug: "barbearia-centro" } });
}

describe("database schema", () => {
  beforeEach(truncateAll);
  afterAll(() => db.$disconnect());

  test("decimal values round-trip without precision loss", async () => {
    const tenant = await createTenant();
    const service = await db.service.create({
      data: { tenantId: tenant.id, name: "Corte", durationMinutes: 30, price: "10.10" },
    });

    const stored = await db.service.findUniqueOrThrow({ where: { id: service.id } });

    expect(stored.price.toString()).toBe("10.1");
    expect(stored.price.toFixed(2)).toBe("10.10");
    // 0.1 + 0.2 must not drift the way JS floats do.
    expect(stored.price.plus("0.2").toFixed(2)).toBe("10.30");
  });

  test("applies legacy defaults", async () => {
    const tenant = await createTenant();
    const user = await db.user.create({
      data: { tenantId: tenant.id, name: "Ana", email: "ana@example.com" },
    });
    const professional = await db.professional.create({ data: { tenantId: tenant.id, userId: user.id } });

    expect(tenant.status).toBe("trial");
    expect(user.role).toBe("admin");
    expect(professional.defaultCommissionRate.toFixed(2)).toBe("0.00");
    expect(professional.active).toBe(true);
  });

  test("stores working hours as time of day", async () => {
    const tenant = await createTenant();
    const user = await db.user.create({
      data: { tenantId: tenant.id, name: "Bruno", email: "bruno@example.com" },
    });
    const professional = await db.professional.create({ data: { tenantId: tenant.id, userId: user.id } });

    const hour = await db.workingHour.create({
      data: {
        professionalId: professional.id,
        weekday: 1,
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T12:30:00Z"),
      },
    });

    expect(hour.startTime.toISOString().slice(11, 19)).toBe("09:00:00");
    expect(hour.endTime.toISOString().slice(11, 19)).toBe("12:30:00");
  });

  test("deleting an order cascades to its items", async () => {
    const tenant = await createTenant();
    const user = await db.user.create({
      data: { tenantId: tenant.id, name: "Caio", email: "caio@example.com" },
    });
    const professional = await db.professional.create({ data: { tenantId: tenant.id, userId: user.id } });
    const customer = await db.customer.create({ data: { tenantId: tenant.id, name: "Davi", phone: "11999999999" } });
    const order = await db.order.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        professionalId: professional.id,
        items: { create: { type: "product", unitPrice: "5.00", totalPrice: "5.00" } },
      },
    });

    await db.order.delete({ where: { id: order.id } });

    expect(await db.orderItem.count()).toBe(0);
  });
});
