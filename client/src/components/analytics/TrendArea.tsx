'use client';

import { useState } from 'react';
import type { DayPoint } from '@/lib/analytics';
import ChartTooltip from './Tooltip';
import { niceTicks, type ChartTheme } from './chartTheme';
import { useWidth } from './useWidth';

const H = 230;
const PAD = { top: 16, right: 16, bottom: 34, left: 44 };

/**
 * Running total of registrations per day (area + 2px line, 10% wash, glow for depth).
 * Crosshair snaps to the nearest day; clicking a day toggles a day filter.
 */
export default function TrendArea({
  points, theme, selectedDay, onSelectDay, dayLabel, fmt, labels, fixedWidth,
}: {
  points: DayPoint[];
  theme: ChartTheme;
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
  dayLabel: (day: string, short?: boolean) => string;
  fmt: (n: number) => string;
  labels: { cumulative: string; newThatDay: string };
  fixedWidth?: number; // print: render at a fixed size
}) {
  const { ref, width: measured } = useWidth<HTMLDivElement>(fixedWidth ?? 600);
  const width = fixedWidth ?? measured;
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div ref={ref} />;

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const ticks = niceTicks(points[points.length - 1].cumulative);
  const yMax = ticks[ticks.length - 1] || 1;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  // x labels: about 6 evenly spaced days + always the last
  const every = Math.max(1, Math.ceil(points.length / 6));
  const gradId = `trend-fill-${theme.mode}`;

  const nearest = (clientX: number, box: DOMRect) => {
    const px = clientX - box.left;
    const i = points.length === 1 ? 0 : Math.round(((px - PAD.left) / innerW) * (points.length - 1));
    return Math.min(points.length - 1, Math.max(0, i));
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative select-none" onPointerLeave={() => setHover(null)}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`${labels.cumulative}: ${fmt(points[points.length - 1].cumulative)}`}
        onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onClick={(e) => onSelectDay?.(points[nearest(e.clientX, e.currentTarget.getBoundingClientRect())].day)}
        style={{ cursor: onSelectDay ? 'pointer' : 'default', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity={theme.mode === 'dark' ? 0.32 : 0.22} />
            <stop offset="100%" stopColor={theme.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? theme.axis : theme.grid} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={theme.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</text>
          </g>
        ))}
        {selectedDay && points.some((p) => p.day === selectedDay) && (() => {
          const i = points.findIndex((p) => p.day === selectedDay);
          const w = Math.max(10, innerW / Math.max(1, points.length - 1));
          return <rect x={x(i) - w / 2} y={PAD.top} width={w} height={innerH} fill={theme.accent} opacity={0.12} rx={4} />;
        })()}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={theme.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 4px 6px ${theme.accent}66)` }} />
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={p.day} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill={theme.muted}>{dayLabel(p.day, true)}</text>
        ))}
        {/* end marker + direct label on the last point */}
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].cumulative)} r={5} fill={theme.accent} stroke={theme.mode === 'dark' ? '#0c1222' : '#ffffff'} strokeWidth={2} />
        <text x={x(points.length - 1)} y={y(points[points.length - 1].cumulative) - 12} textAnchor="end" fontSize={12} fontWeight={700} fill={theme.ink}>
          {fmt(points[points.length - 1].cumulative)}
        </text>
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke={theme.secondary} strokeWidth={1} opacity={0.6} />
            <circle cx={x(hover)} cy={y(hp.cumulative)} r={4.5} fill={theme.accent} stroke={theme.mode === 'dark' ? '#0c1222' : '#ffffff'} strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <ChartTooltip
          x={x(hover)}
          y={y(hp.cumulative)}
          theme={theme}
          containerWidth={width}
          title={dayLabel(hp.day)}
          rows={[
            { color: theme.accent, label: labels.cumulative, value: fmt(hp.cumulative) },
            { label: labels.newThatDay, value: `+${fmt(hp.count)}` },
          ]}
        />
      )}
    </div>
  );
}
