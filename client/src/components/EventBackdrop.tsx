import type { CSSProperties } from 'react';
import styles from './EventBackdrop.module.css';

/** Decorative layers only; transform/opacity animations need no JS render loop. */
export default function EventBackdrop({ paused, viewport = false, subtle = false }: { paused: boolean; viewport?: boolean; subtle?: boolean }) {
  return (
    <div aria-hidden="true" className={`${styles.backdrop} ${viewport ? styles.viewport : styles.hero} ${subtle ? styles.subtle : ''} ${paused ? styles.paused : ''}`}>
      <div className={`${styles.aurora} ${styles.indigo}`} />
      <div className={`${styles.aurora} ${styles.cyan}`} />
      <div className={`${styles.aurora} ${styles.violet}`} />
      <div className={`${styles.ribbon} ${styles.ribbonOne}`} />
      <div className={`${styles.ribbon} ${styles.ribbonTwo}`} />
      <div className={styles.dust}>
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} style={{
            '--x': `${(i * 37 + 9) % 100}%`,
            '--y': `${(i * 29 + 13) % 100}%`,
            '--delay': `${-i * 1.7}s`,
            '--duration': `${12 + i % 5 * 3}s`,
            '--size': `${i % 4 === 0 ? 3 : 2}px`,
          } as CSSProperties} />
        ))}
      </div>
      <div className={styles.trails}><i /><i /><i /></div>
      <div className={styles.shade} />
    </div>
  );
}
