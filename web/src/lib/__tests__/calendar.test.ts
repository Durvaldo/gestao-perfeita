import { describe, expect, test } from "vitest";
import { addDays, dayMonthLabel, minutesToTime, startOfWeek, timeToMinutes, weekdayIndex, weekdayShortLabel } from "@/lib/calendar";

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
