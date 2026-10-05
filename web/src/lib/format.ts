import { phoneDigits } from "./phone";

// Display/input formatting for pt-BR, ported from frontend/src/utils/format.js.

/**
 * Formats a calendar date ("YYYY-MM-DD", any time suffix ignored) as "DD/MM/AAAA".
 * Never goes through `Date` on purpose: `new Date("2022-08-23")` is UTC midnight,
 * and converting it to a Brazilian time zone shows the previous day. Calendar
 * dates (birthday, entry date) have no instant, so no time zone applies.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const datePart = String(value).split("T")[0].split(" ")[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return String(value);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Formats a real instant (e.g. an appointment start) as local pt-BR date and time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** "42.96" or 42.96 → "42,96" (with thousands separator). Empty/invalid → "". */
export function formatDecimal(value: string | number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** "45.5" → "R$ 45,50". Empty/invalid → "". */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Parses a number typed by the user ("8,99", "8.99", "1.234,56") into the API
 * format: a dot-decimal string ("1234.56"), so the value never goes through a
 * float. With both "." and ",", the dot is the thousands separator. Returns null
 * for empty or invalid input.
 */
export function parseDecimal(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  let s = value.trim();
  if (s === "") return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

/** Up to two initials from a name: "Carlos Souza" → "CS". */
export function initials(name: string | null | undefined): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Brazilian phone mask (SPEC-0005), also for partial values while typing:
 * "11987654321" → "(11) 98765-4321", "1133334444" → "(11) 3333-4444",
 * "119876" → "(11) 9876". Phones are stored as digits only.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = phoneDigits(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  // 9 digits after the DDD = mobile (5-4); up to 8 = landline (4-4).
  const split = rest.length === 9 ? 5 : 4;
  return rest.length <= split ? `(${ddd}) ${rest}` : `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
