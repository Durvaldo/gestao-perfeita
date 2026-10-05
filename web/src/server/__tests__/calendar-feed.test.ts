// @vitest-environment node
// Calendar feed per professional (SPEC-0006 RF-2b, TASK-0042).
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { calendarFeedRoutes } from "@/server/calendar/calendar-feed";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

let admin: string;
let carlos: string;
let carlosPro: number;
let rafaelPro: number;

const manage = (id: number, method: "GET" | "POST" | "DELETE", cookie: string) =>
  call(calendarFeedRoutes.manage[method], { method, cookie, params: { id: String(id) } });

async function fetchFeed(path: string | null) {
  const token = path!.split("/").pop()!;
  const response = await calendarFeedRoutes.feed.GET(new Request(`http://localhost${path}`), { params: Promise.resolve({ token }) });
  return { status: response.status, type: response.headers.get("content-type"), body: await response.text() };
}

async function appointment(professionalId: number, startsAt: string, status: "pending" | "confirmed" | "cancelled", customerName: string) {
  const tenantId = (await unscopedDb.professional.findUniqueOrThrow({ where: { id: professionalId } })).tenantId;
  const customer = await unscopedDb.customer.create({ data: { tenantId, name: customerName, phone: "11999990000" } });
  const service = await unscopedDb.service.findFirstOrThrow({ where: { tenantId } });
  const createdBy = await unscopedDb.user.findFirstOrThrow({ where: { tenantId, role: "admin" } });
  const start = new Date(startsAt);
  return unscopedDb.appointment.create({
    data: {
      tenantId,
      customerId: customer.id,
      professionalId,
      startsAt: start,
      endsAt: new Date(start.getTime() + 30 * 60_000),
      status,
      createdByUserId: createdBy.id,
      services: { create: { serviceId: service.id, priceAtBooking: service.price } },
    },
  });
}

describe("calendar feed", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    carlosPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } })).id;
    rafaelPro = (await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } })).id;
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
  });
  beforeEach(async () => {
    await unscopedDb.appointment.deleteMany();
    await unscopedDb.professional.updateMany({ data: { calendarToken: null } });
  });
  afterAll(() => unscopedDb.$disconnect());

  test("the professional creates their own link; not a colleague's; the admin manages anyone's", async () => {
    expect((await manage(carlosPro, "GET", carlos)).body).toEqual({ path: null });
    const created = await manage(carlosPro, "POST", carlos);
    expect(created.body.path).toMatch(/^\/api\/calendar\/[\w-]{32}\.ics$/);
    // The link can be shown again.
    expect((await manage(carlosPro, "GET", carlos)).body).toEqual(created.body);

    expect((await manage(rafaelPro, "POST", carlos)).status).toBe(403);
    expect((await manage(rafaelPro, "POST", admin)).status).toBe(200);
  });

  test("the feed lists the professional's non-cancelled appointments, and only theirs", async () => {
    await appointment(carlosPro, "2030-01-10T13:00:00Z", "confirmed", "Cliente Confirmado");
    await appointment(carlosPro, "2030-01-11T13:00:00Z", "pending", "Cliente Pendente");
    await appointment(carlosPro, "2030-01-12T13:00:00Z", "cancelled", "Cliente Cancelado");
    await appointment(rafaelPro, "2030-01-10T15:00:00Z", "confirmed", "Cliente do Rafael");
    await appointment(carlosPro, "2020-01-10T13:00:00Z", "confirmed", "Cliente Antigo"); // older than 30 days

    const { path } = (await manage(carlosPro, "POST", carlos)).body;
    const feed = await fetchFeed(path);

    expect(feed.status).toBe(200);
    expect(feed.type).toBe("text/calendar; charset=utf-8");
    expect(feed.body).toContain("X-WR-CALNAME:Barbearia Centro · Carlos");
    expect(feed.body).toContain("SUMMARY:Cliente Confirmado · ");
    expect(feed.body).toContain("DTSTART:20300110T130000Z");
    expect(feed.body).toContain("STATUS:TENTATIVE");
    for (const absent of ["Cliente Cancelado", "Cliente do Rafael", "Cliente Antigo"]) expect(feed.body).not.toContain(absent);
  });

  test("a new link revokes the old one; turning it off revokes it; unknown tokens are 404", async () => {
    const first = (await manage(carlosPro, "POST", carlos)).body.path;
    const second = (await manage(carlosPro, "POST", carlos)).body.path;
    expect(second).not.toBe(first);
    expect((await fetchFeed(first)).status).toBe(404);
    expect((await fetchFeed(second)).status).toBe(200);

    expect((await manage(carlosPro, "DELETE", carlos)).body).toEqual({ path: null });
    expect((await fetchFeed(second)).status).toBe(404);
    expect((await fetchFeed("/api/calendar/curto.ics")).status).toBe(404);
  });
});
