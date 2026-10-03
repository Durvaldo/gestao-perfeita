// Time zone helpers built on Intl (no dependency), ADR-0009.
// Instants are stored in UTC; "local" means the wall clock of a barbershop's
// IANA time zone (e.g. "America/Sao_Paulo").

export type ZonedParts = {
  /** "YYYY-MM-DD" */
  date: string;
  /** 0 = Sunday ... 6 = Saturday (same as working_hours.weekday). */
  weekday: number;
  /** "HH:MM:SS" (24h) */
  time: string;
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock date, weekday and time of an instant in `timeZone`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS[parts.weekday],
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (e.g. São Paulo → -3h). */
function offsetAt(instant: Date, timeZone: string): number {
  const { date, time } = zonedParts(instant, timeZone);
  const asUtc = Date.parse(`${date}T${time}Z`);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock time in `timeZone` ("YYYY-MM-DDTHH:MM[:SS]") into the UTC
 * instant. Re-checks the offset once to land on the right side of DST changes.
 */
export function zonedToUtc(local: string, timeZone: string): Date {
  const naive = Date.parse(`${local.length === 16 ? `${local}:00` : local}Z`);
  let result = naive - offsetAt(new Date(naive), timeZone);
  result = naive - offsetAt(new Date(result), timeZone);
  return new Date(result);
}

// "2030-01-10", "2030-01-10T10:00", "2030-01-10 10:00:00", optional seconds,
// fraction and offset ("Z", "-03:00", "-0300").
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Whether `value` is a date/date-time accepted by parseDateTimeInput(). */
export function isDateTimeInput(value: string): boolean {
  const match = DATE_TIME.exec(value);
  return match !== null && !Number.isNaN(Date.parse(`${match[1]}T00:00:00Z`));
}

/**
 * Parses a date-time sent by a client. With an offset ("Z", "-03:00") it is an
 * exact instant; without one (what <input type="datetime-local"> sends) it is a
 * wall-clock time in `timeZone`; a bare date means local midnight.
 */
export function parseDateTimeInput(value: string, timeZone: string): Date {
  const match = DATE_TIME.exec(value);
  if (!match) {
    throw new Error(`Invalid date-time: ${value}`);
  }
  const [, date, hhmm = "00:00", ss = "00", offset] = match;
  if (offset) {
    const normalized = offset === "Z" ? "Z" : offset.includes(":") ? offset : `${offset.slice(0, 3)}:${offset.slice(3)}`;
    return new Date(`${date}T${hhmm}:${ss}${normalized}`);
  }
  return zonedToUtc(`${date}T${hhmm}:${ss}`, timeZone);
}
