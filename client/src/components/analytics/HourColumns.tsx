'use client';

import { useState } from 'react';
import type { HourPoint } from '@/lib/analytics';
import ChartTooltip from './Tooltip';
import { niceTicks, shade, type ChartTheme } from './chartTheme';
import { useWidth } from './useWidth';

const H = 240;
const PAD = { top: 24, right: 12, bottom: 34, left: 40 };
const DEPTH = 7; // 3D side/top face size (px); heights are measured on the front face only

/** Check-ins per hour as extruded 3D columns (front face = value, ≤ 24px wide). */
export default function HourColumns({
  points, theme, selectedHour, onSelectHour, hourLabel, fmt, seriesLabel, fixedWidth,
}: {
  points: HourPoint[];
  theme: ChartTheme;
  selectedHour?: number | null;
  onSelectHour?: (hour: number) => void;
  hourLabel: (hour: number, range?: boolean) => string;
  fmt: (n: number) => string;
  seriesLabel: string;
  fixedWidth?: number;
}) {
  const { ref, width: measured } = useWidth<HTMLDivElement>(fixedWidth ?? 600);
  const width = fixedWidth ?? measured;
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div ref={ref} />;

  const innerW = width - PAD.left - PAD.right - DEPTH;
  const innerH = H - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(...points.map((p) => p.count)));
  const yMax = ticks[ticks.length - 1] || 1;
  const band = innerW / points.length;
  const barW = Math.min(24, band * 0.6);
  // "09:00" needs ~36px: on narrow screens label every 2nd/3rd hour so the axis stays readable
  const labelEvery = Math.max(1, Math.ceil(36 / band));
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const hasSelection = selectedHour !== null && selectedHour !== undefined;

  return (
    <div ref={ref} className="relative select-none" onPointerLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={seriesLabel} style={{ overflow: 'visible' }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? theme.axis : theme.grid} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={theme.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = PAD.left + band * i + band / 2;
          const x0 = cx - barW / 2;
          const top = y(p.count);
          const base = y(0);
          const h = Math.max(0, base - top);
          const active = hover === i || selectedHour === p.hour;
          const faded = hasSelection && selectedHour !== p.hour;
          const front = active ? shade(theme.accent, 0.12) : theme.accent;
          return (
            <g
              key={p.hour}
              role={onSelectHour ? 'button' : undefined}
              tabIndex={onSelectHour ? 0 : undefined}
              aria-label={`${hourLabel(p.hour, true)}: ${fmt(p.count)}`}
              aria-pressed={onSelectHour ? selectedHour === p.hour : undefined}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onSelectHour?.(p.hour)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectHour?.(p.hour); } }}
              style={{ cursor: onSelectHour ? 'pointer' : 'default', opacity: faded ? 0.3 : 1, outline: 'none' }}
            >
              {/* generous hit area: the whole band */}
              <rect x={cx - band / 2} y={PAD.top} width={band} height={innerH} fill="transparent" />
              {h > 0 && (
                <>
                  {/* right side face */}
                  <path d={`M${x0 + barW},${top} l${DEPTH},${-DEPTH} v${h} l${-DEPTH},${DEPTH} z`} fill={shade(front, -0.32)} />
                  {/* top face */}
                  <path d={`M${x0},${top} l${DEPTH},${-DEPTH} h${barW} l${-DEPTH},${DEPTH} z`} fill={shade(front, 0.35)} />
                  {/* front face (the value) */}
                  <rect x={x0} y={top} width={barW} height={h} fill={front} />
                  <rect x={x0} y={top} width={barW * 0.35} height={h} fill="#ffffff" opacity={0.12} />
                </>
              )}
              {p.count > 0 && (
                <text x={cx + DEPTH / 2} y={top - DEPTH - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={theme.ink} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(p.count)}</text>
              )}
              {i % labelEvery === 0 && <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} fill={theme.muted}>{hourLabel(p.hour)}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && points[hover] && (
        <ChartTooltip
          x={PAD.left + band * hover + band / 2}
          y={y(points[hover].count) - DEPTH}
          theme={theme}
          containerWidth={width}
          title={hourLabel(points[hover].hour, true)}
          rows={[{ color: theme.accent, label: seriesLabel, value: fmt(points[hover].count) }]}
        />
      )}
    </div>
  );
}
