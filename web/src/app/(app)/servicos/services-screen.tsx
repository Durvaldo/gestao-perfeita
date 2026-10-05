"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader, PaginationBar, TableState } from "@/components/crud/crud-parts";
import { usePaginated } from "@/components/crud/use-paginated";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CARD_TABLE_CLASS } from "@/lib/table-styles";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  active: boolean;
};

type Form = { name: string; description: string; durationMinutes: string; price: string | null; active: boolean };
const EMPTY: Form = { name: "", description: "", durationMinutes: "", price: null, active: true };

export function ServicesScreen({ canManage }: { canManage: boolean }) {
  const confirm = useConfirm();
  const { items, meta, setPage, loading, reload } = usePaginated<Service>("/api/services");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openForm(service: Service | null) {
    setEditing(service);
    setForm(
      service
        ? {
            name: service.name,
            description: service.description ?? "",
            durationMinutes: String(service.durationMinutes),
            price: service.price,
            active: service.active,
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
    const response = await api<Service>(editing ? `/api/services/${editing.id}` : "/api/services", {
      method: editing ? "PUT" : "POST",
      body: form,
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess(editing ? "Serviço atualizado." : "Serviço cadastrado.");
    setOpen(false);
    reload();
  }

  async function remove(service: Service) {
    const ok = await confirm({ title: `Excluir ${service.name}?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" });
    if (!ok) return;
    const response = await api(`/api/services/${service.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Serviço excluído.");
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Serviços"
        description="Serviços oferecidos, com duração e preço."
        action={
          canManage ? (
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" />
              Novo serviço
            </Button>
          ) : null
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table className={CARD_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-end">Ações</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={canManage ? 5 : 4} emptyText="Nenhum serviço cadastrado." />
            {!loading &&
              items.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.durationMinutes} min</TableCell>
                  <TableCell>{formatCurrency(service.price)}</TableCell>
                  <TableCell>
                    <Badge variant={service.active ? "default" : "secondary"}>{service.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" onClick={() => openForm(service)}>
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(service)}>
                        <Trash2 className="size-4" />
                        Excluir
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <PaginationBar meta={meta} onPage={setPage} />
      </Card>

      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar serviço" : "Novo serviço"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" disabled={saving}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </>
        }
      >
        <form id="service-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="name" label="Nome" errors={errors.name} className="sm:col-span-2">
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField id="durationMinutes" label="Duração (min)" errors={errors.durationMinutes}>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </FormField>
          <FormField id="price" label="Preço (R$)" errors={errors.price}>
            <DecimalInput id="price" value={form.price} onChange={(price) => setForm({ ...form, price })} />
          </FormField>
          <FormField id="description" label="Descrição" errors={errors.description} className="sm:col-span-2">
            <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="active" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
            <Label htmlFor="active">Ativo</Label>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
