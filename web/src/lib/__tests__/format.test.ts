import { describe, expect, test } from "vitest";
import { formatCurrency, formatDate, formatDecimal, initials, parseDecimal } from "@/lib/format";

// Intl output uses a non-breaking space in "R$ 45,50"; normalize for readability.
const plain = (s: string) => s.replace(/ /g, " ");

describe("format", () => {
  test("formatDate never shifts the calendar day", () => {
    expect(formatDate("1990-03-15")).toBe("15/03/1990");
    expect(formatDate("1990-03-15T00:00:00.000Z")).toBe("15/03/1990");
    expect(formatDate(null)).toBe("");
  });

  test("formatDecimal and formatCurrency use pt-BR separators", () => {
    expect(formatDecimal("1234.5")).toBe("1.234,50");
    expect(formatDecimal("")).toBe("");
    expect(plain(formatCurrency("45.5"))).toBe("R$ 45,50");
    expect(formatCurrency(null)).toBe("");
  });

  test("parseDecimal returns the API string format", () => {
    expect(parseDecimal("8,99")).toBe("8.99");
    expect(parseDecimal("8.99")).toBe("8.99");
    expect(parseDecimal("1.234,56")).toBe("1234.56");
    expect(parseDecimal(" 30 ")).toBe("30");
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal(12.5)).toBe("12.5");
  });

  test("initials", () => {
    expect(initials("Carlos Souza")).toBe("CS");
    expect(initials("Admin Barbearia Centro")).toBe("AB");
    expect(initials(null)).toBe("");
  });
});
