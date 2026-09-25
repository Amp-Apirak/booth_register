'use client';

import { Moon, Sun } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { LANGS } from '@/i18n';

/** Light/dark switch + TH/EN switch, shown in the navigation bars. */
export default function PreferenceToggles({ className = '' }: { className?: string }) {
  const { lang, theme, t, setLang, setTheme } = usePreferences();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
        title={theme === 'dark' ? t.common.prefs.switchToLight : t.common.prefs.switchToDark}
        aria-label={theme === 'dark' ? t.common.prefs.switchToLight : t.common.prefs.switchToDark}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
      </button>
      <div
        role="group"
        aria-label={t.common.prefs.language}
        className="flex items-center h-9 p-0.5 rounded-xl border border-white/10 bg-white/[0.04]"
      >
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            title={code === lang ? undefined : t.common.prefs.switchLanguage}
            className={`h-full px-2.5 rounded-[10px] text-xs font-bold tracking-wide transition-colors ${
              lang === code ? 'bg-indigo-600 text-on-accent shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
