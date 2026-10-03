import { Prisma } from "@/generated/prisma/client";

/**
 * Prepares a value for a JSON response. Prisma Decimals become fixed 2-decimal
 * strings ("45.00"), like the legacy API: all money and percentage columns are
 * scale 2, and strings avoid float rounding on the client. Dates use ISO 8601.
 *
 * Needed because JSON.stringify calls Decimal#toJSON ("45") before any replacer runs.
 */
export function toJsonValue(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) {
    return (value as Prisma.Decimal).toFixed(2);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonValue(v)]));
  }
  return value;
}
