// @vitest-environment node
//
// Example operation using the full server stack (ADR-0007):
// session → tenant → authorization → validation → tenant FK check →
// transaction → serialized response. The handlers below are defined here only
// to exercise the conventions; real modules follow the same shape.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { authorize } from "@/lib/authz/guard";
import { db, unscopedDb } from "@/lib/db";
import { NotFoundError } from "@/lib/http-errors";
import { requireTenantId, runWithTenant } from "@/lib/tenancy/context";
import { pageFromRequest, paginate } from "@/server/http/pagination";
import { assertReferencesInTenant } from "@/server/http/references";
import { apiRoute, created } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";
import { SEED_PASSWORD, seed } from "../../../../prisma/seed-data";
import { truncateAll } from "../../../../tests/db";

const blockSchema = z.object({
  professionalId: z.number().int(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  reason: z.string().max(255).nullable().optional(),
});
const blockLabels = { professionalId: "profissional", startsAt: "início", endsAt: "fim", reason: "motivo" };

// POST /api/schedule-blocks (example)
const createBlock = apiRoute(async ({ request, user }) => {
  const input = await parseBody(request, blockSchema, blockLabels);
  authorize(user, "workingHour", "create", { professionalId: input.professionalId });
  await assertReferencesInTenant({ professionalId: { model: "professional", id: input.professionalId } }, blockLabels);
  const block = await db.$transaction((tx) =>
    tx.scheduleBlock.create({
      data: {
        tenantId: requireTenantId(), // explicit and typed; the tenant extension checks it matches
        professionalId: input.professionalId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        reason: input.reason ?? null,
      },
    }),
  );
  return created(block);
});

// GET /api/products (example)
const listProducts = apiRoute(async ({ request, user }) => {
  authorize(user, "product", "viewAny");
  const where = {};
  return paginate(pageFromRequest(request), {
    findMany: (args) => db.product.findMany({ where, orderBy: { id: "asc" }, ...args }),
    count: () => db.product.count({ where }),
  });
});

// GET /api/products/[id] (example)
const showProduct = apiRoute<{ id: string }>(async ({ params, user }) => {
  authorize(user, "product", "view");
  const product = await db.product.findUnique({ where: { id: Number(params.id) } });
  if (!product) throw new NotFoundError();
  return product;
});

const noParams = { params: Promise.resolve({} as Record<string, never>) };
let cookies: Record<string, string> = {};
let ids: { tenantA: number; tenantB: number; proA: number; proB: number; productB: number };

async function login(email: string): Promise<string> {
  const { headers } = await auth.api.signInEmail({ body: { email, password: SEED_PASSWORD }, returnHeaders: true });
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

function request(path: string, init: { cookie?: string; body?: unknown } = {}) {
  return new Request(`http://localhost:3001${path}`, {
    method: init.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function json(response: Response) {
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

describe("server API conventions (full stack)", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    const [tenantA, tenantB] = await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } });
    const proA = await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } });
    const proB = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB.id } });
    const productB = await unscopedDb.product.findFirstOrThrow({ where: { tenantId: tenantB.id } });
    ids = { tenantA: tenantA.id, tenantB: tenantB.id, proA: proA.id, proB: proB.id, productB: productB.id };
    cookies = {
      admin: await login("admin@barbearia-centro.com"),
      professional: await login("rafael@barbearia-centro.com"),
      superAdmin: await login("superadmin@agenda.com"),
    };
  });
  afterAll(() => unscopedDb.$disconnect());

  const validBlock = () => ({
    professionalId: ids.proA,
    startsAt: "2026-10-10T12:00:00Z",
    endsAt: "2026-10-10T13:00:00Z",
    reason: "  Consulta médica  ",
  });

  test("401 without a session", async () => {
    expect(await json(await listProducts(request("/api/products"), noParams))).toEqual({
      status: 401,
      body: { message: "Não autenticado." },
    });
  });

  test("403 for a user without tenant (super_admin)", async () => {
    const res = await json(await listProducts(request("/api/products", { cookie: cookies.superAdmin }), noParams));
    expect(res).toEqual({ status: 403, body: { message: "Esta ação não é autorizada." } });
  });

  test("403 when the policy denies (professional changing someone else's schedule)", async () => {
    const res = await json(await createBlock(request("/api/schedule-blocks", { cookie: cookies.professional, body: validBlock() }), noParams));
    expect(res.status).toBe(403);
  });

  test("422 with field messages for invalid input", async () => {
    const res = await json(
      await createBlock(request("/api/schedule-blocks", { cookie: cookies.admin, body: { startsAt: "amanhã" } }), noParams),
    );

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual({
      professionalId: ["O campo profissional é obrigatório."],
      startsAt: ["O campo início deve ser uma data válida."],
      endsAt: ["O campo fim é obrigatório."],
    });
    expect(res.body.message).toBe("O campo profissional é obrigatório. (e mais 2 erros)");
  });

  test("422 when a foreign key belongs to another tenant", async () => {
    const res = await json(
      await createBlock(request("/api/schedule-blocks", { cookie: cookies.admin, body: { ...validBlock(), professionalId: ids.proB } }), noParams),
    );

    expect(res).toEqual({
      status: 422,
      body: {
        message: "O valor selecionado para profissional é inválido.",
        errors: { professionalId: ["O valor selecionado para profissional é inválido."] },
      },
    });
  });

  test("201 on create, with tenant filled in and input normalized", async () => {
    const res = await json(await createBlock(request("/api/schedule-blocks", { cookie: cookies.admin, body: validBlock() }), noParams));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ tenantId: ids.tenantA, professionalId: ids.proA, reason: "Consulta médica" });
    expect(res.body.startsAt).toBe("2026-10-10T12:00:00.000Z");
  });

  test("paginated listing, scoped to the tenant, with Decimals as strings", async () => {
    const res = await json(await listProducts(request("/api/products?page=1", { cookie: cookies.admin }), noParams));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currentPage: 1, lastPage: 1, perPage: 15, total: 3, from: 1, to: 3 });
    expect(res.body.data.every((p: { tenantId: number }) => p.tenantId === ids.tenantA)).toBe(true);
    expect(res.body.data[0].price).toMatch(/^\d+\.\d{2}$/);
  });

  test("another tenant's record by id is a 404", async () => {
    const res = await json(
      await showProduct(request(`/api/products/${ids.productB}`, { cookie: cookies.admin }), {
        params: Promise.resolve({ id: String(ids.productB) }),
      }),
    );
    expect(res).toEqual({ status: 404, body: { message: "Registro não encontrado." } });
  });

  test("interactive transactions are tenant-scoped and roll back on error", async () => {
    await runWithTenant(ids.tenantA, async () => {
      await expect(
        db.$transaction(async (tx) => {
          expect(await tx.product.count()).toBe(3); // only tenant A's products
          await tx.product.create({ data: { name: "Temporário", price: "1.00" } as never });
          throw new Error("rollback");
        }),
      ).rejects.toThrow("rollback");

      expect(await db.product.findFirst({ where: { name: "Temporário" } })).toBeNull();
    });
  });
});
