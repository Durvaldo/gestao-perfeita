"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader, PaginationBar, TableState } from "@/components/crud/crud-parts";
import { usePaginated } from "@/components/crud/use-paginated";
import { PhoneInput } from "@/components/phone-input";
import { useMessageTemplates, WhatsAppLink } from "@/components/whatsapp-link";
import { CARD_TABLE_CLASS } from "@/lib/table-styles";
import { renderTemplate } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { formatDate, formatPhone } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
};

type Form = { name: string; phone: string; email: string; birthDate: string; notes: string };
const EMPTY: Form = { name: "", phone: "", email: "", birthDate: "", notes: "" };

export function CustomersScreen({ canManage, barbershop }: { canManage: boolean; barbershop: string }) {
  const confirm = useConfirm();
  const templates = useMessageTemplates();
  const { items, meta, setPage, loading, reload } = usePaginated<Customer>("/api/customers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openForm(customer: Customer | null) {
    setEditing(customer);
    setForm(
      customer
        ? {
            name: customer.name,
            phone: customer.phone,
            email: customer.email ?? "",
            birthDate: customer.birthDate ?? "",
            notes: customer.notes ?? "",
          }
        : EMPTY,
    );
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    // Empty strings are sent as-is: the API treats "" as null (ADR-0007).
    const response = await api<Customer>(editing ? `/api/customers/${editing.id}` : "/api/customers", {
      method: editing ? "PUT" : "POST",
      body: form,
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess(editing ? "Cliente atualizado." : "Cliente cadastrado.");
    setOpen(false);
    reload();
  }

  async function remove(customer: Customer) {
    const ok = await confirm({
      title: `Excluir ${customer.name}?`,
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const response = await api(`/api/customers/${customer.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Cliente excluído.");
    reload();
  }

  const set = (field: keyof Form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Clientes da barbearia."
        action={
          canManage ? (
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" />
              Novo cliente
            </Button>
          ) : null
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table className={CARD_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden lg:table-cell">Nascimento</TableHead>
              <TableHead className="text-end">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={5} emptyText="Nenhum cliente cadastrado." />
            {!loading &&
              items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{formatPhone(customer.phone)}</TableCell>
                  <TableCell className="hidden md:table-cell">{customer.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(customer.birthDate) || "—"}</TableCell>
                  <TableCell className="text-end whitespace-nowrap">
                    <WhatsAppLink
                      variant="ghost"
                      phone={customer.phone}
                      label={`WhatsApp de ${customer.name}`}
                      size="icon"
                      text={renderTemplate(templates.customerChat, { cliente: customer.name.split(" ")[0], barbearia: barbershop })}
                    />
                    {canManage ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openForm(customer)}>
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(customer)}>
                          <Trash2 className="size-4" />
                          Excluir
                        </Button>
                      </>
                    ) : null}
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
        title={editing ? "Editar cliente" : "Novo cliente"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="customer-form" disabled={saving}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="name" label="Nome" errors={errors.name} className="sm:col-span-2">
            <Input id="name" value={form.name} onChange={set("name")} />
          </FormField>
          <FormField id="phone" label="Telefone" errors={errors.phone}>
            <PhoneInput id="phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          </FormField>
          <FormField id="birthDate" label="Nascimento" errors={errors.birthDate}>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={set("birthDate")} />
          </FormField>
          <FormField id="email" label="E-mail" errors={errors.email} className="sm:col-span-2">
            <Input id="email" type="email" value={form.email} onChange={set("email")} />
          </FormField>
          <FormField id="notes" label="Observações" errors={errors.notes} className="sm:col-span-2">
            <Textarea id="notes" value={form.notes} onChange={set("notes")} rows={3} />
          </FormField>
        </form>
      </AppModal>
    </div>
  );
}
