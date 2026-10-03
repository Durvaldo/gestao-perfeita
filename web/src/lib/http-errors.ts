import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

// HTTP errors with the same pt-BR messages as the legacy API
// (backend/bootstrap/app.php). Throw them from server code; convert to a
// response with errorResponse().

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  toBody(): Record<string, unknown> {
    return { message: this.message };
  }
}

export class UnauthenticatedError extends HttpError {
  constructor() {
    super(401, "Não autenticado.");
  }
}

export class ForbiddenError extends HttpError {
  constructor() {
    super(403, "Esta ação não é autorizada.");
  }
}

export class NotFoundError extends HttpError {
  constructor() {
    super(404, "Registro não encontrado.");
  }
}

/**
 * 422 with the legacy Laravel shape: `{ message, errors: { field: [messages] } }`.
 * `message` is the first error, plus "(e mais N erro(s))" when there are more,
 * because the screens show only `message`.
 */
export class ValidationError extends HttpError {
  constructor(readonly errors: Record<string, string[]>) {
    super(422, ValidationError.summary(errors));
    this.name = "ValidationError";
  }

  /** Shortcut for a single business-rule error on one field. */
  static field(field: string, message: string): ValidationError {
    return new ValidationError({ [field]: [message] });
  }

  private static summary(errors: Record<string, string[]>): string {
    const messages = Object.values(errors).flat();
    const first = messages[0] ?? "Os dados informados são inválidos.";
    const more = messages.length - 1;
    if (more <= 0) return first;
    return `${first} (e mais ${more} ${more === 1 ? "erro" : "erros"})`;
  }

  override toBody(): Record<string, unknown> {
    return { message: this.message, errors: this.errors };
  }
}

/** 409: the record is still referenced by others (e.g. deleting a customer with appointments). */
export class InUseError extends HttpError {
  constructor() {
    super(409, "Este registro não pode ser excluído porque está vinculado a outros registros.");
  }
}

/**
 * Converts known errors into a JSON response: HttpError subclasses; Prisma's
 * "record not found" on update/delete (P2025), which is also what a record from
 * another tenant produces (ADR-0005), → 404; and a foreign key violation (P2003),
 * e.g. deleting a record still in use, → 409 (the legacy app answered 500).
 * Anything else is rethrown.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(error.toBody(), { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = error.code === "P2025" ? new NotFoundError() : error.code === "P2003" ? new InUseError() : null;
    if (mapped) {
      return NextResponse.json(mapped.toBody(), { status: mapped.status });
    }
  }
  throw error;
}
