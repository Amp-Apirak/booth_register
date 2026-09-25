'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useT } from '@/contexts/PreferencesContext';
import EventBackdrop from './EventBackdrop';
import styles from './EventBackdrop.module.css';

type BackdropState = {
  paused: boolean;
  togglePaused: () => void;
  /** Lets a page hide the site backdrop while it shows its own full-screen scene. */
  setHidden: (hidden: boolean) => void;
};

const BackdropContext = createContext<BackdropState>({ paused: false, togglePaused: () => {}, setHidden: () => {} });

export const useBackdrop = () => useContext(BackdropContext);

// Display screens keep the aurora but not a floating control over the content.
const NO_CONTROL = ['/signage'];

/**
 * One aurora backdrop for every page. It lives in the root layout, so the pause
 * state survives navigation and toggling it never re-renders page forms.
 */
export function SiteBackdropProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const togglePaused = () => setPaused(p => !p);
  const showControl = !hidden && !NO_CONTROL.some(p => pathname.startsWith(p));

  return (
    <BackdropContext.Provider value={{ paused, togglePaused, setHidden }}>
      {!hidden && <EventBackdrop viewport subtle={pathname !== '/'} paused={paused} />}
      {children}
      {showControl && (
        <div className={styles.floatingControl}>
          <button type="button" className={styles.motionButton} aria-pressed={paused} aria-label={paused ? t.home.backdrop.resume : t.home.backdrop.pauseAria} onClick={togglePaused}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
            <span className={styles.motionLabel}>{paused ? t.home.backdrop.resume : t.home.backdrop.pause}</span>
          </button>
        </div>
      )}
    </BackdropContext.Provider>
  );
}
