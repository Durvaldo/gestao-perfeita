"use client";

import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { FormError, FormField, PageHeader, PaginationBar, TableState } from "@/components/crud/crud-parts";
import { usePaginated } from "@/components/crud/use-paginated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiAll } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { toastSuccess } from "@/lib/toast";
import { ORDER_STATUS_LABEL, orderStatusVariant } from "./order-labels";

type OrderRow = {
  id: number;
  totalAmount: string;
  status: string;
  customer: { name: string };
  professional: { user: { name: string } };
};
type Option = { id: number; name: string };
type ProfessionalOption = { id: number; active: boolean; user: { name: string } };

/** Order list + opening a walk-in order (legacy ComandasView.vue). */
export function OrdersScreen({ ownProfessionalId }: { ownProfessionalId: number | null }) {
  const router = useRouter();
  const { items, meta, setPage, loading } = usePaginated<OrderRow>("/api/orders");
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [form, setForm] = useState({ customerId: "", professionalId: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiAll<Option>("/api/customers"), apiAll<ProfessionalOption>("/api/professionals")]).then(([c, p]) => {
      if (cancelled) return;
      if (c.ok) setCustomers(c.data);
      if (p.ok) setProfessionals(p.data.filter((pro) => pro.active));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await api<{ id: number }>("/api/orders", {
      method: "POST",
      body: { customerId: form.customerId || undefined, professionalId: form.professionalId || undefined },
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess("Comanda aberta.");
    router.push(`/comandas/${response.data.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comandas"
        description="Vendas de serviços e produtos."
        action={
          <Button
            onClick={() => {
              setForm({ customerId: "", professionalId: ownProfessionalId ? String(ownProfessionalId) : "" });
              setErrors({});
              setFormError(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova comanda
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Barbeiro</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={6} emptyText="Nenhuma comanda." />
            {!loading &&
              items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{order.professional.user.name}</TableCell>
                  <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/comandas/${order.id}`}>
                        <Eye className="size-4" />
                        Abrir
                      </Link>
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
        title="Nova comanda"
        description="Comanda avulsa. Para atender um agendamento, abra a comanda pela Agenda."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="order-form" disabled={saving}>
              Abrir comanda
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={create} className="grid gap-4">
          <FormError message={formError} />
          <FormField id="customerId" label="Cliente" errors={errors.customerId}>
            <Select value={form.customerId} onValueChange={(customerId) => setForm({ ...form, customerId })}>
              <SelectTrigger id="customerId" className="w-full">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {/* A professional opens orders only for themselves (SPEC-0001). */}
          {ownProfessionalId ? null : (
            <FormField id="professionalId" label="Barbeiro" errors={errors.professionalId}>
              <Select value={form.professionalId} onValueChange={(professionalId) => setForm({ ...form, professionalId })}>
                <SelectTrigger id="professionalId" className="w-full">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form>
      </AppModal>
    </div>
  );
}
