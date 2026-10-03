"use client";

import { useState } from "react";
import { AppModal } from "@/components/app-modal";
import { useConfirm } from "@/components/confirm-provider";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";

/** Usage examples of the base components, for whoever builds the next screens. */
export function ComponentsShowcase() {
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [price, setPrice] = useState<string | null>("1234.5");
  const [lastAnswer, setLastAnswer] = useState<string>("—");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Componentes base</h1>
        <p className="text-muted-foreground">Referência de uso (visível só em desenvolvimento).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Toasts</CardTitle>
            <CardDescription>toastSuccess / toastError (src/lib/toast.ts)</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => toastSuccess("Cliente salvo com sucesso.")}>Sucesso</Button>
            <Button variant="destructive" onClick={() => toastError("Não foi possível salvar o cliente.")}>
              Erro
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmação destrutiva</CardTitle>
            <CardDescription>useConfirm() (src/components/confirm-provider.tsx)</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: "Excluir cliente?",
                  description: "Esta ação não pode ser desfeita.",
                  confirmLabel: "Excluir",
                });
                setLastAnswer(ok ? "confirmou" : "cancelou");
              }}
            >
              Excluir…
            </Button>
            <span className="text-sm text-muted-foreground">Resposta: {lastAnswer}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modal de formulário</CardTitle>
            <CardDescription>AppModal (src/components/app-modal.tsx)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Novo serviço
            </Button>
            <AppModal
              open={modalOpen}
              onOpenChange={setModalOpen}
              title="Novo serviço"
              description="Exemplo de formulário em modal."
              footer={
                <>
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setModalOpen(false)}>Salvar</Button>
                </>
              }
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-name">Nome</Label>
                <Input id="demo-name" placeholder="Corte" />
              </div>
            </AppModal>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input decimal e formatação</CardTitle>
            <CardDescription>DecimalInput + src/lib/format.ts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-price">Preço</Label>
              <DecimalInput id="demo-price" value={price} onChange={setPrice} />
            </div>
            <p className="text-sm text-muted-foreground">
              Valor para a API: <code>{JSON.stringify(price)}</code> · Exibição: {formatCurrency(price)}
            </p>
            <p className="text-sm text-muted-foreground">
              Datas: {formatDate("1990-03-15")} · {formatDateTime(new Date().toISOString())}
            </p>
            <div className="flex gap-2">
              <Badge>Ativo</Badge>
              <Badge variant="secondary">Inativo</Badge>
              <Badge variant="destructive">Cancelado</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
