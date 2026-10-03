import { createAuthClient } from "better-auth/react";

// Browser-side Better Auth client (same origin as the app, ADR-0004).
// Show errors with authErrorMessage() (src/lib/auth-messages.ts).
export const authClient = createAuthClient();
