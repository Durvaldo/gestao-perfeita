import { describe, expect, test } from "vitest";
import { googleCalendarUrl } from "@/lib/calendar-links";

describe("googleCalendarUrl (SPEC-0006 RF-2a)", () => {
  test("fills title, UTC dates, details and location", () => {
    const url = new URL(
      googleCalendarUrl({
        title: "João Pereira · Corte",
        startsAt: "2030-01-10T13:00:00.000Z",
        endsAt: "2030-01-10T13:45:00.000Z",
        details: "Agendamento na Barbearia Centro",
        location: "Barbearia Centro",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "TEMPLATE",
      text: "João Pereira · Corte",
      dates: "20300110T130000Z/20300110T134500Z",
      details: "Agendamento na Barbearia Centro",
      location: "Barbearia Centro",
    });
  });
});
