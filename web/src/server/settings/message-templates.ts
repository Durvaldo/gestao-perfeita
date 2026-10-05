import { z } from "zod";
import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenancy/context";
import { DEFAULT_TEMPLATES, type MessageTemplates, TEMPLATE_KEYS, TEMPLATE_LABELS } from "@/lib/whatsapp";
import { apiRoute } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";

// WhatsApp message templates per barbershop (SPEC-0008 RF-2), stored in
// tenant_settings under one key (ADR-0013). Only the edited ones are stored; the
// rest come from DEFAULT_TEMPLATES, so new templates show up with their default.

const SETTING_KEY = "whatsapp.templates";

const templatesSchema = z.object(
  Object.fromEntries(TEMPLATE_KEYS.map((key) => [key, z.string().min(1).max(1000).optional()])) as Record<
    (typeof TEMPLATE_KEYS)[number],
    z.ZodOptional<z.ZodString>
  >,
);

const labels: Record<string, string> = Object.fromEntries(TEMPLATE_KEYS.map((key) => [key, TEMPLATE_LABELS[key].toLowerCase()]));

/** The barbershop's templates, with defaults for the ones never edited. Run inside the tenant's context. */
export async function loadMessageTemplates(): Promise<MessageTemplates> {
  const setting = await db.tenantSetting.findFirst({ where: { key: SETTING_KEY } });
  const stored = (setting?.value ?? {}) as Partial<MessageTemplates>;
  return { ...DEFAULT_TEMPLATES, ...stored };
}

// GET /api/message-templates — staff: the buttons need them to build the messages.
const show = apiRoute(async ({ user }) => {
  authorize(user, "messageTemplate", "view");
  return loadMessageTemplates();
});

// PUT /api/message-templates — admin; send only the templates to change.
const update = apiRoute(async ({ request, user }) => {
  authorize(user, "messageTemplate", "update");
  const input = await parseBody(request, templatesSchema, labels);
  const current = await loadMessageTemplates();
  // Store only what differs from the defaults, so defaults can still evolve.
  const merged: Partial<MessageTemplates> = {};
  for (const key of TEMPLATE_KEYS) {
    const value = input[key] ?? current[key];
    if (value !== DEFAULT_TEMPLATES[key]) merged[key] = value;
  }
  const tenantId = requireTenantId();
  await db.tenantSetting.upsert({
    where: { tenantId_key: { tenantId, key: SETTING_KEY } },
    create: { tenantId, key: SETTING_KEY, value: merged },
    update: { value: merged },
  });
  return { ...DEFAULT_TEMPLATES, ...merged };
});

export const messageTemplateRoutes = { GET: show, PUT: update };
