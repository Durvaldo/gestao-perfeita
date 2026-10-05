// User-facing (pt-BR) labels for order enums, shared by the order screens.

export const ORDER_STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  paid: "Paga",
  cancelled: "Cancelada",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
};

export const orderStatusVariant = (status: string) =>
  status === "paid" ? ("default" as const) : status === "cancelled" ? ("destructive" as const) : ("secondary" as const);

type StockedProduct = { stockQuantity?: number | null };

/** A tracked product with no units left can't be added to an order (ADR-0011). */
export const isOutOfStock = (product: StockedProduct) =>
  product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0;

/** Stock suffix shown next to a product in the order's select ("" when stock is not tracked). */
export function stockLabel(product: StockedProduct): string {
  if (product.stockQuantity === null || product.stockQuantity === undefined) return "";
  return isOutOfStock(product) ? " · sem estoque" : ` · estoque ${product.stockQuantity}`;
}
