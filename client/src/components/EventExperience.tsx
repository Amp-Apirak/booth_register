'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, MapPin, Pause, Play, QrCode, ScanLine, Sparkles, Zap } from 'lucide-react';
import { type SystemSettings, formatEventDateRange, formatEventTimeRange, formatEventLocation } from '@/lib/api';
import styles from './EventExperience.module.css';
import EventBackdrop from './EventBackdrop';

type ExperienceProps = {
  settings: SystemSettings;
  paused: boolean;
  onToggleMotion: () => void;
  onEnter?: () => void;
  onReplay?: () => void;
};

/** A decorative CSS 3D scene. No attendee data or usable ticket is rendered. */
function EventSculpture({ name }: { name: string }) {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.sceneGlow} />
      <div className={styles.floor} />
      <div className={styles.sculpture}>
        <div className={styles.orbit} />
        <div className={styles.orbitSecondary} />
        <div className={styles.portal}><div className={styles.portalCore} /></div>
        <div className={styles.ticket}>
          <div className={styles.ticketTop}><Zap size={22} /><span>THE EXPERIENCE<br /><b>STARTS HERE.</b></span><ArrowUpRight size={19} /></div>
          <div className={styles.ticketName}>{name}</div>
          <div className={styles.ticketCaption}>YOUR NEXT CONNECTION</div>
          <div className={styles.ticketBottom}><div className={styles.qr}><QrCode size={57} strokeWidth={1.5} /></div><div><span>DIGITAL TICKET</span><strong>SCAN. CONNECT.</strong><small>บัตรตัวอย่าง · PREVIEW</small></div></div>
          <div className={styles.ticketShine} />
        </div>
        <div className={`${styles.floatingTag} ${styles.checkTag}`}><span><Check size={17} /></span><div>Seamless check-in<small>ทุกการพบกัน เริ่มต้นได้ง่าย</small></div></div>
        <div className={`${styles.floatingTag} ${styles.sparkTag}`}><Sparkles size={19} /><span>A moment to remember</span></div>
        <div className={styles.satellite} />
        <div className={styles.satelliteSmall} />
      </div>
      <div className={styles.sceneLabel}><span /> CONNECTING PEOPLE. CREATING MOMENTS.</div>
    </div>
  );
}

export default function EventExperience({ settings, onEnter, onReplay, paused, onToggleMotion }: ExperienceProps) {
  const stage = useRef<HTMLElement>(null);
  const date = formatEventDateRange(settings.event_start, settings.event_end);
  const time = formatEventTimeRange(settings.event_start, settings.event_end);
  const location = formatEventLocation(settings);
  const name = settings.event_name || 'SMART EVENT REGISTRATION';

  const moveScene = (event: PointerEvent<HTMLElement>) => {
    if (paused || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--tilt-y', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 12}deg`);
    event.currentTarget.style.setProperty('--tilt-x', `${-(event.clientY - bounds.top - bounds.height / 2) / bounds.height * 8}deg`);
  };
  const resetScene = () => {
    stage.current?.style.setProperty('--tilt-x', '0deg');
    stage.current?.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <section ref={stage} className={`${styles.experience} ${onEnter ? styles.entrance : styles.compact} ${paused ? styles.paused : ''}`} onPointerMove={moveScene} onPointerLeave={resetScene} aria-label="ต้อนรับสู่งานอีเวนต์">
      <EventBackdrop paused={paused} />
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>{settings.event_logo ? <Image src={settings.event_logo} alt="โลโก้งาน" width={42} height={42} unoptimized /> : <Zap size={22} />}</div>
          <span>EVENT EXPERIENCE<small>SCAN · CHECK-IN · SHOW</small></span>
        </div>
        <button type="button" className={styles.motionButton} aria-pressed={paused} aria-label={paused ? 'เปิดภาพเคลื่อนไหว' : 'หยุดภาพเคลื่อนไหว'} onClick={() => { resetScene(); onToggleMotion(); }}>
          {paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? 'เปิดเอฟเฟกต์' : 'พักเอฟเฟกต์'}</span>
        </button>
      </header>

      <div className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}><span /> WELCOME TO YOUR NEXT EXPERIENCE</div>
          <h1 id={onEnter ? 'event-welcome-title' : 'event-home-title'} tabIndex={-1} className={styles.title}>{name}</h1>
          <p className={styles.tagline}>ทุกการพบกัน<span>สร้างความเป็นไปได้ใหม่</span></p>
          <p className={styles.description}>เชื่อมต่อผู้คน เปิดรับแรงบันดาลใจ และร่วมเป็นส่วนหนึ่ง<br className={styles.desktopBreak} />ของประสบการณ์พิเศษ ตั้งแต่ก้าวแรกที่เข้างาน</p>
          {(date || location) && <div className={styles.details}>
            {date && <div><CalendarDays size={17} /><p>{date}{time && <small>{time}</small>}</p></div>}
            {location && <div><MapPin size={17} /><p>{location}</p></div>}
          </div>}
          <div className={styles.actions}>
            {onEnter ? <button type="button" className={styles.primary} onClick={onEnter}>เข้าสู่ประสบการณ์ <ArrowRight size={19} /></button> : <Link href="/register" className={styles.primary}>ลงทะเบียนเข้าร่วมงาน <ArrowRight size={19} /></Link>}
            <Link href={onEnter ? '/register' : '/ticket'} className={styles.secondary}>{onEnter ? 'ลงทะเบียนเข้างาน' : 'ค้นหาตั๋วของฉัน'}<ArrowUpRight size={16} /></Link>
          </div>
          <div className={styles.actionNote}>{onEnter ? 'พร้อมแล้ว เริ่มต้นประสบการณ์ของคุณได้เลย' : <button type="button" onClick={onReplay}><Play size={12} /> ชมหน้าเปิดตัวอีกครั้ง</button>}</div>
        </div>
        <EventSculpture name={name} />
      </div>

      <footer className={styles.journey}>
        <div className={styles.journeyIntro}><span>ONE EVENT.</span><strong>ENDLESS POSSIBILITIES.</strong></div>
        {[{ icon: QrCode, title: 'ลงทะเบียนง่าย', text: 'Your digital ticket', number: '01' }, { icon: ScanLine, title: 'เช็คอินได้ทันที', text: 'A seamless arrival', number: '02' }, { icon: Sparkles, title: 'สนุกกับทุกโมเมนต์', text: 'Memorable experiences', number: '03' }].map(({ icon: Icon, title, text, number }) => <div key={number} className={styles.journeyItem}><span className={styles.step}>{number}</span><Icon size={21} /><div><strong>{title}</strong><small>{text}</small></div></div>)}
      </footer>
    </section>
  );
}

export function EventWelcome({ settings, onEnter, paused, onToggleMotion }: ExperienceProps & { onEnter: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    element?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="event-welcome-title" onCancel={(event) => { event.preventDefault(); onEnter(); }}><EventExperience settings={settings} onEnter={onEnter} paused={paused} onToggleMotion={onToggleMotion} /></dialog>;
}
