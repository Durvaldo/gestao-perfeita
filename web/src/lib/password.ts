import bcrypt from "bcryptjs";

// bcrypt with cost 12, same as the legacy Laravel app (BCRYPT_ROUNDS=12).
// The auth library chosen in TASK-0004 must verify these hashes, or replace
// this module and re-seed.
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
