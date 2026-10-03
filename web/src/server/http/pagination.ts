import { z } from "zod";
import { parseQuery } from "./validation";

/** Same default page size as Laravel's paginate(). */
export const PER_PAGE = 15;

export type Paginated<T> = {
  data: T[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  /** 1-based position of the first item on this page, or null when empty. */
  from: number | null;
  to: number | null;
};

const pageSchema = z.object({ page: z.coerce.number().int().min(1).optional() });

/** Reads `?page=` (default 1). Invalid values produce a 422. */
export function pageFromRequest(request: Request): number {
  return parseQuery(request, pageSchema, { page: "página" }).page ?? 1;
}

/**
 * Runs a paginated query. `findMany` receives `skip`/`take` and must apply the
 * same filters as `count`; both run against the tenant-scoped `db`.
 */
export async function paginate<T>(
  page: number,
  query: {
    findMany: (args: { skip: number; take: number }) => Promise<T[]>;
    count: () => Promise<number>;
  },
  perPage: number = PER_PAGE,
): Promise<Paginated<T>> {
  const [total, data] = await Promise.all([
    query.count(),
    query.findMany({ skip: (page - 1) * perPage, take: perPage }),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = data.length > 0 ? (page - 1) * perPage + 1 : null;
  return {
    data,
    currentPage: page,
    lastPage,
    perPage,
    total,
    from,
    to: from === null ? null : from + data.length - 1,
  };
}
