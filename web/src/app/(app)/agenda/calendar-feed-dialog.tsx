"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { toastError, toastSuccess } from "@/lib/toast";

/**
 * "Agenda no celular" (SPEC-0006 RF-2b): the subscription link of a professional's
 * calendar feed, to add to Google Calendar, Apple Calendar or Outlook.
 */
export function CalendarFeedDialog({
  professionalId,
  professionalName,
  open,
  onOpenChange,
}: {
  professionalId: string;
  professionalName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const confirm = useConfirm();
  // The loaded link, tagged with its professional: undefined while another professional's is loading.
  const [feed, setFeed] = useState<{ professionalId: string; path: string | null } | null>(null);
  const path = feed?.professionalId === professionalId ? feed.path : undefined;
  const setPath = (value: string | null) => setFeed({ professionalId, path: value });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !professionalId) return;
    let cancelled = false;
    api<{ path: string | null }>(`/api/professionals/${professionalId}/calendar-feed`).then((response) => {
      if (cancelled) return;
      if (response.ok) setFeed({ professionalId, path: response.data.path });
      else toastError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, [open, professionalId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = path ? `${origin}${path}` : null;

  async function generate() {
    if (path) {
      const ok = await confirm({
        title: "Gerar um novo link?",
        description: "O link atual para de funcionar. Quem assinou com ele precisa assinar de novo.",
        confirmLabel: "Gerar novo link",
      });
      if (!ok) return;
    }
    setBusy(true);
    const response = await api<{ path: string }>(`/api/professionals/${professionalId}/calendar-feed`, { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      toastError(response.message);
      return;
    }
    setPath(response.data.path);
  }

  async function turnOff() {
    const ok = await confirm({ title: "Desativar o link?", description: "A agenda some dos calendários que assinaram.", confirmLabel: "Desativar" });
    if (!ok) return;
    setBusy(true);
    const response = await api(`/api/professionals/${professionalId}/calendar-feed`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) setPath(null);
    else toastError(response.message);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess("Link copiado.");
    } catch {
      toastError("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <AppModal open={open} onOpenChange={onOpenChange} title="Agenda no celular">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Assine a agenda de <span className="font-medium text-foreground">{professionalName}</span> no calendário do celular. Os
          agendamentos aparecem lá sozinhos (só leitura).
        </p>

        {path === undefined ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : url ? (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Link da agenda" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" onClick={copy}>
                <Copy className="size-4" />
                Copiar
              </Button>
            </div>
            <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">iPhone:</span> Ajustes → Calendário → Contas → Adicionar Conta → Outra → Adicionar
                Calendário Assinado, e cole o link. Atualiza em minutos.
              </li>
              <li>
                <span className="font-medium text-foreground">Google Agenda</span> (pelo computador): Outras agendas → + → Do URL, e cole o link.
                O Google atualiza agendas assinadas só de tempos em tempos, então mudanças podem levar algumas horas para aparecer.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={generate}>
                <RefreshCw className="size-4" />
                Gerar novo link
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={turnOff}>
                Desativar link
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button type="button" disabled={busy} onClick={generate}>
              Gerar link da agenda
            </Button>
          </div>
        )}
      </div>
    </AppModal>
  );
}
