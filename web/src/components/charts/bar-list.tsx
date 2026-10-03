"use client";

import { useState } from "react";

export type BarListItem = { key: string | number; label: string; value: number; display: string };

/**
 * Horizontal single-series bar chart (magnitude per category) in plain HTML.
 * One hue (the primary blue, validated against both chart surfaces), thin bars
 * with a 4px rounded data end, 2px gaps, labels in text tokens (never the series
 * color), a hover tooltip, and the values as text so nothing depends on color.
 * The card title names the series, so there is no legend.
 */
export function BarList({ items, emptyText, valueLabel }: { items: BarListItem[]; emptyText: string; valueLabel: string }) {
  const [hover, setHover] = useState<string | number | null>(null);
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="flex flex-col gap-0.5" aria-label={valueLabel}>
      {items.map((item) => (
        <li
          key={item.key}
          className="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/60"
          onMouseEnter={() => setHover(item.key)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-sm text-foreground" title={item.label}>
            {item.label}
          </span>
          <span className="relative h-3 rounded-e-[4px] bg-muted" aria-hidden>
            <span
              className="absolute inset-y-0 start-0 rounded-e-[4px] bg-primary transition-[width]"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-end text-sm tabular-nums text-muted-foreground">{item.display}</span>
          {hover === item.key ? (
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-8 start-1/3 z-10 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
            >
              {item.label} · {valueLabel}: <span className="font-medium">{item.display}</span>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
