import { describe, expect, test } from "vitest";
import { blockPeriodLabel, blockToForm, emptyExceptionForm, exceptionFormToBody, type ScheduleBlock } from "../exception-form";

const tz = "America/Sao_Paulo"; // UTC-3
const block = (overrides: Partial<ScheduleBlock>): ScheduleBlock => ({
  id: 1,
  professionalId: null,
  professional: null,
  startsAt: "2030-01-10T03:00:00.000Z",
  endsAt: "2030-01-11T03:00:00.000Z",
  allDay: true,
  reason: "Feriado",
  ...overrides,
});

describe("schedule exception form (SPEC-0004)", () => {
  test("whole days of the barbershop", () => {
    const form = { ...emptyExceptionForm("2030-01-10", "shop"), endDate: "2030-01-12", reason: "Férias coletivas" };
    expect(exceptionFormToBody(form)).toEqual({
      professionalId: null,
      allDay: true,
      startDate: "2030-01-10",
      endDate: "2030-01-12",
      reason: "Férias coletivas",
    });
  });

  test("a time range of one professional", () => {
    const form = { ...emptyExceptionForm("2030-01-10", "7"), allDay: false, startTime: "14:00", endTime: "16:00" };
    expect(exceptionFormToBody(form)).toMatchObject({ professionalId: 7, allDay: false, startsAt: "2030-01-10T14:00", endsAt: "2030-01-10T16:00" });
  });

  test("editing opens with the local dates and times", () => {
    expect(blockToForm(block({ endsAt: "2030-01-13T03:00:00.000Z" }), tz)).toMatchObject({ target: "shop", allDay: true, startDate: "2030-01-10", endDate: "2030-01-12" });
    const range = block({ professionalId: 7, allDay: false, startsAt: "2030-01-10T17:00:00.000Z", endsAt: "2030-01-10T19:00:00.000Z" });
    expect(blockToForm(range, tz)).toMatchObject({ target: "7", allDay: false, date: "2030-01-10", startTime: "14:00", endTime: "16:00" });
  });

  test("period labels", () => {
    expect(blockPeriodLabel(block({}), tz)).toBe("10/01/2030 (dia inteiro)");
    expect(blockPeriodLabel(block({ endsAt: "2030-01-13T03:00:00.000Z" }), tz)).toBe("10/01/2030 a 12/01/2030");
    expect(blockPeriodLabel(block({ allDay: false, startsAt: "2030-01-10T17:00:00.000Z", endsAt: "2030-01-10T19:00:00.000Z" }), tz)).toBe(
      "10/01/2030, 14:00–16:00",
    );
  });
});
