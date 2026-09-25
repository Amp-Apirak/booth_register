'use client';

import { useState } from 'react';
import type { OrgKey } from '@/lib/orgTypes';
import ChartTooltip from './Tooltip';
import { shade, type ChartTheme } from './chartTheme';
import { useWidth } from './useWidth';

export interface ShareRow {
  key: OrgKey;
  label: string;
  color: string;
  count: number;
  share: number; // %
}

/** Readable text color on top of a fill: white on dark fills, ink on light ones */
export function onFill(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.3 ? '#0f172a' : '#ffffff';
}

/**
 * Part-to-whole as one 3D "slab" (100% stacked bar with depth, 2px gaps) plus a clickable legend.
 * Segment widths are exact shares — the depth is decoration only.
 */
export default function ShareBar({
  rows, selected, onToggle, theme, fmt, interactive = true, showLegend = true,
}: {
  rows: ShareRow[];
  selected: OrgKey[];
  onToggle?: (key: OrgKey) => void;
  theme: ChartTheme;
  fmt: (n: number) => string;
  interactive?: boolean;
  showLegend?: boolean; // the printed report shows a table right below instead
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ row: ShareRow; x: number; y: number } | null>(null);
  const filled = rows.filter((r) => r.count > 0);
  const dim = (key: OrgKey) => selected.length > 0 && !selected.includes(key);

  const segment = (r: ShareRow, face: 'front' | 'edge') => (
    <div
      key={`${face}-${r.key}`}
      className="h-full first:rounded-l-xl last:rounded-r-xl transition-opacity"
      style={{
        width: `${r.share}%`,
        minWidth: 4,
        opacity: dim(r.key) ? 0.3 : 1,
        background: face === 'front'
          ? `linear-gradient(180deg, ${shade(r.color, 0.28)} 0%, ${r.color} 55%, ${shade(r.color, -0.12)} 100%)`
          : shade(r.color, -0.35),
      }}
    />
  );

  return (
    <div>
      <div
        ref={ref}
        className="relative"
        onPointerLeave={() => setHover(null)}
        style={{ filter: theme.mode === 'dark' ? 'drop-shadow(0 10px 14px rgba(0,0,0,.45))' : 'drop-shadow(0 10px 14px rgba(15,23,42,.18))' }}
      >
        {/* thickness (lower edge) */}
        <div className="absolute inset-x-0 top-[8px] h-12 flex gap-[2px]" aria-hidden="true">{filled.map((r) => segment(r, 'edge'))}</div>
        <div className="relative h-12 flex gap-[2px]">
          {filled.map((r) => {
            const label = `${r.share}%`;
            return (
              <button
                key={r.key}
                type="button"
                disabled={!interactive}
                onClick={() => onToggle?.(r.key)}
                onPointerMove={(e) => {
                  const box = ref.current?.getBoundingClientRect();
                  if (box) setHover({ row: r, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={(e) => {
                  const box = ref.current?.getBoundingClientRect();
                  const own = e.currentTarget.getBoundingClientRect();
                  if (box) setHover({ row: r, x: own.left - box.left + own.width / 2, y: 0 });
                }}
                onBlur={() => setHover(null)}
                aria-pressed={selected.includes(r.key)}
                aria-label={`${r.label}: ${fmt(r.count)} (${label})`}
                className="relative h-full first:rounded-l-xl last:rounded-r-xl overflow-hidden transition-[opacity,filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-default"
                style={{
                  width: `${r.share}%`,
                  minWidth: 4,
                  opacity: dim(r.key) ? 0.3 : 1,
                  background: `linear-gradient(180deg, ${shade(r.color, 0.28)} 0%, ${r.color} 55%, ${shade(r.color, -0.12)} 100%)`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 10px rgba(0,0,0,.12)',
                }}
              >
                {/* label only when it fits with padding (≈ 7 % of the bar) */}
                {r.share >= 7 && (
                  <span className="text-xs font-bold tabular-nums" style={{ color: onFill(r.color) }}>{label}</span>
                )}
              </button>
            );
          })}
        </div>
        {hover && (
          <ChartTooltip
            x={hover.x}
            y={hover.y}
            theme={theme}
            containerWidth={width}
            title={hover.row.label}
            rows={[{ color: hover.row.color, label: `(${hover.row.share}%)`, value: fmt(hover.row.count) }]}
          />
        )}
      </div>

      {/* legend: always present on screen (≥2 series), doubles as filter buttons */}
      {showLegend && <ul className="mt-6 grid grid-cols-1 gap-y-1">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => onToggle?.(r.key)}
              aria-pressed={selected.includes(r.key)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-colors disabled:cursor-default ${
                selected.includes(r.key) ? 'bg-white/10 ring-1 ring-indigo-400/50' : 'hover:bg-white/5'
              } ${dim(r.key) ? 'opacity-50' : ''}`}
            >
              <span className="w-3 h-3 rounded-[4px] shrink-0" style={{ background: r.color }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate text-slate-200" title={r.label}>{r.label}</span>
              <span className="font-bold tabular-nums text-white">{fmt(r.count)}</span>
              <span className="w-12 text-right tabular-nums text-slate-400">{r.share}%</span>
            </button>
          </li>
        ))}
      </ul>}
    </div>
  );
}
