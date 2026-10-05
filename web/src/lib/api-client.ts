// Browser-side calls to our own Route Handlers (same origin, session cookie).

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string; errors: Record<string, string[]> };

/** Shape of paginated listings (src/server/http/pagination.ts). */
export type Paginated<T> = {
  data: T[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
};

const FALLBACK = "Não foi possível concluir a operação. Tente novamente.";

/**
 * fetch() wrapper that never throws for HTTP errors: returns `ok: false` with the
 * server's pt-BR `message` and the 422 field `errors` (ADR-0007).
 */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    // FormData (file uploads) goes as multipart, with the boundary set by the browser.
    const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch {
    return { ok: false, status: 0, message: "Sem conexão com o servidor.", errors: {} };
  }

  const text = await response.text();
  const json = text ? safeParse(text) : null;
  if (response.ok) {
    return { ok: true, status: response.status, data: json as T };
  }
  const body = (json ?? {}) as { message?: string; errors?: Record<string, string[]> };
  return { ok: false, status: response.status, message: body.message ?? FALLBACK, errors: body.errors ?? {} };
}

/**
 * Loads every page of a paginated listing (for selects such as customers or
 * services). Fine for the sizes of a barbershop; switch to search if lists grow.
 */
export async function apiAll<T>(path: string): Promise<ApiResult<T[]>> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const response = await api<Paginated<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}`);
    if (!response.ok) return response;
    all.push(...response.data.data);
    if (page >= response.data.lastPage) return { ok: true, status: 200, data: all };
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
