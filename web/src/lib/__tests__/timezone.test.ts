import { describe, expect, test } from "vitest";
import { isDateTimeInput, parseDateTimeInput, zonedParts, zonedToUtc } from "@/lib/timezone";

describe("timezone helpers", () => {
  test("wall-clock parts in a barbershop's zone", () => {
    // 2030-01-11 01:30 UTC is still Thursday 2030-01-10 22:30 in São Paulo (UTC-3).
    expect(zonedParts(new Date("2030-01-11T01:30:00Z"), "America/Sao_Paulo")).toEqual({
      date: "2030-01-10",
      weekday: 4,
      time: "22:30:00",
    });
    expect(zonedParts(new Date("2030-01-11T01:30:00Z"), "America/Manaus").time).toBe("21:30:00"); // UTC-4
  });

  test("local wall-clock → UTC instant", () => {
    expect(zonedToUtc("2030-01-10T10:00", "America/Sao_Paulo").toISOString()).toBe("2030-01-10T13:00:00.000Z");
    expect(zonedToUtc("2030-01-10T10:00:00", "America/Manaus").toISOString()).toBe("2030-01-10T14:00:00.000Z");
  });

  test("handles daylight saving time zones", () => {
    // New York: EST (UTC-5) in January, EDT (UTC-4) in July.
    expect(zonedToUtc("2030-01-10T10:00", "America/New_York").toISOString()).toBe("2030-01-10T15:00:00.000Z");
    expect(zonedToUtc("2030-07-10T10:00", "America/New_York").toISOString()).toBe("2030-07-10T14:00:00.000Z");
  });

  test("parses client inputs: naive = local, offset = exact, date = local midnight", () => {
    const tz = "America/Sao_Paulo";
    expect(parseDateTimeInput("2030-01-10T10:00", tz).toISOString()).toBe("2030-01-10T13:00:00.000Z");
    expect(parseDateTimeInput("2030-01-10 10:00:00", tz).toISOString()).toBe("2030-01-10T13:00:00.000Z");
    expect(parseDateTimeInput("2030-01-10T10:00:00Z", tz).toISOString()).toBe("2030-01-10T10:00:00.000Z");
    expect(parseDateTimeInput("2030-01-10T10:00:00-0300", tz).toISOString()).toBe("2030-01-10T13:00:00.000Z");
    expect(parseDateTimeInput("2030-01-10", tz).toISOString()).toBe("2030-01-10T03:00:00.000Z");
  });

  test("validates input format", () => {
    expect(isDateTimeInput("2030-01-10T10:00")).toBe(true);
    expect(isDateTimeInput("10/01/2030")).toBe(false);
    expect(isDateTimeInput("2030-13-45")).toBe(false);
    expect(isDateTimeInput("amanhã")).toBe(false);
  });
});
