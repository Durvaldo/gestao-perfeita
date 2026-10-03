// @vitest-environment node
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { ValidationError } from "@/lib/http-errors";
import { validate } from "@/server/http/validation";

const schema = z.object({
  name: z.string().min(1).max(10),
  email: z.email().nullable().optional(),
  durationMinutes: z.number().int().min(5),
  status: z.enum(["pending", "confirmed"]).optional(),
  serviceIds: z.array(z.number().int()).min(1).optional(),
});

const labels = {
  name: "nome",
  email: "e-mail",
  durationMinutes: "duração",
  status: "status",
  serviceIds: "serviços",
};

function errorsOf(input: unknown): ValidationError {
  try {
    validate(schema, input, labels);
  } catch (error) {
    if (error instanceof ValidationError) return error;
    throw error;
  }
  throw new Error("Expected a validation error");
}

describe("validate", () => {
  test("returns parsed data when valid", () => {
    expect(validate(schema, { name: " Corte ", durationMinutes: 30 }, labels)).toEqual({
      name: "Corte",
      durationMinutes: 30,
    });
  });

  test("missing, null and empty values are 'required' (legacy ConvertEmptyStringsToNull)", () => {
    for (const name of [undefined, null, "", "   "]) {
      expect(errorsOf({ name, durationMinutes: 30 }).errors.name).toEqual(["O campo nome é obrigatório."]);
    }
  });

  test("uses legacy pt-BR messages with field labels", () => {
    const error = errorsOf({
      name: "Um nome longo demais",
      email: "not-an-email",
      durationMinutes: 2,
      status: "unknown",
      serviceIds: [],
    });

    expect(error.status).toBe(422);
    expect(error.errors).toEqual({
      name: ["O campo nome não deve ter mais de 10 caracteres."],
      email: ["O campo e-mail deve ser um endereço de e-mail válido."],
      durationMinutes: ["O campo duração deve ser ao menos 5."],
      status: ["O valor selecionado para status é inválido."],
      serviceIds: ["O campo serviços deve ter ao menos 1 itens."],
    });
  });

  test("reports wrong types", () => {
    expect(errorsOf({ name: "Corte", durationMinutes: "trinta" }).errors.durationMinutes).toEqual([
      "O campo duração deve ser um número.",
    ]);
  });

  test("summarizes the first error and the count of the others in `message`", () => {
    expect(errorsOf({}).message).toBe("O campo nome é obrigatório. (e mais 1 erro)");
    expect(errorsOf({ name: "Corte", durationMinutes: 1 }).message).toBe("O campo duração deve ser ao menos 5.");
  });

  test("body shape matches the legacy 422", () => {
    expect(errorsOf({ name: "Corte" }).toBody()).toEqual({
      message: "O campo duração é obrigatório.",
      errors: { durationMinutes: ["O campo duração é obrigatório."] },
    });
  });
});
