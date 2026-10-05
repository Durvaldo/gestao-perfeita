// @vitest-environment node
// Port of backend/tests/Feature/Negocio/DashboardApiTest.php, plus year wrap and
// 29 Feb birthdays, rankings and tenant isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { zonedParts } from "@/lib/timezone";
import { dashboardRoute, daysUntilBirthday } from "@/server/dashboard/dashboard";
import { orderRoutes } from "@/server/orders/orders";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

let admin: string;
let carlos: string;
let tenantA: number;
let tenantB: number;
let carlosPro: number;
let rafaelPro: number;

const dashboard = (cookie = admin) => call(dashboardRoute, { cookie });

async function customer(name: string, birthDate: string | null = null, tenantId = tenantA) {
  return unscopedDb.customer.create({
    data: { tenantId, name, phone: "1", birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null },
  });
}

async function paidOrder(customerId: number, professionalId: number, items: { serviceId?: number; productId?: number; quantity: number; total: string }[], tenantId = tenantA) {
  const total = items.reduce((sum, i) => sum + Number(i.total), 0).toFixed(2);
  return unscopedDb.order.create({
    data: {
      tenantId,
      customerId,
      professionalId,
      status: "paid",
      paidAt: new Date(),
      totalAmount: total,
      items: {
        create: items.map((i) => ({
          type: i.productId ? ("product" as const) : ("service" as const),
          serviceId: i.serviceId ?? null,
          productId: i.productId ?? null,
          quantity: i.quantity,
          unitPrice: i.total,
          totalPrice: i.total,
        })),
      },
    },
  });
}

/** "YYYY-MM-DD" of today + n days, with the year replaced (São Paulo calendar). */
function shiftedDate(days: number, yearsBack: number) {
  const today = zonedParts(new Date(), "America/Sao_Paulo").date;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCFullYear(d.getUTCFullYear() - yearsBack);
  return d.toISOString().slice(0, 10);
}

describe("dashboard API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    carlosPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    rafaelPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.financialEntry.deleteMany();
    await unscopedDb.order.deleteMany();
    await unscopedDb.appointment.deleteMany();
    await unscopedDb.customer.deleteMany({ where: { phone: "1" } });
    // Seed customers have birthdays; clear them so birthday assertions are deterministic.
    await unscopedDb.customer.updateMany({ data: { birthDate: null } });
  });
  afterAll(() => unscopedDb.$disconnect());

  test("aggregates only paid orders (legacy scenario, through the real order flow)", async () => {
    const loyal = await customer("Cliente Fiel");
    const pomade = await unscopedDb.product.create({ data: { tenantId: tenantA, name: "Pomada", price: "30.00", stockQuantity: 100 } });
    const paid = await call(orderRoutes.collection.POST, { cookie: admin, body: { customerId: loyal.id, professionalId: carlosPro } });
    await call(orderRoutes.items.POST, { cookie: admin, params: { id: String(paid.body.id) }, body: { type: "product", productId: pomade.id, quantity: 3 } });
    await call(orderRoutes.close.POST, { cookie: admin, params: { id: String(paid.body.id) }, body: { paymentMethod: "pix" } });
    // An open order must not count.
    const open = await call(orderRoutes.collection.POST, { cookie: admin, body: { customerId: loyal.id, professionalId: carlosPro } });
    await call(orderRoutes.items.POST, { cookie: admin, params: { id: String(open.body.id) }, body: { type: "product", productId: pomade.id, quantity: 7 } });

    const res = await dashboard();

    expect(res.status).toBe(200);
    expect(res.body.bestSellingProducts[0]).toMatchObject({ name: "Pomada", totalQuantity: 3 });
    expect(res.body.professionalRanking[0]).toMatchObject({ professionalId: carlosPro, totalRevenue: "90.00" });
    expect(res.body.topCustomers[0]).toMatchObject({ name: "Cliente Fiel", totalVisits: 1 });
  });

  test("rankings are ordered and limited to the top 5", async () => {
    const a = await customer("A");
    const b = await customer("B");
    const services = await unscopedDb.service.findMany({ where: { tenantId: tenantA }, orderBy: { id: "asc" } });
    await paidOrder(a.id, carlosPro, [{ serviceId: services[0].id, quantity: 1, total: "45.00" }]);
    await paidOrder(a.id, rafaelPro, [{ serviceId: services[1].id, quantity: 4, total: "140.00" }]);
    await paidOrder(b.id, rafaelPro, [{ serviceId: services[1].id, quantity: 1, total: "35.00" }]);

    const res = await dashboard();

    expect(res.body.bestSellingServices.map((s: { id: number }) => s.id)).toEqual([services[1].id, services[0].id]);
    expect(res.body.bestSellingServices[0].totalQuantity).toBe(5);
    expect(res.body.professionalRanking.map((p: { professionalId: number; totalRevenue: string }) => [p.professionalId, p.totalRevenue])).toEqual([
      [rafaelPro, "175.00"],
      [carlosPro, "45.00"],
    ]);
    expect(res.body.topCustomers.map((c: { name: string }) => c.name)).toEqual(["A", "B"]);
  });

  test("completed appointments count as visits, without counting twice (SPEC-0003)", async () => {
    const regular = await customer("Cliente da Agenda");
    const other = await customer("Outro Cliente");
    const adminUser = await unscopedDb.user.findUniqueOrThrow({ where: { email: "admin@barbearia-centro.com" } });
    const service = await unscopedDb.service.findFirstOrThrow({ where: { tenantId: tenantA } });
    const appointment = (customerId: number, status: "completed" | "confirmed" | "cancelled", day: number) =>
      unscopedDb.appointment.create({
        data: {
          tenantId: tenantA,
          customerId,
          professionalId: carlosPro,
          startsAt: new Date(`2030-01-${String(day).padStart(2, "0")}T13:00:00Z`),
          endsAt: new Date(`2030-01-${String(day).padStart(2, "0")}T13:30:00Z`),
          status,
          createdByUserId: adminUser.id,
        },
      });

    // (a) completed in the agenda, no order;
    await appointment(regular.id, "completed", 10);
    // (b) completed and closed through its paid order: one visit, not two;
    const closed = await appointment(regular.id, "completed", 11);
    const order = await paidOrder(regular.id, carlosPro, [{ serviceId: service.id, quantity: 1, total: "45.00" }]);
    await unscopedDb.order.update({ where: { id: order.id }, data: { appointmentId: closed.id } });
    // (c) a paid walk-in order.
    await paidOrder(regular.id, carlosPro, [{ serviceId: service.id, quantity: 1, total: "45.00" }]);
    // Not visits: a confirmed and a cancelled appointment.
    await appointment(other.id, "confirmed", 12);
    await appointment(other.id, "cancelled", 13);

    const res = await dashboard();

    expect(res.body.topCustomers).toEqual([{ customerId: regular.id, name: "Cliente da Agenda", totalVisits: 3 }]);
  });

  test("a professional sees only their own data; the admin sees the whole barbershop (SPEC-0001)", async () => {
    const services = await unscopedDb.service.findMany({ where: { tenantId: tenantA }, orderBy: { id: "asc" } });
    const ofCarlos = await customer("Cliente do Carlos", shiftedDate(3, 30));
    const ofRafael = await customer("Cliente do Rafael", shiftedDate(2, 30));
    await paidOrder(ofCarlos.id, carlosPro, [{ serviceId: services[0].id, quantity: 1, total: "45.00" }]);
    await paidOrder(ofRafael.id, rafaelPro, [{ serviceId: services[1].id, quantity: 2, total: "70.00" }]);

    const own = (await dashboard(carlos)).body;
    expect(own.professionalRanking).toEqual([{ professionalId: carlosPro, name: "Carlos Souza", totalRevenue: "45.00" }]);
    expect(own.bestSellingServices.map((s: { id: number }) => s.id)).toEqual([services[0].id]);
    expect(own.topCustomers.map((c: { name: string }) => c.name)).toEqual(["Cliente do Carlos"]);
    expect(own.upcomingBirthdays.map((c: { name: string }) => c.name)).toEqual(["Cliente do Carlos"]);

    const all = (await dashboard()).body;
    expect(all.professionalRanking.map((r: { professionalId: number }) => r.professionalId)).toEqual([rafaelPro, carlosPro]);
    expect(all.upcomingBirthdays.map((c: { name: string }) => c.name)).toEqual(["Cliente do Rafael", "Cliente do Carlos"]);
  });

  test("upcoming birthdays are ordered by the closest one, including year wrap", async () => {
    await customer("Aniversário em 100 dias", shiftedDate(100, 30));
    await customer("Aniversário em 5 dias", shiftedDate(5, 20));
    await customer("Aniversário ontem", shiftedDate(-1, 25)); // next one is ~364 days away
    await customer("Aniversário hoje", shiftedDate(0, 40));

    const res = await dashboard();

    expect(res.body.upcomingBirthdays.map((c: { name: string }) => c.name)).toEqual([
      "Aniversário hoje",
      "Aniversário em 5 dias",
      "Aniversário em 100 dias",
      "Aniversário ontem",
    ]);
    expect(res.body.upcomingBirthdays[0].daysUntilBirthday).toBe(0);
    expect(res.body.upcomingBirthdays[1].daysUntilBirthday).toBe(5);
  });

  test("daysUntilBirthday handles year wrap and 29 February", () => {
    expect(daysUntilBirthday("1990-12-31", "2030-12-30")).toBe(1);
    expect(daysUntilBirthday("1990-01-01", "2030-12-31")).toBe(1);
    expect(daysUntilBirthday("1990-03-15", "2030-03-15")).toBe(0);
    // 29 Feb in a non-leap year rolls to 1 Mar (legacy Carbon behavior).
    expect(daysUntilBirthday("2000-02-29", "2030-02-28")).toBe(1);
  });

  test("other tenants' data never enters the dashboard; professionals see it too", async () => {
    const otherPro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherCustomer = await customer("Outro tenant", shiftedDate(1, 20), tenantB);
    const otherService = await unscopedDb.service.findFirstOrThrow({ where: { tenantId: tenantB } });
    await paidOrder(otherCustomer.id, otherPro.id, [{ serviceId: otherService.id, quantity: 9, total: "999.00" }], tenantB);

    const res = await dashboard(carlos); // legacy parity: staff (incl. professionals) can view

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      bestSellingProducts: [],
      bestSellingServices: [],
      professionalRanking: [],
      topCustomers: [],
      upcomingBirthdays: [],
    });
  });
});
