// iCalendar (RFC 5545) for the professional's calendar feed (SPEC-0006 RF-2b).
// Pure: no database, so it is unit-testable.

export type IcsEvent = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description?: string;
  location?: string;
  /** pending → TENTATIVE, the others → CONFIRMED. */
  tentative?: boolean;
};

/** 2030-01-10T13:00:00.000Z → 20300110T130000Z */
const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes TEXT values (backslash, semicolon, comma, newline). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets (continuation lines start with a space), without splitting a character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines carry the leading space
    if (size + charSize > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(calendar: { name: string; events: IcsEvent[]; now?: Date }): string {
  const stamp = icsDate(calendar.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda da Barbearia//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    // Hint for clients that honor it (Apple, Outlook); Google ignores it and refreshes on its own schedule.
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];
  for (const event of calendar.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(event.startsAt)}`,
      `DTEND:${icsDate(event.endsAt)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      `STATUS:${event.tentative ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
