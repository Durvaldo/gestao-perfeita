// @vitest-environment node
// Port of backend/tests/Feature/Cadastro/BarbeiroApiTest.php, plus deactivation
// (ADR-0008), atomic creation and validation.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/current-user";
import { unscopedDb } from "@/lib/db";
import { professionalRoutes } from "@/server/professionals/professionals";
import { seed } from "../../../prisma/seed-data";
import { call, loginCookie } from "../../../tests/api";
import { truncateAll } from "../../../tests/db";

const { collection, item } = professionalRoutes;

let admin: string;
let professional: string;
let tenantA: number;
let tenantB: number;

const newProfessional = (email: string) => ({
  name: "João Barbeiro",
  email,
  password: "senha1234",
  defaultCommissionRate: 30,
});

async function signInError(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (error) {
    if (error instanceof APIError) return error;
    throw error;
  }
  return null;
}

describe("professionals API", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(unscopedDb);
    [tenantA, tenantB] = (await unscopedDb.tenant.findMany({ orderBy: { id: "asc" } })).map((t) => t.id);
    admin = await loginCookie("admin@barbearia-centro.com");
    professional = await loginCookie("rafael@barbearia-centro.com");
  });
  afterAll(() => unscopedDb.$disconnect());

  test("admin creates a professional with its own user account, who can then sign in", async () => {
    const res = await call(collection.POST, { cookie: admin, body: newProfessional("joao@barbearia-teste.com") });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tenantId: tenantA,
      defaultCommissionRate: "30.00",
      active: true,
      user: { name: "João Barbeiro", email: "joao@barbearia-teste.com" },
    });
    const user = await unscopedDb.user.findUniqueOrThrow({ where: { email: "joao@barbearia-teste.com" } });
    expect(user).toMatchObject({ role: "professional", tenantId: tenantA });
    expect(res.body).not.toHaveProperty("user.password");

    const cookie = await loginCookie("joao@barbearia-teste.com", "senha1234");
    expect((await getCurrentUser(new Headers({ cookie })))?.professional?.id).toBe(res.body.id);
  });

  test("rejects an e-mail already in use and invalid fields", async () => {
    const duplicate = await call(collection.POST, { cookie: admin, body: newProfessional("carlos@barbearia-centro.com") });
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.errors).toEqual({ email: ["Este e-mail já está em uso."] });

    const invalid = await call(collection.POST, {
      cookie: admin,
      body: { name: "X", email: "invalido", password: "123", defaultCommissionRate: 150, photoUrl: "foto" },
    });
    expect(invalid.body.errors).toEqual({
      email: ["O campo e-mail deve ser um endereço de e-mail válido."],
      password: ["O campo senha deve ter ao menos 8 caracteres."],
      defaultCommissionRate: ["O campo percentual de comissão padrão não deve ser maior que 100."],
      photoUrl: ["O campo foto deve ser uma URL válida."],
    });
  });

  test("the professional's phone is optional and stored as digits only (SPEC-0005)", async () => {
    const withPhone = await call(collection.POST, {
      cookie: admin,
      body: { ...newProfessional("fone@barbearia-teste.com"), phone: "(11) 97777-6666" },
    });
    expect(withPhone.status).toBe(201);
    expect(withPhone.body.user.phone).toBe("11977776666");

    const invalid = await call(collection.POST, { cookie: admin, body: { ...newProfessional("fone2@barbearia-teste.com"), phone: "1234" } });
    expect(invalid.body.errors).toEqual({ phone: ["O telefone deve ter DDD e 8 ou 9 dígitos."] });

    const without = await call(collection.POST, { cookie: admin, body: { ...newProfessional("fone3@barbearia-teste.com"), phone: "" } });
    expect(without.status).toBe(201);
    expect(without.body.user.phone).toBeNull();
  });

  test("creation is atomic: if a later step fails, the user is not kept", async () => {
    // Make the login-account insert fail (unique providerId+accountId) for the next user id.
    const [{ next }] = await unscopedDb.$queryRaw<{ next: bigint }[]>`
      SELECT last_value + 1 AS next FROM users_id_seq`;
    const someone = await unscopedDb.user.findFirstOrThrow();
    await unscopedDb.account.create({ data: { providerId: "credential", accountId: String(next), userId: someone.id } });

    const res = await call(collection.POST, { cookie: admin, body: newProfessional("atomico@barbearia-teste.com") }).catch(
      (error: unknown) => ({ status: 500, body: String(error) }),
    );

    expect(res.status).toBe(500);
    expect(await unscopedDb.user.findUnique({ where: { email: "atomico@barbearia-teste.com" } })).toBeNull();
  });

  test("admin updates the profile (legacy fields only)", async () => {
    const target = await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } });

    const res = await call(item.PUT, {
      method: "PUT",
      cookie: admin,
      params: { id: String(target.id) },
      body: { defaultCommissionRate: 45, active: true, name: "Ignorado" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ defaultCommissionRate: "45.00", active: true, user: { name: "Carlos Souza" } });
  });

  test("delete deactivates: record kept, sessions revoked, sign-in blocked; reactivation restores access", async () => {
    const created = await call(collection.POST, { cookie: admin, body: newProfessional("saindo@barbearia-teste.com") });
    const id = String(created.body.id);
    const session = await loginCookie("saindo@barbearia-teste.com", "senha1234");
    expect(await getCurrentUser(new Headers({ cookie: session }))).not.toBeNull();

    expect((await call(item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(204);

    expect((await call(item.GET, { cookie: admin, params: { id } })).body.active).toBe(false);
    expect(await getCurrentUser(new Headers({ cookie: session }))).toBeNull();
    const blocked = await signInError("saindo@barbearia-teste.com", "senha1234");
    expect(blocked?.body?.code).toBe("ACCOUNT_DISABLED");
    expect(authErrorMessage(blocked?.body)).toBe("Seu acesso está desativado. Fale com o administrador da barbearia.");

    await call(item.PUT, { method: "PUT", cookie: admin, params: { id }, body: { defaultCommissionRate: 30, active: true } });
    expect(await signInError("saindo@barbearia-teste.com", "senha1234")).toBeNull();
  });

  test("deactivating through update also revokes sessions", async () => {
    const created = await call(collection.POST, { cookie: admin, body: newProfessional("pausa@barbearia-teste.com") });
    const session = await loginCookie("pausa@barbearia-teste.com", "senha1234");

    await call(item.PUT, { method: "PUT", cookie: admin, params: { id: String(created.body.id) }, body: { defaultCommissionRate: 30, active: false } });

    expect(await unscopedDb.session.count({ where: { userId: created.body.user.id } })).toBe(0);
    expect(await getCurrentUser(new Headers({ cookie: session }))).toBeNull();
  });

  test("a professional only lists and reads their own record (SPEC-0001)", async () => {
    const rafael = await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "rafael@barbearia-centro.com" } } });
    const carlos = await unscopedDb.professional.findFirstOrThrow({ where: { user: { email: "carlos@barbearia-centro.com" } } });

    const list = await call(collection.GET, { cookie: professional });
    expect(list.status).toBe(200);
    expect(list.body.data.map((p: { id: number }) => p.id)).toEqual([rafael.id]);
    expect(list.body.total).toBe(1);

    expect((await call(item.GET, { cookie: professional, params: { id: String(rafael.id) } })).status).toBe(200);
    expect((await call(item.GET, { cookie: professional, params: { id: String(carlos.id) } })).status).toBe(403);

    // The admin still lists everyone.
    expect((await call(collection.GET, { cookie: admin })).body.total).toBeGreaterThan(1);
  });

  test("professional can list but not create or manage", async () => {
    const target = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantA } });
    const id = String(target.id);

    expect((await call(collection.GET, { cookie: professional })).status).toBe(200);
    expect((await call(collection.POST, { cookie: professional, body: newProfessional("outro@teste.com") })).status).toBe(403);
    expect((await call(item.PUT, { method: "PUT", cookie: professional, params: { id }, body: { defaultCommissionRate: 45 } })).status).toBe(403);
    expect((await call(item.DELETE, { method: "DELETE", cookie: professional, params: { id } })).status).toBe(403);
  });

  test("professionals are isolated per tenant", async () => {
    const other = await unscopedDb.professional.findFirstOrThrow({ where: { tenantId: tenantB } });
    const id = String(other.id);

    expect((await call(item.GET, { cookie: admin, params: { id } })).status).toBe(404);
    expect((await call(item.DELETE, { method: "DELETE", cookie: admin, params: { id } })).status).toBe(404);
    const list = await call(collection.GET, { cookie: admin });
    expect(list.body.data.every((p: { tenantId: number }) => p.tenantId === tenantA)).toBe(true);
    expect((await unscopedDb.professional.findUniqueOrThrow({ where: { id: other.id } })).active).toBe(true);
  });
});
