// Calendar-day helpers (ported from frontend/src/utils/calendar.js). Calendar days
// are "YYYY-MM-DD" strings ("dateKey"); arithmetic is done on UTC dates so the
// browser's own time zone never shifts a day. Times of day are minutes since 00:00.

const toUtc = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`);
const toKey = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(dateKey: string, days: number): string {
  const d = toUtc(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
}

/** 0 = Sunday ... 6 = Saturday (same as working_hours.weekday). */
export function weekdayIndex(dateKey: string): number {
  return toUtc(dateKey).getUTCDay();
}

/** Monday of the dateKey's week. */
export function startOfWeek(dateKey: string): string {
  return addDays(dateKey, -((weekdayIndex(dateKey) + 6) % 7));
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function weekdayShortLabel(dateKey: string): string {
  return WEEKDAY_SHORT[weekdayIndex(dateKey)];
}

/** "2030-01-10" → "10/01". */
export function dayMonthLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

/** "HH:MM" or "HH:MM:SS" → minutes since 00:00. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since 00:00 → "HH:MM". */
export function minutesToTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** A point in the barbershop's local time: calendar day + minutes since 00:00. */
export type LocalNow = { date: string; minutes: number };

/**
 * Whether a calendar slot starts before `now` (both in the barbershop's local
 * time): past slots can't be booked (SPEC-0003). "YYYY-MM-DD" keys compare as strings.
 */
export function isPastSlot(dateKey: string, minutes: number, now: LocalNow): boolean {
  return dateKey < now.date || (dateKey === now.date && minutes < now.minutes);
}
