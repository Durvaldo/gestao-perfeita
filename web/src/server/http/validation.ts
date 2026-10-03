import type { z } from "zod";
import { ValidationError } from "@/lib/http-errors";

/** Human-readable (pt-BR) names for fields, used in messages: { birthDate: "data de nascimento" }. */
export type FieldLabels = Record<string, string>;

type Issue = z.core.$ZodIssue;

function labelFor(path: PropertyKey[], labels: FieldLabels): string {
  const key = path.filter((p) => typeof p !== "number").join(".");
  return labels[key] ?? key ?? "valor";
}

function sizeUnit(origin: string): "string" | "array" | "number" {
  if (origin === "string") return "string";
  if (origin === "array" || origin === "set") return "array";
  return "number";
}

// Messages follow the legacy backend/lang/pt_BR/validation.php.
function messageFor(issue: Issue, label: string): string {
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null) return `O campo ${label} é obrigatório.`;
      if (issue.expected === "int") return `O campo ${label} deve ser um número inteiro.`;
      if (issue.expected === "number") return `O campo ${label} deve ser um número.`;
      if (issue.expected === "boolean") return `O campo ${label} deve ser verdadeiro ou falso.`;
      if (issue.expected === "array") return `O campo ${label} deve ser uma lista.`;
      if (issue.expected === "date") return `O campo ${label} deve ser uma data válida.`;
      return `O campo ${label} é inválido.`;
    case "too_small": {
      const unit = sizeUnit(issue.origin);
      const min = String(issue.minimum);
      if (unit === "string") {
        return Number(issue.minimum) <= 1 ? `O campo ${label} é obrigatório.` : `O campo ${label} deve ter ao menos ${min} caracteres.`;
      }
      if (unit === "array") return `O campo ${label} deve ter ao menos ${min} itens.`;
      return issue.inclusive === false
        ? `O campo ${label} deve ser maior que ${min}.`
        : `O campo ${label} deve ser ao menos ${min}.`;
    }
    case "too_big": {
      const unit = sizeUnit(issue.origin);
      const max = String(issue.maximum);
      if (unit === "string") return `O campo ${label} não deve ter mais de ${max} caracteres.`;
      if (unit === "array") return `O campo ${label} não deve ter mais de ${max} itens.`;
      return issue.inclusive === false
        ? `O campo ${label} deve ser menor que ${max}.`
        : `O campo ${label} não deve ser maior que ${max}.`;
    }
    case "invalid_format":
      if (issue.format === "email") return `O campo ${label} deve ser um endereço de e-mail válido.`;
      if (issue.format === "date" || issue.format === "datetime") return `O campo ${label} deve ser uma data válida.`;
      if (issue.format === "time") return `O campo ${label} deve ser um horário válido.`;
      if (issue.format === "url") return `O campo ${label} deve ser uma URL válida.`;
      return `O campo ${label} tem um formato inválido.`;
    case "invalid_value":
      return `O valor selecionado para ${label} é inválido.`;
    case "custom":
      // Custom refinements carry their own (already pt-BR) message.
      return issue.message;
    default:
      return `O campo ${label} é inválido.`;
  }
}

/** Converts Zod issues into the legacy 422 shape: field → messages. */
export function toFieldErrors(issues: readonly Issue[], labels: FieldLabels): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join(".") || "_";
    (errors[field] ??= []).push(messageFor(issue, labelFor(issue.path, labels)));
  }
  return errors;
}

// Legacy parity (Laravel's TrimStrings + ConvertEmptyStringsToNull middleware):
// trim strings and treat "" as null, so optional fields can be sent empty.
function normalize(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

/** Validates `input` against `schema`, throwing a 422 ValidationError on failure. */
export function validate<S extends z.ZodType>(schema: S, input: unknown, labels: FieldLabels = {}): z.output<S> {
  const result = schema.safeParse(normalize(input), { reportInput: true });
  if (!result.success) {
    throw new ValidationError(toFieldErrors(result.error.issues, labels));
  }
  return result.data;
}

/** Reads and validates a JSON request body. An unreadable body counts as empty. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S, labels: FieldLabels = {}) {
  const body = await request.json().catch(() => ({}));
  return validate(schema, body, labels);
}

/** Validates the URL query string (all values arrive as strings; use z.coerce for numbers). */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S, labels: FieldLabels = {}) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return validate(schema, params, labels);
}
