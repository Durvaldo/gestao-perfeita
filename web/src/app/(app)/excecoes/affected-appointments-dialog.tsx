"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessageTemplates, WhatsAppLink } from "@/components/whatsapp-link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { zonedParts } from "@/lib/timezone";
import { toastError, toastSuccess } from "@/lib/toast";
import { appointmentVariables, renderTemplate, type TemplateKey } from "@/lib/whatsapp";
import { blockPeriodLabel, type ScheduleBlock } from "./exception-form";

type AffectedAppointment = {
  id: number;
  customerId: number;
  professionalId: number;
  startsAt: string;
  notes: string | null;
  customer: { id: number; name: string; phone: string };
  professional: { id: number; user: { name: string } };
  services: { id: number; name: string }[];
};
type ProfessionalOption = { id: number; active: boolean; user: { name: string } };
type Resolution = { kind: "rescheduled" | "transferred" | "cancelled"; appointment: AffectedAppointment };

const TEMPLATE_OF: Record<Resolution["kind"], TemplateKey> = {
  rescheduled: "appointmentRescheduled",
  transferred: "appointmentTransferred",
  cancelled: "appointmentCancelled",
};
const RESOLVED_LABEL: Record<Resolution["kind"], string> = {
  rescheduled: "Remarcado",
  transferred: "Transferido",
  cancelled: "Cancelado",
};

/**
 * Appointments inside an exception that still need action (SPEC-0004 RF-3):
 * reschedule (same professional), transfer (same time, another professional;
 * admins only, SPEC-0001) or cancel, one by one or all at once (Q3). After each
 * action, a button tells the customer through WhatsApp (SPEC-0008).
 */
export function AffectedAppointmentsDialog({
  blockId,
  onClose,
  isAdmin,
  professionals,
  timeZone,
  barbershop,
}: {
  blockId: number | null;
  onClose: () => void;
  isAdmin: boolean;
  professionals: ProfessionalOption[];
  timeZone: string;
  barbershop: string;
}) {
  const confirm = useConfirm();
  const templates = useMessageTemplates();
  const [block, setBlock] = useState<ScheduleBlock | null>(null);
  const [pending, setPending] = useState<AffectedAppointment[]>([]);
  const [resolved, setResolved] = useState<Resolution[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<{ id: number; action: "reschedule" | "transfer" } | null>(null);
  const [newStart, setNewStart] = useState("");
  const [target, setTarget] = useState("");
  const [bulkTarget, setBulkTarget] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (blockId === null) return;
    let cancelled = false;
    api<ScheduleBlock & { affectedAppointments: AffectedAppointment[] }>(`/api/schedule-blocks/${blockId}`).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        toastError(response.message);
        return;
      }
      setBlock(response.data);
      setPending(response.data.affectedAppointments);
      setResolved([]);
      setErrors({});
      setMode(null);
    });
    return () => {
      cancelled = true;
    };
  }, [blockId]);

  const when = (iso: string) => {
    const parts = zonedParts(new Date(iso), timeZone);
    return `${formatDate(parts.date)} às ${parts.time.slice(0, 5)}`;
  };

  /** PUT with the appointment's current data plus the changes. Returns the updated appointment or null. */
  async function change(appointment: AffectedAppointment, changes: Record<string, unknown>, kind: Resolution["kind"]): Promise<boolean> {
    const response = await api<AffectedAppointment>(`/api/appointments/${appointment.id}`, {
      method: "PUT",
      body: {
        customerId: appointment.customerId,
        professionalId: appointment.professionalId,
        startsAt: appointment.startsAt, // exact instant (with "Z")
        serviceIds: appointment.services.map((s) => s.id),
        notes: appointment.notes,
        ...changes,
      },
    });
    if (!response.ok) {
      setErrors((current) => ({ ...current, [appointment.id]: response.message ?? "Não foi possível alterar o agendamento." }));
      return false;
    }
    setErrors((current) => {
      const next = { ...current };
      delete next[appointment.id];
      return next;
    });
    setPending((current) => current.filter((a) => a.id !== appointment.id));
    setResolved((current) => [...current, { kind, appointment: kind === "cancelled" ? appointment : response.data }]);
    return true;
  }

  async function reschedule(appointment: AffectedAppointment) {
    if (!newStart) return;
    setBusy(true);
    if (await change(appointment, { startsAt: newStart }, "rescheduled")) setMode(null);
    setBusy(false);
  }

  async function transfer(appointment: AffectedAppointment) {
    if (!target) return;
    setBusy(true);
    if (await change(appointment, { professionalId: Number(target) }, "transferred")) setMode(null);
    setBusy(false);
  }

  async function cancel(appointment: AffectedAppointment) {
    const ok = await confirm({ title: `Cancelar o agendamento de ${appointment.customer.name}?`, confirmLabel: "Cancelar agendamento" });
    if (!ok) return;
    setBusy(true);
    await change(appointment, { status: "cancelled" }, "cancelled");
    setBusy(false);
  }

  async function bulk(kind: "transferred" | "cancelled") {
    if (kind === "transferred" && !bulkTarget) return;
    if (kind === "cancelled") {
      const ok = await confirm({ title: `Cancelar os ${pending.length} agendamentos?`, confirmLabel: "Cancelar todos" });
      if (!ok) return;
    }
    setBusy(true);
    let done = 0;
    for (const appointment of pending) {
      const changes = kind === "cancelled" ? { status: "cancelled" } : { professionalId: Number(bulkTarget) };
      if (await change(appointment, changes, kind)) done += 1;
    }
    setBusy(false);
    const failed = pending.length - done;
    if (failed > 0) toastError(`${done} resolvido(s); ${failed} não puderam ser alterados (veja o motivo em cada um).`);
    else toastSuccess(`${done} agendamento(s) resolvido(s).`);
  }

  const others = (appointment: AffectedAppointment) => professionals.filter((p) => p.active && p.id !== appointment.professionalId);

  return (
    <AppModal open={blockId !== null} onOpenChange={(open) => !open && onClose()} title="Agendamentos que precisam de ação">
      {block ? (
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            {block.professionalId === null ? "Barbearia inteira" : block.professional?.user.name} · {blockPeriodLabel(block, timeZone)}
            {block.reason ? ` · ${block.reason}` : ""}
          </p>

          {pending.length === 0 && resolved.length === 0 ? <p>Nenhum agendamento neste período.</p> : null}

          {isAdmin && pending.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
              <span className="font-medium">Todos:</span>
              <Select value={bulkTarget} onValueChange={setBulkTarget}>
                <SelectTrigger className="w-48" aria-label="Transferir todos para">
                  <SelectValue placeholder="Transferir para…" />
                </SelectTrigger>
                <SelectContent>
                  {professionals
                    .filter((p) => p.active && p.id !== block.professionalId)
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.user.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={busy || !bulkTarget} onClick={() => bulk("transferred")}>
                Transferir todos
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => bulk("cancelled")}>
                Cancelar todos
              </Button>
            </div>
          ) : null}

          <ul className="flex flex-col gap-3">
            {pending.map((appointment) => (
              <li key={appointment.id} className="rounded-lg border p-3" data-testid="affected-appointment">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{appointment.customer.name}</span>
                  <Badge variant="secondary">Precisa de ação</Badge>
                </div>
                <p className="text-muted-foreground">
                  {when(appointment.startsAt)} · {appointment.professional.user.name} · {appointment.services.map((s) => s.name).join(", ")}
                </p>
                {errors[appointment.id] ? <p className="mt-1 text-destructive">{errors[appointment.id]}</p> : null}

                {mode?.id === appointment.id && mode.action === "reschedule" ? (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Input
                      type="datetime-local"
                      aria-label="Novo horário"
                      className="w-56"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                    />
                    <Button size="sm" disabled={busy || !newStart} onClick={() => reschedule(appointment)}>
                      Salvar novo horário
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                      Voltar
                    </Button>
                  </div>
                ) : mode?.id === appointment.id && mode.action === "transfer" ? (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger className="w-48" aria-label="Transferir para">
                        <SelectValue placeholder="Barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {others(appointment).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={busy || !target} onClick={() => transfer(appointment)}>
                      Confirmar transferência
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                      Voltar
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setNewStart("");
                        setMode({ id: appointment.id, action: "reschedule" });
                      }}
                    >
                      Remarcar
                    </Button>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setTarget("");
                          setMode({ id: appointment.id, action: "transfer" });
                        }}
                      >
                        Transferir
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => cancel(appointment)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {resolved.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium">Resolvidos — avise o cliente:</p>
              <ul className="flex flex-col gap-2">
                {resolved.map(({ kind, appointment }) => (
                  <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <span>
                      <Badge variant={kind === "cancelled" ? "destructive" : "default"}>{RESOLVED_LABEL[kind]}</Badge>{" "}
                      {appointment.customer.name} · {when(appointment.startsAt)} · {appointment.professional.user.name}
                    </span>
                    <WhatsAppLink
                      phone={appointment.customer.phone}
                      label="Avisar no WhatsApp"
                      text={renderTemplate(templates[TEMPLATE_OF[kind]], appointmentVariables(appointment, barbershop, timeZone))}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppModal>
  );
}
