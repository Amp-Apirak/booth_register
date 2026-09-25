// Chart chrome colors per theme (ink, grid, accent). Series colors for organization types
// come from lib/orgTypes.ts; single-series charts use `accent` (palette slot 1, blue).
export interface ChartTheme {
  mode: 'light' | 'dark';
  ink: string; // values, primary labels
  secondary: string; // axis labels
  muted: string; // de-emphasized text
  grid: string; // hairline gridlines
  axis: string; // baseline
  accent: string; // single-series mark
  accentDark: string; // 3D side face / pressed
  accentLight: string; // 3D top face / highlight
  track: string; // empty meter track
  tooltipBg: string;
  tooltipBorder: string;
}

export const CHART_THEMES: Record<'light' | 'dark', ChartTheme> = {
  light: {
    mode: 'light',
    ink: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    grid: '#e2e8f0',
    axis: '#cbd5e1',
    accent: '#2a78d6',
    accentDark: '#1c5cab',
    accentLight: '#86b6ef',
    track: '#e2e8f0',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(15,23,42,0.12)',
  },
  dark: {
    mode: 'dark',
    ink: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    grid: 'rgba(255,255,255,0.07)',
    axis: 'rgba(255,255,255,0.18)',
    accent: '#3987e5',
    accentDark: '#1c5cab',
    accentLight: '#9ec5f4',
    track: 'rgba(255,255,255,0.08)',
    tooltipBg: '#0f172a',
    tooltipBorder: 'rgba(255,255,255,0.14)',
  },
};

/** Mix a #rrggbb color with white (amount > 0) or black (amount < 0) — for 3D faces/highlights */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const channel = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Round axis maximum and 4–5 tick values ("nice" numbers); counts of people only get whole steps */
export function niceTicks(max: number, target = 4, integer = true): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const steps = integer && pow < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step = Math.max(integer ? 1 : 0, steps.map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
