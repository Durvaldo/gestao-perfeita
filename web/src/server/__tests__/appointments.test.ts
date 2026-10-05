// @vitest-environment node
// Port of backend/tests/Feature/Negocio/AgendamentoApiTest.php, plus working-hour
// borders, time zone (ADR-0009), frozen prices, inactive professionals and
// concurrent double-booking.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { appointmentRoutes } from "@/server/appointments/appointments";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const { collection, item } = appointmentRoutes;
// 2030-01-10 is a Thursday (weekday 4). Tenants use America/Sao_Paulo (UTC-3).
const THURSDAY = "2030-01-10";

let admin: string;
let carlos: string;
let tenantA: number;
let tenantB: number;
let customer: number;
let carlosPro: number;
let rafaelPro: number;
let counter = 0;

const at = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00Z`);

/** A professional in tenant A with the given periods for THURSDAY. */
async function professionalWith(periods: [string, string][], active = true) {
  counter += 1;
  const user = await unscopedDb.user.create({
    data: { name: `Pro ${counter}`, email: `pro${counter}@teste.com`, role: "professional", tenantId: tenantA },
  });
  const professional = await unscopedDb.professional.create({ data: { tenantId: tenantA, userId: user.id, active } });
  for (const [start, end] of periods) {
    await unscopedDb.workingHour.create({
      data: { professionalId: professional.id, weekday: 4, startTime: at(start), endTime: at(end) },
    });
  }
  return professional.id;
}

async function serviceWith(durationMinutes: number, price = "50.00", tenantId = tenantA) {
  counter += 1;
  const service = await unscopedDb.service.create({ data: { tenantId, name: `Serviço ${counter}`, durationMinutes, price } });
  return service.id;
}

const book = (professionalId: number, startsAt: string, serviceIds: number[], cookie = admin) =>
  call(collection.POST, { cookie, body: { customerId: customer, professionalId, startsAt, serviceIds } });

describe("appointments API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    customer = (await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } })).id;
    carlosPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    rafaelPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
  });
  afterAll(() => unscopedDb.$disconnect());

  test("admin creates an appointment; end time comes from the services and prices are frozen", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(45, "60.00");

    const res = await book(pro, `${THURSDAY} 10:00:00`, [service]);

    expect(res.status).toBe(201);
    // 10:00 in São Paulo = 13:00 UTC; + 45 min.
    expect(res.body).toMatchObject({ startsAt: "2030-01-10T13:00:00.000Z", endsAt: "2030-01-10T13:45:00.000Z", status: "pending" });
    expect(res.body.services).toEqual([expect.objectContaining({ id: service, durationMinutes: 45, priceAtBooking: "60.00" })]);
    expect(res.body.professional.user.name).toMatch(/^Pro /);
  });

  test("overlapping appointment for the same professional is rejected", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(60);
    expect((await book(pro, `${THURSDAY}T10:00`, [service])).status).toBe(201);

    const res = await book(pro, `${THURSDAY}T10:30`, [service]);

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({ professionalId: ["Este barbeiro já tem um agendamento nesse horário."] });
    expect(await unscopedDb.appointment.count()).toBe(1);
  });

  test("back-to-back appointments and cancelled ones do not conflict", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);
    const first = await book(pro, `${THURSDAY}T10:00`, [service]);
    expect((await book(pro, `${THURSDAY}T10:30`, [service])).status).toBe(201);

    await unscopedDb.appointment.update({ where: { id: first.body.id }, data: { status: "cancelled" } });
    expect((await book(pro, `${THURSDAY}T10:00`, [service])).status).toBe(201);
  });

  test("ending after the working hours is rejected", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const res = await book(pro, `${THURSDAY}T17:30`, [await serviceWith(40)]); // 17:30 + 40 = 18:10

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({ startsAt: ["O horário está fora do expediente do barbeiro."] });
  });

  test("starting exactly at opening and ending exactly at closing is accepted", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);

    expect((await book(pro, `${THURSDAY}T09:00`, [service])).status).toBe(201);
    expect((await book(pro, `${THURSDAY}T17:30`, [service])).status).toBe(201);
    expect((await book(pro, `${THURSDAY}T08:59`, [service])).status).toBe(422);
  });

  test("a day without working hours is rejected", async () => {
    const pro = await professionalWith([]);
    expect((await book(pro, `${THURSDAY}T10:00`, [await serviceWith(30)])).body.errors).toHaveProperty("startsAt");
  });

  test("spanning the lunch gap is rejected", async () => {
    const pro = await professionalWith([
      ["09:00", "12:00"],
      ["13:00", "18:00"],
    ]);
    const service = await serviceWith(30);

    expect((await book(pro, `${THURSDAY}T11:50`, [service])).status).toBe(422); // 11:50–12:20
    expect((await book(pro, `${THURSDAY}T13:00`, [service])).status).toBe(201);
  });

  test("weekday and hours use the barbershop's time zone, not UTC", async () => {
    // 22:00 Thursday in São Paulo is 01:00 Friday in UTC: still Thursday's hours.
    const pro = await professionalWith([["18:00", "23:00"]]);
    const res = await book(pro, `${THURSDAY}T22:00`, [await serviceWith(30)]);

    expect(res.status).toBe(201);
    expect(res.body.startsAt).toBe("2030-01-11T01:00:00.000Z");
  });

  test("a status-only update works even outside the current working hours", async () => {
    const pro = await professionalWith([]); // no hours at all
    const service = await serviceWith(30, "40.00");
    const legacy = await unscopedDb.appointment.create({
      data: {
        tenantId: tenantA,
        customerId: customer,
        professionalId: pro,
        startsAt: new Date("2030-01-10T13:00:00Z"),
        endsAt: new Date("2030-01-10T13:30:00Z"),
        createdByUserId: (await unscopedDb.user.findFirstOrThrow({ where: { tenantId: tenantA, role: "admin" } })).id,
        services: { create: { serviceId: service, priceAtBooking: "40.00" } },
      },
    });

    const res = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id: String(legacy.id) },
      body: { customerId: customer, professionalId: pro, startsAt: `${THURSDAY}T10:00`, serviceIds: [service], status: "completed" },
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  test("update keeps the frozen price of kept services; new services take the current price", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const cut = await serviceWith(30, "40.00");
    const beard = await serviceWith(30, "30.00");
    const created = await book(pro, `${THURSDAY}T10:00`, [cut]);
    await unscopedDb.service.update({ where: { id: cut }, data: { price: "99.00" } });

    const res = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id: String(created.body.id) },
      body: { customerId: customer, professionalId: pro, startsAt: `${THURSDAY}T10:00`, serviceIds: [cut, beard], status: "confirmed" },
    });

    expect(res.status).toBe(200);
    expect(res.body.endsAt).toBe("2030-01-10T14:00:00.000Z"); // 30 + 30 min
    const prices = Object.fromEntries(res.body.services.map((s: { id: number; priceAtBooking: string }) => [s.id, s.priceAtBooking]));
    expect(prices).toEqual({ [cut]: "40.00", [beard]: "30.00" });
  });

  test("new bookings with an inactive professional are refused; existing ones can still change status", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);
    const created = await book(pro, `${THURSDAY}T10:00`, [service]);
    await unscopedDb.professional.update({ where: { id: pro }, data: { active: false } });

    const refused = await book(pro, `${THURSDAY}T11:00`, [service]);
    expect(refused.body.errors).toEqual({ professionalId: ["Este barbeiro está inativo."] });

    const statusOnly = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id: String(created.body.id) },
      body: { customerId: customer, professionalId: pro, startsAt: `${THURSDAY}T10:00`, serviceIds: [service], status: "cancelled" },
    });
    expect(statusOnly.body.status).toBe("cancelled");
  });

  test("references from another tenant are rejected", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const otherTenantService = await serviceWith(30, "10.00", tenantB);

    const res = await book(pro, `${THURSDAY}T10:00`, [otherTenantService]);

    expect(res.body.errors).toEqual({ serviceIds: ["O valor selecionado para serviços é inválido."] });
  });

  test("validation messages", async () => {
    const res = await call(collection.POST, { cookie: admin, body: { startsAt: "amanhã", serviceIds: [] } });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({
      customerId: ["O campo cliente é obrigatório."],
      professionalId: ["O campo barbeiro é obrigatório."],
      startsAt: ["O campo data e hora de início deve ser uma data válida."],
      serviceIds: ["O campo serviços deve ter ao menos 1 itens."],
    });
  });

  test("a professional only sees and manages their own appointments", async () => {
    const service = await serviceWith(30);
    const own = await book(carlosPro, `${THURSDAY}T10:00`, [service]);
    const other = await book(rafaelPro, `${THURSDAY}T10:00`, [service]);

    const list = await call(collection.GET, { cookie: carlos });
    expect(list.body.data.map((a: { id: number }) => a.id)).toEqual([own.body.id]);
    expect((await call(item.GET, { cookie: carlos, params: { id: String(other.body.id) } })).status).toBe(403);
    expect((await call(item.GET, { cookie: carlos, params: { id: String(own.body.id) } })).status).toBe(200);
    // Only admins delete.
    expect((await call(item.DELETE, { method: "DELETE", cookie: carlos, params: { id: String(own.body.id) } })).status).toBe(403);
    expect((await call(item.DELETE, { method: "DELETE", cookie: admin, params: { id: String(own.body.id) } })).status).toBe(204);
  });

  test("a professional books and moves appointments only on their own schedule (SPEC-0001)", async () => {
    const service = await serviceWith(30);

    // Booking for a colleague is refused; nothing is created.
    expect((await book(rafaelPro, `${THURSDAY}T15:00`, [service], carlos)).status).toBe(403);
    expect(await unscopedDb.appointment.count({ where: { professionalId: rafaelPro } })).toBe(0);

    // Their own booking works, but it can't be moved to a colleague.
    const own = await book(carlosPro, `${THURSDAY}T15:00`, [service], carlos);
    expect(own.status).toBe(201);
    const moved = await call(item.PUT, {
      method: "PUT",
      cookie: carlos,
      params: { id: String(own.body.id) },
      body: { customerId: customer, professionalId: rafaelPro, startsAt: `${THURSDAY}T15:00`, serviceIds: [service] },
    });
    expect(moved.status).toBe(403);

    // The admin still books for anyone.
    expect((await book(rafaelPro, `${THURSDAY}T16:00`, [service])).status).toBe(201);
  });

  test("with a period, returns the flat list of overlapping appointments", async () => {
    const pro = await professionalWith([]);
    const createdBy = (await unscopedDb.user.findFirstOrThrow({ where: { tenantId: tenantA, role: "admin" } })).id;
    const make = (startsAt: string, endsAt: string) =>
      unscopedDb.appointment.create({
        data: { tenantId: tenantA, customerId: customer, professionalId: pro, startsAt: new Date(startsAt), endsAt: new Date(endsAt), createdByUserId: createdBy },
      });
    // Local São Paulo times converted to UTC (+3h).
    const inside = await make("2030-01-15T13:00:00Z", "2030-01-15T13:30:00Z");
    const runningInto = await make("2030-01-14T02:30:00Z", "2030-01-14T03:30:00Z"); // 13th 23:30 → 14th 00:30 local
    await make("2030-01-21T13:00:00Z", "2030-01-21T13:30:00Z");

    const res = await call(collection.GET, { cookie: admin, path: "/api/appointments?from=2030-01-14T00:00&to=2030-01-21T00:00" });
    const viaPath = await call(collection.GET, {
      cookie: admin,
      path: `/api/appointments?from=2030-01-14T00:00&to=2030-01-21T00:00&professionalId=${pro}`,
    });

    expect(Array.isArray(res.body)).toBe(true); // no pagination with a period
    expect(res.body.map((a: { id: number }) => a.id).sort()).toEqual([inside.id, runningInto.id].sort());
    expect(viaPath.body.map((a: { id: number }) => a.id).sort()).toEqual([inside.id, runningInto.id].sort());
  });

  test("filters by professional; a professional filtering by a colleague gets an empty list", async () => {
    const service = await serviceWith(30);
    const ofCarlos = await book(carlosPro, `${THURSDAY}T11:00`, [service]);
    await book(rafaelPro, `${THURSDAY}T11:00`, [service]);

    const byAdmin = await call(collection.GET, { cookie: admin, path: `/api/appointments?professionalId=${carlosPro}` });
    expect(byAdmin.body.data.map((a: { id: number }) => a.id)).toEqual([ofCarlos.body.id]);

    const byCarlos = await call(collection.GET, { cookie: carlos, path: `/api/appointments?professionalId=${rafaelPro}` });
    expect(byCarlos.body.data).toEqual([]);
  });

  test("appointments are isolated per tenant", async () => {
    const otherPro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherCustomer = await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantB } });
    const otherAdmin = await unscopedDb.user.findFirstOrThrow({ where: { tenantId: tenantB, role: "admin" } });
    const appointmentB = await unscopedDb.appointment.create({
      data: {
        tenantId: tenantB,
        customerId: otherCustomer.id,
        professionalId: otherPro.id,
        startsAt: new Date("2030-01-10T13:00:00Z"),
        endsAt: new Date("2030-01-10T13:30:00Z"),
        createdByUserId: otherAdmin.id,
      },
    });

    expect((await call(item.GET, { cookie: admin, params: { id: String(appointmentB.id) } })).status).toBe(404);
    expect((await call(collection.GET, { cookie: admin })).body.total).toBe(0);
  });

  test("concurrent bookings for the same slot: exactly one wins", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);

    const results = await Promise.all(Array.from({ length: 5 }, () => book(pro, `${THURSDAY}T16:00`, [service])));

    expect(results.map((r) => r.status).sort()).toEqual([201, 422, 422, 422, 422]);
    expect(await unscopedDb.appointment.count({ where: { professionalId: pro } })).toBe(1);
  });
});

// SPEC-0003: no retroactive bookings. 2020-01-09 was a Thursday, like THURSDAY.
const PAST_THURSDAY = "2020-01-09";

describe("no retroactive bookings (SPEC-0003)", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    tenantA = (await unscopedDb.tenant.findFirstOrThrow({ orderBy: { id: "asc" } })).id;
    customer = (await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
  });
  afterAll(() => unscopedDb.$disconnect());

  const pastAppointment = async (professionalId: number, serviceId: number) => {
    const adminUser = await unscopedDb.user.findUniqueOrThrow({ where: { email: "admin@barbearia-centro.com" } });
    // 10:00 in São Paulo = 13:00 UTC, 30 minutes.
    return unscopedDb.appointment.create({
      data: {
        tenantId: tenantA,
        customerId: customer,
        professionalId,
        startsAt: new Date(`${PAST_THURSDAY}T13:00:00Z`),
        endsAt: new Date(`${PAST_THURSDAY}T13:30:00Z`),
        createdByUserId: adminUser.id,
        services: { create: { serviceId, priceAtBooking: "50.00" } },
      },
    });
  };

  test("booking in the past is refused, for the admin and for the professional", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);

    const res = await book(pro, `${PAST_THURSDAY} 10:00:00`, [service]);
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({ startsAt: ["Não é possível agendar em um horário que já passou."] });

    const carlosId = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    expect((await book(carlosId, `${PAST_THURSDAY} 10:00:00`, [service], carlos)).status).toBe(422);
    expect(await unscopedDb.appointment.count()).toBe(0);
  });

  test("moving an appointment to the past is refused", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);
    const created = await book(pro, `${THURSDAY} 10:00:00`, [service]);

    const res = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id: String(created.body.id) },
      body: { customerId: customer, professionalId: pro, startsAt: `${PAST_THURSDAY} 10:00:00`, serviceIds: [service] },
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.startsAt).toEqual(["Não é possível agendar em um horário que já passou."]);
  });

  test("a past appointment can still be completed or cancelled", async () => {
    const pro = await professionalWith([["09:00", "18:00"]]);
    const service = await serviceWith(30);
    const past = await pastAppointment(pro, service);
    const body = { customerId: customer, professionalId: pro, startsAt: `${PAST_THURSDAY} 10:00:00`, serviceIds: [service] };

    const completed = await call(item.PUT, { method: "PUT", cookie: admin, params: { id: String(past.id) }, body: { ...body, status: "completed" } });
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe("completed");
  });
});
