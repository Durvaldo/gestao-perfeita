"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/format";

/**
 * Phone input with the Brazilian mask applied while typing (SPEC-0005). The value
 * is the masked text; the API strips it to digits, so it can be sent as is.
 */
export function PhoneInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="(11) 98765-4321"
      value={formatPhone(value)}
      onChange={(event) => onChange(formatPhone(event.target.value))}
    />
  );
}
