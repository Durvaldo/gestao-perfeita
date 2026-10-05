// Product form state and its mapping to the API body (SPEC-0002). The API is
// unchanged: stockQuantity null means "estoque livre" (no stock control).

export type StockMode = "tracked" | "free";

export type ProductForm = {
  name: string;
  description: string;
  price: string | null;
  stockMode: StockMode;
  stockQuantity: string;
  active: boolean;
};

export const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  description: "",
  price: null,
  // New products track stock by default (SPEC-0002 RF-2).
  stockMode: "tracked",
  stockQuantity: "",
  active: true,
};

export function productToForm(product: {
  name: string;
  description: string | null;
  price: string;
  stockQuantity: number | null;
  active: boolean;
}): ProductForm {
  return {
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    stockMode: product.stockQuantity === null ? "free" : "tracked",
    stockQuantity: product.stockQuantity === null ? "" : String(product.stockQuantity),
    active: product.active,
  };
}

/**
 * The API body for the form, or the field errors that stop it from being sent.
 * "Estoque livre" sends "" (→ null); "Registrar quantidade" requires a quantity.
 */
export function productFormToBody(
  form: ProductForm,
): { ok: true; body: Record<string, unknown> } | { ok: false; errors: Record<string, string[]> } {
  const { stockMode, ...rest } = form;
  if (stockMode === "free") {
    return { ok: true, body: { ...rest, stockQuantity: "" } };
  }
  if (form.stockQuantity.trim() === "") {
    return { ok: false, errors: { stockQuantity: ["Informe a quantidade em estoque ou escolha estoque livre."] } };
  }
  return { ok: true, body: rest };
}
