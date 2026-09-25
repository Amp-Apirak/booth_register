'use client';

import type { ChartTheme } from './chartTheme';

export interface TooltipRow {
  color?: string;
  label: string;
  value: string;
}

/** Floating readout: value first (strong), label second; line keys instead of boxes. */
export default function ChartTooltip({
  x, y, title, rows, theme, containerWidth,
}: {
  x: number;
  y: number;
  title?: string;
  rows: TooltipRow[];
  theme: ChartTheme;
  containerWidth: number;
}) {
  const flip = x > containerWidth - 180;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 min-w-36 rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        left: flip ? undefined : x + 14,
        right: flip ? containerWidth - x + 14 : undefined,
        top: Math.max(0, y - 12),
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.ink,
      }}
    >
      {title && <div className="font-semibold mb-1" style={{ color: theme.secondary }}>{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          {r.color && <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: r.color }} />}
          <span className="font-bold tabular-nums" style={{ color: theme.ink }}>{r.value}</span>
          <span style={{ color: theme.secondary }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
