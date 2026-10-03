import type { UserRole } from "@/generated/prisma/enums";

// Role-based permissions, ported from backend/app/Policies (ADR-0006).
// Pure functions: no database access, so every rule is unit-testable.

/** The parts of the current user that authorization needs (see getCurrentUser()). */
export type Actor = {
  id: number;
  role: UserRole;
  professional: { id: number } | null;
};

/** Records owned by a professional (appointments, orders, working hours). */
type OwnedByProfessional = { professionalId: number };

type Rule<S = undefined> = (actor: Actor, subject: S) => boolean;

const isAdmin = (actor: Actor) => actor.role === "admin";
// Panel users: tenant admins and professionals. super_admin and customer have no
// panel permissions, same as the legacy policies.
const isStaff = (actor: Actor) => actor.role === "admin" || actor.role === "professional";
const ownsRecord = (actor: Actor, subject: OwnedByProfessional) =>
  actor.role === "professional" && actor.professional !== null && actor.professional.id === subject.professionalId;

const adminOrOwner: Rule<OwnedByProfessional> = (actor, subject) => isAdmin(actor) || ownsRecord(actor, subject);

// Catalog-like resources: staff can read, only admins can write.
const catalogPolicy = {
  viewAny: isStaff,
  view: isStaff,
  create: isAdmin,
  update: isAdmin,
  delete: isAdmin,
};

export const policies = {
  customer: catalogPolicy,
  service: catalogPolicy,
  product: catalogPolicy,
  professional: catalogPolicy,
  workingHour: {
    viewAny: isStaff,
    view: isStaff,
    // Subject: the professional whose schedule is being changed.
    create: adminOrOwner,
    update: adminOrOwner,
    delete: adminOrOwner,
  },
  appointment: {
    viewAny: isStaff,
    view: adminOrOwner,
    // Legacy parity: a professional may book for any professional of the tenant.
    create: isStaff,
    update: adminOrOwner,
    delete: isAdmin,
  },
  order: {
    viewAny: isStaff,
    view: adminOrOwner,
    // Legacy parity: a professional may open an order for any professional.
    create: isStaff,
    update: adminOrOwner,
  },
  financialEntry: {
    viewAny: isAdmin,
    view: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Same rule as the legacy DashboardController (Comanda::viewAny).
  dashboard: {
    view: isStaff,
  },
} satisfies Record<string, Record<string, Rule<never>>>;

export type Resource = keyof typeof policies;
export type Action<R extends Resource> = keyof (typeof policies)[R] & string;
// Rules declared with only `actor` take no subject; a two-parameter function is
// not assignable to a one-parameter one, so this check tells them apart.
type SubjectOf<R extends Resource, A extends Action<R>> = (typeof policies)[R][A] extends (actor: Actor) => boolean
  ? undefined
  : (typeof policies)[R][A] extends Rule<infer S>
    ? S
    : never;
/** Extra argument of can()/authorize(): the record, for rules that check ownership. */
export type SubjectArgs<R extends Resource, A extends Action<R>> = SubjectOf<R, A> extends undefined ? [] : [SubjectOf<R, A>];

/** Whether `actor` may perform `action` on `resource` (optionally on a specific record). */
export function can<R extends Resource, A extends Action<R>>(
  actor: Actor,
  resource: R,
  action: A,
  ...subject: SubjectArgs<R, A>
): boolean {
  const rule = policies[resource][action] as Rule<unknown>;
  return rule(actor, subject[0]);
}

/**
 * Prisma `where` restricting a listing to the records the actor may see
 * (legacy: professionals only list their own appointments/orders).
 */
export function visibleToActor(actor: Actor): { professionalId?: number } {
  if (actor.role === "professional") {
    // A professional user without a professional record sees nothing.
    return { professionalId: actor.professional?.id ?? -1 };
  }
  return {};
}
