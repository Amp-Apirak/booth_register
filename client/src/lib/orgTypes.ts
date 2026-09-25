// Organization types: chart-safe colors, labels per language and grouping helpers.
// Kept free of React so it can be unit-tested with `node --test`.
import type { OrganizationType, Participant } from './api';

// Categorical palette validated for color-vision deficiency on both themes
// (dataviz six checks: lightness band, chroma, CVD ΔE ≥ 8 adjacent, contrast) — ADR-0012.
// Order matters: a new type takes the next unused slot, so neighbours stay distinguishable.
export const ORG_COLOR_SLOTS = ['blue', 'red', 'green', 'violet', 'orange', 'aqua', 'yellow', 'magenta'] as const;
export type OrgColorSlot = (typeof ORG_COLOR_SLOTS)[number];

export const ORG_COLORS: Record<OrgColorSlot, { light: string; dark: string }> = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  red: { light: '#e34948', dark: '#e66767' },
  green: { light: '#008300', dark: '#008300' },
  violet: { light: '#4a3aa7', dark: '#9085e9' },
  orange: { light: '#eb6834', dark: '#d95926' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
  yellow: { light: '#eda100', dark: '#c98500' },
  magenta: { light: '#e87ba4', dark: '#d55181' },
};
/** De-emphasis gray for "Other" (free text) and "Not specified" */
export const OTHER_COLOR = { light: '#8a94a6', dark: '#7c8799' };

export type ThemeName = 'light' | 'dark';

export const isColorSlot = (v: unknown): v is OrgColorSlot => ORG_COLOR_SLOTS.includes(v as OrgColorSlot);

export const slotColor = (slot: string, theme: ThemeName): string =>
  isColorSlot(slot) ? ORG_COLORS[slot][theme] : OTHER_COLOR[theme];

/** First palette slot not used yet (falls back to cycling only past 8 types) */
export const nextFreeSlot = (types: Pick<OrganizationType, 'color'>[]): OrgColorSlot => {
  const used = new Set(types.map((t) => t.color));
  return ORG_COLOR_SLOTS.find((s) => !used.has(s)) ?? ORG_COLOR_SLOTS[types.length % ORG_COLOR_SLOTS.length];
};

export const orgTypeName = (type: Pick<OrganizationType, 'name_th' | 'name_en'>, lang: string): string =>
  lang === 'en' ? type.name_en || type.name_th : type.name_th;

/** Group key of a participant: a type id, 'other' (free text) or 'none' (not answered / registered before the field existed) */
export type OrgKey = number | 'other' | 'none';

export const participantOrgKey = (p: Pick<Participant, 'organization_type_id' | 'organization_type_other'>): OrgKey => {
  if (p.organization_type_id != null) return p.organization_type_id;
  if (p.organization_type_other && p.organization_type_other.trim()) return 'other';
  return 'none';
};

export interface OrgGroupLabels {
  other: string;
  none: string;
}

/** Display label for a participant's organization type ("อื่นๆ: <text>" for free text) */
export const participantOrgLabel = (
  p: Pick<Participant, 'organization_type_id' | 'organization_type_other'>,
  types: OrganizationType[],
  lang: string,
  labels: OrgGroupLabels
): string => {
  const key = participantOrgKey(p);
  if (key === 'none') return labels.none;
  if (key === 'other') return `${labels.other}: ${p.organization_type_other?.trim()}`;
  const type = types.find((t) => t.id === key);
  return type ? orgTypeName(type, lang) : labels.none;
};

export const orgKeyLabel = (key: OrgKey, types: OrganizationType[], lang: string, labels: OrgGroupLabels): string => {
  if (key === 'other') return labels.other;
  if (key === 'none') return labels.none;
  const type = types.find((t) => t.id === key);
  return type ? orgTypeName(type, lang) : labels.none;
};

export const orgKeyColor = (key: OrgKey, types: OrganizationType[], theme: ThemeName): string => {
  if (key === 'other' || key === 'none') return OTHER_COLOR[theme];
  const type = types.find((t) => t.id === key);
  return type ? slotColor(type.color, theme) : OTHER_COLOR[theme];
};
