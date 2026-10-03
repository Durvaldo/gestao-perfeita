import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "@/lib/api-client";

function mockFetch(status: number, body: unknown) {
  const text = body === undefined ? "" : JSON.stringify(body);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(text || null, { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  test("returns data on success and sends JSON bodies", async () => {
    mockFetch(201, { id: 1, name: "Corte" });

    const result = await api<{ id: number }>("/api/services", { method: "POST", body: { name: "Corte" } });

    expect(result).toEqual({ ok: true, status: 201, data: { id: 1, name: "Corte" } });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ name: "Corte" }) });
  });

  test("returns the server message and field errors on 422", async () => {
    mockFetch(422, { message: "O campo nome é obrigatório.", errors: { name: ["O campo nome é obrigatório."] } });

    expect(await api("/api/services", { method: "POST", body: {} })).toEqual({
      ok: false,
      status: 422,
      message: "O campo nome é obrigatório.",
      errors: { name: ["O campo nome é obrigatório."] },
    });
  });

  test("handles 204 and responses without a JSON body", async () => {
    mockFetch(204, undefined);
    expect(await api("/api/services/1", { method: "DELETE" })).toEqual({ ok: true, status: 204, data: null });

    mockFetch(500, undefined);
    const failed = await api("/api/services");
    expect(failed).toMatchObject({ ok: false, status: 500, errors: {} });
  });

  test("network failure becomes a pt-BR error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await api("/api/services")).toEqual({ ok: false, status: 0, message: "Sem conexão com o servidor.", errors: {} });
  });
});
