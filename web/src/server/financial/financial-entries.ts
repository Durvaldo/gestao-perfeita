import { z } from "zod";
import type { FinancialEntry } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { crudRoutes } from "@/server/http/crud";
import { decimal, formatIsoDate, isoDate, optionalText, text } from "@/server/http/fields";

// Legacy: FinanceiroLancamentoRequest + FinanceiroLancamentoController (admin only).
export const financialEntrySchema = z.object({
  type: z.enum(["income", "expense"]),
  category: text(255),
  description: optionalText(),
  amount: decimal({ min: 0 }),
  entryDate: isoDate(),
});

export const financialEntryLabels = {
  type: "tipo",
  category: "categoria",
  description: "descrição",
  amount: "valor",
  entryDate: "data",
};

export const presentFinancialEntry = (entry: FinancialEntry) => ({ ...entry, entryDate: formatIsoDate(entry.entryDate) });

export const financialEntryRoutes = crudRoutes({
  resource: "financialEntry",
  delegate: () => db.financialEntry,
  schema: financialEntrySchema,
  labels: financialEntryLabels,
  present: presentFinancialEntry,
  // Legacy orderByDesc('data').
  orderBy: [{ entryDate: "desc" }, { id: "desc" }],
});
