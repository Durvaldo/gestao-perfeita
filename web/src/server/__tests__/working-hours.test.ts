// @vitest-environment node
// Port of backend/tests/Feature/Cadastro/HorarioTrabalhoApiTest.php, plus the
// cross-tenant access by id that the legacy app allowed (ADR-0005) and validation.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { workingHourRoutes } from "@/server/working-hours/working-hours";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const { byProfessional, item } = workingHourRoutes;
const payload = { weekday: 6, startTime: "09:00", endTime: "13:00" };

let admin: string;
let carlos: string;
let ids: { carlos: number; rafael: number; otherTenantPro: number; otherTenantHour: number };

describe("working hours API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    const find = (email: string) => unscopedDb.professional.findFirstOrThrow({ where: { user: { email } } });
    const otherTenantPro = await find("bruno@barbearia-zona-sul.com");
    const otherTenantHour = await unscopedDb.workingHour.findFirstOrThrow({ where: { professionalId: otherTenantPro.id } });
    ids = {
      carlos: (await find("carlos@barbearia-centro.com")).id,
      rafael: (await find("rafael@barbearia-centro.com")).id,
      otherTenantPro: otherTenantPro.id,
      otherTenantHour: otherTenantHour.id,
    };
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  afterAll(() => unscopedDb.$disconnect());

  test("admin manages any professional's schedule", async () => {
    const created = await call(byProfessional.POST, { cookie: admin, params: { id: String(ids.rafael) }, body: payload });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ professionalId: ids.rafael, weekday: 6, startTime: "09:00", endTime: "13:00" });
    const id = String(created.body.id);

    const updated = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id },
      body: { weekday: 0, startTime: "10:00", endTime: "14:30" },
    });
    expect(updated.body).toMatchObject({ weekday: 0, startTime: "10:00", endTime: "14:30" });

    expect((await call(item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(204);
    expect(await unscopedDb.workingHour.findUnique({ where: { id: Number(id) } })).toBeNull();
  });

  test("lists a professional's schedule ordered by weekday", async () => {
    const res = await call(byProfessional.GET, { cookie: carlos, params: { id: String(ids.carlos) } });

    expect(res.status).toBe(200);
    expect(res.body.map((h: { weekday: number }) => h.weekday)).toEqual([1, 2, 3, 4, 5]);
    expect(res.body[0]).toMatchObject({ startTime: "09:00", endTime: "18:00" });
  });

  test("a professional cannot read a colleague's schedule (SPEC-0001)", async () => {
    expect((await call(byProfessional.GET, { cookie: carlos, params: { id: String(ids.rafael) } })).status).toBe(403);
    const rafaelHour = await unscopedDb.workingHour.findFirstOrThrow({ where: { professionalId: ids.rafael } });
    expect((await call(item.GET, { cookie: carlos, params: { id: String(rafaelHour.id) } })).status).toBe(403);
    // The admin still reads everyone's schedule.
    expect((await call(byProfessional.GET, { cookie: admin, params: { id: String(ids.rafael) } })).status).toBe(200);
  });

  test("a professional manages only their own schedule", async () => {
    const own = await call(byProfessional.POST, { cookie: carlos, params: { id: String(ids.carlos) }, body: payload });
    expect(own.status).toBe(201);
    expect((await call(item.PUT, { method: "PUT", cookie: carlos, params: { id: String(own.body.id) }, body: payload })).status).toBe(200);

    expect((await call(byProfessional.POST, { cookie: carlos, params: { id: String(ids.rafael) }, body: payload })).status).toBe(403);
    const rafaelHour = await unscopedDb.workingHour.findFirstOrThrow({ where: { professionalId: ids.rafael } });
    const rafaelId = String(rafaelHour.id);
    expect((await call(item.PUT, { method: "PUT", cookie: carlos, params: { id: rafaelId }, body: payload })).status).toBe(403);
    expect((await call(item.DELETE, { method: "DELETE", cookie: carlos, params: { id: rafaelId } })).status).toBe(403);
  });

  test("schedules are isolated per tenant, including by id (legacy allowed this)", async () => {
    expect((await call(byProfessional.POST, { cookie: admin, params: { id: String(ids.otherTenantPro) }, body: payload })).status).toBe(404);
    expect((await call(byProfessional.GET, { cookie: admin, params: { id: String(ids.otherTenantPro) } })).status).toBe(404);

    const id = String(ids.otherTenantHour);
    expect((await call(item.GET, { cookie: admin, params: { id } })).status).toBe(404);
    expect((await call(item.PUT, { method: "PUT", cookie: admin, params: { id }, body: payload })).status).toBe(404);
    expect((await call(item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(404);

    const untouched = await unscopedDb.workingHour.findUniqueOrThrow({ where: { id: ids.otherTenantHour } });
    expect(untouched.weekday).toBe(1);
  });

  test("validation messages", async () => {
    const res = await call(byProfessional.POST, {
      cookie: admin,
      params: { id: String(ids.rafael) },
      body: { weekday: 7, startTime: "9h", endTime: "08:00" },
    });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({
      weekday: ["O campo dia da semana não deve ser maior que 6."],
      startTime: ["O campo hora de início deve ser um horário válido."],
    });

    const reversed = await call(byProfessional.POST, {
      cookie: admin,
      params: { id: String(ids.rafael) },
      body: { weekday: 1, startTime: "18:00", endTime: "09:00" },
    });
    expect(reversed.body.errors).toEqual({ endTime: ["O campo hora de término deve ser posterior à hora de início."] });
  });
});
