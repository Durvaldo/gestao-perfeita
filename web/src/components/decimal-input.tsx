"use client";

import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDecimal, parseDecimal } from "@/lib/format";

type DecimalInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  /** Value in API format ("1234.5"), or null when empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  decimals?: number;
};

/**
 * Number field in Brazilian format (legacy DecimalInput.vue): the user types
 * "1.234,5", the field shows "1.234,50" after leaving it, and `onChange` receives
 * the API value "1234.5" (a string, never a float).
 */
export function DecimalInput({ value, onChange, decimals = 2, onBlur, onFocus, ...props }: DecimalInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatDecimal(value, decimals);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={shown}
      onFocus={(event) => {
        setDraft(formatDecimal(value, decimals));
        onFocus?.(event);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseDecimal(event.target.value));
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
