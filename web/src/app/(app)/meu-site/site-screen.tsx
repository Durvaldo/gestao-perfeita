"use client";

import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { FormError, FormField, PageHeader } from "@/components/crud/crud-parts";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { toastError, toastSuccess } from "@/lib/toast";

const MAX_GALLERY = 8;

type SiteForm = {
  slug: string;
  enabled: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  gallery: string[];
  about: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
};

/** Uploads an image (POST /api/files) and returns its URL, or null after showing the error. */
async function uploadImage(file: File): Promise<string | null> {
  const body = new FormData();
  body.append("file", file);
  const response = await api<{ url: string }>("/api/files", { method: "POST", body });
  if (!response.ok) {
    toastError(response.errors.file?.[0] ?? response.message);
    return null;
  }
  return response.data.url;
}

/** Picks an image file and uploads it. */
function UploadButton({ label, onUploaded, disabled }: { label: string; onUploaded: (url: string) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          const url = await uploadImage(file);
          setBusy(false);
          if (url) onUploaded(url);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => input.current?.click()}>
        <ImagePlus className="size-4" />
        {busy ? "Enviando…" : label}
      </Button>
    </>
  );
}

function ImagePreview({ url, alt, className }: { url: string; alt: string; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border bg-muted ${className}`}>
      <Image src={url} alt={alt} fill unoptimized className="object-cover" />
    </div>
  );
}

/** "Meu site" (SPEC-0007 RF-2): the admin customizes the public site. */
export function SiteScreen() {
  const [form, setForm] = useState<SiteForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SiteForm>("/api/site-settings").then((response) => {
      if (cancelled) return;
      if (response.ok) setForm(response.data);
      else setFormError(response.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    // The API ignores fields it does not know (slug is read-only).
    const response = await api<SiteForm>("/api/site-settings", { method: "PUT", body: { ...form, whatsapp: form.whatsapp ?? "" } });
    setSaving(false);
    if (!response.ok) {
      setErrors(response.errors);
      setFormError(response.message);
      return;
    }
    setErrors({});
    setFormError(null);
    setForm(response.data);
    toastSuccess("Site atualizado.");
  }

  if (!form) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Meu site" />
        <FormError message={formError} />
      </div>
    );
  }

  const set = <K extends keyof SiteForm>(key: K, value: SiteForm[K]) => setForm({ ...form, [key]: value });

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <PageHeader
        title="Meu site"
        description="Personalize o site público da barbearia. Serviços, equipe e horários vêm dos cadastros."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={`/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Ver site
              </a>
            </Button>
            <Button type="submit" disabled={saving}>
              Salvar
            </Button>
          </div>
        }
      />
      <FormError message={formError} />

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="enabled" className="font-medium">
              Site no ar
            </Label>
            <p className="text-sm text-muted-foreground">
              Endereço: <span className="font-mono">/{form.slug}</span>. Desligado, o endereço mostra “Página não encontrada”.
            </p>
          </div>
          <Switch id="enabled" checked={form.enabled} onCheckedChange={(enabled) => set("enabled", enabled)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagens</CardTitle>
          <CardDescription>JPEG, PNG ou WebP, até 4 MB cada. As alterações só valem depois de salvar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex flex-wrap items-center gap-3">
              {form.logoUrl ? <ImagePreview url={form.logoUrl} alt="Logo" className="size-20" /> : null}
              <UploadButton label={form.logoUrl ? "Trocar logo" : "Enviar logo"} onUploaded={(url) => set("logoUrl", url)} />
              {form.logoUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("logoUrl", null)}>
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              ) : null}
            </div>
            {errors.logoUrl ? <p className="text-sm text-destructive">{errors.logoUrl[0]}</p> : null}
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Capa</span>
            <div className="flex flex-wrap items-center gap-3">
              {form.coverUrl ? <ImagePreview url={form.coverUrl} alt="Capa" className="h-20 w-36" /> : null}
              <UploadButton label={form.coverUrl ? "Trocar capa" : "Enviar capa"} onUploaded={(url) => set("coverUrl", url)} />
              {form.coverUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("coverUrl", null)}>
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">
              Galeria ({form.gallery.length}/{MAX_GALLERY})
            </span>
            <ul className="flex flex-wrap gap-3">
              {form.gallery.map((url) => (
                <li key={url} className="flex flex-col items-center gap-1">
                  <ImagePreview url={url} alt="Foto da galeria" className="size-24" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("gallery", form.gallery.filter((u) => u !== url))}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
            <div>
              <UploadButton
                label="Adicionar foto"
                disabled={form.gallery.length >= MAX_GALLERY}
                onUploaded={(url) => setForm((current) => (current ? { ...current, gallery: [...current.gallery, url] } : current))}
              />
            </div>
            {errors.gallery ? <p className="text-sm text-destructive">{errors.gallery[0]}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Textos e contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="about" label="Sobre a barbearia" errors={errors.about} className="sm:col-span-2">
            <Textarea id="about" rows={4} maxLength={2000} value={form.about ?? ""} onChange={(e) => set("about", e.target.value)} />
          </FormField>
          <FormField id="whatsapp" label="WhatsApp para agendamento" errors={errors.whatsapp}>
            <PhoneInput id="whatsapp" value={form.whatsapp ?? ""} onChange={(whatsapp) => set("whatsapp", whatsapp)} />
          </FormField>
          <p className="self-end pb-2 text-sm text-muted-foreground">Vazio: usa o telefone da barbearia.</p>
          <FormField id="instagram" label="Instagram (link)" errors={errors.instagram}>
            <Input id="instagram" type="url" placeholder="https://instagram.com/..." value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} />
          </FormField>
          <FormField id="facebook" label="Facebook (link)" errors={errors.facebook}>
            <Input id="facebook" type="url" placeholder="https://facebook.com/..." value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
    </form>
  );
}
