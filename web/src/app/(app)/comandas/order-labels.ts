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
