"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader, TableState } from "@/components/crud/crud-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiAll } from "@/lib/api-client";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  blockPeriodLabel,
  blockToForm,
  emptyExceptionForm,
  type ExceptionForm,
  exceptionFormToBody,
  REASON_SUGGESTIONS,
  type ScheduleBlock,
} from "./exception-form";

type ProfessionalOption = { id: number; active: boolean; user: { name: string } };
type SavedBlock = ScheduleBlock & { affectedAppointments: { id: number }[] };

/**
 * Schedule exceptions (SPEC-0004): days or periods when the barbershop, or one
 * professional, doesn't work. The admin manages all; a professional only their own.
 */
export function ExceptionsScreen({
  isAdmin,
  ownProfessionalId,
  timeZone,
  today,
}: {
  isAdmin: boolean;
  ownProfessionalId: number | null;
  timeZone: string;
  today: string;
}) {
  const confirm = useConfirm();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const defaultTarget = isAdmin ? "shop" : String(ownProfessionalId ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleBlock | null>(null);
  const [form, setForm] = useState<ExceptionForm>(emptyExceptionForm(today, defaultTarget));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Upcoming and current exceptions (past ones are history).
  useEffect(() => {
    let cancelled = false;
    api<ScheduleBlock[]>(`/api/schedule-blocks?from=${today}`).then((response) => {
      if (cancelled) return;
      setLoading(false);
      if (response.ok) setBlocks(response.data);
      else toastError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, [today, version]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    apiAll<ProfessionalOption>("/api/professionals").then((response) => {
      if (!cancelled && response.ok) setProfessionals(response.data.filter((p) => p.active));
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const canManage = (block: ScheduleBlock) => isAdmin || (block.professionalId !== null && block.professionalId === ownProfessionalId);

  function openForm(block: ScheduleBlock | null) {
    setEditing(block);
    setForm(block ? blockToForm(block, timeZone) : emptyExceptionForm(today, defaultTarget));
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await api<SavedBlock>(editing ? `/api/schedule-blocks/${editing.id}` : "/api/schedule-blocks", {
      method: editing ? "PUT" : "POST",
      body: exceptionFormToBody(form),
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    const affected = response.data.affectedAppointments.length;
    toastSuccess(
      affected > 0
        ? `Exceção salva. ${affected} agendamento(s) no período precisam de ação.`
        : editing
          ? "Exceção atualizada."
          : "Exceção registrada.",
    );
    setOpen(false);
    setVersion((v) => v + 1);
  }

  async function remove(block: ScheduleBlock) {
    const ok = await confirm({
      title: "Excluir exceção?",
      description: `${blockPeriodLabel(block, timeZone)}. A agenda volta a ficar aberta nesse período.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const response = await api(`/api/schedule-blocks/${block.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Exceção excluída.");
    setVersion((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exceções da agenda"
        description={
          isAdmin
            ? "Feriados, folgas, férias e atestados: dias ou horários em que a barbearia ou um barbeiro não atende."
            : "Suas folgas e compromissos: dias ou horários em que você não atende."
        }
        action={
          <Button onClick={() => openForm(null)} disabled={!isAdmin && !ownProfessionalId}>
            <Plus className="size-4" />
            Nova exceção
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quem</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="hidden md:table-cell">Motivo</TableHead>
              <TableHead className="text-end">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState loading={loading} empty={blocks.length === 0} columns={4} emptyText="Nenhuma exceção a partir de hoje." />
            {!loading &&
              blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell className="font-medium">
                    {block.professionalId === null ? <Badge variant="secondary">Barbearia inteira</Badge> : (block.professional?.user.name ?? "—")}
                  </TableCell>
                  <TableCell>{blockPeriodLabel(block, timeZone)}</TableCell>
                  <TableCell className="hidden md:table-cell">{block.reason ?? "—"}</TableCell>
                  <TableCell className="text-end whitespace-nowrap">
                    {canManage(block) ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openForm(block)}>
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(block)}>
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
      </Card>

      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar exceção" : "Nova exceção"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="exception-form" disabled={saving}>
              {editing ? "Salvar" : "Registrar"}
            </Button>
          </>
        }
      >
        <form id="exception-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>

          {isAdmin ? (
            <FormField id="target" label="Quem não vai atender" errors={errors.professionalId} className="sm:col-span-2">
              <Select value={form.target} onValueChange={(target) => setForm({ ...form, target })}>
                <SelectTrigger id="target" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Barbearia inteira</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Tipo</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { allDay: true, label: "Dia inteiro", hint: "Um ou mais dias sem atendimento." },
                { allDay: false, label: "Período do dia", hint: "Só uma faixa de horário." },
              ].map((option) => (
                <label
                  key={option.label}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="allDay"
                    checked={form.allDay === option.allDay}
                    onChange={() => setForm({ ...form, allDay: option.allDay })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.allDay ? (
            <>
              <FormField id="startDate" label="De" errors={errors.startDate}>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </FormField>
              <FormField id="endDate" label="Até" errors={errors.endDate}>
                <Input id="endDate" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </FormField>
            </>
          ) : (
            <>
              <FormField id="date" label="Dia" errors={errors.startsAt} className="sm:col-span-2">
                <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FormField>
              <FormField id="startTime" label="Das" errors={errors.startsAt ? undefined : errors.startTime}>
                <Input id="startTime" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </FormField>
              <FormField id="endTime" label="Até" errors={errors.endsAt}>
                <Input id="endTime" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </FormField>
            </>
          )}

          <FormField id="reason" label="Motivo" errors={errors.reason} className="sm:col-span-2">
            <Input id="reason" value={form.reason} maxLength={255} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </FormField>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {REASON_SUGGESTIONS.map((reason) => (
              <Button key={reason} type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, reason })}>
                {reason}
              </Button>
            ))}
          </div>
        </form>
      </AppModal>
    </div>
  );
}
