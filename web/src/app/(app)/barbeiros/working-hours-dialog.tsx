"use client";

import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { FormError, FormField } from "@/components/crud/crud-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Professional } from "./professionals-screen";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type WorkingHour = { id: number; weekday: number; startTime: string; endTime: string };
type Form = { weekday: string; morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string };
const EMPTY: Form = { weekday: "1", morningStart: "09:00", morningEnd: "12:00", afternoonStart: "13:00", afternoonEnd: "18:00" };

/**
 * Lists and edits a professional's working hours. Like the legacy screen, one
 * submission can add up to two periods for a weekday (morning and afternoon);
 * leave a period empty to skip it.
 */
export function WorkingHoursDialog({ professional, canEdit, onClose }: { professional: Professional; canEdit: boolean; onClose: () => void }) {
  const [hours, setHours] = useState<WorkingHour[] | null>(null);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // (Re)loads the list; `version` bumps after each change.
  useEffect(() => {
    let cancelled = false;
    api<WorkingHour[]>(`/api/professionals/${professional.id}/working-hours`).then((response) => {
      if (cancelled) return;
      if (response.ok) setHours(response.data);
      else toastError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, [professional.id, version]);

  const load = useCallback(() => setVersion((v) => v + 1), []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const periods = [
      [form.morningStart, form.morningEnd],
      [form.afternoonStart, form.afternoonEnd],
    ].filter(([start, end]) => start && end);
    if (periods.length === 0) {
      setError("Informe ao menos um período (início e fim).");
      return;
    }

    setSaving(true);
    setError(null);
    for (const [startTime, endTime] of periods) {
      const response = await api(`/api/professionals/${professional.id}/working-hours`, {
        method: "POST",
        body: { weekday: Number(form.weekday), startTime, endTime },
      });
      if (!response.ok) {
        setError(response.message);
        break;
      }
    }
    setSaving(false);
    await load();
  }

  async function remove(hour: WorkingHour) {
    const response = await api(`/api/working-hours/${hour.id}`, { method: "DELETE" });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Horário removido.");
    await load();
  }

  const set = (field: keyof Form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  return (
    <AppModal open onOpenChange={(open) => !open && onClose()} title={`Horários de ${professional.user.name}`}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border">
          {hours === null ? (
            <div className="p-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ) : hours.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
          ) : (
            <ul className="divide-y">
              {hours.map((hour) => (
                <li key={hour.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="inline-block w-20 font-medium">{WEEKDAYS[hour.weekday]}</span>
                    {hour.startTime} – {hour.endTime}
                  </span>
                  {canEdit ? (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(hour)} aria-label="Remover horário">
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canEdit ? (
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <FormError message={error} />
            <FormField id="weekday" label="Dia" className="sm:col-span-2">
              <Select value={form.weekday} onValueChange={(weekday) => setForm({ ...form, weekday })}>
                <SelectTrigger id="weekday" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="morningStart" label="Manhã — início">
              <Input id="morningStart" type="time" value={form.morningStart} onChange={set("morningStart")} />
            </FormField>
            <FormField id="morningEnd" label="Manhã — fim">
              <Input id="morningEnd" type="time" value={form.morningEnd} onChange={set("morningEnd")} />
            </FormField>
            <FormField id="afternoonStart" label="Tarde — início">
              <Input id="afternoonStart" type="time" value={form.afternoonStart} onChange={set("afternoonStart")} />
            </FormField>
            <FormField id="afternoonEnd" label="Tarde — fim">
              <Input id="afternoonEnd" type="time" value={form.afternoonEnd} onChange={set("afternoonEnd")} />
            </FormField>
            <Button type="submit" variant="outline" disabled={saving} className="sm:col-span-2">
              <Plus className="size-4" />
              Adicionar horário
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Somente o administrador ou o próprio barbeiro alteram estes horários.</p>
        )}
      </div>
    </AppModal>
  );
}
