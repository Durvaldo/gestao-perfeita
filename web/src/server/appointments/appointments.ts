import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { authorize } from "@/lib/authz/guard";
import { visibleToActor } from "@/lib/authz/policies";
import type { CurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { isDateTimeInput, parseDateTimeInput } from "@/lib/timezone";
import { parseId } from "@/server/http/crud";
import { integer, optionalText } from "@/server/http/fields";
import { pageFromRequest, paginate } from "@/server/http/pagination";
import { assertReferencesInTenant } from "@/server/http/references";
import { apiRoute, created, noContent } from "@/server/http/route";
import { parseBody, parseQuery } from "@/server/http/validation";
import { hasConflict, isWithinWorkingHours, lockProfessionalSchedule, startsInThePast } from "./rules";

// Legacy: AgendamentoRequest + AgendamentoController + Agendamento model.

const dateTime = (label: string) =>
  z.string().refine(isDateTimeInput, { message: `O campo ${label} deve ser uma data válida.` });

export const appointmentSchema = z.object({
  customerId: integer(),
  professionalId: integer(),
  // Naive values ("2030-01-10T10:00", from <input type="datetime-local">) are in
  // the barbershop's time zone; values with an offset are exact (ADR-0009).
  startsAt: dateTime("data e hora de início"),
  serviceIds: z.array(integer()).min(1),
  notes: optionalText(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
});

export const appointmentLabels = {
  customerId: "cliente",
  professionalId: "barbeiro",
  startsAt: "data e hora de início",
  serviceIds: "serviços",
  notes: "observações",
  status: "status",
};

const listQuerySchema = z.object({
  professionalId: integer().optional(),
  from: dateTime("de").optional(),
  to: dateTime("até").optional(),
  page: z.string().optional(),
});

const include = {
  customer: { select: { id: true, name: true, phone: true } },
  professional: { select: { id: true, active: true, user: { select: { id: true, name: true } } } },
  services: { include: { service: { select: { id: true, name: true, durationMinutes: true } } } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof include }>;

/** Flattens the services pivot: [{ id, name, durationMinutes, priceAtBooking }]. */
export function presentAppointment({ services, ...appointment }: AppointmentWithRelations) {
  return {
    ...appointment,
    services: services.map((s) => ({ ...s.service, priceAtBooking: s.priceAtBooking })),
  };
}

const timeZoneOf = (user: CurrentUser) => user.tenant?.timezone ?? "America/Sao_Paulo";

async function findOr404(id: number) {
  const appointment = await db.appointment.findUnique({ where: { id }, include });
  if (!appointment) throw new NotFoundError();
  return appointment;
}

/**
 * Validates input that changes the schedule and resolves the time range:
 * references in tenant (422), active professional (422), end = start + sum of
 * service durations, and working hours (422). `checkSchedule` is false for a
 * status-only update (legacy: an old appointment outside the current working
 * hours can still be confirmed/cancelled). `checkPast` refuses a start before now
 * (SPEC-0003): on create, and on update only when the start time changes, so a
 * past appointment can still be completed or cancelled.
 */
async function resolveSchedule(
  input: z.output<typeof appointmentSchema>,
  timeZone: string,
  options: { checkSchedule: (start: Date, end: Date) => boolean; checkPast: (start: Date) => boolean },
) {
  await assertReferencesInTenant(
    {
      customerId: { model: "customer", id: input.customerId },
      professionalId: { model: "professional", id: input.professionalId },
      serviceIds: { model: "service", id: input.serviceIds },
    },
    appointmentLabels,
  );

  const services = await db.service.findMany({ where: { id: { in: input.serviceIds } } });
  const start = parseDateTimeInput(input.startsAt, timeZone);
  const totalMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const end = new Date(start.getTime() + totalMinutes * 60_000);

  if (options.checkPast(start) && startsInThePast(start)) {
    throw ValidationError.field("startsAt", "Não é possível agendar em um horário que já passou.");
  }

  if (options.checkSchedule(start, end)) {
    const professional = await db.professional.findUniqueOrThrow({ where: { id: input.professionalId } });
    // New bookings with a deactivated professional are refused (ADR-0009).
    if (!professional.active) {
      throw ValidationError.field("professionalId", "Este barbeiro está inativo.");
    }
    if (!(await isWithinWorkingHours(input.professionalId, start, end, timeZone))) {
      throw ValidationError.field("startsAt", "O horário está fora do expediente do barbeiro.");
    }
  }

  return { start, end, services };
}

const conflictError = () => ValidationError.field("professionalId", "Este barbeiro já tem um agendamento nesse horário.");

// GET /api/appointments
const index = apiRoute(async ({ request, user }) => {
  authorize(user, "appointment", "viewAny");
  const query = parseQuery(request, listQuerySchema, { professionalId: "barbeiro", from: "de", to: "até" });

  // A professional only sees their own schedule; the filter is combined (AND),
  // so asking for someone else's schedule returns nothing instead of leaking.
  const filters: Prisma.AppointmentWhereInput[] = [visibleToActor(user)];
  if (query.professionalId) filters.push({ professionalId: query.professionalId });

  // With a period: the full list (no pagination) of appointments that OVERLAP it,
  // including ones starting before and running into it.
  if (query.from && query.to) {
    const timeZone = timeZoneOf(user);
    filters.push({
      startsAt: { lt: parseDateTimeInput(query.to, timeZone) },
      endsAt: { gt: parseDateTimeInput(query.from, timeZone) },
    });
    const list = await db.appointment.findMany({ where: { AND: filters }, include, orderBy: { startsAt: "asc" } });
    return list.map(presentAppointment);
  }

  const where = { AND: filters };
  const result = await paginate(pageFromRequest(request), {
    findMany: (args) => db.appointment.findMany({ where, include, orderBy: { startsAt: "asc" }, ...args }),
    count: () => db.appointment.count({ where }),
  });
  return { ...result, data: result.data.map(presentAppointment) };
});

// POST /api/appointments
const store = apiRoute(async ({ request, user }) => {
  authorize(user, "appointment", "create");
  const input = await parseBody(request, appointmentSchema, appointmentLabels);
  const { start, end, services } = await resolveSchedule(input, timeZoneOf(user), {
    checkSchedule: () => true,
    checkPast: () => true,
  });

  const appointment = await db.$transaction(async (tx) => {
    await lockProfessionalSchedule(tx, input.professionalId);
    if (await hasConflict(tx, input.professionalId, start, end)) throw conflictError();
    return tx.appointment.create({
      data: {
        tenantId: requireTenantId(),
        customerId: input.customerId,
        professionalId: input.professionalId,
        startsAt: start,
        endsAt: end,
        createdByUserId: user.id,
        notes: input.notes ?? null,
        // Each service's current price is frozen on the appointment.
        services: { create: services.map((s) => ({ serviceId: s.id, priceAtBooking: s.price })) },
      },
      include,
    });
  });

  return created(presentAppointment(appointment));
});

// GET /api/appointments/[id]
const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const appointment = await findOr404(parseId(params.id));
  authorize(user, "appointment", "view", appointment);
  return presentAppointment(appointment);
});

// PUT/PATCH /api/appointments/[id]
const update = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const current = await findOr404(parseId(params.id));
  authorize(user, "appointment", "update", current);
  const input = await parseBody(request, appointmentSchema, appointmentLabels);

  // Working hours and active professional are only rechecked when the professional
  // or the time range changes. Conflicts are always rechecked.
  const { start, end, services } = await resolveSchedule(input, timeZoneOf(user), {
    checkSchedule: (s, e) =>
      current.professionalId !== input.professionalId ||
      current.startsAt.getTime() !== s.getTime() ||
      current.endsAt.getTime() !== e.getTime(),
    checkPast: (s) => current.startsAt.getTime() !== s.getTime(),
  });

  const keptIds = new Set(current.services.map((s) => s.serviceId));
  const appointment = await db.$transaction(async (tx) => {
    await lockProfessionalSchedule(tx, input.professionalId);
    if (await hasConflict(tx, input.professionalId, start, end, current.id)) throw conflictError();

    // Services kept on the appointment keep their frozen price; only new ones take
    // the current price (the legacy app re-priced every service on each update).
    await tx.appointmentService.deleteMany({
      where: { appointmentId: current.id, serviceId: { notIn: input.serviceIds } },
    });
    const added = services.filter((s) => !keptIds.has(s.id));
    if (added.length > 0) {
      await tx.appointmentService.createMany({
        data: added.map((s) => ({ appointmentId: current.id, serviceId: s.id, priceAtBooking: s.price })),
      });
    }

    return tx.appointment.update({
      where: { id: current.id },
      data: {
        customerId: input.customerId,
        professionalId: input.professionalId,
        startsAt: start,
        endsAt: end,
        notes: input.notes,
        status: input.status ?? current.status,
      },
      include,
    });
  });

  return presentAppointment(appointment);
});

// DELETE /api/appointments/[id]
const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
  const appointment = await findOr404(parseId(params.id));
  authorize(user, "appointment", "delete");
  await db.appointment.delete({ where: { id: appointment.id } });
  return noContent();
});

export const appointmentRoutes = {
  collection: { GET: index, POST: store },
  item: { GET: show, PUT: update, PATCH: update, DELETE: destroy },
};
