import { networkInterfaces } from 'node:os';
import { test, expect, type Browser, type Page, type WebSocketRoute } from '@playwright/test';
import { apiLogin, cleanupTestParticipants, createParticipant, signIn, waitForLive, type Session } from './helpers';

/**
 * The LED screens must react the moment a ticket is checked in — from the dashboard
 * "สแกนเข้า" button or from the scanner page — windowed and full screen, and also when
 * the LED is another device on the network. The LED runs in its own browser (not logged in).
 */
let admin: Session;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  await cleanupTestParticipants(request, admin);
});
test.afterAll(async ({ request }) => {
  await cleanupTestParticipants(request, admin);
});

const lanAddress = () =>
  Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;

async function openLed(browser: Browser, screen: 'welcome' | 'overview', baseURL?: string): Promise<Page> {
  const led = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...(baseURL ? { baseURL } : {}) })).newPage();
  await led.goto(`/signage?screen=${screen}`);
  await waitForLive(led);
  return led;
}

async function staffPage(browser: Browser, path: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signIn(context, admin);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

async function checkInFromDashboard(staff: Page, name: string) {
  await staff.getByPlaceholder(/ค้นหาชื่อ/).filter({ visible: true }).fill(name);
  await staff.locator('tr', { hasText: name }).getByRole('button', { name: 'สแกนเข้า' }).click();
}

async function checkInFromScanner(staff: Page, ticketCode: string) {
  await staff.getByPlaceholder(/กรอกรหัสตั๋ว/).filter({ visible: true }).fill(ticketCode);
  await staff.getByRole('button', { name: 'ยืนยันเข้างาน' }).click();
}

async function goFullScreen(led: Page) {
  await led.getByRole('button', { name: 'เต็มจอ' }).click();
  await expect.poll(() => led.evaluate(() => !!document.fullscreenElement || !!document.querySelector('[data-signage-covering="true"]'))).toBe(true);
}

const statValue = (led: Page, stat: 'registered' | 'checked_in' | 'pending') =>
  led.locator(`[data-stat="${stat}"]`).filter({ visible: true });

test('Welcome (windowed): dashboard "สแกนเข้า" shows the guest at once', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const led = await openLed(browser, 'welcome');
  const staff = await staffPage(browser, '/dashboard');
  await checkInFromDashboard(staff, guest.name);
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });
});

test('Welcome (full screen): scanner page check-in shows the guest at once', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const led = await openLed(browser, 'welcome');
  await goFullScreen(led);
  const staff = await staffPage(browser, '/scanner');
  await checkInFromScanner(staff, guest.ticket_code);
  await expect(staff.getByText(guest.name).first()).toBeVisible();
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });
});

test('Overview (full screen): the numbers change at once', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const led = await openLed(browser, 'overview');
  await goFullScreen(led);
  await expect.poll(async () => Number(await statValue(led, 'registered').innerText())).toBeGreaterThan(0);
  const checkedBefore = Number(await statValue(led, 'checked_in').innerText());
  const pendingBefore = Number(await statValue(led, 'pending').innerText());
  const staff = await staffPage(browser, '/dashboard');
  await checkInFromDashboard(staff, guest.name);
  await expect(statValue(led, 'checked_in')).toHaveText(String(checkedBefore + 1), { timeout: 3_000 });
  await expect(statValue(led, 'pending')).toHaveText(String(pendingBefore - 1));
});

test('Phone-style full screen (no Fullscreen API) still updates live and can be closed', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // like iPhone Safari: web pages cannot go full screen at all
  await context.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { get: () => false });
    Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined });
    Object.defineProperty(Element.prototype, 'webkitRequestFullscreen', { value: undefined });
  });
  const led = await context.newPage();
  await led.goto('/signage?screen=welcome');
  await waitForLive(led);
  await led.getByRole('button', { name: 'เต็มจอ' }).click();
  await expect(led.locator('[data-signage-covering="true"]')).toBeVisible();
  const staff = await staffPage(browser, '/scanner');
  await checkInFromScanner(staff, guest.ticket_code);
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });
  await led.mouse.move(10, 10);
  await led.getByRole('button', { name: 'ออกจากเต็มจอ' }).click();
  await expect(led.locator('[data-signage-covering="true"]')).toHaveCount(0);
});

test('LED on another device of the network (not localhost) works live', async ({ browser, request }) => {
  const lan = lanAddress();
  test.skip(!lan, 'this machine has no network address');
  const guest = await createParticipant(request, admin);
  const port = new URL(process.env.E2E_BASE_URL || 'http://localhost:3000').port || '80';
  const context = await browser.newContext({ baseURL: `http://${lan}:${port}`, viewport: { width: 1280, height: 720 } });
  // a TV/phone cannot reach "localhost" of this computer: prove the page never needs it
  await context.route(/\/\/(localhost|127\.0\.0\.1):/, (route) => route.abort());
  const led = await context.newPage();
  const blocked: string[] = [];
  led.on('response', (r) => { if (r.status() === 403) blocked.push(r.url()); });
  await led.goto('/signage?screen=welcome');
  await waitForLive(led);
  expect(blocked, 'page scripts refused by the dev server').toEqual([]);
  const staff = await staffPage(browser, '/scanner');
  await checkInFromScanner(staff, guest.ticket_code);
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });
});

test('Full screen LED shows a warning when the live connection drops, and recovers', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  // stand-in for a network cut: close the live connection and refuse new ones until "allow" returns
  let allow = true;
  const open: WebSocketRoute[] = [];
  await context.routeWebSocket(/socket\.io/, (ws) => {
    if (!allow) { ws.close(); return; }
    ws.connectToServer();
    open.push(ws);
  });
  await context.route(/socket\.io\/\?.*transport=polling/, (route) => (allow ? route.continue() : route.abort()));
  const led = await context.newPage();
  await led.goto('/signage?screen=overview');
  await waitForLive(led);
  await goFullScreen(led);
  allow = false;
  for (const ws of open) await ws.close();
  await expect(led.getByRole('status').filter({ hasText: 'ขาดการเชื่อมต่อ' })).toBeVisible({ timeout: 10_000 });
  const guest = await createParticipant(request, admin); // happens while the LED is offline
  allow = true;
  await expect(led.getByRole('status').filter({ hasText: 'ขาดการเชื่อมต่อ' })).toHaveCount(0, { timeout: 20_000 });
  // on reconnect the numbers are reloaded, so the attendee added meanwhile is counted
  const res = await request.get(`${process.env.E2E_API_URL || 'http://localhost:3005'}/api/v1/events/1/stats`);
  const { registered } = (await res.json()).data;
  await expect(statValue(led, 'registered')).toHaveText(String(registered));
  expect(guest.id).toBeTruthy();
});

test('A second scan of the same ticket says who and when, not "not found"', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const staff = await staffPage(browser, '/scanner');
  await checkInFromScanner(staff, guest.ticket_code);
  await expect(staff.getByText(guest.name).first()).toBeVisible();
  await checkInFromScanner(staff, guest.ticket_code);
  await expect(staff.getByText(`${guest.name} เช็คอินไปแล้ว`)).toBeVisible();
  await checkInFromScanner(staff, 'SER000000000000');
  await expect(staff.getByText('ไม่พบรหัสตั๋วนี้ในระบบ')).toBeVisible();
});

test('The LED (not logged in) never receives the attendee list with personal data', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const context = await browser.newContext();
  const led = await context.newPage();
  const frames: string[] = [];
  led.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(String(f.payload))));
  await led.goto('/signage?screen=welcome');
  await waitForLive(led);
  const staff = await staffPage(browser, '/dashboard');
  await checkInFromDashboard(staff, guest.name);
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });
  await led.waitForTimeout(1_000);
  const received = frames.join('\n');
  expect(received).toContain('welcome:new_checkin');
  expect(received).not.toContain('participants:update');
  expect(received).not.toContain(guest.phone);
  expect(received).not.toMatch(/"email"/);
  // the staff dashboard does get the live attendee list (it shows the new status without reload)
  await expect(staff.locator('tr', { hasText: guest.name }).getByText('เช็คอินแล้ว')).toBeVisible();
});
