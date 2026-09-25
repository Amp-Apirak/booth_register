'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Dict, Lang, Theme, dictionaries, isLang, isTheme, LANG_COOKIE, THEME_COOKIE,
} from '@/i18n';

interface PreferencesValue {
  lang: Lang;
  theme: Theme;
  t: Dict;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;
const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
};

/**
 * Language + color theme for the whole app.
 * The server layout reads the cookies and passes the initial values, so the first
 * paint is already correct. `?lang=en` / `?theme=light` in any URL override and
 * persist them (handy for LED screens: one URL per display).
 */
export function PreferencesProvider({
  initialLang,
  initialTheme,
  children,
}: {
  initialLang: Lang;
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeCookie(LANG_COOKIE, next);
    document.documentElement.lang = next;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeCookie(THEME_COOKIE, next);
    applyThemeToDocument(next);
  }, []);

  // URL overrides are applied after hydration (the server never sees search params in the layout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    const urlTheme = params.get('theme');
    const frame = requestAnimationFrame(() => {
      if (isLang(urlLang)) setLang(urlLang);
      if (isTheme(urlTheme)) setTheme(urlTheme);
    });
    return () => cancelAnimationFrame(frame);
  }, [setLang, setTheme]);

  const value = useMemo(
    () => ({ lang, theme, t: dictionaries[lang], setLang, setTheme }),
    [lang, theme, setLang, setTheme]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}

/** UI text for the current language: `const t = useT(); t.nav.home` */
export function useT(): Dict {
  return usePreferences().t;
}
