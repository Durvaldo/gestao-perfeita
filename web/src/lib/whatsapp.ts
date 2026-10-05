// WhatsApp level 1 (SPEC-0008): ready-made messages opened through wa.me links,
// no provider involved. Isomorphic: the API validates templates with it and the
// UI renders the links.
import { formatDate } from "./format";
import { isValidPhoneDigits, phoneDigits } from "./phone";
import { zonedParts } from "./timezone";

export const TEMPLATE_KEYS = [
  "customerChat",
  "appointmentConfirmation",
  "appointmentReminder",
  "appointmentRescheduled",
  "appointmentTransferred",
  "appointmentCancelled",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type MessageTemplates = Record<TemplateKey, string>;

/** User-facing names of the templates (pt-BR). */
export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  customerChat: "Conversa com o cliente",
  appointmentConfirmation: "Confirmação de agendamento",
  appointmentReminder: "Lembrete de agendamento",
  appointmentRescheduled: "Agendamento remarcado",
  appointmentTransferred: "Agendamento com outro barbeiro",
  appointmentCancelled: "Agendamento cancelado",
};

export const DEFAULT_TEMPLATES: MessageTemplates = {
  customerChat: "Olá, {cliente}! Aqui é da {barbearia}.",
  appointmentConfirmation:
    "Olá, {cliente}! Confirmando seu horário na {barbearia}: {data} às {hora}, com {profissional} ({servicos}). Podemos confirmar?",
  appointmentReminder: "Olá, {cliente}! Lembrete do seu horário na {barbearia}: {data} às {hora}, com {profissional}. Até lá!",
  appointmentRescheduled:
    "Olá, {cliente}! Precisamos remarcar seu horário na {barbearia}. O novo horário é {data} às {hora}, com {profissional}. Tudo bem para você?",
  appointmentTransferred:
    "Olá, {cliente}! Seu horário de {data} às {hora} na {barbearia} vai ser com {profissional}. Tudo bem para você?",
  appointmentCancelled:
    "Olá, {cliente}! Infelizmente precisamos cancelar seu horário de {data} às {hora} na {barbearia}. Quer marcar outro dia?",
};

/** The variables a template can use, as typed by the admin. */
export const TEMPLATE_VARIABLES = ["{cliente}", "{barbearia}", "{profissional}", "{data}", "{hora}", "{servicos}"];

export type TemplateVariables = Partial<Record<"cliente" | "barbearia" | "profissional" | "data" | "hora" | "servicos", string>>;

/** Replaces {variable} placeholders; unknown or missing ones are left as typed. */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => variables[name as keyof TemplateVariables] ?? match);
}

/** Variables of an appointment, with date and time in the barbershop's time zone (ADR-0009). */
export function appointmentVariables(
  appointment: { startsAt: string; customer: { name: string }; professional: { user: { name: string } }; services: { name: string }[] },
  barbershop: string,
  timeZone: string,
): TemplateVariables {
  const start = zonedParts(new Date(appointment.startsAt), timeZone);
  return {
    cliente: appointment.customer.name.split(" ")[0],
    barbearia: barbershop,
    profissional: appointment.professional.user.name.split(" ")[0],
    data: formatDate(start.date),
    hora: start.time.slice(0, 5),
    servicos: appointment.services.map((s) => s.name).join(", "),
  };
}

/**
 * wa.me link that opens a chat with the message typed, or null when the phone
 * isn't a valid Brazilian number. Phones are stored without the country code
 * (SPEC-0005), so 55 is added here.
 */
export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const digits = phone ? phoneDigits(phone) : "";
  if (!isValidPhoneDigits(digits)) return null;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}
