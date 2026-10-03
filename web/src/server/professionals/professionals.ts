import { z } from "zod";
import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { requireTenantId } from "@/lib/tenancy/context";
import { parseId } from "@/server/http/crud";
import { boolean, decimal, optionalText, text } from "@/server/http/fields";
import { pageFromRequest, paginate } from "@/server/http/pagination";
import { apiRoute, created, noContent } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";

// Legacy: BarbeiroRequest + BarbeiroController ("barbeiro" → Professional, ADR-0003).

const profileFields = {
  defaultCommissionRate: decimal({ min: 0, max: 100 }),
  photoUrl: z.url().nullable().optional(),
  active: boolean().optional(),
};

/** Create also creates the user account (name, e-mail, password). */
export const createProfessionalSchema = z.object({
  name: text(255),
  email: z.email().max(255),
  password: z.string().min(8),
  phone: optionalText(30),
  ...profileFields,
});

/** Update changes only the professional profile, like the legacy app. */
export const updateProfessionalSchema = z.object(profileFields);

export const professionalLabels = {
  name: "nome",
  email: "e-mail",
  password: "senha",
  phone: "telefone",
  defaultCommissionRate: "percentual de comissão padrão",
  photoUrl: "foto",
  active: "ativo",
};

const withUser = { user: { select: { id: true, name: true, email: true, phone: true } } } as const;

async function findOr404(id: number) {
  const professional = await db.professional.findUnique({ where: { id }, include: withUser });
  if (!professional) throw new NotFoundError();
  return professional;
}

/** Ends every session of the professional's user, so access is lost at once (ADR-0008). */
async function revokeSessions(userId: number) {
  await db.session.deleteMany({ where: { userId } });
}

const index = apiRoute(async ({ request, user }) => {
  authorize(user, "professional", "viewAny");
  return paginate(pageFromRequest(request), {
    findMany: (args) => db.professional.findMany({ include: withUser, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...args }),
    count: () => db.professional.count(),
  });
});

const store = apiRoute(async ({ request, user }) => {
  authorize(user, "professional", "create");
  const input = await parseBody(request, createProfessionalSchema, professionalLabels);

  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw ValidationError.field("email", "Este e-mail já está em uso.");
  }

  const tenantId = requireTenantId();
  const passwordHash = await hashPassword(input.password);

  // User + login account + professional are created together or not at all.
  const professional = await db.$transaction(async (tx) => {
    const account = await tx.user.create({
      data: { name: input.name, email: input.email, phone: input.phone ?? null, role: "professional", tenantId },
    });
    await tx.account.create({
      data: { providerId: "credential", accountId: String(account.id), userId: account.id, password: passwordHash },
    });
    return tx.professional.create({
      data: {
        tenantId,
        userId: account.id,
        defaultCommissionRate: input.defaultCommissionRate,
        photoUrl: input.photoUrl ?? null,
        active: input.active ?? true,
      },
      include: withUser,
    });
  });

  return created(professional);
});

const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const professional = await findOr404(parseId(params.id));
  authorize(user, "professional", "view");
  return professional;
});

const update = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const id = parseId(params.id);
  const current = await findOr404(id);
  authorize(user, "professional", "update");
  const input = await parseBody(request, updateProfessionalSchema, professionalLabels);

  const professional = await db.professional.update({ where: { id }, data: input, include: withUser });
  if (current.active && !professional.active) {
    await revokeSessions(professional.userId);
  }
  return professional;
});

/**
 * "Delete" deactivates instead (ADR-0008): the professional is kept (history of
 * appointments/orders stays intact), access is blocked and sessions are revoked.
 */
const destroy = apiRoute<{ id: string }>(async ({ params, user }) => {
  const id = parseId(params.id);
  const professional = await findOr404(id);
  authorize(user, "professional", "delete");
  await db.$transaction(async (tx) => {
    await tx.professional.update({ where: { id }, data: { active: false } });
    await tx.session.deleteMany({ where: { userId: professional.userId } });
  });
  return noContent();
});

export const professionalRoutes = {
  collection: { GET: index, POST: store },
  item: { GET: show, PUT: update, PATCH: update, DELETE: destroy },
};
