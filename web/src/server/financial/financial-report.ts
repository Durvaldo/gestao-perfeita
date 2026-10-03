import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { zonedParts, zonedToUtc } from "@/lib/timezone";
import { apiRoute } from "@/server/http/route";
import { parseQuery } from "@/server/http/validation";

// Legacy: FinanceiroRelatorioController.

const querySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

/** First and last calendar day of the current month in `timeZone` ("YYYY-MM-DD"). */
export function currentMonth(timeZone: string, now = new Date()): { from: string; to: string } {
  const [year, month] = zonedParts(now, timeZone).date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** "YYYY-MM-DD" + n days. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const toDate = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Period totals (income, expenses, balance) and each professional's commission,
 * computed from the service items of orders paid in the period.
 *
 * Commission rate: the professional × service override (professional_services.
 * commission_rate) or the professional's default rate. Orders are filtered by
 * `paid_at` (the legacy app used `updated_at`, ADR-0003), with the period's days
 * taken in the barbershop's time zone (ADR-0009). Decimal arithmetic throughout.
 */
export async function buildFinancialReport(from: string, to: string, timeZone: string) {
  const entries = await db.financialEntry.groupBy({
    by: ["type"],
    where: { entryDate: { gte: toDate(from), lte: toDate(to) } },
    _sum: { amount: true },
  });
  const sumOf = (type: "income" | "expense") =>
    entries.find((e) => e.type === type)?._sum.amount ?? new Prisma.Decimal(0);
  const totalIncome = sumOf("income");
  const totalExpenses = sumOf("expense");

  const orders = await db.order.findMany({
    where: {
      status: "paid",
      paidAt: { gte: zonedToUtc(`${from}T00:00`, timeZone), lt: zonedToUtc(`${addDays(to, 1)}T00:00`, timeZone) },
    },
    include: {
      professional: { include: { user: { select: { name: true } }, services: true } },
      items: { where: { type: "service" } },
    },
    orderBy: { id: "asc" },
  });

  const byProfessional = new Map<number, { professionalId: number; professionalName: string; commission: Prisma.Decimal }>();
  for (const order of orders) {
    const professional = order.professional;
    const row = byProfessional.get(professional.id) ?? {
      professionalId: professional.id,
      professionalName: professional.user.name,
      commission: new Prisma.Decimal(0),
    };
    for (const item of order.items) {
      const override = professional.services.find((s) => s.serviceId === item.serviceId)?.commissionRate;
      const rate = override ?? professional.defaultCommissionRate;
      row.commission = row.commission.plus(item.totalPrice.times(rate).dividedBy(100));
    }
    byProfessional.set(professional.id, row);
  }

  return {
    period: { from, to },
    totalIncome: totalIncome.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    balance: totalIncome.minus(totalExpenses).toFixed(2),
    commissionsByProfessional: [...byProfessional.values()].map((r) => ({ ...r, commission: r.commission.toFixed(2) })),
  };
}

// GET /api/financial-report?from=YYYY-MM-DD&to=YYYY-MM-DD (default: current month)
export const financialReportRoute = apiRoute(async ({ request, user }) => {
  authorize(user, "financialEntry", "viewAny");
  const query = parseQuery(request, querySchema, { from: "início", to: "fim" });
  const timeZone = user.tenant?.timezone ?? "America/Sao_Paulo";
  const month = currentMonth(timeZone);
  return buildFinancialReport(query.from ?? month.from, query.to ?? month.to, timeZone);
});
