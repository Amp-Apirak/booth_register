'use client';

import { useMemo, useSyncExternalStore } from 'react';

/** Staff roles (server: middlewares/authMiddleware.js requireRole, ADR-0015) */
export type StaffRole = 'Admin' | 'Staff';

export interface StaffUser {
  username: string;
  role: StaffRole | string;
  fullname?: string;
}

const CHANGE_EVENT = 'staff-session-change';

/** Call after writing or removing the token in this tab (other tabs get the native `storage` event) */
export function notifyStaffSessionChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveStaffSession(token: string, user: StaffUser) {
  localStorage.setItem('staff_token', token);
  localStorage.setItem('staff_user', JSON.stringify(user));
  notifyStaffSessionChange();
}

export function clearStaffSession() {
  localStorage.removeItem('staff_token');
  localStorage.removeItem('staff_user');
  notifyStaffSessionChange();
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// '' = signed out; otherwise the stored user JSON ('{}' when only a token exists)
const readSnapshot = () => (localStorage.getItem('staff_token') ? localStorage.getItem('staff_user') || '{}' : '');

export interface StaffSession {
  /** 'loading' only during the first render (the server cannot see the browser's login) */
  status: 'loading' | 'signed-out' | 'signed-in';
  user: StaffUser | null;
  isAdmin: boolean;
}

export function useStaffSession(): StaffSession {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => null);
  return useMemo(() => {
    if (snapshot === null) return { status: 'loading', user: null, isAdmin: false };
    if (snapshot === '') return { status: 'signed-out', user: null, isAdmin: false };
    let user: StaffUser | null = null;
    try { user = JSON.parse(snapshot); } catch { user = null; }
    return { status: 'signed-in', user, isAdmin: user?.role === 'Admin' };
  }, [snapshot]);
}

/** A same-site path to return to after login (never an outside address) */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
