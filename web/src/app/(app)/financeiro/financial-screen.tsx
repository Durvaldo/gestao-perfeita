"use client";

import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader, PaginationBar, TableState } from "@/components/crud/crud-parts";
import { usePaginated } from "@/components/crud/use-paginated";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CARD_TABLE_CLASS } from "@/lib/table-styles";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Entry = { id: number; type: "income" | "expense"; category: string; description: string | null; amount: string; entryDate: string };
type Report = {
  period: { from: string; to: string };
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  commissionsByProfessional: { professionalId: number; professionalName: string; commission: string }[];
};
type Form = { type: string; category: string; description: string; amount: string | null; entryDate: string };

/** Financial entries + period report with commissions (legacy FinanceiroView.vue). Admin only. */
export function FinancialScreen({ defaultFrom, defaultTo, today }: { defaultFrom: string; defaultTo: string; today: string }) {
  const confirm = useConfirm();
  const { items, meta, setPage, loading, reload } = usePaginated<Entry>("/api/financial-entries");
  const [period, setPeriod] = useState({ from: defaultFrom, to: defaultTo });
  const [report, setReport] = useState<Report | null>(null);
  const [reportVersion, setReportVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ type: "expense", category: "", description: "", amount: null, entryDate: today });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Report>(`/api/financial-report?from=${period.from}&to=${period.to}`).then((response) => {
      if (cancelled) return;
      if (response.ok) setReport(response.data);
      else toastError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, [period, reportVersion]);

  const refresh = () => {
    reload();
    setReportVersion((v) => v + 1);
  };

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await api("/api/financial-entries", { method: "POST", body: form });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess("Lançamento registrado.");
    setOpen(false);
    refresh();
  }

  async function remove(entry: Entry) {
    const ok = await confirm({ title: "Excluir lançamento?", description: `${entry.category} · ${formatCurrency(entry.amount)}`, confirmLabel: "Excluir" });
    if (!ok) return;
    const response = await api(`/api/financial-entries/${entry.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Lançamento excluído.");
    refresh();
  }

  const balanceNegative = report ? Number(report.balance) < 0 : false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e comissões."
        action={
          <Button
            onClick={() => {
              setForm({ type: "expense", category: "", description: "", amount: null, entryDate: today });
              setErrors({});
              setFormError(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        }
      />

      {/* Period filter: one row above the figures it controls. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={period.from} onChange={(e) => e.target.value && setPeriod({ ...period, from: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={period.to} onChange={(e) => e.target.value && setPeriod({ ...period, to: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Receitas", value: report?.totalIncome },
          { label: "Despesas", value: report?.totalExpenses },
          { label: "Saldo", value: report?.balance, negative: balanceNegative },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardHeader>
              <CardDescription>{tile.label}</CardDescription>
              <CardTitle className={cn("text-2xl tabular-nums", tile.negative && "text-destructive")}>
                {tile.value === undefined ? "—" : formatCurrency(tile.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="pt-(--card-spacing) pb-3">
          <CardTitle>Comissões por barbeiro</CardTitle>
          <CardDescription>Sobre os serviços das comandas pagas no período</CardDescription>
        </CardHeader>
        <Table className={CARD_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Barbeiro</TableHead>
              <TableHead className="text-end">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report && report.commissionsByProfessional.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  Nenhuma comanda paga no período.
                </TableCell>
              </TableRow>
            ) : null}
            {report?.commissionsByProfessional.map((c) => (
              <TableRow key={c.professionalId}>
                <TableCell className="font-medium">{c.professionalName}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(c.commission)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="pt-(--card-spacing) pb-3">
          <CardTitle>Lançamentos</CardTitle>
        </CardHeader>
        <Table className={CARD_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-end">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={6} emptyText="Nenhum lançamento." />
            {!loading &&
              items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.entryDate)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === "income" ? "default" : "secondary"}>{entry.type === "income" ? "Receita" : "Despesa"}</Badge>
                  </TableCell>
                  <TableCell>{entry.category}</TableCell>
                  <TableCell className="hidden md:table-cell">{entry.description ?? "—"}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {entry.type === "expense" ? "− " : ""}
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(entry)} aria-label="Excluir lançamento">
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <PaginationBar meta={meta} onPage={setPage} />
      </Card>

      <AppModal
        open={open}
        onOpenChange={setOpen}
        title="Novo lançamento"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="entry-form" disabled={saving}>
              Registrar
            </Button>
          </>
        }
      >
        <form id="entry-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="type" label="Tipo" errors={errors.type}>
            <Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="entryDate" label="Data" errors={errors.entryDate}>
            <Input id="entryDate" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          </FormField>
          <FormField id="category" label="Categoria" errors={errors.category}>
            <Input id="category" placeholder="aluguel, produtos, manutenção..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </FormField>
          <FormField id="amount" label="Valor (R$)" errors={errors.amount}>
            <DecimalInput id="amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
          </FormField>
          <FormField id="description" label="Descrição" errors={errors.description} className="sm:col-span-2">
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
        </form>
      </AppModal>
    </div>
  );
}
