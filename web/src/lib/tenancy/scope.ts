import type { PrismaClient } from "@/generated/prisma/client";
import { requireTenantId } from "./context";

// Models with a tenant_id column: filtered by it and filled in on create.
const DIRECT_MODELS = new Set([
  "Customer",
  "Professional",
  "Service",
  "Product",
  "ScheduleBlock",
  "Appointment",
  "Order",
  "FinancialEntry",
]);

// Models without tenant_id, scoped through a parent that has one. The legacy app
// left these unscoped (e.g. working hours could be edited by id across tenants).
const INDIRECT_MODELS: Record<string, { relation: string; foreignKey: string; parent: string }> = {
  WorkingHour: { relation: "professional", foreignKey: "professionalId", parent: "professional" },
  ProfessionalService: { relation: "professional", foreignKey: "professionalId", parent: "professional" },
  AppointmentService: { relation: "appointment", foreignKey: "appointmentId", parent: "appointment" },
  OrderItem: { relation: "order", foreignKey: "orderId", parent: "order" },
};

// Operations whose `where` must be restricted to the current tenant.
const FILTERED_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

type Args = Record<string, unknown>;
type Data = Record<string, unknown>;

export function isTenantScoped(model: string | undefined): boolean {
  return model !== undefined && (DIRECT_MODELS.has(model) || model in INDIRECT_MODELS);
}

function tenantFilter(model: string, tenantId: number): Record<string, unknown> {
  if (DIRECT_MODELS.has(model)) {
    return { tenantId };
  }
  return { [INDIRECT_MODELS[model].relation]: { tenantId } };
}

// Adds the tenant filter under AND, so it never replaces the caller's conditions
// and keeps unique fields at the top level (required by findUnique/update/delete).
function scopeWhere(where: unknown, filter: Record<string, unknown>): Record<string, unknown> {
  const base = (where ?? {}) as Record<string, unknown>;
  const existingAnd = base.AND === undefined ? [] : Array.isArray(base.AND) ? base.AND : [base.AND];
  return { ...base, AND: [...existingAnd, filter] };
}

class CrossTenantWriteError extends Error {
  constructor(model: string) {
    super(`Refusing to write ${model} outside the current tenant.`);
    this.name = "CrossTenantWriteError";
  }
}

/**
 * Builds the Prisma query extension that enforces tenant isolation (equivalent of
 * the legacy BelongsToTenant + TenantScope). Fails closed: any query on a scoped
 * model without a tenant in context throws TenantContextMissingError.
 *
 * `base` is the unscoped client, used to verify parent ownership on writes to
 * indirectly scoped models.
 */
export function tenantScopeExtension(base: PrismaClient) {
  async function assertParentInTenant(model: string, data: Data, tenantId: number): Promise<void> {
    const { foreignKey, parent } = INDIRECT_MODELS[model];
    const parentId = data[foreignKey];
    if (parentId === undefined) {
      return; // Not changing the parent (e.g. an update of other fields).
    }
    const delegate = (base as unknown as Record<string, { count(args: Args): Promise<number> }>)[parent];
    const found = await delegate.count({ where: { id: parentId, tenantId } });
    if (found === 0) {
      throw new CrossTenantWriteError(model);
    }
  }

  function prepareDirectData(model: string, data: Data, tenantId: number, isCreate: boolean): Data {
    if ("tenant" in data) {
      throw new CrossTenantWriteError(model); // Use tenantId (or nothing), never a tenant relation write.
    }
    if (data.tenantId !== undefined && data.tenantId !== tenantId) {
      throw new CrossTenantWriteError(model);
    }
    return isCreate ? { ...data, tenantId } : data;
  }

  async function prepareData(model: string, data: Data, tenantId: number, isCreate: boolean): Promise<Data> {
    if (DIRECT_MODELS.has(model)) {
      return prepareDirectData(model, data, tenantId, isCreate);
    }
    if (INDIRECT_MODELS[model].relation in data) {
      throw new CrossTenantWriteError(model); // Use the foreign key, so ownership can be checked.
    }
    await assertParentInTenant(model, data, tenantId);
    return data;
  }

  return {
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: Args;
          query: (args: Args) => Promise<unknown>;
        }) {
          if (!isTenantScoped(model)) {
            return query(args);
          }
          const tenantId = requireTenantId();
          const next: Args = { ...args };

          if (FILTERED_OPERATIONS.has(operation)) {
            next.where = scopeWhere(args.where, tenantFilter(model, tenantId));
          }

          if (operation === "create") {
            next.data = await prepareData(model, args.data as Data, tenantId, true);
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const rows = Array.isArray(args.data) ? args.data : [args.data];
            next.data = await Promise.all(rows.map((row) => prepareData(model, row as Data, tenantId, true)));
          } else if (operation === "update" || operation === "updateMany" || operation === "updateManyAndReturn") {
            next.data = await prepareData(model, args.data as Data, tenantId, false);
          } else if (operation === "upsert") {
            next.create = await prepareData(model, args.create as Data, tenantId, true);
            next.update = await prepareData(model, args.update as Data, tenantId, false);
          }

          return query(next);
        },
      },
    },
  };
}
