import { db } from "@/lib/db";
import { ValidationError } from "@/lib/http-errors";
import type { FieldLabels } from "./validation";

// Models a request may reference by id. Lookups go through the tenant-scoped
// `db`, so an id from another tenant is "not found" here.
const delegates = {
  customer: (ids: number[]) => db.customer.count({ where: { id: { in: ids } } }),
  professional: (ids: number[]) => db.professional.count({ where: { id: { in: ids } } }),
  service: (ids: number[]) => db.service.count({ where: { id: { in: ids } } }),
  product: (ids: number[]) => db.product.count({ where: { id: { in: ids } } }),
  appointment: (ids: number[]) => db.appointment.count({ where: { id: { in: ids } } }),
  order: (ids: number[]) => db.order.count({ where: { id: { in: ids } } }),
};

export type ReferenceModel = keyof typeof delegates;

/**
 * Validates that every foreign key sent by the client points to a record of the
 * current tenant (legacy: existsInTenant() in the Form Requests). Required on
 * every client-supplied id, because the tenant extension does not check foreign
 * keys of directly scoped models (ADR-0005). Null/undefined ids are skipped
 * (optional references); arrays are checked as a whole.
 *
 * Throws a 422 with "O valor selecionado para <label> é inválido." per bad field.
 */
export async function assertReferencesInTenant(
  references: Record<string, { model: ReferenceModel; id: number | number[] | null | undefined }>,
  labels: FieldLabels = {},
): Promise<void> {
  const errors: Record<string, string[]> = {};

  for (const [field, { model, id }] of Object.entries(references)) {
    if (id === null || id === undefined) continue;
    const ids = [...new Set(Array.isArray(id) ? id : [id])];
    if (ids.length === 0) continue;
    const found = await delegates[model](ids);
    if (found !== ids.length) {
      errors[field] = [`O valor selecionado para ${labels[field] ?? field} é inválido.`];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}
