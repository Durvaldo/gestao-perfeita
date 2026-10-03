import { z } from "zod";
import { db } from "@/lib/db";
import { crudRoutes } from "@/server/http/crud";
import { boolean, decimal, integer, optionalText, text } from "@/server/http/fields";

// Legacy: ServicoRequest + ServicoController.
export const serviceSchema = z.object({
  name: text(255),
  description: optionalText(),
  durationMinutes: integer(1),
  price: decimal({ min: 0 }),
  active: boolean().optional(),
});

export const serviceLabels = {
  name: "nome",
  description: "descrição",
  durationMinutes: "duração em minutos",
  price: "preço",
  active: "ativo",
};

export const serviceRoutes = crudRoutes({
  resource: "service",
  delegate: () => db.service,
  schema: serviceSchema,
  labels: serviceLabels,
});
