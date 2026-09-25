// i18n entry point.
// - Thai (th/) is the source of truth; English (en/) is typed against it, so a
//   missing or extra key fails `tsc` / `next build`.
// - Leaves are plain strings or small formatter functions, e.g. (n: number) => string.
// Components read text with `const t = useT()` → `t.nav.home`.
import { th } from './th';
import { en } from './en';

export type Dict = typeof th;
export const LANGS = ['th', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'th';

export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'dark';

// Cookie names read by app/layout.tsx so the first render already has the right language/theme
export const LANG_COOKIE = 'booth_lang';
export const THEME_COOKIE = 'booth_theme';

export const dictionaries: Record<Lang, Dict> = { th, en };

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);
