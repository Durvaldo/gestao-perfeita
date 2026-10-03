import { authorize } from "@/lib/authz/guard";
import { db } from "@/lib/db";
import { zonedParts } from "@/lib/timezone";
import { apiRoute } from "@/server/http/route";

// Legacy: DashboardController. Only PAID orders count. Like the legacy app, the
// dashboard covers the whole barbershop for every staff member (no per-professional
// filter), professionals included.

const TOP = 5;

async function bestSelling(type: "product" | "service") {
  const key = type === "product" ? "productId" : "serviceId";
  const rows = await db.orderItem.groupBy({
    by: [key],
    where: { type, order: { status: "paid" } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: TOP,
  });
  const ids = rows.map((r) => r[key]).filter((id): id is number => id !== null);
  const names = new Map(
    (type === "product"
      ? await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : await db.service.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    ).map((r) => [r.id, r.name]),
  );
  return rows.map((r) => ({ id: r[key], name: names.get(r[key]!) ?? null, totalQuantity: r._sum.quantity ?? 0 }));
}

async function professionalRanking() {
  const rows = await db.order.groupBy({
    by: ["professionalId"],
    where: { status: "paid" },
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: "desc" } },
  });
  const professionals = await db.professional.findMany({
    where: { id: { in: rows.map((r) => r.professionalId) } },
    select: { id: true, user: { select: { name: true } } },
  });
  const names = new Map(professionals.map((p) => [p.id, p.user.name]));
  return rows.map((r) => ({
    professionalId: r.professionalId,
    name: names.get(r.professionalId) ?? null,
    totalRevenue: (r._sum.totalAmount ?? 0).toFixed(2),
  }));
}

async function topCustomers() {
  const rows = await db.order.groupBy({
    by: ["customerId"],
    where: { status: "paid" },
    _count: { _all: true },
    orderBy: { _count: { customerId: "desc" } },
    take: TOP,
  });
  const customers = await db.customer.findMany({ where: { id: { in: rows.map((r) => r.customerId) } }, select: { id: true, name: true } });
  const names = new Map(customers.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ customerId: r.customerId, name: names.get(r.customerId) ?? null, totalVisits: r._count._all }));
}

/** Whole days from `today` to the next birthday ("YYYY-MM-DD" strings); today = 0. */
export function daysUntilBirthday(birthDate: string, today: string): number {
  const [year] = today.split("-").map(Number);
  const [, month, day] = birthDate.split("-").map(Number);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  // Date.UTC rolls 29 Feb into 1 Mar in non-leap years (same as the legacy Carbon code).
  let next = Date.UTC(year, month - 1, day);
  if (next < todayMs) next = Date.UTC(year + 1, month - 1, day);
  return Math.round((next - todayMs) / 86_400_000);
}

async function upcomingBirthdays(timeZone: string) {
  const today = zonedParts(new Date(), timeZone).date;
  const customers = await db.customer.findMany({ where: { birthDate: { not: null } }, select: { id: true, name: true, birthDate: true } });
  return customers
    .map((c) => {
      const birthDate = c.birthDate!.toISOString().slice(0, 10);
      return { customerId: c.id, name: c.name, birthDate, daysUntilBirthday: daysUntilBirthday(birthDate, today) };
    })
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)
    .slice(0, TOP);
}

/** All dashboard widgets. Must run inside the tenant's context (ADR-0005). */
export async function buildDashboard(timeZone: string) {
  const [bestSellingProducts, bestSellingServices, ranking, customers, birthdays] = await Promise.all([
    bestSelling("product"),
    bestSelling("service"),
    professionalRanking(),
    topCustomers(),
    // "Today" is the barbershop's calendar day (ADR-0009).
    upcomingBirthdays(timeZone),
  ]);
  return {
    bestSellingProducts,
    bestSellingServices,
    professionalRanking: ranking,
    topCustomers: customers,
    upcomingBirthdays: birthdays,
  };
}

export type DashboardData = Awaited<ReturnType<typeof buildDashboard>>;

// GET /api/dashboard
export const dashboardRoute = apiRoute(async ({ user }) => {
  authorize(user, "dashboard", "view");
  return buildDashboard(user.tenant?.timezone ?? "America/Sao_Paulo");
});
