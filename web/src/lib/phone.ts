// Brazilian phone numbers (SPEC-0005): stored as digits only, area code (DDD) +
// number, without the country code; masks are applied only for display.
// Isomorphic: used by the API validation and by the UI.

/** Keeps only the digits: "(11) 98765-4321" → "11987654321". */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** DDD + 8 digits (landline) or DDD + 9 digits (mobile). */
export function isValidPhoneDigits(digits: string): boolean {
  return /^\d{10,11}$/.test(digits);
}

export const INVALID_PHONE_MESSAGE = "O telefone deve ter DDD e 8 ou 9 dígitos.";
