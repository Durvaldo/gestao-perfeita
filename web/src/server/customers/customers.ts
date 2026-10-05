import { z } from "zod";
import type { Customer } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { crudRoutes } from "@/server/http/crud";
import { formatIsoDate, isoDate, optionalText, phone, text } from "@/server/http/fields";

// Legacy: ClienteRequest + ClienteController.
export const customerSchema = z.object({
  name: text(255),
  phone: phone(),
  email: z.email().max(255).nullable().optional(),
  birthDate: isoDate().nullable().optional(),
  notes: optionalText(),
});

export const customerLabels = {
  name: "nome",
  phone: "telefone",
  email: "e-mail",
  birthDate: "data de nascimento",
  notes: "observações",
};

export const presentCustomer = (customer: Customer) => ({ ...customer, birthDate: formatIsoDate(customer.birthDate) });

export const customerRoutes = crudRoutes({
  resource: "customer",
  delegate: () => db.customer,
  schema: customerSchema,
  labels: customerLabels,
  present: presentCustomer,
});
