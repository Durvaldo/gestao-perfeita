"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { DEFAULT_TEMPLATES, type MessageTemplates, whatsappUrl } from "@/lib/whatsapp";

/** The barbershop's WhatsApp templates (SPEC-0008), falling back to the defaults until loaded. */
export function useMessageTemplates(): MessageTemplates {
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  useEffect(() => {
    let cancelled = false;
    api<MessageTemplates>("/api/message-templates").then((response) => {
      if (!cancelled && response.ok) setTemplates(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return templates;
}

/**
 * Opens WhatsApp (web or app) with the message typed, through wa.me. Renders
 * nothing when the phone isn't valid, so there's no dead button.
 */
export function WhatsAppLink({
  phone,
  text,
  label = "WhatsApp",
  variant = "outline",
  size = "sm",
}: {
  phone: string | null | undefined;
  text: string;
  label?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default" | "icon";
}) {
  const url = whatsappUrl(phone, text);
  if (!url) return null;
  return (
    <Button asChild variant={variant} size={size}>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={size === "icon" ? label : undefined}>
        <MessageCircle className="size-4" />
        {size === "icon" ? null : label}
      </a>
    </Button>
  );
}
