import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz/guard";
import { type CurrentUser, getCurrentUser } from "@/lib/current-user";
import { errorResponse, ForbiddenError } from "@/lib/http-errors";
import { runWithTenant } from "@/lib/tenancy/context";
import { toJsonValue } from "./serialize";

type RouteContext<P> = { params: Promise<P> };

export type ApiContext<P> = {
  request: Request;
  user: CurrentUser;
  params: P;
};

/** Marks a handler result as "201 Created" (legacy: newly created models). */
export class Created<T> {
  constructor(readonly data: T) {}
}

export const created = <T>(data: T) => new Created(data);

/** 204 No Content (legacy: destroy endpoints). */
export const noContent = () => new NextResponse(null, { status: 204 });

/**
 * Wraps a Route Handler for the authenticated panel API (ADR-0007):
 * 1. requires a session (401), using the request's own headers;
 * 2. requires a tenant (403, e.g. super_admin has none for panel routes);
 * 3. runs the handler inside that tenant's context (ADR-0005);
 * 4. serializes the result (Decimals as "0.00", dates ISO) as JSON, or passes a
 *    Response through; Created → 201;
 * 5. converts known errors (401/403/404/422, Prisma P2025) via errorResponse().
 *
 * Authorization (`authorize(...)`) stays inside each handler, next to the rule.
 */
export function apiRoute<P = Record<string, never>>(handler: (ctx: ApiContext<P>) => Promise<unknown>) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      const user = requireUser(await getCurrentUser(request.headers));
      if (user.tenantId === null) {
        throw new ForbiddenError();
      }
      const params = await context.params;
      const result = await runWithTenant(user.tenantId, () => handler({ request, user, params }));

      if (result instanceof Response) {
        return result;
      }
      if (result instanceof Created) {
        return NextResponse.json(toJsonValue(result.data), { status: 201 });
      }
      return NextResponse.json(toJsonValue(result));
    } catch (error) {
      return errorResponse(error);
    }
  };
}
