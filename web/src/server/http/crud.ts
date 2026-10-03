import type { z } from "zod";
import { authorize } from "@/lib/authz/guard";
import { NotFoundError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { pageFromRequest, paginate } from "./pagination";
import { apiRoute, created, noContent } from "./route";
import { type FieldLabels, parseBody } from "./validation";

// Minimal shape of a Prisma model delegate, so one implementation serves every
// simple resource. Calls go through the tenant-scoped `db` (ADR-0005).
type Delegate = {
  findMany(args: object): Promise<unknown[]>;
  count(args: object): Promise<number>;
  findUnique(args: object): Promise<unknown | null>;
  create(args: object): Promise<unknown>;
  update(args: object): Promise<unknown>;
  delete(args: object): Promise<unknown>;
};

/** Route param → id. Anything that is not a positive integer is a 404 (legacy route binding). */
export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new NotFoundError();
  }
  return id;
}

/**
 * Route Handlers for a simple tenant-scoped resource with the legacy apiResource
 * behavior (index/store/show/update/destroy). Order of checks follows the legacy
 * Form Requests: 404 (record) → 403 (policy) → 422 (validation).
 *
 * - index: paginated, newest first by default (legacy `latest()->paginate()`).
 * - update: the same schema as create; absent optional fields keep their value,
 *   null clears them (legacy `$request->validated()`).
 */
export function crudRoutes<S extends z.ZodObject>(config: {
  resource: "customer" | "service" | "product" | "financialEntry";
  delegate: () => unknown;
  schema: S;
  labels: FieldLabels;
  present?: (record: never) => unknown;
  /** Listing order; default newest first (legacy `latest()`). */
  orderBy?: object[];
}) {
  const model = () => config.delegate() as Delegate;
  const present = (record: unknown) => (config.present ? config.present(record as never) : record);

  async function findOr404(id: number) {
    const record = await model().findUnique({ where: { id } });
    if (!record) throw new NotFoundError();
    return record;
  }

  const index = apiRoute(async ({ request, user }) => {
    authorize(user, config.resource, "viewAny");
    const page = pageFromRequest(request);
    const result = await paginate(page, {
      findMany: (args) => model().findMany({ orderBy: config.orderBy ?? [{ createdAt: "desc" }, { id: "desc" }], ...args }),
      count: () => model().count({}),
    });
    return { ...result, data: result.data.map(present) };
  });

  const store = apiRoute(async ({ request, user }) => {
    authorize(user, config.resource, "create");
    const input = await parseBody(request, config.schema, config.labels);
    const record = await model().create({ data: { ...input, tenantId: requireTenantId() } });
    return created(present(record));
  });

  const show = apiRoute<{ id: string }>(async ({ params, user }) => {
    const record = await findOr404(parseId(params.id));
    authorize(user, config.resource, "view");
    return present(record);
  });

  const update = apiRoute<{ id: string }>(async ({ request, params, user }) => {
    const id = parseId(params.id);
    await findOr404(id);
    authorize(user, config.resource, "update");
    const input = await parseBody(request, config.schema, config.labels);
    return present(await model().update({ where: { id }, data: input }));
  });

  const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
    const id = parseId(params.id);
    await findOr404(id);
    authorize(user, config.resource, "delete");
    await model().delete({ where: { id } });
    return noContent();
  });

  return {
    collection: { GET: index, POST: store },
    item: { GET: show, PUT: update, PATCH: update, DELETE: destroy },
  };
}
