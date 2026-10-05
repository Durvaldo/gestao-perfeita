import { z } from "zod";
import type { WorkingHour } from "@/generated/prisma/client";
import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/http-errors";
import { parseId } from "@/server/http/crud";
import { integer } from "@/server/http/fields";
import { apiRoute, created, noContent } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";

// Legacy: HorarioTrabalhoRequest + HorarioTrabalhoController (shallow routes:
// list/create under the professional, show/update/delete by id).

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" (legacy date_format:H:i). */
const timeOfDay = () => z.iso.time({ precision: -1 });

export const workingHourSchema = z
  .object({
    weekday: integer(0).pipe(z.number().max(6)),
    startTime: timeOfDay(),
    endTime: timeOfDay(),
  })
  // Zod runs object refinements even when a field failed; only compare valid times.
  .refine((v) => !HHMM.test(v.startTime) || !HHMM.test(v.endTime) || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "O campo hora de término deve ser posterior à hora de início.",
  });

export const workingHourLabels = {
  weekday: "dia da semana",
  startTime: "hora de início",
  endTime: "hora de término",
};

// Times are stored as time(0); Prisma exposes them as Dates on 1970-01-01 UTC.
const toTime = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00Z`);
const fromTime = (value: Date) => value.toISOString().slice(11, 16);

export const presentWorkingHour = (hour: WorkingHour) => ({
  ...hour,
  startTime: fromTime(hour.startTime),
  endTime: fromTime(hour.endTime),
});

function toData(input: z.output<typeof workingHourSchema>) {
  return { weekday: input.weekday, startTime: toTime(input.startTime), endTime: toTime(input.endTime) };
}

async function findProfessionalOr404(id: number) {
  const professional = await db.professional.findUnique({ where: { id }, select: { id: true } });
  if (!professional) throw new NotFoundError();
  return professional;
}

async function findHourOr404(id: number) {
  // Scoped through the professional by the tenant extension (fixes the legacy
  // cross-tenant access by id, ADR-0005).
  const hour = await db.workingHour.findUnique({ where: { id } });
  if (!hour) throw new NotFoundError();
  return hour;
}

// GET /api/professionals/[id]/working-hours
const index = apiRoute<{ id: string }>(async ({ params, user }) => {
  const professional = await findProfessionalOr404(parseId(params.id));
  authorize(user, "workingHour", "viewAny", { professionalId: professional.id });
  const hours = await db.workingHour.findMany({
    where: { professionalId: professional.id },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return hours.map(presentWorkingHour);
});

// POST /api/professionals/[id]/working-hours
const store = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const professional = await findProfessionalOr404(parseId(params.id));
  authorize(user, "workingHour", "create", { professionalId: professional.id });
  const input = await parseBody(request, workingHourSchema, workingHourLabels);
  const hour = await db.workingHour.create({ data: { professionalId: professional.id, ...toData(input) } });
  return created(presentWorkingHour(hour));
});

// GET /api/working-hours/[id]
const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const hour = await findHourOr404(parseId(params.id));
  authorize(user, "workingHour", "view", hour);
  return presentWorkingHour(hour);
});

// PUT/PATCH /api/working-hours/[id]
const update = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const hour = await findHourOr404(parseId(params.id));
  authorize(user, "workingHour", "update", hour);
  const input = await parseBody(request, workingHourSchema, workingHourLabels);
  return presentWorkingHour(await db.workingHour.update({ where: { id: hour.id }, data: toData(input) }));
});

// DELETE /api/working-hours/[id]
const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
  const hour = await findHourOr404(parseId(params.id));
  authorize(user, "workingHour", "delete", hour);
  await db.workingHour.delete({ where: { id: hour.id } });
  return noContent();
});

export const workingHourRoutes = {
  byProfessional: { GET: index, POST: store },
  item: { GET: show, PUT: update, PATCH: update, DELETE: destroy },
};
