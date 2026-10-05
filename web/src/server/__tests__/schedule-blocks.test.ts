// @vitest-environment node
// Schedule exceptions (SPEC-0004, TASK-0030): CRUD, permissions per role,
// tenant isolation, and the agenda refusing bookings inside an exception.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { appointmentRoutes } from "@/server/appointments/appointments";
import { scheduleBlockRoutes } from "@/server/schedule-blocks/schedule-blocks";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const { collection, item } = scheduleBlockRoutes;
// 2030-01-10 is a Thursday; seeded professionals work Mon–Fri 09:00–18:00 (São Paulo, UTC-3).
const DAY = "2030-01-10";

let admin: string;
let carlos: string;
let tenantA: number;
let tenantB: number;
let carlosPro: number;
let rafaelPro: number;
let customer: number;
let service: number;

const wholeDay = (body: Record<string, unknown> = {}) => ({ allDay: true, startDate: DAY, endDate: DAY, reason: "Feriado", ...body });
const period = (from: string, to: string, body: Record<string, unknown> = {}) => ({
  allDay: false,
  startsAt: `${DAY}T${from}`,
  endsAt: `${DAY}T${to}`,
  ...body,
});
const createBlock = (body: Record<string, unknown>, cookie = admin) => call(collection.POST, { cookie, body });
const book = (professionalId: number, time: string, cookie = admin) =>
  call(appointmentRoutes.collection.POST, {
    cookie,
    body: { customerId: customer, professionalId, startsAt: `${DAY}T${time}`, serviceIds: [service] },
  });

describe("schedule exceptions API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    carlosPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    rafaelPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } })).id;
    customer = (await unscopedDb.customer.findFirstOrThrow({ where: { tenantId: tenantA } })).id;
    service = (await unscopedDb.service.findFirstOrThrow({ where: { tenantId: tenantA, durationMinutes: 30 } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
    await unscopedDb.scheduleBlock.deleteMany();
  });
  afterAll(() => unscopedDb.$disconnect());

  test("admin closes the whole barbershop for a whole day, in the barbershop's time zone", async () => {
    const res = await createBlock(wholeDay());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      professionalId: null,
      allDay: true,
      reason: "Feriado",
      startsAt: "2030-01-10T03:00:00.000Z",
      endsAt: "2030-01-11T03:00:00.000Z",
      affectedAppointments: [],
    });
  });

  test("a professional manages only their own exceptions, without approval", async () => {
    const own = await createBlock(period("14:00", "16:00", { professionalId: carlosPro, reason: "Compromisso" }), carlos);
    expect(own.status).toBe(201);
    expect(own.body).toMatchObject({ professionalId: carlosPro, allDay: false });

    expect((await createBlock(period("14:00", "16:00", { professionalId: rafaelPro }), carlos)).status).toBe(403);
    // Only the admin closes the whole barbershop, and a professional can't turn theirs into that.
    expect((await createBlock(wholeDay(), carlos)).status).toBe(403);
    const id = String(own.body.id);
    expect((await call(item.PUT, { method: "PUT", cookie: carlos, params: { id }, body: wholeDay() })).status).toBe(403);

    const edited = await call(item.PUT, {
      method: "PUT",
      cookie: carlos,
      params: { id },
      body: period("15:00", "17:00", { professionalId: carlosPro, reason: "Médico" }),
    });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ reason: "Médico", startsAt: "2030-01-10T18:00:00.000Z" });

    expect((await call(item.DELETE, { method: "DELETE", cookie: carlos, params: { id } })).status).toBe(204);
  });

  test("a professional can't see, change or delete a colleague's exception", async () => {
    const rafael = await createBlock(period("10:00", "11:00", { professionalId: rafaelPro }));
    const id = String(rafael.body.id);

    expect((await call(item.GET, { cookie: carlos, params: { id } })).status).toBe(403);
    expect((await call(item.DELETE, { method: "DELETE", cookie: carlos, params: { id } })).status).toBe(403);
    expect(await unscopedDb.scheduleBlock.count()).toBe(1);
  });

  test("listing: a professional sees their own and the barbershop's; filters by period and professional", async () => {
    const shop = await createBlock(wholeDay({ startDate: "2030-01-20", endDate: "2030-01-20" }));
    const own = await createBlock(period("14:00", "16:00", { professionalId: carlosPro }));
    const colleague = await createBlock(period("10:00", "11:00", { professionalId: rafaelPro }));

    const ids = (res: { body: { id: number }[] }) => res.body.map((b) => b.id);
    expect(ids(await call(collection.GET, { cookie: carlos }))).toEqual([own.body.id, shop.body.id]);
    expect(ids(await call(collection.GET, { cookie: admin }))).toEqual([colleague.body.id, own.body.id, shop.body.id]);

    const ofRafael = await call(collection.GET, { cookie: admin, path: `/api/schedule-blocks?professionalId=${rafaelPro}` });
    expect(ids(ofRafael)).toEqual([colleague.body.id, shop.body.id]);
    const inPeriod = await call(collection.GET, { cookie: admin, path: `/api/schedule-blocks?from=${DAY}&to=2030-01-11` });
    expect(ids(inPeriod)).toEqual([colleague.body.id, own.body.id]);
  });

  test("validation: ranges and required fields", async () => {
    const backwards = await createBlock(wholeDay({ startDate: "2030-01-12", endDate: "2030-01-10" }));
    expect(backwards.body.errors).toEqual({ endDate: ["A data final deve ser igual ou posterior à data inicial."] });

    const inverted = await createBlock(period("16:00", "14:00", { professionalId: carlosPro }));
    expect(inverted.body.errors).toEqual({ endsAt: ["O fim deve ser depois do início."] });

    const twoDays = await createBlock({ allDay: false, professionalId: carlosPro, startsAt: `${DAY}T20:00`, endsAt: "2030-01-11T10:00" });
    expect(twoDays.body.errors.endsAt[0]).toMatch(/mesmo dia/);

    const missing = await createBlock({ allDay: true });
    expect(missing.status).toBe(422);
    expect(missing.body.errors).toMatchObject({ startDate: ["O campo data inicial é obrigatório."], endDate: ["O campo data final é obrigatório."] });
  });

  test("exceptions are isolated per tenant", async () => {
    const otherPro = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const other = await unscopedDb.scheduleBlock.create({
      data: { tenantId: tenantB, professionalId: null, startsAt: new Date("2030-01-10T03:00Z"), endsAt: new Date("2030-01-11T03:00Z") },
    });

    expect((await call(item.GET, { cookie: admin, params: { id: String(other.id) } })).status).toBe(404);
    expect((await call(collection.GET, { cookie: admin })).body).toEqual([]);
    expect((await createBlock(period("10:00", "11:00", { professionalId: otherPro.id }))).status).toBe(422);
  });

  test("the response lists the appointments that now need action", async () => {
    const inside = await book(carlosPro, "14:30");
    await book(carlosPro, "17:00"); // outside the exception
    await book(rafaelPro, "14:30"); // another professional

    const res = await createBlock(period("14:00", "16:00", { professionalId: carlosPro, reason: "Atestado" }));

    expect(res.body.affectedAppointments.map((a: { id: number }) => a.id)).toEqual([inside.body.id]);
    // A whole-barbershop exception affects everyone's appointments.
    const shop = await createBlock(wholeDay());
    expect(shop.body.affectedAppointments).toHaveLength(3);
  });
});

describe("the agenda respects schedule exceptions (SPEC-0004 RF-2)", () => {
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
    await unscopedDb.scheduleBlock.deleteMany();
  });

  test("booking inside the professional's exception is refused, with the reason", async () => {
    await createBlock(period("14:00", "16:00", { professionalId: carlosPro, reason: "Atestado" }));

    const res = await book(carlosPro, "15:30");
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({ startsAt: ["Agenda fechada neste período: Atestado."] });
    // Partly inside also counts (13:45 + 30 min runs into 14:00).
    expect((await book(carlosPro, "13:45")).status).toBe(422);
    // A colleague is not affected; right after the end is open.
    expect((await book(rafaelPro, "15:30")).status).toBe(201);
    expect((await book(carlosPro, "16:00")).status).toBe(201);
  });

  test("a whole-barbershop exception closes everyone's schedule, even for the admin", async () => {
    await createBlock(wholeDay({ reason: null }));

    for (const pro of [carlosPro, rafaelPro]) {
      const res = await book(pro, "10:00");
      expect(res.status).toBe(422);
      expect(res.body.errors).toEqual({ startsAt: ["Agenda fechada neste período."] });
    }
  });

  test("moving an appointment into an exception is refused, but its status can still change", async () => {
    const appointment = await book(carlosPro, "10:00");
    await createBlock(period("14:00", "16:00", { professionalId: carlosPro }));
    const body = { customerId: customer, professionalId: carlosPro, serviceIds: [service] };
    const id = String(appointment.body.id);

    const moved = await call(appointmentRoutes.item.PUT, { method: "PUT", cookie: admin, params: { id }, body: { ...body, startsAt: `${DAY}T14:30` } });
    expect(moved.status).toBe(422);

    // An appointment caught by a new exception can still be cancelled (status-only update).
    await createBlock(period("09:00", "12:00", { professionalId: carlosPro }));
    const cancelled = await call(appointmentRoutes.item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id },
      body: { ...body, startsAt: appointment.body.startsAt, status: "cancelled" },
    });
    expect(cancelled.status).toBe(200);
  });
});

describe("resolving the appointments affected by an exception (SPEC-0004 RF-3, TASK-0032)", () => {
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
    await unscopedDb.scheduleBlock.deleteMany();
  });

  const put = (appointment: { id: number; startsAt: string }, changes: Record<string, unknown>, cookie = admin) =>
    call(appointmentRoutes.item.PUT, {
      method: "PUT",
      cookie,
      params: { id: String(appointment.id) },
      body: { customerId: customer, professionalId: carlosPro, startsAt: appointment.startsAt, serviceIds: [service], ...changes },
    });

  test("a professional only sees their own appointments in a whole-barbershop exception", async () => {
    await book(carlosPro, "10:00");
    await book(rafaelPro, "11:00");
    const shop = await createBlock(wholeDay());

    const asCarlos = await call(item.GET, { cookie: carlos, params: { id: String(shop.body.id) } });
    expect(asCarlos.body.affectedAppointments.map((a: { professionalId: number }) => a.professionalId)).toEqual([carlosPro]);
    expect((await call(collection.GET, { cookie: carlos })).body[0].affectedCount).toBe(1);
    expect((await call(collection.GET, { cookie: admin })).body[0].affectedCount).toBe(2);
  });

  test("reschedule, transfer and cancel take the appointments out of the exception", async () => {
    const [a, b, c] = [await book(carlosPro, "14:00"), await book(carlosPro, "14:30"), await book(carlosPro, "15:00")];
    const block = await createBlock(period("14:00", "16:00", { professionalId: carlosPro, reason: "Atestado" }));
    expect(block.body.affectedAppointments).toHaveLength(3);
    expect(block.body.affectedAppointments[0].services).toEqual([expect.objectContaining({ id: service })]);

    // Reschedule: same professional, another time (outside the exception).
    expect((await put(a.body, { startsAt: `${DAY}T17:00` })).status).toBe(200);
    // Transfer: same time, another professional who is free; a busy one is refused.
    await book(rafaelPro, "15:00");
    expect((await put(c.body, { professionalId: rafaelPro })).status).toBe(422);
    const transferred = await put(b.body, { professionalId: rafaelPro });
    expect(transferred.status).toBe(200);
    expect(transferred.body.services[0].priceAtBooking).toBe(b.body.services[0].priceAtBooking);
    // Cancel.
    expect((await put(c.body, { status: "cancelled" })).status).toBe(200);

    const after = await call(item.GET, { cookie: admin, params: { id: String(block.body.id) } });
    expect(after.body.affectedAppointments).toEqual([]);
  });
});
