// @vitest-environment node
import { describe, expect, test } from "vitest";
import { startsInThePast } from "../rules";

describe("startsInThePast (SPEC-0003)", () => {
  const now = new Date("2030-01-10T13:00:00Z");

  test("a start before now is in the past, even by a minute", () => {
    expect(startsInThePast(new Date("2030-01-10T12:59:00Z"), now)).toBe(true);
    expect(startsInThePast(new Date("2030-01-09T20:00:00Z"), now)).toBe(true);
  });

  test("now and later are not in the past", () => {
    expect(startsInThePast(new Date("2030-01-10T13:00:00Z"), now)).toBe(false);
    expect(startsInThePast(new Date("2030-01-11T09:00:00Z"), now)).toBe(false);
  });
});
