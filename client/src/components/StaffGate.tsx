'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';
import { useT } from '@/contexts/PreferencesContext';
import { useStaffSession, type StaffRole } from '@/lib/staffSession';

/**
 * Shows staff pages only to logged-in staff (and only to the given roles).
 * Signed out → a login button that comes back to this page; wrong role → a clear notice.
 * The server checks the same rules on every request; this is the friendly front door.
 */
export default function StaffGate({ children, roles }: { children: ReactNode; roles?: StaffRole[] }) {
  return (
    <Suspense>
      <Gate roles={roles}>{children}</Gate>
    </Suspense>
  );
}

function Gate({ children, roles }: { children: ReactNode; roles?: StaffRole[] }) {
  const t = useT();
  const session = useStaffSession();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  if (session.status === 'loading') return null;

  if (session.status === 'signed-out') {
    const next = encodeURIComponent(search ? `${pathname}?${search}` : pathname);
    return (
      <Notice icon={<Lock className="w-7 h-7" />} title={t.staffGate.signInTitle} text={t.staffGate.signInText}>
        <Link href={`/login?next=${next}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold shadow-lg">
          <LogIn className="w-4 h-4" />{t.staffGate.signIn}
        </Link>
      </Notice>
    );
  }

  if (roles && !roles.includes(session.user?.role as StaffRole)) {
    return (
      <Notice icon={<ShieldAlert className="w-7 h-7" />} title={t.staffGate.forbiddenTitle} text={t.staffGate.forbiddenText}>
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold">
          {t.staffGate.backToDashboard}
        </Link>
      </Notice>
    );
  }

  return <>{children}</>;
}

function Notice({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto my-10 sm:my-16 glass-panel rounded-3xl border border-white/10 p-8 text-center space-y-4 shadow-2xl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300">{icon}</div>
      <h1 className="text-xl font-extrabold text-white">{title}</h1>
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
      <div className="pt-2">{children}</div>
    </div>
  );
}
