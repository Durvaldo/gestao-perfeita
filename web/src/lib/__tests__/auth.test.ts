// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/current-user";
import { unscopedDb as db } from "@/lib/db";
import { truncateAll } from "../../../tests/db";
import { SEED_PASSWORD, seed } from "../../../prisma/seed-data";

// Signs in through Better Auth and returns request headers carrying the session cookie.
async function signIn(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function apiError(promise: Promise<unknown>): Promise<APIError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof APIError) return error;
    throw error;
  }
  throw new Error("Expected the call to fail");
}

describe("authentication", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(db);
  });
  afterAll(() => db.$disconnect());

  test("signs in with a seeded login and resolves the current user", async () => {
    const headers = await signIn("admin@barbearia-centro.com", SEED_PASSWORD);

    const user = await getCurrentUser(headers);

    expect(user?.email).toBe("admin@barbearia-centro.com");
    expect(user?.role).toBe("admin");
    expect(user?.tenantId).not.toBeNull();
    expect(user?.professional).toBeNull();
  });

  test("includes the linked professional for professional users", async () => {
    const headers = await signIn("carlos@barbearia-centro.com", SEED_PASSWORD);

    const user = await getCurrentUser(headers);

    expect(user?.role).toBe("professional");
    expect(user?.professional?.id).toEqual(expect.any(Number));
  });

  test("rejects a wrong password with a pt-BR message", async () => {
    const error = await apiError(auth.api.signInEmail({ body: { email: "admin@barbearia-centro.com", password: "wrong-password" } }));

    expect(error.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(authErrorMessage(error.body)).toBe("Essas credenciais não conferem com nossos registros.");
  });

  test("rejects an unknown email the same way", async () => {
    const error = await apiError(auth.api.signInEmail({ body: { email: "nobody@example.com", password: SEED_PASSWORD } }));

    expect(error.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  test("has no current user without a session", async () => {
    expect(await getCurrentUser(new Headers())).toBeNull();
    expect(await getCurrentUser(new Headers({ cookie: "better-auth.session_token=invalid" }))).toBeNull();
  });

  test("ends the session on sign-out", async () => {
    const headers = await signIn("admin@barbearia-zona-sul.com", SEED_PASSWORD);
    expect(await getCurrentUser(headers)).not.toBeNull();

    await auth.api.signOut({ headers });

    expect(await getCurrentUser(headers)).toBeNull();
  });

  test("does not allow public sign-up", async () => {
    const error = await apiError(
      auth.api.signUpEmail({ body: { name: "Intruso", email: "intruso@example.com", password: "senha12345" } }),
    );

    expect(error.body?.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
    expect(await db.user.findUnique({ where: { email: "intruso@example.com" } })).toBeNull();
  });
});
