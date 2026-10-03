import { unscopedDb } from "@/lib/db";

/** Better Auth error code returned when a deactivated account tries to sign in. */
export const ACCOUNT_DISABLED = "ACCOUNT_DISABLED";

/**
 * Whether a user's access is blocked (ADR-0008): a professional whose
 * professional record is deactivated ("deleting" a professional deactivates it).
 */
export function isAccessBlocked(user: { role: string; professional: { active: boolean } | null }): boolean {
  return user.role === "professional" && user.professional !== null && !user.professional.active;
}

/** Loads the user (outside any tenant context, as auth runs before one exists) and checks access. */
export async function isUserAccessBlocked(userId: number): Promise<boolean> {
  const user = await unscopedDb.user.findUnique({
    where: { id: userId },
    select: { role: true, professional: { select: { active: true } } },
  });
  return user !== null && isAccessBlocked(user);
}
