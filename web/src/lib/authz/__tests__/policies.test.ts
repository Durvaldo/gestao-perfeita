import { describe, expect, test } from "vitest";
import { authorize, requireUser } from "@/lib/authz/guard";
import { type Actor, can, policies, visibleProfessionals, visibleToActor } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/http-errors";

const admin: Actor = { id: 1, role: "admin", professional: null };
const professional: Actor = { id: 2, role: "professional", professional: { id: 10 } };
const professionalWithoutRecord: Actor = { id: 3, role: "professional", professional: null };
const superAdmin: Actor = { id: 4, role: "super_admin", professional: null };
const customer: Actor = { id: 5, role: "customer", professional: null };

const own = { professionalId: 10 };
const others = { professionalId: 99 };

// Expected permissions per resource/action, from backend/app/Policies.
// "own" = allowed for the admin, and for a professional only on their own records.
type Expectation = "admin" | "staff" | "own";
const matrix: Record<string, Record<string, Expectation>> = {
  customer: { viewAny: "staff", view: "staff", create: "admin", update: "admin", delete: "admin" },
  service: { viewAny: "staff", view: "staff", create: "admin", update: "admin", delete: "admin" },
  product: { viewAny: "staff", view: "staff", create: "admin", update: "admin", delete: "admin" },
  // SPEC-0001: a professional sees only their own record and schedule.
  professional: { viewAny: "staff", view: "own", create: "admin", update: "admin", delete: "admin" },
  workingHour: { viewAny: "own", view: "own", create: "own", update: "own", delete: "own" },
  appointment: { viewAny: "staff", view: "own", create: "staff", assignTo: "own", update: "own", delete: "admin" },
  order: { viewAny: "staff", view: "own", create: "staff", createFor: "own", update: "own" },
  financialEntry: { viewAny: "admin", view: "admin", create: "admin", update: "admin", delete: "admin" },
  dashboard: { view: "staff" },
};

// Dynamic access for the table-driven tests below.
const check = (actor: Actor, resource: string, action: string, subject?: unknown) =>
  (can as (a: Actor, r: string, ac: string, s?: unknown) => boolean)(actor, resource, action, subject);

describe("authorization policies", () => {
  test("the matrix covers every policy and action", () => {
    const actual = Object.fromEntries(Object.entries(policies).map(([r, actions]) => [r, Object.keys(actions).sort()]));
    const expected = Object.fromEntries(Object.entries(matrix).map(([r, actions]) => [r, Object.keys(actions).sort()]));
    expect(actual).toEqual(expected);
  });

  for (const [resource, actions] of Object.entries(matrix)) {
    for (const [action, expectation] of Object.entries(actions)) {
      test(`${resource}.${action} is "${expectation}"`, () => {
        expect(check(admin, resource, action, others)).toBe(true);

        if (expectation === "admin") {
          expect(check(professional, resource, action, own)).toBe(false);
        } else if (expectation === "staff") {
          expect(check(professional, resource, action, others)).toBe(true);
        } else {
          expect(check(professional, resource, action, own)).toBe(true);
          expect(check(professional, resource, action, others)).toBe(false);
          expect(check(professionalWithoutRecord, resource, action, own)).toBe(false);
        }

        // Legacy policies grant nothing to super_admin or customer.
        expect(check(superAdmin, resource, action, own)).toBe(false);
        expect(check(customer, resource, action, own)).toBe(false);
      });
    }
  }

  test("typed calls: rules without a subject take no record", () => {
    expect(can(admin, "customer", "create")).toBe(true);
    expect(can(professional, "appointment", "update", own)).toBe(true);
    // Ownership rules require the record; forgetting it must not compile.
    // @ts-expect-error missing subject
    expect(() => can(professional, "appointment", "update")).toThrow();
  });

  test("professionals only list their own records", () => {
    expect(visibleToActor(admin)).toEqual({});
    expect(visibleToActor(professional)).toEqual({ professionalId: 10 });
    expect(visibleToActor(professionalWithoutRecord)).toEqual({ professionalId: -1 });
  });

  test("professionals only list their own professional record", () => {
    expect(visibleProfessionals(admin)).toEqual({});
    expect(visibleProfessionals(professional)).toEqual({ id: 10 });
    expect(visibleProfessionals(professionalWithoutRecord)).toEqual({ id: -1 });
  });
});

describe("guards", () => {
  test("requireUser throws 401 without a session", () => {
    expect(() => requireUser(null)).toThrow(UnauthenticatedError);
    expect(requireUser(admin)).toBe(admin);
  });

  test("authorize throws 403 when not allowed", () => {
    expect(() => authorize(professional, "financialEntry", "viewAny")).toThrow(ForbiddenError);
    expect(() => authorize(professional, "order", "update", others)).toThrow(ForbiddenError);
    expect(() => authorize(professional, "order", "update", own)).not.toThrow();
  });
});
