"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Paginated } from "@/lib/api-client";

/** Page title, optional description and primary action (e.g. "Novo cliente"). */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Label + control + the field's validation messages (from a 422 `errors`). */
export function FormField({
  id,
  label,
  errors,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.map((message) => (
        <p key={message} className="text-sm text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}

/** General error shown at the top of a form (the 422/409/... `message`). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

/** Placeholder rows while a table loads, or an empty-state row. */
export function TableState({ loading, empty, columns, emptyText }: { loading: boolean; empty: boolean; columns: number; emptyText: string }) {
  if (loading) {
    return (
      <>
        {[0, 1, 2].map((row) => (
          <TableRow key={row}>
            <TableCell colSpan={columns}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }
  if (empty) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className="py-10 text-center text-muted-foreground">
          {emptyText}
        </TableCell>
      </TableRow>
    );
  }
  return null;
}

/** "1–15 de 23" + previous/next buttons. Hidden when there is a single page. */
export function PaginationBar<T>({ meta, onPage }: { meta: Paginated<T> | null; onPage: (page: number) => void }) {
  if (!meta || meta.lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {meta.from}–{meta.to} de {meta.total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={meta.currentPage <= 1} onClick={() => onPage(meta.currentPage - 1)}>
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.currentPage >= meta.lastPage}
          onClick={() => onPage(meta.currentPage + 1)}
        >
          Próxima
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
