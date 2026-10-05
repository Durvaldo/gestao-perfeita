import { describe, expect, test } from "vitest";
import { isValidPhoneDigits, phoneDigits } from "@/lib/phone";

describe("phone digits (SPEC-0005)", () => {
  test("keeps only the digits", () => {
    expect(phoneDigits("(11) 98765-4321")).toBe("11987654321");
    expect(phoneDigits(" 11 3333-4444 ")).toBe("1133334444");
  });

  test("valid = DDD + 8 or 9 digits", () => {
    expect(isValidPhoneDigits("1133334444")).toBe(true);
    expect(isValidPhoneDigits("11987654321")).toBe(true);
    expect(isValidPhoneDigits("987654321")).toBe(false);
    expect(isValidPhoneDigits("5511987654321")).toBe(false);
  });
});
