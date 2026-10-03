// @vitest-environment node
// Port of backend/tests/Feature/Negocio/FinanceiroApiTest.php, plus commission
// overrides, period boundaries in the barbershop's time zone and decimal precision.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { zonedParts } from "@/lib/timezone";
import { financialEntryRoutes } from "@/server/financial/financial-entries";
import { currentMonth, financialReportRoute } from "@/server/financial/financial-report";
import { orderRoutes } from "@/server/orders/orders";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

let admin: string;
let carlos: string;
let tenantA: number;
let tenantB: number;
let customer: number;

const report = (query = "") => call(financialReportRoute, { cookie: admin, path: `/api/financial-report${query}` });

async function professional(defaultCommissionRate: string) {
  const n = Math.random().toString(36).slice(2, 8);
  const user = await unscopedDb.user.create({ data: { name: `Pro ${n}`, email: `${n}@teste.com`, role: "professional", tenantId: tenantA } });
  return unscopedDb.professional.create({ data: { tenantId: tenantA, userId: user.id, defaultCommissionRate } });
}

async function service(price: string) {
  return unscopedDb.service.create({ data: { tenantId: tenantA, name: `Serviço ${Math.random()}`, durationMinutes: 30, price } });
}

/** A paid order with one service item, paid at `paidAt`. */
async function paidOrder(professionalId: number, serviceId: number, total: string, paidAt: Date, tenantId = tenantA, customerId = customer) {
  return unscopedDb.order.create({
    data: {
      tenantId,
      customerId,
      professionalId,
      status: "paid",
      paymentMethod: "cash",
      paidAt,
      totalAmount: total,
      items: { create: { type: "service", serviceId, unitPrice: total, totalPrice: total } },
    },
  });
}

describe("financial API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    customer = (await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.financialEntry.deleteMany();
    await unscopedDb.order.deleteMany();
  });
  afterAll(() => unscopedDb.$disconnect());

  test("admin has full CRUD on entries; a professional is forbidden", async () => {
    const payload = { type: "expense", category: "aluguel", amount: 1200, entryDate: "2030-01-05" };
    expect((await call(financialEntryRoutes.collection.POST, { cookie: carlos, body: payload })).status).toBe(403);
    expect((await call(financialEntryRoutes.collection.GET, { cookie: carlos })).status).toBe(403);
    expect((await call(financialReportRoute, { cookie: carlos })).status).toBe(403);

    const created = await call(financialEntryRoutes.collection.POST, { cookie: admin, body: payload });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ amount: "1200.00", entryDate: "2030-01-05", type: "expense" });
    const id = String(created.body.id);

    const updated = await call(financialEntryRoutes.item.PUT, { method: "PUT", cookie: admin, params: { id }, body: { ...payload, amount: 1300 } });
    expect(updated.body.amount).toBe("1300.00");
    expect((await call(financialEntryRoutes.item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(204);
    expect(await unscopedDb.financialEntry.count()).toBe(0);
  });

  test("entries are listed by date, newest first", async () => {
    for (const entryDate of ["2030-01-03", "2030-01-10", "2030-01-01"]) {
      await call(financialEntryRoutes.collection.POST, { cookie: admin, body: { type: "income", category: "outros", amount: 1, entryDate } });
    }
    const list = await call(financialEntryRoutes.collection.GET, { cookie: admin });
    expect(list.body.data.map((e: { entryDate: string }) => e.entryDate)).toEqual(["2030-01-10", "2030-01-03", "2030-01-01"]);
  });

  test("report totals and commission (legacy scenario, through the real order flow)", async () => {
    const pro = await professional("40.00");
    const svc = await service("100.00");
    const today = zonedParts(new Date(), "America/Sao_Paulo").date;
    await call(financialEntryRoutes.collection.POST, { cookie: admin, body: { type: "expense", category: "aluguel", amount: 200, entryDate: today } });
    const order = await call(orderRoutes.collection.POST, { cookie: admin, body: { customerId: customer, professionalId: pro.id } });
    await call(orderRoutes.items.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { type: "service", serviceId: svc.id } });
    await call(orderRoutes.close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "cash" } });

    const res = await report(); // default: current month

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalIncome: "100.00", totalExpenses: "200.00", balance: "-100.00" });
    expect(res.body.commissionsByProfessional).toEqual([{ professionalId: pro.id, professionalName: expect.any(String), commission: "40.00" }]);
  });

  test("uses the professional × service override rate when there is one", async () => {
    const pro = await professional("40.00");
    const special = await service("100.00");
    const regular = await service("50.00");
    await unscopedDb.professionalService.create({ data: { professionalId: pro.id, serviceId: special.id, commissionRate: "50.00" } });
    await paidOrder(pro.id, special.id, "100.00", new Date("2030-01-10T15:00:00Z"));
    await paidOrder(pro.id, regular.id, "50.00", new Date("2030-01-11T15:00:00Z"));

    const res = await report("?from=2030-01-01&to=2030-01-31");

    // 100 × 50% + 50 × 40% = 70
    expect(res.body.commissionsByProfessional).toEqual([expect.objectContaining({ professionalId: pro.id, commission: "70.00" })]);
  });

  test("the period is taken in the barbershop's time zone, by payment date", async () => {
    const pro = await professional("10.00");
    const svc = await service("100.00");
    // 31 Jan 23:30 in São Paulo is already 1 Feb in UTC: belongs to January.
    await paidOrder(pro.id, svc.id, "100.00", new Date("2030-02-01T02:30:00Z"));
    // 1 Feb 00:30 in São Paulo: belongs to February.
    await paidOrder(pro.id, svc.id, "100.00", new Date("2030-02-01T03:30:00Z"));
    await unscopedDb.financialEntry.create({ data: { tenantId: tenantA, type: "income", category: "x", amount: "5.00", entryDate: new Date("2030-02-01T00:00:00Z") } });

    const january = await report("?from=2030-01-01&to=2030-01-31");
    expect(january.body.commissionsByProfessional[0].commission).toBe("10.00");
    expect(january.body.totalIncome).toBe("0.00");

    const february = await report("?from=2030-02-01&to=2030-02-28");
    expect(february.body.commissionsByProfessional[0].commission).toBe("10.00");
    expect(february.body.totalIncome).toBe("5.00");
  });

  test("decimal arithmetic, no float drift", async () => {
    const pro = await professional("33.33");
    const svc = await service("10.10");
    for (let i = 0; i < 3; i++) await paidOrder(pro.id, svc.id, "10.10", new Date("2030-01-10T15:00:00Z"));

    const res = await report("?from=2030-01-01&to=2030-01-31");

    // 3 × 10.10 × 33.33% = 10.09899 → 10.10
    expect(res.body.commissionsByProfessional[0].commission).toBe("10.10");
  });

  test("other tenants' data never enters the report", async () => {
    const otherPro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherCustomer = await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherService = await unscopedDb.service.findFirstOrThrow({ where: { tenantId: tenantB } });
    await paidOrder(otherPro.id, otherService.id, "100.00", new Date("2030-01-10T15:00:00Z"), tenantB, otherCustomer.id);
    await unscopedDb.financialEntry.create({ data: { tenantId: tenantB, type: "income", category: "x", amount: "999.00", entryDate: new Date("2030-01-10T00:00:00Z") } });

    const res = await report("?from=2030-01-01&to=2030-01-31");

    expect(res.body).toMatchObject({ totalIncome: "0.00", commissionsByProfessional: [] });
  });

  test("invalid period dates are a 422; the default period is the current month", async () => {
    const bad = await report("?from=01/01/2030");
    expect(bad.status).toBe(422);
    expect(bad.body.errors).toEqual({ from: ["O campo início deve ser uma data válida."] });

    expect(currentMonth("America/Sao_Paulo", new Date("2030-02-15T12:00:00Z"))).toEqual({ from: "2030-02-01", to: "2030-02-28" });
    // 1 Mar 01:00 UTC is still 28 Feb in São Paulo.
    expect(currentMonth("America/Sao_Paulo", new Date("2030-03-01T01:00:00Z"))).toEqual({ from: "2030-02-01", to: "2030-02-28" });
  });
});
