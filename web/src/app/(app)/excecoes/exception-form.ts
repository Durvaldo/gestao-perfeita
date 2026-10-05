// Schedule exception form (SPEC-0004) and how it maps to /api/schedule-blocks.
// Dates and times are the barbershop's local wall clock (ADR-0009, ADR-0012).
import { formatDate } from "@/lib/format";
import { zonedParts } from "@/lib/timezone";

export type ScheduleBlock = {
  id: number;
  professionalId: number | null;
  professional: { id: number; user: { name: string } } | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  reason: string | null;
};

export type ExceptionForm = {
  /** "shop" = the whole barbershop, otherwise the professional id. */
  target: string;
  allDay: boolean;
  startDate: string;
  endDate: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export const REASON_SUGGESTIONS = ["Feriado", "Folga", "Férias", "Atestado", "Compromisso", "Manutenção"];

export function emptyExceptionForm(today: string, target: string): ExceptionForm {
  return { target, allDay: true, startDate: today, endDate: today, date: today, startTime: "", endTime: "", reason: "" };
}

export function exceptionFormToBody(form: ExceptionForm) {
  const professionalId = form.target === "shop" ? null : Number(form.target);
  const range = form.allDay
    ? { startDate: form.startDate, endDate: form.endDate }
    : { startsAt: form.startTime ? `${form.date}T${form.startTime}` : "", endsAt: form.endTime ? `${form.date}T${form.endTime}` : "" };
  return { professionalId, allDay: form.allDay, ...range, reason: form.reason };
}

const localDate = (iso: string, timeZone: string) => zonedParts(new Date(iso), timeZone).date;
const localTime = (iso: string, timeZone: string) => zonedParts(new Date(iso), timeZone).time.slice(0, 5);
/** The last day covered by a whole-day exception (its end is the next local midnight). */
const lastDay = (endsAt: string, timeZone: string) => localDate(new Date(new Date(endsAt).getTime() - 1).toISOString(), timeZone);

export function blockToForm(block: ScheduleBlock, timeZone: string): ExceptionForm {
  const target = block.professionalId === null ? "shop" : String(block.professionalId);
  const startDate = localDate(block.startsAt, timeZone);
  if (block.allDay) {
    return { target, allDay: true, startDate, endDate: lastDay(block.endsAt, timeZone), date: startDate, startTime: "", endTime: "", reason: block.reason ?? "" };
  }
  return {
    target,
    allDay: false,
    startDate,
    endDate: startDate,
    date: startDate,
    startTime: localTime(block.startsAt, timeZone),
    endTime: localTime(block.endsAt, timeZone),
    reason: block.reason ?? "",
  };
}

/** "10/01/2030 (dia inteiro)", "10/01/2030 a 12/01/2030" or "10/01/2030, 14:00–16:00". */
export function blockPeriodLabel(block: ScheduleBlock, timeZone: string): string {
  const start = localDate(block.startsAt, timeZone);
  if (block.allDay) {
    const end = lastDay(block.endsAt, timeZone);
    return start === end ? `${formatDate(start)} (dia inteiro)` : `${formatDate(start)} a ${formatDate(end)}`;
  }
  return `${formatDate(start)}, ${localTime(block.startsAt, timeZone)}–${localTime(block.endsAt, timeZone)}`;
}
