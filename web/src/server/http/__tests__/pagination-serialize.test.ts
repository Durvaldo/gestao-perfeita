// @vitest-environment node
import { describe, expect, test } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { ValidationError } from "@/lib/http-errors";
import { pageFromRequest, paginate } from "@/server/http/pagination";
import { toJsonValue } from "@/server/http/serialize";

const items = Array.from({ length: 23 }, (_, i) => i + 1);
const source = {
  findMany: async ({ skip, take }: { skip: number; take: number }) => items.slice(skip, skip + take),
  count: async () => items.length,
};

describe("paginate", () => {
  test("first, last and out-of-range pages", async () => {
    expect(await paginate(1, source)).toMatchObject({ currentPage: 1, lastPage: 2, perPage: 15, total: 23, from: 1, to: 15 });
    const last = await paginate(2, source);
    expect(last).toMatchObject({ currentPage: 2, from: 16, to: 23 });
    expect(last.data).toHaveLength(8);
    expect(await paginate(5, source)).toMatchObject({ data: [], from: null, to: null, lastPage: 2 });
  });

  test("empty result has one (empty) page", async () => {
    const empty = await paginate(1, { findMany: async () => [], count: async () => 0 });
    expect(empty).toMatchObject({ total: 0, lastPage: 1, from: null, to: null });
  });

  test("reads ?page= and rejects invalid values with 422", () => {
    expect(pageFromRequest(new Request("http://x/api?page=3"))).toBe(3);
    expect(pageFromRequest(new Request("http://x/api"))).toBe(1);
    expect(() => pageFromRequest(new Request("http://x/api?page=0"))).toThrow(ValidationError);
    expect(() => pageFromRequest(new Request("http://x/api?page=abc"))).toThrow(ValidationError);
  });
});

describe("toJsonValue", () => {
  test("Decimals become fixed 2-decimal strings, dates ISO, recursively", () => {
    const value = {
      price: new Prisma.Decimal("45"),
      nested: [{ rate: new Prisma.Decimal("12.5"), at: new Date("2026-10-03T12:00:00Z") }],
      name: "Corte",
      missing: null,
    };

    expect(toJsonValue(value)).toEqual({
      price: "45.00",
      nested: [{ rate: "12.50", at: "2026-10-03T12:00:00.000Z" }],
      name: "Corte",
      missing: null,
    });
  });
});
