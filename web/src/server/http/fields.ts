import { z } from "zod";
import { INVALID_PHONE_MESSAGE, isValidPhoneDigits, phoneDigits } from "@/lib/phone";

// Reusable Zod field builders that accept the same inputs as the legacy Laravel
// rules (e.g. "30" for an integer, "1" for a boolean). Inputs were already
// trimmed, with "" turned into null, by validate() (src/server/http/validation.ts).

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Turns numeric strings into numbers, leaving anything else for Zod to reject. */
const numericString = (value: unknown) => (typeof value === "string" && NUMERIC.test(value) ? Number(value) : value);

/** Required text (Laravel: required|string|max:N). */
export const text = (max = 255) => z.string().min(1).max(max);

/** Optional text: absent keeps the stored value on update, null clears it (Laravel: nullable|string). */
export const optionalText = (max?: number) => (max ? z.string().max(max) : z.string()).nullable().optional();

/** Integer (Laravel: integer|min:N). */
export const integer = (min?: number) => {
  const base = z.number().int();
  return z.preprocess(numericString, min === undefined ? base : base.min(min));
};

/**
 * Money or percentage for a decimal(10,2)/(5,2) column (Laravel: numeric|min:0).
 * Returned as a string so Prisma stores it as Decimal without float conversion.
 */
export const decimal = (options: { min?: number; max?: number } = {}) =>
  z
    .preprocess(numericString, z.number().min(options.min ?? 0).max(options.max ?? 99_999_999.99))
    .transform((value) => String(value));

/** Boolean (Laravel: boolean, which also accepts 1/0/"1"/"0"). */
export const boolean = () =>
  z.preprocess((value) => {
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
    return value;
  }, z.boolean());

/** Calendar date "YYYY-MM-DD" (Laravel: date, as sent by <input type="date">), as a UTC midnight Date. */
export const isoDate = () => z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`));

/** Formats a date-only column back to "YYYY-MM-DD" for responses. */
export const formatIsoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

const toPhoneDigits = (value: unknown) => (typeof value === "string" ? phoneDigits(value) : value);
const phoneString = z.string().refine(isValidPhoneDigits, { message: INVALID_PHONE_MESSAGE });

/** Required Brazilian phone, stored as digits only (SPEC-0005): "(11) 98765-4321" → "11987654321". */
export const phone = () => z.preprocess(toPhoneDigits, phoneString);

/** Optional Brazilian phone, digits only; null clears it. */
export const optionalPhone = () => z.preprocess(toPhoneDigits, phoneString.nullable().optional());
