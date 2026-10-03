// @vitest-environment node
import { describe, expect, test } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { errorResponse, ForbiddenError, NotFoundError, UnauthenticatedError } from "@/lib/http-errors";

async function body(response: Response) {
  return { status: response.status, json: await response.json() };
}

describe("errorResponse", () => {
  test("uses the legacy pt-BR messages for 401, 403 and 404", async () => {
    expect(await body(errorResponse(new UnauthenticatedError()))).toEqual({
      status: 401,
      json: { message: "Não autenticado." },
    });
    expect(await body(errorResponse(new ForbiddenError()))).toEqual({
      status: 403,
      json: { message: "Esta ação não é autorizada." },
    });
    expect(await body(errorResponse(new NotFoundError()))).toEqual({
      status: 404,
      json: { message: "Registro não encontrado." },
    });
  });

  test("maps Prisma record-not-found (also what another tenant's record yields) to 404", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    });

    expect(await body(errorResponse(error))).toEqual({ status: 404, json: { message: "Registro não encontrado." } });
  });

  test("rethrows unknown errors", () => {
    const error = new Error("boom");
    expect(() => errorResponse(error)).toThrow(error);
  });
});
