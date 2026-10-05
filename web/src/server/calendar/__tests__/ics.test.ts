import { describe, expect, test } from "vitest";
import { buildIcs, escapeText, foldLine } from "../ics";

describe("iCalendar (RFC 5545)", () => {
  test("escapes text values", () => {
    expect(escapeText("Corte, Barba; e\\ mais\nlinha")).toBe("Corte\\, Barba\\; e\\\\ mais\\nlinha");
  });

  test("folds lines at 75 octets without splitting accented characters", () => {
    const line = `SUMMARY:${"João Pereira · ".repeat(10)}`;
    const folded = foldLine(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(folded.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });

  test("calendar with events in UTC, CRLF line endings", () => {
    const ics = buildIcs({
      name: "Barbearia Centro · Carlos",
      now: new Date("2030-01-01T00:00:00Z"),
      events: [
        { uid: "appointment-1@agenda", startsAt: new Date("2030-01-10T13:00:00Z"), endsAt: new Date("2030-01-10T13:30:00Z"), summary: "João · Corte", location: "Barbearia Centro" },
        { uid: "appointment-2@agenda", startsAt: new Date("2030-01-11T13:00:00Z"), endsAt: new Date("2030-01-11T14:00:00Z"), summary: "Pedro · Barba", tentative: true },
      ],
    });
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").slice(0, 2)).toEqual(["BEGIN:VCALENDAR", "VERSION:2.0"]);
    expect(ics).toContain("BEGIN:VEVENT\r\nUID:appointment-1@agenda\r\nDTSTAMP:20300101T000000Z\r\nDTSTART:20300110T130000Z\r\nDTEND:20300110T133000Z\r\nSUMMARY:João · Corte\r\nLOCATION:Barbearia Centro\r\nSTATUS:CONFIRMED\r\nEND:VEVENT");
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});
