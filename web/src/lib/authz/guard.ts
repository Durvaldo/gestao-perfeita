import { ForbiddenError, UnauthenticatedError } from "@/lib/http-errors";
import { type Action, type Actor, can, type Resource, type SubjectArgs } from "./policies";

/** Narrows a possibly-null current user, throwing 401 when there is no session. */
export function requireUser<U extends Actor>(user: U | null): U {
  if (!user) {
    throw new UnauthenticatedError();
  }
  return user;
}

/** Throws 403 unless `actor` may perform `action` (equivalent of `$this->authorize()`). */
export function authorize<R extends Resource, A extends Action<R>>(
  actor: Actor,
  resource: R,
  action: A,
  ...subject: SubjectArgs<R, A>
): void {
  if (!can(actor, resource, action, ...subject)) {
    throw new ForbiddenError();
  }
}
