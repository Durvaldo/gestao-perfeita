"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Paginated } from "@/lib/api-client";
import { toastError } from "@/lib/toast";

/** Loads a paginated listing (`?page=`) and exposes page navigation and reload. */
export function usePaginated<T>(path: string) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Paginated<T> | null>(null);
  // Key of the request whose response is on screen; "loading" while it differs
  // from the current one (state is only set from the async response).
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = `${path}|${page}|${version}`;

  useEffect(() => {
    let cancelled = false;
    api<Paginated<T>>(`${path}?page=${page}`).then((response) => {
      if (cancelled) return;
      if (response.ok) {
        // A deletion can leave the current page empty: step back one page.
        if (response.data.data.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setResult(response.data);
      } else {
        toastError(response.message);
      }
      setLoadedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [path, page, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { items: result?.data ?? [], meta: result, page, setPage, loading: loadedKey !== key && result === null, reload };
}
