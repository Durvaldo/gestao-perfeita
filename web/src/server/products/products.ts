import { z } from "zod";
import { db } from "@/lib/db";
import { crudRoutes } from "@/server/http/crud";
import { boolean, decimal, integer, optionalText, text } from "@/server/http/fields";

// Legacy: ProdutoRequest + ProdutoController.
export const productSchema = z.object({
  name: text(255),
  description: optionalText(),
  price: decimal({ min: 0 }),
  // Null means stock is not tracked for this product.
  stockQuantity: integer(0).nullable().optional(),
  active: boolean().optional(),
});

export const productLabels = {
  name: "nome",
  description: "descrição",
  price: "preço",
  stockQuantity: "quantidade em estoque",
  active: "ativo",
};

export const productRoutes = crudRoutes({
  resource: "product",
  delegate: () => db.product,
  schema: productSchema,
  labels: productLabels,
});
