"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { FormError, FormField, PageHeader } from "@/components/crud/crud-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, apiAll } from "@/lib/api-client";
import { addDays, dayMonthLabel, minutesToTime, startOfWeek, timeToMinutes } from "@/lib/calendar";
import { formatCurrency, formatDate } from "@/lib/format";
import { zonedParts } from "@/lib/timezone";
import { toastError, toastSuccess } from "@/lib/toast";
import { AgendaCalendar, type CalendarAppointment, type CalendarBlock, type CalendarWorkingHour } from "./agenda-calendar";

type Appointment = Omit<CalendarAppointment, "customer" | "services"> & {
  customerId: number;
  professionalId: number;
  notes: string | null;
  customer: { id: number; name: string; phone: string };
  professional: { id: number; user: { name: string } };
  services: { id: number; name: string; durationMinutes: number; priceAtBooking: string }[];
};
type Option = { id: number; name: string };
type ProfessionalOption = { id: number; active: boolean; user: { name: string } };
type ServiceOption = { id: number; name: string; durationMinutes: number; price: string; active: boolean };

const STATUS_LABEL: Record<Appointment["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Atendido",
  cancelled: "Cancelado",
};
const STATUS_TOAST: Partial<Record<Appointment["status"], string>> = {
  confirmed: "Agendamento confirmado.",
  completed: "Agendamento marcado como atendido.",
  cancelled: "Agendamento cancelado.",
};

type Form = { customerId: string; professionalId: string; startsAt: string; serviceIds: number[]; notes: string };

export function AgendaScreen({
  timeZone,
  isAdmin,
  ownProfessionalId,
}: {
  timeZone: string;
  isAdmin: boolean;
  ownProfessionalId: number | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  // "Today" is the barbershop's calendar day.
  const today = useMemo(() => zonedParts(new Date(), timeZone).date, [timeZone]);

  const [view, setView] = useState<"week" | "day">("week");
  const [baseDate, setBaseDate] = useState(today);
  // A professional always sees their own schedule; an admin picks one.
  const [professionalId, setProfessionalId] = useState<string>(ownProfessionalId ? String(ownProfessionalId) : "");
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Current barbershop time, refreshed whenever the appointments reload: past slots
  // can't be booked (SPEC-0003; the API is the real check).
  const now = useMemo(() => {
    const parts = zonedParts(new Date(), timeZone);
    return { date: parts.date, minutes: timeToMinutes(parts.time), time: parts.time.slice(0, 5) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute the clock on each reload
  }, [timeZone, appointments]);
  const [workingHours, setWorkingHours] = useState<CalendarWorkingHour[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [version, setVersion] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>({ customerId: "", professionalId: "", startsAt: "", serviceIds: [], notes: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);

  const days = useMemo(() => {
    if (view === "day") return [baseDate];
    const monday = startOfWeek(baseDate);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [view, baseDate]);

  // Lists for the form and the professional picker.
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiAll<ProfessionalOption>("/api/professionals"), apiAll<Option>("/api/customers"), apiAll<ServiceOption>("/api/services")]).then(
      ([pros, custs, servs]) => {
        if (cancelled) return;
        if (pros.ok) {
          setProfessionals(pros.data);
          const firstActive = pros.data.find((p) => p.active);
          if (firstActive) setProfessionalId((current) => current || String(firstActive.id));
        }
        if (custs.ok) setCustomers(custs.data);
        if (servs.ok) setServices(servs.data.filter((s) => s.active));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Appointments of the visible period + working hours of the selected professional.
  useEffect(() => {
    if (!professionalId) return;
    let cancelled = false;
    const from = `${days[0]}T00:00`;
    const to = `${addDays(days[days.length - 1], 1)}T00:00`;
    Promise.all([
      api<Appointment[]>(`/api/appointments?professionalId=${professionalId}&from=${from}&to=${to}`),
      api<CalendarWorkingHour[]>(`/api/professionals/${professionalId}/working-hours`),
      // The professional's and the whole barbershop's exceptions (SPEC-0004).
      api<CalendarBlock[]>(`/api/schedule-blocks?professionalId=${professionalId}&from=${from}&to=${to}`),
    ]).then(([list, hours, exceptions]) => {
      if (cancelled) return;
      if (list.ok) setAppointments(list.data);
      else toastError(list.message);
      if (hours.ok) setWorkingHours(hours.data);
      if (exceptions.ok) setBlocks(exceptions.data);
    });
    return () => {
      cancelled = true;
    };
  }, [professionalId, days, version]);

  const reload = () => setVersion((v) => v + 1);
  const navigate = (direction: number) => setBaseDate((d) => addDays(d, (view === "week" ? 7 : 1) * direction));
  const periodLabel = days.length === 1 ? formatDate(days[0]) : `${dayMonthLabel(days[0])} – ${dayMonthLabel(days[days.length - 1])}`;

  function openCreate(dateKey?: string, minutes?: number) {
    setForm({
      customerId: "",
      professionalId,
      startsAt: dateKey !== undefined && minutes !== undefined ? `${dateKey}T${minutesToTime(minutes)}` : "",
      serviceIds: [],
      notes: "",
    });
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    // startsAt is a naive local time: the API reads it in the barbershop's zone.
    const response = await api("/api/appointments", {
      method: "POST",
      body: { ...form, customerId: form.customerId || null, professionalId: form.professionalId || null },
    });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    toastSuccess("Agendamento criado.");
    setFormOpen(false);
    reload();
  }

  async function changeStatus(appointment: Appointment, status: Appointment["status"]) {
    const response = await api(`/api/appointments/${appointment.id}`, {
      method: "PUT",
      body: {
        customerId: appointment.customerId,
        professionalId: appointment.professionalId,
        startsAt: appointment.startsAt, // exact instant (with "Z")
        serviceIds: appointment.services.map((s) => s.id),
        notes: appointment.notes,
        status,
      },
    });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess(STATUS_TOAST[status] ?? "Agendamento atualizado.");
    setDetail(null);
    reload();
  }

  async function cancel(appointment: Appointment) {
    const ok = await confirm({
      title: `Cancelar o agendamento de ${appointment.customer.name}?`,
      confirmLabel: "Sim, cancelar",
      cancelLabel: "Voltar",
    });
    if (ok) await changeStatus(appointment, "cancelled");
  }

  async function openOrder(appointment: Appointment) {
    const response = await api<{ id: number }>("/api/orders", { method: "POST", body: { appointmentId: appointment.id } });
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    toastSuccess("Comanda criada.");
    router.push(`/comandas/${response.data.id}`);
  }

  const toggleService = (id: number) =>
    setForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id] }));
  const timeOf = (iso: string) => zonedParts(new Date(iso), timeZone).time.slice(0, 5);
  const selectedProfessional = professionals.find((p) => String(p.id) === professionalId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agenda"
        description={isAdmin ? "Agenda dos barbeiros." : "Sua agenda."}
        action={
          <Button onClick={() => openCreate()} disabled={!professionalId}>
            <CalendarPlus className="size-4" />
            Novo agendamento
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Período anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" onClick={() => setBaseDate(today)}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Próximo período">
          <ChevronRight className="size-4" />
        </Button>
        <span className="min-w-36 text-sm font-medium">{periodLabel}</span>
        <div className="flex rounded-lg border p-0.5">
          {(["week", "day"] as const).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "secondary" : "ghost"} onClick={() => setView(v)}>
              {v === "week" ? "Semana" : "Dia"}
            </Button>
          ))}
        </div>
        {isAdmin ? (
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger className="ms-auto w-56" aria-label="Barbeiro">
              <SelectValue placeholder="Selecione o barbeiro" />
            </SelectTrigger>
            <SelectContent>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.user.name}
                  {p.active ? "" : " (inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <Card className="p-0">
        {professionalId ? (
          <AgendaCalendar
            days={days}
            today={today}
            now={now}
            timeZone={timeZone}
            appointments={appointments}
            workingHours={workingHours}
            blocks={blocks}
            onSelectSlot={selectedProfessional?.active === false ? undefined : (day, minutes) => openCreate(day, minutes)}
            onSelectAppointment={(a) => setDetail(a as Appointment)}
          />
        ) : (
          <p className="p-10 text-center text-muted-foreground">Nenhum barbeiro cadastrado.</p>
        )}
      </Card>

      <AppModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Novo agendamento"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="appointment-form" disabled={saving}>
              Agendar
            </Button>
          </>
        }
      >
        <form id="appointment-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <FormField id="customerId" label="Cliente" errors={errors.customerId} className="sm:col-span-2">
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
          {isAdmin ? (
            <FormField id="professionalId" label="Barbeiro" errors={errors.professionalId}>
              <Select value={form.professionalId} onValueChange={(value) => setForm({ ...form, professionalId: value })}>
                <SelectTrigger id="professionalId" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professionals
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.user.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <FormField id="startsAt" label="Data e hora" errors={errors.startsAt} className={isAdmin ? "" : "sm:col-span-2"}>
            <Input
              id="startsAt"
              type="datetime-local"
              // No booking in the past (SPEC-0003).
              min={`${now.date}T${now.time}`}
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </FormField>
          <FormField id="serviceIds" label="Serviços" errors={errors.serviceIds} className="sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-2" id="serviceIds">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5">
                  <input type="checkbox" className="accent-primary" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.durationMinutes} min · {formatCurrency(s.price)}
                  </span>
                </label>
              ))}
            </div>
          </FormField>
          <FormField id="notes" label="Observações" errors={errors.notes} className="sm:col-span-2">
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </form>
      </AppModal>

      <AppModal open={detail !== null} onOpenChange={(open) => !open && setDetail(null)} title="Agendamento">
        {detail ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{detail.customer.name}</span>
                <Badge variant={detail.status === "cancelled" ? "destructive" : detail.status === "pending" ? "secondary" : "default"}>
                  {STATUS_LABEL[detail.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {formatDate(zonedParts(new Date(detail.startsAt), timeZone).date)} · {timeOf(detail.startsAt)} – {timeOf(detail.endsAt)} · {detail.professional.user.name}
              </p>
              <ul className="rounded-md border">
                {detail.services.map((s) => (
                  <li key={s.id} className="flex justify-between border-b px-3 py-1.5 last:border-b-0">
                    <span>{s.name}</span>
                    <span>{formatCurrency(s.priceAtBooking)}</span>
                  </li>
                ))}
              </ul>
              {detail.notes ? <p className="text-muted-foreground">Obs.: {detail.notes}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.status === "pending" ? <Button onClick={() => changeStatus(detail, "confirmed")}>Confirmar</Button> : null}
              {detail.status === "pending" || detail.status === "confirmed" ? (
                <>
                  <Button variant="outline" onClick={() => changeStatus(detail, "completed")}>
                    Marcar atendido
                  </Button>
                  <Button variant="outline" onClick={() => openOrder(detail)}>
                    <Receipt className="size-4" />
                    Criar comanda
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => cancel(detail)}>
                    Cancelar agendamento
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}
