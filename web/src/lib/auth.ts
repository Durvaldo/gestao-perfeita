import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { ACCOUNT_DISABLED, isUserAccessBlocked } from "@/lib/account-status";
import { unscopedDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

// Authentication (ADR-0004). Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
export const auth = betterAuth({
  database: prismaAdapter(unscopedDb, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: tenants and users are created by the seed or by
    // app code (ADR-0004). Self-service onboarding is a separate, later task.
    disableSignUp: true,
    password: {
      // bcrypt, compatible with the hashes written by the seed (src/lib/password.ts).
      hash: hashPassword,
      verify: ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, input: false },
      tenantId: { type: "number", required: false, input: false },
    },
  },
  advanced: {
    // Our tables use serial integer ids.
    database: { generateId: "serial" },
  },
  databaseHooks: {
    session: {
      create: {
        // Deactivated professionals cannot sign in (ADR-0008).
        before: async (session) => {
          if (await isUserAccessBlocked(Number(session.userId))) {
            throw new APIError("FORBIDDEN", { code: ACCOUNT_DISABLED, message: "Account disabled" });
          }
        },
      },
    },
  },
  rateLimit: {
    // Same limit as the legacy Laravel login (5 attempts per minute). Better Auth
    // only enforces rate limits in production by default.
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  // Must be the last plugin: lets Server Actions set the session cookie.
  plugins: [nextCookies()],
});
