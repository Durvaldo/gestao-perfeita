"use client";

import { RotateCcw } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { FormError, PageHeader } from "@/components/crud/crud-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { toastSuccess } from "@/lib/toast";
import {
  DEFAULT_TEMPLATES,
  type MessageTemplates,
  renderTemplate,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_VARIABLES,
  type TemplateVariables,
} from "@/lib/whatsapp";

/** Sample values for the preview. */
const sample = (barbershop: string): TemplateVariables => ({
  cliente: "João",
  barbearia: barbershop || "sua barbearia",
  profissional: "Carlos",
  data: "10/01/2030",
  hora: "10:00",
  servicos: "Corte, Barba",
});

/** WhatsApp message templates (SPEC-0008 RF-2): the texts of the "WhatsApp" buttons. */
export function MessagesScreen({ barbershop }: { barbershop: string }) {
  const [templates, setTemplates] = useState<MessageTemplates | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<MessageTemplates>("/api/message-templates").then((response) => {
      if (cancelled) return;
      if (response.ok) setTemplates(response.data);
      else setFormError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!templates) return;
    setSaving(true);
    const response = await api<MessageTemplates>("/api/message-templates", { method: "PUT", body: templates });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    setErrors({});
    setFormError(null);
    setTemplates(response.data);
    toastSuccess("Mensagens salvas.");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <PageHeader
        title="Mensagens de WhatsApp"
        description={`Textos dos botões de WhatsApp em Clientes e na Agenda. Variáveis: ${TEMPLATE_VARIABLES.join(", ")}.`}
        action={
          <Button type="submit" disabled={saving || !templates}>
            Salvar
          </Button>
        }
      />
      <FormError message={formError} />
      {templates
        ? TEMPLATE_KEYS.map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{TEMPLATE_LABELS[key]}</CardTitle>
                <CardDescription>Prévia: {renderTemplate(templates[key], sample(barbershop))}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Label htmlFor={`template-${key}`} className="sr-only">
                  {TEMPLATE_LABELS[key]}
                </Label>
                <Textarea
                  id={`template-${key}`}
                  rows={3}
                  maxLength={1000}
                  value={templates[key]}
                  onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
                />
                {errors[key] ? <p className="text-sm text-destructive">{errors[key][0]}</p> : null}
                {templates[key] !== DEFAULT_TEMPLATES[key] ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setTemplates({ ...templates, [key]: DEFAULT_TEMPLATES[key] })}
                  >
                    <RotateCcw className="size-4" />
                    Voltar ao texto padrão
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        : null}
    </form>
  );
}
