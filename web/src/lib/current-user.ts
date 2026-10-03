import { headers } from "next/headers";
import { isAccessBlocked } from "@/lib/account-status";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  tenantId: true,
  // The linked professional tells the UI which schedule belongs to the logged-in
  // user (same as the legacy GET /api/user, which loaded `barbeiro`).
  professional: { select: { id: true, active: true } },
  // Name for the UI; time zone for scheduling rules (ADR-0009).
  tenant: { select: { name: true, timezone: true } },
} as const;

/**
 * Returns the authenticated user, or null when there is no valid session.
 * Role and tenant are read from the database, not from the session cache,
 * so changes apply on the next request.
 *
 * Pass `requestHeaders` outside a Next.js request (e.g. in tests); inside a
 * request the incoming headers are used.
 */
export async function getCurrentUser(requestHeaders?: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
  if (!session) {
    return null;
  }
  const user = await db.user.findUnique({ where: { id: Number(session.user.id) }, select: currentUserSelect });
  // A deactivated professional loses access immediately, even with a live session (ADR-0008).
  return user && !isAccessBlocked(user) ? user : null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
