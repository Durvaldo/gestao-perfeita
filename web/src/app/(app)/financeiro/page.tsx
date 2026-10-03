import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz/policies";
import { getCurrentUser } from "@/lib/current-user";
import { zonedParts } from "@/lib/timezone";
import { currentMonth } from "@/server/financial/financial-report";
import { FinancialScreen } from "./financial-screen";

export const metadata: Metadata = { title: "Financeiro · Agenda da Barbearia" };

export default async function Page() {
  // Financial data is admin-only (ADR-0006); professionals don't see this route.
  const user = await getCurrentUser();
  if (!user || !can(user, "financialEntry", "viewAny")) {
    notFound();
  }
  const timeZone = user.tenant?.timezone ?? "America/Sao_Paulo";
  const month = currentMonth(timeZone);
  return <FinancialScreen defaultFrom={month.from} defaultTo={month.to} today={zonedParts(new Date(), timeZone).date} />;
}
