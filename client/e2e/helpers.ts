import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export const API = process.env.E2E_API_URL || 'http://localhost:3005';
export const TEST_COMPANY = 'E2E Playwright Co';

export type Role = 'admin' | 'staff';

const credentials = (role: Role) => {
  const user = process.env[role === 'admin' ? 'E2E_ADMIN_USER' : 'E2E_STAFF_USER'];
  const password = process.env[role === 'admin' ? 'E2E_ADMIN_PASSWORD' : 'E2E_STAFF_PASSWORD'];
  if (!user || !password) throw new Error(`Missing E2E_${role.toUpperCase()}_USER / _PASSWORD (see client/e2e/README.md)`);
  return { username: user, password };
};

export interface Session { token: string; user: { username: string; role: string; fullname?: string } }

/** Logs in through the API (the UI login itself is covered in auth.spec.ts) */
export async function apiLogin(request: APIRequestContext, role: Role): Promise<Session> {
  const res = await request.post(`${API}/api/v1/login`, { data: credentials(role) });
  expect(res.status(), `login as ${role}`).toBe(200);
  const body = await res.json();
  return { token: body.data.token, user: body.data.user };
}

/** Makes every page of the context start logged in, like a staff browser */
export async function signIn(context: BrowserContext, session: Session) {
  await context.addInitScript(([token, user]) => {
    localStorage.setItem('staff_token', token);
    localStorage.setItem('staff_user', user);
  }, [session.token, JSON.stringify(session.user)] as const);
}

export const auth = (session: Session) => ({ Authorization: `Bearer ${session.token}` });

let seq = 0;
/** A unique attendee that the test owns; remove it with deleteParticipant */
export async function createParticipant(request: APIRequestContext, session: Session, overrides: Record<string, unknown> = {}) {
  seq += 1;
  const stamp = `${Date.now().toString(36)}${seq}`;
  const res = await request.post(`${API}/api/v1/participants`, {
    headers: auth(session),
    data: {
      name: `ทดสอบ E2E ${stamp}`,
      company: TEST_COMPANY,
      position: 'QA',
      email: `e2e_${stamp}@example.com`,
      phone: `09${String(Date.now()).slice(-8)}`,
      attendee_type: 'General',
      ...overrides,
    },
  });
  expect(res.status(), 'create test attendee').toBe(201);
  return (await res.json()).data as { id: number; name: string; company: string; ticket_code: string; phone: string };
}

export async function deleteParticipant(request: APIRequestContext, session: Session, id: number) {
  await request.delete(`${API}/api/v1/participants/${id}`, { headers: auth(session) });
}

/** Removes attendees left behind by an interrupted run */
export async function cleanupTestParticipants(request: APIRequestContext, session: Session) {
  const res = await request.get(`${API}/api/v1/participants`, { headers: auth(session) });
  if (!res.ok()) return;
  const list = (await res.json()).data as { id: number; company: string }[];
  for (const p of list.filter((x) => x.company === TEST_COMPANY)) await deleteParticipant(request, session, p.id);
}

/** Waits until the page's live (socket) connection is up (the badge may be hidden on small screens) */
export async function waitForLive(page: Page) {
  await expect(page.locator('[data-live-status="connected"]').first()).toBeAttached({ timeout: 15_000 });
}
