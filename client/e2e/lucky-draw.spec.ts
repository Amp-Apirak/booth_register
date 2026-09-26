import { test, expect } from '@playwright/test';
import { API, apiLogin, auth, cleanupTestParticipants, createParticipant, signIn, waitForLive, type Session } from './helpers';
import { closeDb, sql } from './db';

/**
 * Lucky draw: staff spin on /lucky-draw, the LED "lucky" screen shows the winner at once,
 * a prize is never given more times than its quantity, and spinning needs a staff login.
 */
const PRIZE = `E2E Prize ${Date.now().toString(36)}`;
let admin: Session;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  await cleanupTestParticipants(request, admin);
  const res = await request.post(`${API}/api/v1/events/1/prizes`, {
    headers: auth(admin),
    data: { name: PRIZE, code: '', description: 'Playwright test prize', image: '', quantity: 1, is_active: true },
  });
  expect(res.status()).toBe(201);
  // at least one person who can win
  const guest = await createParticipant(request, admin);
  await request.post(`${API}/api/v1/checkin`, { headers: auth(admin), data: { ticket_code: guest.ticket_code } });
});

test.afterAll(async ({ request }) => {
  await sql('DELETE FROM lucky_draw_winners WHERE prize_name = $1', [PRIZE]);
  await sql('DELETE FROM lucky_draw_prizes WHERE name = $1', [PRIZE]);
  await cleanupTestParticipants(request, admin);
  await closeDb();
});

test('spin → winner on the control page and on the LED at once; the prize cannot be won twice', async ({ browser }) => {
  const led = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await led.goto('/signage?screen=lucky');
  await waitForLive(led);

  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(staffContext, admin);
  const control = await staffContext.newPage();
  await control.goto('/lucky-draw');
  await control.getByRole('button', { name: new RegExp(PRIZE) }).click();
  const spin = control.getByRole('button', { name: /SPIN/ });
  await spin.click();

  await expect(control.getByText('LUCKY WINNER ANNOUNCED!')).toBeVisible({ timeout: 20_000 });
  const [winner] = await sql<{ name: string }>(
    'SELECT p.fullname AS name FROM lucky_draw_winners w JOIN participants p ON p.participant_id = w.participant_id WHERE w.prize_name = $1',
    [PRIZE],
  );
  await expect(led.getByText(winner.name).first()).toBeVisible({ timeout: 3_000 });
  await expect(led.getByText(PRIZE).first()).toBeVisible();
  await expect(control.getByText(winner.name).first()).toBeVisible();

  // quantity 1: a second spin of the same prize is refused with a clear message
  await control.getByRole('button', { name: new RegExp(PRIZE) }).click();
  await spin.click();
  await expect(control.getByText('ของรางวัลนี้แจกครบจำนวนแล้ว', { exact: false })).toBeVisible({ timeout: 20_000 });
  const [{ n }] = await sql<{ n: number }>('SELECT COUNT(*)::int AS n FROM lucky_draw_winners WHERE prize_name = $1', [PRIZE]);
  expect(n).toBe(1);
});

test('earlier winners are listed when the control page opens', async ({ browser }) => {
  const context = await browser.newContext();
  await signIn(context, admin);
  const control = await context.newPage();
  await control.goto('/lucky-draw');
  await expect(control.getByText(PRIZE).first()).toBeVisible();
});

test('spinning needs a staff login (page and API)', async ({ browser, request }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/lucky-draw');
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบเจ้าหน้าที่' })).toBeVisible();
  await expect(page.getByRole('button', { name: /SPIN/ })).toHaveCount(0);
  const res = await request.post(`${API}/api/v1/events/1/lucky-draw/spin`, { data: { prize_name: PRIZE } });
  expect(res.status()).toBe(401);
});
