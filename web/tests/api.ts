// Helpers for calling Route Handlers directly in tests, with a real session.
import { auth } from "@/lib/auth";
import { SEED_PASSWORD } from "../prisma/seed-data";

type Handler<P> = (request: Request, context: { params: Promise<P> }) => Promise<Response>;

/** Signs in with a seeded login and returns the Cookie header value. */
export async function loginCookie(email: string, password = SEED_PASSWORD): Promise<string> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/**
 * Calls a Route Handler and returns status + parsed JSON body (null for 204).
 * `params` are the dynamic route params, e.g. { id: "3" }.
 */
export async function call<P = Record<string, never>>(
  handler: Handler<P>,
  options: { method?: string; path?: string; cookie?: string; body?: unknown; params?: P } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary JSON, asserted by each test
): Promise<{ status: number; body: any }> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const request = new Request(`http://localhost:3001${options.path ?? "/api/test"}`, {
    method,
    headers: { "content-type": "application/json", ...(options.cookie ? { cookie: options.cookie } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve((options.params ?? {}) as P) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
