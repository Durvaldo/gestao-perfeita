"use client";

import { Clock, Pencil, Plus, Power, PowerOff } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { formatDecimal } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import { WorkingHoursDialog } from "./working-hours-dialog";

export type Professional = {
  id: number;
  defaultCommissionRate: string;
  photoUrl: string | null;
  active: boolean;
  user: { id: number; name: string; email: string; phone: string | null };
};

type CreateForm = { name: string; email: string; password: string; phone: string; defaultCommissionRate: string | null };
const EMPTY_CREATE: CreateForm = { name: "", email: "", password: "", phone: "", defaultCommissionRate: "30" };

export function ProfessionalsScreen({ canManage, ownProfessionalId }: { canManage: boolean; ownProfessionalId: number | null }) {
  const confirm = useConfirm();
  const { items, meta, setPage, loading, reload } = usePaginated<Professional>("/api/professionals");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [commission, setCommission] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hoursOf, setHoursOf] = useState<Professional | null>(null);

  function resetErrors() {
    setErrors({});
    setFormError(null);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await api<Professional>("/api/professionals", { method: "POST", body: createForm });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess("Barbeiro cadastrado. Ele já pode entrar com o e-mail e a senha informados.");
    setCreateOpen(false);
    reload();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const response = await api(`/api/professionals/${editing.id}`, {
      method: "PUT",
      body: { defaultCommissionRate: commission, photoUrl: editing.photoUrl, active: editing.active },
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess("Barbeiro atualizado.");
    setEditing(null);
    reload();
  }

  // "Delete" deactivates (ADR-0008): access is blocked, history is kept.
  async function deactivate(professional: Professional) {
    const ok = await confirm({
      title: `Desativar ${professional.user.name}?`,
      description: "O acesso ao sistema é bloqueado na hora e ele deixa de receber agendamentos. O histórico é mantido e você pode reativar depois.",
      confirmLabel: "Desativar",
    });
    if (!ok) return;
    const response = await api(`/api/professionals/${professional.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Barbeiro desativado.");
    reload();
  }

  async function reactivate(professional: Professional) {
    const response = await api(`/api/professionals/${professional.id}`, {
      method: "PUT",
      body: { defaultCommissionRate: professional.defaultCommissionRate, photoUrl: professional.photoUrl, active: true },
    });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Barbeiro reativado.");
    reload();
  }

  const canEditHours = (professional: Professional) => canManage || professional.id === ownProfessionalId;
  const set = (field: keyof CreateForm) => (event: { target: { value: string } }) =>
    setCreateForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Barbeiros"
        description="Profissionais da barbearia, comissões e horários de trabalho."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setCreateForm(EMPTY_CREATE);
                resetErrors();
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              Novo barbeiro
            </Button>
          ) : null
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={items.length === 0} columns={5} emptyText="Nenhum barbeiro cadastrado." />
            {!loading &&
              items.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell className="font-medium">{professional.user.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{professional.user.email}</TableCell>
                  <TableCell>{formatDecimal(professional.defaultCommissionRate)}%</TableCell>
                  <TableCell>
                    <Badge variant={professional.active ? "default" : "secondary"}>{professional.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-end whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setHoursOf(professional)}>
                      <Clock className="size-4" />
                      Horários
                    </Button>
                    {canManage ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(professional);
                            setCommission(professional.defaultCommissionRate);
                            resetErrors();
                          }}
                        >
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                        {professional.active ? (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deactivate(professional)}>
                            <PowerOff className="size-4" />
                            Desativar
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => reactivate(professional)}>
                            <Power className="size-4" />
                            Reativar
                          </Button>
                        )}
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
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Novo barbeiro"
        description="Cria também a conta de acesso dele ao sistema."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="professional-create-form" disabled={saving}>
              Adicionar
            </Button>
          </>
        }
      >
        <form id="professional-create-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="name" label="Nome" errors={errors.name} className="sm:col-span-2">
            <Input id="name" value={createForm.name} onChange={set("name")} />
          </FormField>
          <FormField id="email" label="E-mail (login)" errors={errors.email}>
            <Input id="email" type="email" autoComplete="off" value={createForm.email} onChange={set("email")} />
          </FormField>
          <FormField id="password" label="Senha inicial" errors={errors.password}>
            <Input id="password" type="password" autoComplete="new-password" value={createForm.password} onChange={set("password")} />
          </FormField>
          <FormField id="phone" label="Telefone" errors={errors.phone}>
            <Input id="phone" value={createForm.phone} onChange={set("phone")} />
          </FormField>
          <FormField id="defaultCommissionRate" label="Comissão padrão (%)" errors={errors.defaultCommissionRate}>
            <DecimalInput
              id="defaultCommissionRate"
              value={createForm.defaultCommissionRate}
              onChange={(value) => setCreateForm({ ...createForm, defaultCommissionRate: value })}
            />
          </FormField>
        </form>
      </AppModal>

      <AppModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Editar ${editing?.user.name ?? ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="professional-edit-form" disabled={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="professional-edit-form" onSubmit={saveEdit} className="grid gap-4">
          <FormError message={formError} />
          <FormField id="edit-commission" label="Comissão padrão (%)" errors={errors.defaultCommissionRate}>
            <DecimalInput id="edit-commission" value={commission} onChange={setCommission} />
          </FormField>
        </form>
      </AppModal>

      {hoursOf ? (
        <WorkingHoursDialog professional={hoursOf} canEdit={canEditHours(hoursOf)} onClose={() => setHoursOf(null)} />
      ) : null}
    </div>
  );
}
