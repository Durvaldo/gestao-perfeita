// @vitest-environment node
// Port of backend/tests/Feature/Negocio/ComandaApiTest.php, plus the ADR-0011
// rules (stock never negative, one order per appointment, no double close).
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { zonedParts } from "@/lib/timezone";
import { orderRoutes } from "@/server/orders/orders";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const { collection, item, items, itemById, close } = orderRoutes;

let admin: string;
let carlos: string;
let tenantA: number;
let tenantB: number;
let customer: number;
let carlosPro: number;
let rafaelPro: number;
let adminUser: number;

async function product(stockQuantity: number | null, price = "20.00", tenantId = tenantA) {
  return (await unscopedDb.product.create({ data: { tenantId, name: `Produto ${Math.random()}`, price, stockQuantity } })).id;
}

async function walkIn(professionalId = carlosPro, cookie = admin) {
  return call(collection.POST, { cookie, body: { customerId: customer, professionalId } });
}

async function appointmentWith(price: string, status: "pending" | "cancelled" = "pending") {
  const service = await unscopedDb.service.create({ data: { tenantId: tenantA, name: `Serviço ${Math.random()}`, durationMinutes: 30, price } });
  return unscopedDb.appointment.create({
    data: {
      tenantId: tenantA,
      customerId: customer,
      professionalId: carlosPro,
      startsAt: new Date("2030-01-10T13:00:00Z"),
      endsAt: new Date("2030-01-10T13:30:00Z"),
      status,
      createdByUserId: adminUser,
      services: { create: { serviceId: service.id, priceAtBooking: price } },
    },
  });
}

const addProduct = (orderId: number, productId: number, quantity?: number, cookie = admin) =>
  call(items.POST, { cookie, params: { id: String(orderId) }, body: { type: "product", productId, quantity } });

describe("orders API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    customer = (await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } })).id;
    carlosPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    rafaelPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } })).id;
    adminUser = (await unscopedDb.user.findUniqueOrThrow({ where: { email: "admin@barbearia-centro.com" } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.financialEntry.deleteMany();
    await unscopedDb.order.deleteMany();
    await unscopedDb.appointment.deleteMany();
  });
  afterAll(() => unscopedDb.$disconnect());

  test("an order created from an appointment is prefilled with its services at the frozen price", async () => {
    const appointment = await appointmentWith("50.00");
    await unscopedDb.service.updateMany({ where: { appointments: { some: { appointmentId: appointment.id } } }, data: { price: "99.00" } });

    const res = await call(collection.POST, { cookie: admin, body: { appointmentId: appointment.id } });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ customerId: customer, professionalId: carlosPro, totalAmount: "50.00", status: "open" });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ type: "service", totalPrice: "50.00", quantity: 1 });
  });

  test("walk-in order: items decrement stock, closing posts income and freezes the total", async () => {
    const productId = await product(10, "20.00");
    const order = await walkIn();
    expect(order.status).toBe(201);

    const added = await addProduct(order.body.id, productId, 2);
    expect(added.status).toBe(201);
    expect(added.body.totalPrice).toBe("40.00");
    expect((await unscopedDb.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(8);

    const closed = await call(close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "pix" } });
    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({ status: "paid", totalAmount: "40.00", paymentMethod: "pix" });
    expect(closed.body.paidAt).not.toBeNull();

    const entry = await unscopedDb.financialEntry.findFirstOrThrow({ where: { tenantId: tenantA } });
    expect(entry).toMatchObject({ type: "income", category: "venda", description: `Comanda #${order.body.id}` });
    expect(entry.amount.toFixed(2)).toBe("40.00");
    // Entry date = today in the barbershop's time zone.
    expect(entry.entryDate.toISOString().slice(0, 10)).toBe(zonedParts(new Date(), "America/Sao_Paulo").date);

    const afterClose = await addProduct(order.body.id, productId);
    expect(afterClose.status).toBe(422);
    expect(afterClose.body.message).toBe("Esta comanda já foi fechada.");
  });

  test("closing an order from an appointment marks the appointment completed", async () => {
    const appointment = await appointmentWith("45.00");
    const order = await call(collection.POST, { cookie: admin, body: { appointmentId: appointment.id } });

    await call(close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "cash" } });

    expect((await unscopedDb.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("completed");
  });

  test("removing an item restores stock and recalculates the total", async () => {
    const productId = await product(5, "15.00");
    const order = await walkIn();
    const added = await addProduct(order.body.id, productId);
    expect((await unscopedDb.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(4);

    const removed = await call(itemById.DELETE, {
      method: "DELETE",
      cookie: admin,
      params: { id: String(order.body.id), itemId: String(added.body.id) },
    });

    expect(removed.status).toBe(204);
    expect((await unscopedDb.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(5);
    expect((await unscopedDb.order.findUniqueOrThrow({ where: { id: order.body.id } })).totalAmount.toFixed(2)).toBe("0.00");
  });

  test("an item of another order is a 404; removing from a closed order is a 422", async () => {
    const productId = await product(null);
    const first = await walkIn();
    const second = await walkIn();
    const added = await addProduct(first.body.id, productId);

    const wrongOrder = await call(itemById.DELETE, {
      method: "DELETE",
      cookie: admin,
      params: { id: String(second.body.id), itemId: String(added.body.id) },
    });
    expect(wrongOrder.status).toBe(404);

    await call(close.POST, { cookie: admin, params: { id: String(first.body.id) }, body: { paymentMethod: "cash" } });
    const closedRemove = await call(itemById.DELETE, {
      method: "DELETE",
      cookie: admin,
      params: { id: String(first.body.id), itemId: String(added.body.id) },
    });
    expect(closedRemove.status).toBe(422);
  });

  test("stock never goes negative; untracked stock is unlimited", async () => {
    const tracked = await product(2);
    const untracked = await product(null);
    const order = await walkIn();

    const tooMany = await addProduct(order.body.id, tracked, 3);
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.errors).toEqual({ quantity: ["Estoque insuficiente: restam 2 unidades."] });
    expect((await unscopedDb.product.findUniqueOrThrow({ where: { id: tracked } })).stockQuantity).toBe(2);

    expect((await addProduct(order.body.id, tracked, 2)).status).toBe(201);
    expect((await addProduct(order.body.id, untracked, 50)).status).toBe(201);
  });

  test("one order per appointment, and none for a cancelled appointment", async () => {
    const appointment = await appointmentWith("30.00");
    expect((await call(collection.POST, { cookie: admin, body: { appointmentId: appointment.id } })).status).toBe(201);

    const duplicate = await call(collection.POST, { cookie: admin, body: { appointmentId: appointment.id } });
    expect(duplicate.body.errors).toEqual({ appointmentId: ["Este agendamento já tem uma comanda."] });

    const cancelled = await appointmentWith("30.00", "cancelled");
    const fromCancelled = await call(collection.POST, { cookie: admin, body: { appointmentId: cancelled.id } });
    expect(fromCancelled.body.errors).toEqual({ appointmentId: ["Não é possível abrir comanda de um agendamento cancelado."] });
  });

  test("concurrent closes post exactly one financial entry", async () => {
    const order = await walkIn();
    await addProduct(order.body.id, await product(null));

    const results = await Promise.all(
      Array.from({ length: 4 }, () => call(close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "pix" } })),
    );

    expect(results.map((r) => r.status).sort()).toEqual([200, 422, 422, 422]);
    expect(await unscopedDb.financialEntry.count()).toBe(1);
  });

  test("validation: walk-in needs customer and professional; close needs items and a valid payment method", async () => {
    const missing = await call(collection.POST, { cookie: admin, body: {} });
    expect(missing.body.errors).toEqual({
      customerId: ["O campo cliente é obrigatório quando não há agendamento."],
      professionalId: ["O campo barbeiro é obrigatório quando não há agendamento."],
    });

    const order = await walkIn();
    const empty = await call(close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "pix" } });
    expect(empty.body.errors).toEqual({ items: ["Adicione ao menos um item antes de fechar a comanda."] });

    const badMethod = await call(close.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { paymentMethod: "boleto" } });
    expect(badMethod.body.errors).toEqual({ paymentMethod: ["O valor selecionado para forma de pagamento é inválido."] });

    const noProduct = await call(items.POST, { cookie: admin, params: { id: String(order.body.id) }, body: { type: "product" } });
    expect(noProduct.body.errors).toEqual({ productId: ["O campo produto é obrigatório."] });
  });

  test("references from another tenant are rejected", async () => {
    const order = await walkIn();
    const otherTenantProduct = await product(10, "5.00", tenantB);

    const res = await addProduct(order.body.id, otherTenantProduct);

    expect(res.body.errors).toEqual({ productId: ["O valor selecionado para produto é inválido."] });
  });

  test("a professional opens walk-in orders only for themselves (SPEC-0001)", async () => {
    const own = await call(collection.POST, { cookie: carlos, body: { customerId: customer } });
    expect(own.status).toBe(201);
    expect(own.body.professionalId).toBe(carlosPro);

    const forColleague = await walkIn(rafaelPro, carlos);
    expect(forColleague.status).toBe(403);
    expect(await unscopedDb.order.count({ where: { professionalId: rafaelPro } })).toBe(0);

    // The admin still opens orders for anyone, and must say for whom.
    expect((await walkIn(rafaelPro)).status).toBe(201);
    const missing = await call(collection.POST, { cookie: admin, body: { customerId: customer } });
    expect(missing.status).toBe(422);
    expect(missing.body.errors.professionalId).toBeDefined();
  });

  test("a professional cannot open an order from a colleague's appointment (SPEC-0001)", async () => {
    const appointment = await appointmentWith("40.00");
    await unscopedDb.appointment.update({ where: { id: appointment.id }, data: { professionalId: rafaelPro } });

    const res = await call(collection.POST, { cookie: carlos, body: { appointmentId: appointment.id } });
    expect(res.status).toBe(403);
    expect(await unscopedDb.order.count({ where: { appointmentId: appointment.id } })).toBe(0);
  });

  test("a professional cannot manage a colleague's order, but manages their own", async () => {
    const colleagues = await walkIn(rafaelPro);
    const own = await walkIn(carlosPro, carlos);
    const productId = await product(null);

    expect((await addProduct(colleagues.body.id, productId, 1, carlos)).status).toBe(403);
    expect((await call(item.GET, { cookie: carlos, params: { id: String(colleagues.body.id) } })).status).toBe(403);
    expect((await addProduct(own.body.id, productId, 1, carlos)).status).toBe(201);

    const list = await call(collection.GET, { cookie: carlos });
    expect(list.body.data.map((o: { id: number }) => o.id)).toEqual([own.body.id]);
  });

  test("orders are isolated per tenant", async () => {
    const otherPro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherCustomer = await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantB } });
    const orderB = await unscopedDb.order.create({ data: { tenantId: tenantB, customerId: otherCustomer.id, professionalId: otherPro.id } });

    expect((await call(item.GET, { cookie: admin, params: { id: String(orderB.id) } })).status).toBe(404);
    expect((await call(close.POST, { cookie: admin, params: { id: String(orderB.id) }, body: { paymentMethod: "pix" } })).status).toBe(404);
    expect((await call(collection.GET, { cookie: admin })).body.total).toBe(0);
  });
});
