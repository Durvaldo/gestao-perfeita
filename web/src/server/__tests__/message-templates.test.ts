// @vitest-environment node
// WhatsApp message templates per barbershop (SPEC-0008 RF-2, TASK-0039).
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { unscopedDb } from "@/lib/db";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";
import { messageTemplateRoutes } from "@/server/settings/message-templates";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

let admin: string;
let carlos: string;
let otherAdmin: string;

describe("message templates API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    admin = await loginCookie("admin@barbearia-centro.com");
    carlos = await loginCookie("carlos@barbearia-centro.com");
    otherAdmin = await loginCookie("admin@barbearia-zona-sul.com");
  });
  beforeEach(() => unscopedDb.tenantSetting.deleteMany());
  afterAll(() => unscopedDb.$disconnect());

  test("without edits, every template is the default; professionals can read them", async () => {
    const res = await call(messageTemplateRoutes.GET, { cookie: carlos });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_TEMPLATES);
  });

  test("the admin edits a template; only the changed ones are stored", async () => {
    const res = await call(messageTemplateRoutes.PUT, {
      method: "PUT",
      cookie: admin,
      body: { appointmentReminder: "Oi {cliente}, até {data}!" },
    });
    expect(res.status).toBe(200);
    expect(res.body.appointmentReminder).toBe("Oi {cliente}, até {data}!");
    expect(res.body.customerChat).toBe(DEFAULT_TEMPLATES.customerChat);

    const stored = await unscopedDb.tenantSetting.findFirstOrThrow({ where: { key: "whatsapp.templates" } });
    expect(stored.value).toEqual({ appointmentReminder: "Oi {cliente}, até {data}!" });
    expect((await call(messageTemplateRoutes.GET, { cookie: carlos })).body.appointmentReminder).toBe("Oi {cliente}, até {data}!");
  });

  test("templates are per barbershop and only admins edit them", async () => {
    await call(messageTemplateRoutes.PUT, { method: "PUT", cookie: admin, body: { customerChat: "Fala, {cliente}!" } });

    expect((await call(messageTemplateRoutes.GET, { cookie: otherAdmin })).body.customerChat).toBe(DEFAULT_TEMPLATES.customerChat);
    expect((await call(messageTemplateRoutes.PUT, { method: "PUT", cookie: carlos, body: { customerChat: "x" } })).status).toBe(403);
  });

  test("an empty template is refused", async () => {
    const res = await call(messageTemplateRoutes.PUT, { method: "PUT", cookie: admin, body: { customerChat: "" } });
    expect(res.status).toBe(422);
    expect(res.body.errors.customerChat).toBeDefined();
  });
});
