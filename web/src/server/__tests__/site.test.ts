// @vitest-environment node
// Public barbershop site (SPEC-0007, TASK-0037): content, privacy and when there is no site.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { loadPublicSite, openingHours } from "@/server/site/site";
import { seed } from "../../../prisma/seed-data";
import { truncateAll } from "../../../tests/db";

const at = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00Z`);

describe("public site", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
  });
  beforeEach(async () => {
    await unscopedDb.tenantSetting.deleteMany();
    await unscopedDb.tenant.updateMany({ data: { status: "active" } });
  });
  afterAll(() => unscopedDb.$disconnect());

  test("is built from the barbershop's own data, with the booking WhatsApp from its phone", async () => {
    const site = await loadPublicSite("barbearia-centro");

    expect(site).toMatchObject({ name: "Barbearia Centro", slug: "barbearia-centro", whatsapp: "11900000001", about: null, gallery: [] });
    expect(site!.services.length).toBeGreaterThan(0);
    expect(site!.services[0]).toEqual({ id: expect.any(Number), name: expect.any(String), description: null, durationMinutes: expect.any(Number), price: expect.stringMatching(/^\d+\.\d{2}$/) });
    expect(site!.team.map((m) => m.name)).toEqual(["Carlos Souza", "Rafael Lima"]);
    // Seeded professionals work Mon–Fri 09:00–18:00.
    expect(site!.hours).toEqual([1, 2, 3, 4, 5].map((weekday) => ({ weekday, open: "09:00", close: "18:00" })));
  });

  test("exposes only public fields and nothing from other barbershops", async () => {
    const json = JSON.stringify(await loadPublicSite("barbearia-centro"));

    for (const privateField of ["commission", "Commission", "email", "notes", "tenantId", "userId", "@", "Zona Sul"]) {
      expect(json).not.toContain(privateField);
    }
  });

  test("uses the admin's texts, and hides inactive services and professionals", async () => {
    const tenant = await unscopedDb.tenant.findUniqueOrThrow({ where: { slug: "barbearia-centro" } });
    await unscopedDb.tenantSetting.create({
      data: { tenantId: tenant.id, key: "site", value: { about: "Desde 1990.", whatsapp: "11977776666", instagram: "https://instagram.com/x" } },
    });
    const service = await unscopedDb.service.create({ data: { tenantId: tenant.id, name: "Inativo", durationMinutes: 10, price: "1.00", active: false } });

    const site = await loadPublicSite("barbearia-centro");
    expect(site).toMatchObject({ about: "Desde 1990.", whatsapp: "11977776666", instagram: "https://instagram.com/x" });
    expect(site!.services.map((s) => s.id)).not.toContain(service.id);
    await unscopedDb.service.delete({ where: { id: service.id } });
  });

  test("there is no site for an unknown slug, a suspended barbershop or a site turned off", async () => {
    expect(await loadPublicSite("nao-existe")).toBeNull();

    const tenant = await unscopedDb.tenant.findUniqueOrThrow({ where: { slug: "barbearia-centro" } });
    await unscopedDb.tenant.update({ where: { id: tenant.id }, data: { status: "suspended" } });
    expect(await loadPublicSite("barbearia-centro")).toBeNull();

    await unscopedDb.tenant.update({ where: { id: tenant.id }, data: { status: "active" } });
    await unscopedDb.tenantSetting.create({ data: { tenantId: tenant.id, key: "site", value: { enabled: false } } });
    expect(await loadPublicSite("barbearia-centro")).toBeNull();
  });
});

describe("openingHours", () => {
  test("spans from the earliest start to the latest end per weekday, across lunch breaks and professionals", () => {
    expect(
      openingHours([
        { weekday: 2, startTime: at("09:00"), endTime: at("12:00") },
        { weekday: 2, startTime: at("13:00"), endTime: at("18:00") },
        { weekday: 2, startTime: at("10:00"), endTime: at("20:00") },
        { weekday: 6, startTime: at("08:00"), endTime: at("12:00") },
      ]),
    ).toEqual([
      { weekday: 2, open: "09:00", close: "20:00" },
      { weekday: 6, open: "08:00", close: "12:00" },
    ]);
  });
});
