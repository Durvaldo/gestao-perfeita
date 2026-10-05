import { describe, expect, test } from "vitest";
import { addDays, dayMonthLabel, isPastSlot, minutesToTime, rangeOnDay, startOfWeek, timeToMinutes, weekdayIndex, weekdayShortLabel } from "@/lib/calendar";

describe("calendar helpers", () => {
  test("day arithmetic across months and years", () => {
    expect(addDays("2030-01-31", 1)).toBe("2030-02-01");
    expect(addDays("2030-01-01", -1)).toBe("2029-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("weekdays and week start (Monday)", () => {
    expect(weekdayIndex("2030-01-10")).toBe(4); // Thursday
    expect(weekdayShortLabel("2030-01-10")).toBe("Qui");
    expect(startOfWeek("2030-01-10")).toBe("2030-01-07");
    expect(startOfWeek("2030-01-13")).toBe("2030-01-07"); // Sunday belongs to the week that started Monday
    expect(startOfWeek("2030-01-07")).toBe("2030-01-07");
  });

  test("labels and time conversions", () => {
    expect(dayMonthLabel("2030-01-10")).toBe("10/01");
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("18:00:00")).toBe(1080);
    expect(minutesToTime(570)).toBe("09:30");
  });
});

describe("isPastSlot (SPEC-0003)", () => {
  const now = { date: "2030-01-10", minutes: 10 * 60 + 5 }; // 10:05

  test("earlier days and earlier slots of today are past", () => {
    expect(isPastSlot("2030-01-09", 18 * 60, now)).toBe(true);
    expect(isPastSlot("2030-01-10", 10 * 60, now)).toBe(true);
  });

  test("later slots of today and later days are bookable", () => {
    expect(isPastSlot("2030-01-10", 10 * 60 + 30, now)).toBe(false);
    expect(isPastSlot("2030-01-11", 9 * 60, now)).toBe(false);
  });
});

describe("rangeOnDay (SPEC-0004)", () => {
  const tz = "America/Sao_Paulo"; // UTC-3

  test("a time range on one day", () => {
    // 14:00–16:00 local.
    expect(rangeOnDay("2030-01-10T17:00:00Z", "2030-01-10T19:00:00Z", "2030-01-10", tz)).toEqual({ startMin: 840, endMin: 960 });
    expect(rangeOnDay("2030-01-10T17:00:00Z", "2030-01-10T19:00:00Z", "2030-01-11", tz)).toBeNull();
  });

  test("whole days cover each day from 00:00 to 24:00, and not the day after", () => {
    // 10/01 00:00 → 12/01 00:00 local (two whole days).
    const [s, e] = ["2030-01-10T03:00:00Z", "2030-01-12T03:00:00Z"];
    expect(rangeOnDay(s, e, "2030-01-10", tz)).toEqual({ startMin: 0, endMin: 1440 });
    expect(rangeOnDay(s, e, "2030-01-11", tz)).toEqual({ startMin: 0, endMin: 1440 });
    expect(rangeOnDay(s, e, "2030-01-12", tz)).toBeNull();
  });
});
