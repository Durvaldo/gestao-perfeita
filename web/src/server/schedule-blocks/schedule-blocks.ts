import { z } from "zod";
import type { Prisma, ScheduleBlock } from "@/generated/prisma/client";
import { authorize } from "@/lib/authz/guard";
import type { CurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { isDateTimeInput, parseDateTimeInput, zonedParts, zonedToUtc } from "@/lib/timezone";
import { parseId } from "@/server/http/crud";
import { boolean, integer, optionalText } from "@/server/http/fields";
import { assertReferencesInTenant } from "@/server/http/references";
import { apiRoute, created, noContent } from "@/server/http/route";
import { parseBody, parseQuery } from "@/server/http/validation";

// Schedule exceptions ("exceções da agenda", SPEC-0004, ADR-0012): the whole
// barbershop (professionalId null, e.g. a holiday) or one professional (day off,
// sick leave) is closed for whole days or for a time range within one day.
// Stored in schedule_blocks as UTC instants; a whole-day exception goes from local
// midnight to the next local midnight in the barbershop's time zone.

const dateTime = (label: string) => z.string().refine(isDateTimeInput, { message: `O campo ${label} deve ser uma data válida.` });

export const scheduleBlockSchema = z
  .object({
    professionalId: integer().nullable().optional(),
    allDay: boolean(),
    // allDay: calendar days (inclusive); otherwise a time range on one day.
    startDate: z.iso.date().nullable().optional(),
    endDate: z.iso.date().nullable().optional(),
    startsAt: dateTime("início").nullable().optional(),
    endsAt: dateTime("fim").nullable().optional(),
    reason: optionalText(255),
  })
  .superRefine((v, ctx) => {
    if (v.allDay) {
      if (!v.startDate) ctx.addIssue({ code: "custom", path: ["startDate"], message: "O campo data inicial é obrigatório." });
      if (!v.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "O campo data final é obrigatório." });
    } else {
      if (!v.startsAt) ctx.addIssue({ code: "custom", path: ["startsAt"], message: "O campo início é obrigatório." });
      if (!v.endsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "O campo fim é obrigatório." });
    }
  });

export const scheduleBlockLabels = {
  professionalId: "barbeiro",
  allDay: "dia inteiro",
  startDate: "data inicial",
  endDate: "data final",
  startsAt: "início",
  endsAt: "fim",
  reason: "motivo",
};

const listQuerySchema = z.object({
  professionalId: integer().optional(),
  from: dateTime("de").optional(),
  to: dateTime("até").optional(),
});

const include = {
  professional: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.ScheduleBlockInclude;

type BlockWithProfessional = Prisma.ScheduleBlockGetPayload<{ include: typeof include }>;

const timeZoneOf = (user: CurrentUser) => user.tenant?.timezone ?? "America/Sao_Paulo";

/** Adds whole days to a "YYYY-MM-DD" key. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Resolves the input into UTC instants, validating the range (422). */
export function resolveRange(input: z.output<typeof scheduleBlockSchema>, timeZone: string): { startsAt: Date; endsAt: Date } {
  if (input.allDay) {
    const startDate = input.startDate!;
    const endDate = input.endDate!;
    if (endDate < startDate) {
      throw ValidationError.field("endDate", "A data final deve ser igual ou posterior à data inicial.");
    }
    return { startsAt: zonedToUtc(`${startDate}T00:00`, timeZone), endsAt: zonedToUtc(`${nextDay(endDate)}T00:00`, timeZone) };
  }
  const startsAt = parseDateTimeInput(input.startsAt!, timeZone);
  const endsAt = parseDateTimeInput(input.endsAt!, timeZone);
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw ValidationError.field("endsAt", "O fim deve ser depois do início.");
  }
  if (zonedParts(startsAt, timeZone).date !== zonedParts(new Date(endsAt.getTime() - 1), timeZone).date) {
    throw ValidationError.field("endsAt", "Um período de horário deve começar e terminar no mesmo dia. Para vários dias, use dia inteiro.");
  }
  return { startsAt, endsAt };
}

/** Response shape: adds whether it is a whole-day exception, derived from local midnights. */
export function presentBlock(block: ScheduleBlock | BlockWithProfessional, timeZone: string) {
  const start = zonedParts(block.startsAt, timeZone);
  const end = zonedParts(block.endsAt, timeZone);
  const allDay = start.time === "00:00:00" && end.time === "00:00:00";
  return { ...block, allDay };
}

/** Where clause for the exceptions that apply to a professional: their own and the whole barbershop's. */
export const appliesTo = (professionalId: number): Prisma.ScheduleBlockWhereInput => ({
  OR: [{ professionalId }, { professionalId: null }],
});

/**
 * Non-cancelled appointments inside an exception (SPEC-0004 RF-3: they "need
 * action"). A whole-barbershop exception affects every professional.
 */
export function affectedAppointments(block: Pick<ScheduleBlock, "professionalId" | "startsAt" | "endsAt">) {
  return db.appointment.findMany({
    where: {
      status: { not: "cancelled" },
      ...(block.professionalId === null ? {} : { professionalId: block.professionalId }),
      startsAt: { lt: block.endsAt },
      endsAt: { gt: block.startsAt },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      professional: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });
}

async function findOr404(id: number) {
  const block = await db.scheduleBlock.findUnique({ where: { id }, include });
  if (!block) throw new NotFoundError();
  return block;
}

// GET /api/schedule-blocks — ?from=&to= (overlap) and ?professionalId=.
// A professional lists only their own and the whole barbershop's exceptions.
const index = apiRoute(async ({ request, user }) => {
  authorize(user, "scheduleBlock", "viewAny");
  const query = parseQuery(request, listQuerySchema, { professionalId: "barbeiro", from: "de", to: "até" });
  const timeZone = timeZoneOf(user);

  const filters: Prisma.ScheduleBlockWhereInput[] = [];
  if (user.role === "professional") filters.push(appliesTo(user.professional?.id ?? -1));
  if (query.professionalId) filters.push(appliesTo(query.professionalId));
  if (query.from) filters.push({ endsAt: { gt: parseDateTimeInput(query.from, timeZone) } });
  if (query.to) filters.push({ startsAt: { lt: parseDateTimeInput(query.to, timeZone) } });

  const blocks = await db.scheduleBlock.findMany({ where: { AND: filters }, include, orderBy: { startsAt: "asc" } });
  return blocks.map((b) => presentBlock(b, timeZone));
});

// POST /api/schedule-blocks — responds with the appointments that now need action.
const store = apiRoute(async ({ request, user }) => {
  const input = await parseBody(request, scheduleBlockSchema, scheduleBlockLabels);
  const professionalId = input.professionalId ?? null;
  // The policy needs the target: only admins close the whole barbershop.
  authorize(user, "scheduleBlock", "create", { professionalId });
  await assertReferencesInTenant({ professionalId: { model: "professional", id: professionalId ?? undefined } }, scheduleBlockLabels);
  const timeZone = timeZoneOf(user);
  const range = resolveRange(input, timeZone);

  const block = await db.scheduleBlock.create({
    data: { tenantId: requireTenantId(), professionalId, ...range, reason: input.reason ?? null },
    include,
  });
  return created({ ...presentBlock(block, timeZone), affectedAppointments: await affectedAppointments(block) });
});

// GET /api/schedule-blocks/[id]
const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const block = await findOr404(parseId(params.id));
  authorize(user, "scheduleBlock", "view", block);
  return { ...presentBlock(block, timeZoneOf(user)), affectedAppointments: await affectedAppointments(block) };
});

// PUT/PATCH /api/schedule-blocks/[id]
const update = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const current = await findOr404(parseId(params.id));
  authorize(user, "scheduleBlock", "update", current);
  const input = await parseBody(request, scheduleBlockSchema, scheduleBlockLabels);
  const professionalId = input.professionalId ?? null;
  // Re-targeting is checked like creating (e.g. a professional can't turn theirs into a holiday).
  authorize(user, "scheduleBlock", "create", { professionalId });
  await assertReferencesInTenant({ professionalId: { model: "professional", id: professionalId ?? undefined } }, scheduleBlockLabels);
  const timeZone = timeZoneOf(user);

  const block = await db.scheduleBlock.update({
    where: { id: current.id },
    data: { professionalId, ...resolveRange(input, timeZone), reason: input.reason ?? null },
    include,
  });
  return { ...presentBlock(block, timeZone), affectedAppointments: await affectedAppointments(block) };
});

// DELETE /api/schedule-blocks/[id]
const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
  const block = await findOr404(parseId(params.id));
  authorize(user, "scheduleBlock", "delete", block);
  await db.scheduleBlock.delete({ where: { id: block.id } });
  return noContent();
});

export const scheduleBlockRoutes = {
  collection: { GET: index, POST: store },
  item: { GET: show, PUT: update, PATCH: update, DELETE: destroy },
};
