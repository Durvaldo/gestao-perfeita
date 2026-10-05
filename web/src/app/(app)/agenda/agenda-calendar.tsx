"use client";

import { dayMonthLabel, isPastSlot, type LocalNow, minutesToTime, rangeOnDay, timeToMinutes, weekdayIndex, weekdayShortLabel } from "@/lib/calendar";
import { zonedParts } from "@/lib/timezone";
import { cn } from "@/lib/utils";

// Week/day grid (legacy AgendaCalendar.vue). Appointment instants are placed in
// the barbershop's time zone, never the browser's (ADR-0009).

export type CalendarAppointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  customer: { name: string };
  services: { name: string }[];
};

export type CalendarWorkingHour = { weekday: number; startTime: string; endTime: string };

/** A schedule exception (SPEC-0004): the slots inside it can't be booked. */
export type CalendarBlock = { id: number; startsAt: string; endsAt: string; reason: string | null; professionalId: number | null };

const PX_PER_MINUTE = 1.2;
const SLOT_MINUTES = 30;

export const STATUS_STYLES: Record<CalendarAppointment["status"], string> = {
  pending: "bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200",
  confirmed: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200",
  completed: "bg-green-100 border-green-400 text-green-900 hover:bg-green-200",
  cancelled: "bg-red-100 border-red-400 text-red-900 opacity-60 hover:bg-red-200",
};

type Placed = { appointment: CalendarAppointment; startMin: number; endMin: number };

export function AgendaCalendar({
  days,
  today,
  now,
  timeZone,
  appointments,
  workingHours,
  blocks = [],
  onSelectSlot,
  onSelectAppointment,
}: {
  days: string[];
  today: string;
  /** Current time in the barbershop: slots before it can't be booked (SPEC-0003). */
  now: LocalNow;
  timeZone: string;
  appointments: CalendarAppointment[];
  workingHours: CalendarWorkingHour[];
  blocks?: CalendarBlock[];
  onSelectSlot?: (dateKey: string, minutes: number) => void;
  onSelectAppointment: (appointment: CalendarAppointment) => void;
}) {
  // Working periods per weekday, in minutes.
  const periods = new Map<number, { start: number; end: number }[]>();
  for (const h of workingHours) {
    const list = periods.get(h.weekday) ?? [];
    list.push({ start: timeToMinutes(h.startTime), end: timeToMinutes(h.endTime) });
    periods.set(h.weekday, list);
  }

  // Appointments per visible day, positioned in the barbershop's local time.
  const byDay = new Map<string, Placed[]>(days.map((d) => [d, []]));
  for (const appointment of appointments) {
    const start = zonedParts(new Date(appointment.startsAt), timeZone);
    const end = zonedParts(new Date(appointment.endsAt), timeZone);
    const list = byDay.get(start.date);
    if (!list) continue;
    const startMin = timeToMinutes(start.time);
    list.push({ appointment, startMin, endMin: end.date === start.date ? timeToMinutes(end.time) : 24 * 60 });
  }

  // Hour range: working hours ±1h (fallback 07–21h), widened to fit any appointment.
  let min = Infinity;
  let max = -Infinity;
  for (const list of periods.values()) {
    for (const p of list) {
      min = Math.min(min, p.start);
      max = Math.max(max, p.end);
    }
  }
  if (min === Infinity) {
    min = 7 * 60;
    max = 21 * 60;
  } else {
    min = Math.max(0, Math.floor(min / 60) * 60 - 60);
    max = Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60);
  }
  for (const list of byDay.values()) {
    for (const p of list) {
      min = Math.max(0, Math.min(min, Math.floor(p.startMin / 60) * 60));
      max = Math.min(24 * 60, Math.max(max, Math.ceil(p.endMin / 60) * 60));
    }
  }
  const height = (max - min) * PX_PER_MINUTE;
  const slots: number[] = [];
  for (let m = min; m < max; m += SLOT_MINUTES) slots.push(m);
  // Exceptions per visible day, clipped to the grid's hour range.
  const blocksByDay = new Map(
    days.map((day) => [
      day,
      blocks.flatMap((block) => {
        const range = rangeOnDay(block.startsAt, block.endsAt, day, timeZone);
        if (!range) return [];
        const startMin = Math.max(range.startMin, min);
        const endMin = Math.min(range.endMin, max);
        return endMin > startMin ? [{ block, startMin, endMin, fullStart: range.startMin, fullEnd: range.endMin }] : [];
      }),
    ]),
  );
  const isBlocked = (dateKey: string, minute: number) =>
    (blocksByDay.get(dateKey) ?? []).some((b) => minute < b.fullEnd && minute + SLOT_MINUTES > b.fullStart);
  const isWorking = (dateKey: string, minute: number) =>
    (periods.get(weekdayIndex(dateKey)) ?? []).some((p) => minute >= p.start && minute + SLOT_MINUTES <= p.end);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((day) => (
          <div key={day} className={cn("border-b px-2 py-2 text-center text-sm", day === today && "font-semibold text-primary")}>
            {weekdayShortLabel(day)} <span className="text-muted-foreground">{dayMonthLabel(day)}</span>
          </div>
        ))}

        {/* Hour ruler */}
        <div className="relative" style={{ height }}>
          {slots
            .filter((m) => m % 60 === 0 && m !== min)
            .map((m) => (
              <span key={m} className="absolute end-2 -translate-y-1/2 text-xs text-muted-foreground" style={{ top: (m - min) * PX_PER_MINUTE }}>
                {minutesToTime(m)}
              </span>
            ))}
        </div>

        {days.map((day) => (
          <div key={day} className="relative border-s" style={{ height }}>
            {slots.map((m) => {
              const past = isPastSlot(day, m, now);
              const selectable = Boolean(onSelectSlot) && !past && !isBlocked(day, m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-label={`${dayMonthLabel(day)} ${minutesToTime(m)}`}
                  disabled={!selectable}
                  onClick={() => onSelectSlot?.(day, m)}
                  className={cn(
                    "absolute inset-x-0 border-t border-dashed border-border/70 transition-colors",
                    isWorking(day, m) && !past ? "bg-background hover:bg-primary/5" : "bg-muted/60",
                    !selectable && "cursor-default",
                  )}
                  style={{ top: (m - min) * PX_PER_MINUTE, height: SLOT_MINUTES * PX_PER_MINUTE }}
                />
              );
            })}
            {(blocksByDay.get(day) ?? []).map(({ block, startMin, endMin }) => (
              <div
                key={`block-${block.id}`}
                role="note"
                aria-label={`Agenda fechada: ${block.reason ?? "sem motivo"}`}
                className="pointer-events-none absolute inset-x-0 overflow-hidden border-y border-muted-foreground/30 bg-[repeating-linear-gradient(135deg,var(--muted)_0,var(--muted)_6px,transparent_6px,transparent_12px)] px-1.5 py-0.5 text-xs text-muted-foreground"
                style={{ top: (startMin - min) * PX_PER_MINUTE, height: (endMin - startMin) * PX_PER_MINUTE }}
              >
                <span className="rounded bg-background/80 px-1 font-medium">
                  {block.professionalId === null ? "Barbearia fechada" : "Fechado"}
                  {block.reason ? ` · ${block.reason}` : ""}
                </span>
              </div>
            ))}
            {(byDay.get(day) ?? []).map(({ appointment, startMin, endMin }) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onSelectAppointment(appointment)}
                className={cn("absolute inset-x-1 overflow-hidden rounded-md border-s-4 px-1.5 py-0.5 text-start text-xs shadow-sm", STATUS_STYLES[appointment.status])}
                style={{ top: (startMin - min) * PX_PER_MINUTE, height: Math.max(18, (endMin - startMin) * PX_PER_MINUTE - 2) }}
              >
                <span className="font-medium">{minutesToTime(startMin)}</span> {appointment.customer.name}
                <span className="block truncate opacity-80">{appointment.services.map((s) => s.name).join(", ")}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
