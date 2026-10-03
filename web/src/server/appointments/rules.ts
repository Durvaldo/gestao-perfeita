import { db } from "@/lib/db";
import { zonedParts } from "@/lib/timezone";

// Scheduling rules, ported from the legacy Agendamento model.

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** "HH:MM:SS" of a working_hours time column (stored on 1970-01-01 UTC). */
const timeOf = (value: Date) => value.toISOString().slice(11, 19);

/**
 * Whether [start, end) fits entirely inside ONE working period of the professional
 * for that weekday (legacy Agendamento::dentroDoExpediente): it cannot span the
 * lunch gap nor midnight, and a day without working hours accepts nothing.
 * Weekday and times are taken in the barbershop's time zone (ADR-0009).
 */
export async function isWithinWorkingHours(professionalId: number, start: Date, end: Date, timeZone: string): Promise<boolean> {
  const from = zonedParts(start, timeZone);
  const to = zonedParts(end, timeZone);
  if (from.date !== to.date) {
    return false;
  }
  const periods = await db.workingHour.findMany({ where: { professionalId, weekday: from.weekday } });
  // "HH:MM:SS" strings compare correctly because they are zero-padded.
  return periods.some((p) => timeOf(p.startTime) <= from.time && timeOf(p.endTime) >= to.time);
}

/**
 * Whether another non-cancelled appointment of the same professional overlaps
 * [start, end) (legacy Agendamento::conflita). Run inside the transaction that
 * writes, after lockProfessionalSchedule().
 */
export async function hasConflict(tx: Tx, professionalId: number, start: Date, end: Date, ignoreId?: number): Promise<boolean> {
  const overlapping = await tx.appointment.count({
    where: {
      professionalId,
      status: { not: "cancelled" },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
  });
  return overlapping > 0;
}

/**
 * Serializes writes to one professional's schedule for the rest of the
 * transaction (Postgres advisory lock), so two concurrent requests cannot both
 * pass the conflict check and double-book. The legacy app had this race.
 */
export async function lockProfessionalSchedule(tx: Tx, professionalId: number): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(1, ${professionalId}::int)::text`;
}
