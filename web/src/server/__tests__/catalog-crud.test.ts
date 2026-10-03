// @vitest-environment node
// Port of backend/tests/Feature/Cadastro/CadastroApiTest.php, plus validation,
// update semantics and edge cases.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { customerRoutes } from "@/server/customers/customers";
import { productRoutes } from "@/server/products/products";
import { serviceRoutes } from "@/server/services/services";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

type Routes = typeof customerRoutes;

const resources: { name: string; routes: Routes; payload: Record<string, unknown>; table: "customer" | "service" | "product" }[] = [
  { name: "customers", routes: customerRoutes, payload: { name: "Fulano", phone: "11999998888" }, table: "customer" },
  { name: "services", routes: serviceRoutes, payload: { name: "Corte", durationMinutes: 30, price: 40 }, table: "service" },
  { name: "products", routes: productRoutes, payload: { name: "Pomada", price: 30 }, table: "product" },
];

let admin: string;
let professional: string;
let tenantA: number;
let tenantB: number;

const countIn = (table: "customer" | "service" | "product", tenantId: number) =>
  (unscopedDb[table] as unknown as { count(a: object): Promise<number> }).count({ where: { tenantId } });

async function createInTenant(table: "customer" | "service" | "product", tenantId: number, payload: Record<string, unknown>) {
  const data = { ...payload, tenantId };
  return (unscopedDb[table] as unknown as { create(a: object): Promise<{ id: number }> }).create({ data });
}

describe("catalog CRUD (customers, services, products)", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    admin = await loginCookie("admin@barbearia-centro.com");
    professional = await loginCookie("rafael@barbearia-centro.com");
  });
  afterAll(() => unscopedDb.$disconnect());

  describe.each(resources)("$name", ({ routes, payload, table }) => {
    test("admin has full CRUD access", async () => {
      const before = await countIn(table, tenantA);

      const created = await call(routes.collection.POST, { cookie: admin, body: payload });
      expect(created.status).toBe(201);
      expect(created.body.tenantId).toBe(tenantA);
      const id = String(created.body.id);

      const list = await call(routes.collection.GET, { cookie: admin });
      expect(list.status).toBe(200);
      expect(list.body.total).toBe(before + 1);
      expect(list.body.data[0].id).toBe(created.body.id); // newest first

      expect((await call(routes.item.GET, { cookie: admin, params: { id } })).status).toBe(200);
      expect((await call(routes.item.PUT, { method: "PUT", cookie: admin, params: { id }, body: payload })).status).toBe(200);
      expect((await call(routes.item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(204);
      expect(await countIn(table, tenantA)).toBe(before);
    });

    test("professional can view but not manage", async () => {
      const record = await createInTenant(table, tenantA, payload);
      const id = String(record.id);

      expect((await call(routes.collection.GET, { cookie: professional })).status).toBe(200);
      expect((await call(routes.item.GET, { cookie: professional, params: { id } })).status).toBe(200);
      expect((await call(routes.collection.POST, { cookie: professional, body: payload })).status).toBe(403);
      // Authorization comes before validation (legacy Form Request order): 403, not 422.
      expect((await call(routes.collection.POST, { cookie: professional, body: {} })).status).toBe(403);
      expect((await call(routes.item.PUT, { method: "PUT", cookie: professional, params: { id }, body: payload })).status).toBe(403);
      expect((await call(routes.item.DELETE, { method: "DELETE", cookie: professional, params: { id } })).status).toBe(403);
    });

    test("records are isolated per tenant", async () => {
      const recordB = await createInTenant(table, tenantB, payload);
      const id = String(recordB.id);

      const list = await call(routes.collection.GET, { cookie: admin });
      expect(list.body.data.some((r: { id: number }) => r.id === recordB.id)).toBe(false);
      expect((await call(routes.item.GET, { cookie: admin, params: { id } })).status).toBe(404);
      expect((await call(routes.item.PUT, { method: "PUT", cookie: admin, params: { id }, body: payload })).status).toBe(404);
      expect((await call(routes.item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(404);
      expect(await countIn(table, tenantB)).toBeGreaterThan(0); // untouched
    });

    test("non-numeric or unknown ids are 404", async () => {
      expect((await call(routes.item.GET, { cookie: admin, params: { id: "abc" } })).status).toBe(404);
      expect((await call(routes.item.GET, { cookie: admin, params: { id: "999999" } })).status).toBe(404);
    });

    test("requires a session", async () => {
      expect((await call(routes.collection.GET)).status).toBe(401);
    });
  });

  test("customer validation messages", async () => {
    const res = await call(customerRoutes.collection.POST, {
      cookie: admin,
      body: { name: "", email: "invalido", birthDate: "15/03/1990" },
    });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({
      name: ["O campo nome é obrigatório."],
      phone: ["O campo telefone é obrigatório."],
      email: ["O campo e-mail deve ser um endereço de e-mail válido."],
      birthDate: ["O campo data de nascimento deve ser uma data válida."],
    });
  });

  test("service and product validation messages", async () => {
    const service = await call(serviceRoutes.collection.POST, {
      cookie: admin,
      body: { name: "Corte", durationMinutes: 0, price: "abc" },
    });
    expect(service.body.errors).toEqual({
      durationMinutes: ["O campo duração em minutos deve ser ao menos 1."],
      price: ["O campo preço deve ser um número."],
    });

    const product = await call(productRoutes.collection.POST, {
      cookie: admin,
      body: { name: "Pomada", price: -1, stockQuantity: 2.5 },
    });
    expect(product.body.errors).toEqual({
      price: ["O campo preço deve ser ao menos 0."],
      stockQuantity: ["O campo quantidade em estoque deve ser um número inteiro."],
    });
  });

  test("accepts the same loose inputs as the legacy rules, and serializes decimals and dates", async () => {
    const service = await call(serviceRoutes.collection.POST, {
      cookie: admin,
      body: { name: "Barba", durationMinutes: "30", price: "40.5", active: "0" },
    });
    expect(service.status).toBe(201);
    expect(service.body).toMatchObject({ durationMinutes: 30, price: "40.50", active: false });

    const customer = await call(customerRoutes.collection.POST, {
      cookie: admin,
      body: { name: "Ana", phone: "11988887777", email: "", birthDate: "1990-03-15" },
    });
    expect(customer.body).toMatchObject({ email: null, birthDate: "1990-03-15" });
  });

  test("update: absent optional fields are kept, null clears them", async () => {
    const created = await call(productRoutes.collection.POST, {
      cookie: admin,
      body: { name: "Cera", price: 25, stockQuantity: 10, description: "Fixação forte" },
    });
    const id = String(created.body.id);

    const kept = await call(productRoutes.item.PUT, { method: "PUT", cookie: admin, params: { id }, body: { name: "Cera", price: 26 } });
    expect(kept.body).toMatchObject({ price: "26.00", stockQuantity: 10, description: "Fixação forte" });

    const cleared = await call(productRoutes.item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id },
      body: { name: "Cera", price: 26, stockQuantity: null },
    });
    expect(cleared.body.stockQuantity).toBeNull();
  });

  test("deleting a customer still in use is a 409, not a 500", async () => {
    const customer = await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } });
    const pro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantA } });
    await unscopedDb.order.create({ data: { tenantId: tenantA, customerId: customer.id, professionalId: pro.id } });

    const res = await call(customerRoutes.item.DELETE, { method: "DELETE", cookie: admin, params: { id: String(customer.id) } });

    expect(res).toEqual({
      status: 409,
      body: { message: "Este registro não pode ser excluído porque está vinculado a outros registros." },
    });
  });
});
