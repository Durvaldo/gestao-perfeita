import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { authorize } from "@/lib/authz/guard";
import { visibleToActor } from "@/lib/authz/policies";
import type { CurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/http-errors";
import { requireTenantId } from "@/lib/tenancy/context";
import { zonedParts } from "@/lib/timezone";
import { parseId } from "@/server/http/crud";
import { integer } from "@/server/http/fields";
import { pageFromRequest, paginate } from "@/server/http/pagination";
import { assertReferencesInTenant } from "@/server/http/references";
import { apiRoute, created, noContent } from "@/server/http/route";
import { parseBody } from "@/server/http/validation";

// Legacy: ComandaRequest/ComandaItemRequest/ComandaFecharRequest + ComandaController
// ("comanda" → Order, ADR-0003). Business decisions in ADR-0011.

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export const createOrderSchema = z
  .object({
    appointmentId: integer().nullable().optional(),
    customerId: integer().optional(),
    professionalId: integer().optional(),
  })
  .superRefine((v, ctx) => {
    // Legacy required_without:agendamento_id.
    if (!v.appointmentId) {
      if (v.customerId === undefined) ctx.addIssue({ code: "custom", path: ["customerId"], message: "O campo cliente é obrigatório quando não há agendamento." });
      if (v.professionalId === undefined) ctx.addIssue({ code: "custom", path: ["professionalId"], message: "O campo barbeiro é obrigatório quando não há agendamento." });
    }
  });

export const addItemSchema = z
  .object({
    type: z.enum(["service", "product"]),
    serviceId: integer().nullable().optional(),
    productId: integer().nullable().optional(),
    quantity: integer(1).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    // Legacy required_if:tipo,servico / required_if:tipo,produto.
    if (v.type === "service" && !v.serviceId) ctx.addIssue({ code: "custom", path: ["serviceId"], message: "O campo serviço é obrigatório." });
    if (v.type === "product" && !v.productId) ctx.addIssue({ code: "custom", path: ["productId"], message: "O campo produto é obrigatório." });
  });

export const closeOrderSchema = z.object({
  paymentMethod: z.enum(["cash", "pix", "debit_card", "credit_card"]),
});

export const orderLabels = {
  appointmentId: "agendamento",
  customerId: "cliente",
  professionalId: "barbeiro",
  type: "tipo",
  serviceId: "serviço",
  productId: "produto",
  quantity: "quantidade",
  paymentMethod: "forma de pagamento",
};

const include = {
  customer: { select: { id: true, name: true } },
  professional: { select: { id: true, user: { select: { id: true, name: true } } } },
  items: {
    include: { service: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.OrderInclude;

const closedError = () => ValidationError.field("order", "Esta comanda já foi fechada.");

async function findOr404(id: number, client: Tx | typeof db = db) {
  const order = await client.order.findUnique({ where: { id }, include });
  if (!order) throw new NotFoundError();
  return order;
}

/**
 * Serializes every change to one order (add/remove item, close) for the rest of
 * the transaction, so two concurrent requests cannot, e.g., close it twice and post
 * two financial entries (the legacy app had this race). ADR-0011.
 */
async function lockOrder(tx: Tx, orderId: number) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(3, ${orderId}::int)::text`;
}

/** total_amount = sum of item totals (legacy recalcularValorTotal). */
async function recalculateTotal(tx: Tx, orderId: number) {
  const { _sum } = await tx.orderItem.aggregate({ where: { orderId }, _sum: { totalPrice: true } });
  await tx.order.update({ where: { id: orderId }, data: { totalAmount: _sum.totalPrice ?? "0" } });
}

/** Today's calendar date in the barbershop's time zone, as a date-only value (ADR-0009). */
function todayIn(user: CurrentUser): Date {
  const { date } = zonedParts(new Date(), user.tenant?.timezone ?? "America/Sao_Paulo");
  return new Date(`${date}T00:00:00Z`);
}

// GET /api/orders
const index = apiRoute(async ({ request, user }) => {
  authorize(user, "order", "viewAny");
  const where = visibleToActor(user);
  return paginate(pageFromRequest(request), {
    findMany: (args) => db.order.findMany({ where, include, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...args }),
    count: () => db.order.count({ where }),
  });
});

// POST /api/orders — from an appointment (prefilled with its services) or walk-in.
const store = apiRoute(async ({ request, user }) => {
  authorize(user, "order", "create");
  const input = await parseBody(request, createOrderSchema, orderLabels);
  await assertReferencesInTenant(
    {
      appointmentId: { model: "appointment", id: input.appointmentId },
      customerId: { model: "customer", id: input.appointmentId ? undefined : input.customerId },
      professionalId: { model: "professional", id: input.appointmentId ? undefined : input.professionalId },
    },
    orderLabels,
  );

  const order = await db.$transaction(async (tx) => {
    const appointment = input.appointmentId
      ? await tx.appointment.findUniqueOrThrow({ where: { id: input.appointmentId }, include: { services: true } })
      : null;

    if (appointment) {
      // One order per appointment (ADR-0011): no billing twice, no billing a cancellation.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(2, ${appointment.id}::int)::text`;
      if (appointment.status === "cancelled") {
        throw ValidationError.field("appointmentId", "Não é possível abrir comanda de um agendamento cancelado.");
      }
      const existing = await tx.order.count({ where: { appointmentId: appointment.id, status: { not: "cancelled" } } });
      if (existing > 0) {
        throw ValidationError.field("appointmentId", "Este agendamento já tem uma comanda.");
      }
    }

    const created = await tx.order.create({
      data: {
        tenantId: requireTenantId(),
        appointmentId: appointment?.id ?? null,
        customerId: appointment?.customerId ?? input.customerId!,
        professionalId: appointment?.professionalId ?? input.professionalId!,
        // One service item per appointment service, at its frozen price.
        items: appointment
          ? {
              create: appointment.services.map((s) => ({
                type: "service" as const,
                serviceId: s.serviceId,
                quantity: 1,
                unitPrice: s.priceAtBooking,
                totalPrice: s.priceAtBooking,
              })),
            }
          : undefined,
      },
    });
    await recalculateTotal(tx, created.id);
    return findOr404(created.id, tx);
  });

  return created(order);
});

// GET /api/orders/[id]
const show = apiRoute<{ id: string }>(async ({ params, user }) => {
  const order = await findOr404(parseId(params.id));
  authorize(user, "order", "view", order);
  return order;
});

// POST /api/orders/[id]/items
const addItem = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const current = await findOr404(parseId(params.id));
  authorize(user, "order", "update", current);
  const input = await parseBody(request, addItemSchema, orderLabels);
  const isProduct = input.type === "product";
  await assertReferencesInTenant(
    isProduct ? { productId: { model: "product", id: input.productId } } : { serviceId: { model: "service", id: input.serviceId } },
    orderLabels,
  );
  const quantity = input.quantity ?? 1;

  const item = await db.$transaction(async (tx) => {
    await lockOrder(tx, current.id);
    const order = await tx.order.findUniqueOrThrow({ where: { id: current.id } });
    if (order.status !== "open") throw closedError();

    let unitPrice: Prisma.Decimal;
    if (isProduct) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId! } });
      unitPrice = product.price;
      if (product.stockQuantity !== null) {
        // Conditional, atomic decrement: never below zero (ADR-0011).
        const { count } = await tx.product.updateMany({
          where: { id: product.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (count === 0) {
          const left = (await tx.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity ?? 0;
          throw ValidationError.field(
            "quantity",
            left === 1 ? "Estoque insuficiente: resta 1 unidade." : `Estoque insuficiente: restam ${left} unidades.`,
          );
        }
      }
    } else {
      unitPrice = (await tx.service.findUniqueOrThrow({ where: { id: input.serviceId! } })).price;
    }

    const createdItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        type: input.type,
        serviceId: isProduct ? null : input.serviceId!,
        productId: isProduct ? input.productId! : null,
        quantity,
        unitPrice,
        totalPrice: unitPrice.times(quantity),
      },
      include: { service: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
    });
    await recalculateTotal(tx, order.id);
    return createdItem;
  });

  return created(item);
});

// DELETE /api/orders/[id]/items/[itemId]
const removeItem = apiRoute<{ id: string; itemId: string }>(async ({ params, user }) => {
  const current = await findOr404(parseId(params.id));
  authorize(user, "order", "update", current);
  const itemId = parseId(params.itemId);

  await db.$transaction(async (tx) => {
    await lockOrder(tx, current.id);
    const order = await tx.order.findUniqueOrThrow({ where: { id: current.id } });
    if (order.status !== "open") throw closedError();
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { product: true } });
    if (!item || item.orderId !== order.id) throw new NotFoundError();

    if (item.product && item.product.stockQuantity !== null) {
      await tx.product.update({ where: { id: item.product.id }, data: { stockQuantity: { increment: item.quantity } } });
    }
    await tx.orderItem.delete({ where: { id: item.id } });
    await recalculateTotal(tx, order.id);
  });

  return noContent();
});

// POST /api/orders/[id]/close — payment method, frozen total, financial entry, appointment completed.
const close = apiRoute<{ id: string }>(async ({ request, params, user }) => {
  const current = await findOr404(parseId(params.id));
  authorize(user, "order", "update", current);
  const input = await parseBody(request, closeOrderSchema, orderLabels);

  const order = await db.$transaction(async (tx) => {
    await lockOrder(tx, current.id);
    const fresh = await tx.order.findUniqueOrThrow({ where: { id: current.id } });
    if (fresh.status !== "open") throw closedError();
    if ((await tx.orderItem.count({ where: { orderId: fresh.id } })) === 0) {
      throw ValidationError.field("items", "Adicione ao menos um item antes de fechar a comanda.");
    }

    await recalculateTotal(tx, fresh.id);
    const paid = await tx.order.update({
      where: { id: fresh.id },
      // paid_at: the real payment date, used by the commission report (ADR-0003).
      data: { paymentMethod: input.paymentMethod, status: "paid", paidAt: new Date() },
    });
    await tx.financialEntry.create({
      data: {
        tenantId: requireTenantId(),
        type: "income",
        // Category values are user-facing data, kept as in the legacy app.
        category: "venda",
        description: `Comanda #${paid.id}`,
        amount: paid.totalAmount,
        entryDate: todayIn(user),
      },
    });
    if (paid.appointmentId) {
      await tx.appointment.update({ where: { id: paid.appointmentId }, data: { status: "completed" } });
    }
    return findOr404(paid.id, tx);
  });

  return order;
});

export const orderRoutes = {
  collection: { GET: index, POST: store },
  item: { GET: show },
  items: { POST: addItem },
  itemById: { DELETE: removeItem },
  close: { POST: close },
};
