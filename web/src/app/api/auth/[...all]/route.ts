import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth endpoints: POST /api/auth/sign-in/email, POST /api/auth/sign-out,
// GET /api/auth/get-session, etc.
export const { GET, POST } = toNextJsHandler(auth);
