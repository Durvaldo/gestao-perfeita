import { Cake, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { BarList } from "@/components/charts/bar-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/current-user";
import { formatCurrency, formatDate } from "@/lib/format";
import { runWithTenant } from "@/lib/tenancy/context";
import { buildDashboard } from "@/server/dashboard/dashboard";

export const metadata: Metadata = { title: "Dashboard · Agenda da Barbearia" };

// Legacy DashboardView.vue: best sellers, professional ranking, frequent
// customers and upcoming birthdays. Only paid orders count.
export default async function DashboardPage() {
  // The layout already guarantees a signed-in user with a tenant.
  const user = (await getCurrentUser())!;
  const data = await runWithTenant(user.tenantId!, () => buildDashboard(user.tenant?.timezone ?? "America/Sao_Paulo"));
  const firstName = user.name.split(" ")[0];

  const quantityItems = (rows: { id: number | null; name: string | null; totalQuantity: number }[]) =>
    rows.map((r) => ({ key: r.id ?? r.name ?? "?", label: r.name ?? "—", value: r.totalQuantity, display: String(r.totalQuantity) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName}!</h1>
        <p className="text-muted-foreground">Resumo da barbearia (comandas pagas).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Serviços mais vendidos</CardTitle>
            <CardDescription>Quantidade vendida (top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={quantityItems(data.bestSellingServices)} valueLabel="Quantidade" emptyText="Nenhum serviço vendido ainda." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
            <CardDescription>Quantidade vendida (top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={quantityItems(data.bestSellingProducts)} valueLabel="Quantidade" emptyText="Nenhum produto vendido ainda." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" />
              Ranking de barbeiros
            </CardTitle>
            <CardDescription>Faturamento total</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.professionalRanking.map((r) => ({
                key: r.professionalId,
                label: r.name ?? "—",
                value: Number(r.totalRevenue),
                display: formatCurrency(r.totalRevenue),
              }))}
              valueLabel="Faturamento"
              emptyText="Nenhuma comanda paga ainda."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clientes mais frequentes</CardTitle>
            <CardDescription>Atendimentos pagos (top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.topCustomers.map((c) => ({ key: c.customerId, label: c.name ?? "—", value: c.totalVisits, display: String(c.totalVisits) }))}
              valueLabel="Atendimentos"
              emptyText="Nenhum atendimento pago ainda."
            />
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2">
            <Cake className="size-4 text-muted-foreground" />
            Próximos aniversários
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead className="text-end">Faltam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.upcomingBirthdays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  Nenhum cliente com data de nascimento.
                </TableCell>
              </TableRow>
            ) : null}
            {data.upcomingBirthdays.map((b) => (
              <TableRow key={b.customerId}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{formatDate(b.birthDate)}</TableCell>
                <TableCell className="text-end">
                  {b.daysUntilBirthday === 0 ? "Hoje!" : b.daysUntilBirthday === 1 ? "1 dia" : `${b.daysUntilBirthday} dias`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
