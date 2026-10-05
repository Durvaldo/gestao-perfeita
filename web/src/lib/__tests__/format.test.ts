import { describe, expect, test } from "vitest";
import { formatCurrency, formatDate, formatDecimal, formatPhone, initials, parseDecimal } from "@/lib/format";

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

describe("formatPhone (SPEC-0005)", () => {
  test("mobile and landline", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  test("partial values while typing", () => {
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119876")).toBe("(11) 9876");
    expect(formatPhone("1198765")).toBe("(11) 9876-5");
  });

  test("already masked or extra digits", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhone("119876543210000")).toBe("(11) 98765-4321");
    expect(formatPhone("")).toBe("");
    expect(formatPhone(null)).toBe("");
  });
});
