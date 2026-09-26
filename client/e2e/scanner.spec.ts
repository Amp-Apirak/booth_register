import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { apiLogin, cleanupTestParticipants, createParticipant, signIn, waitForLive, type Session } from './helpers';
import { writeQrVideo } from './fakeCamera';

/**
 * Gate scanner: the camera reads a real QR code (Chrome's fake camera plays a video of the
 * ticket's QR), the attendee is checked in and the LED welcome screen shows them at once.
 */
const VIDEO = join(tmpdir(), `booth-e2e-qr-${process.pid}.y4m`);
writeQrVideo(VIDEO, 'NO-TICKET-YET'); // replaced with a real ticket before the camera starts

test.use({
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${VIDEO}`],
  },
  permissions: ['camera'],
});

let admin: Session;
test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  await cleanupTestParticipants(request, admin);
});
test.afterAll(async ({ request }) => {
  await cleanupTestParticipants(request, admin);
});

test('QR code through the camera checks the attendee in and the LED shows them', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  writeQrVideo(VIDEO, guest.ticket_code);

  const led = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await led.goto('/signage?screen=welcome');
  await waitForLive(led);

  const gate = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['camera'] });
  await signIn(gate, admin);
  const scanner = await gate.newPage();
  await scanner.goto('/scanner');
  await scanner.getByRole('button', { name: 'เปิดกล้องสแกน QR' }).click();
  await expect(scanner.getByRole('button', { name: 'ปิดกล้อง' })).toBeVisible();

  await expect(scanner.getByText(guest.name).first()).toBeVisible({ timeout: 15_000 });
  await expect(led.getByText(guest.name)).toBeVisible({ timeout: 3_000 });

  // the same QR staying in front of the camera is not sent again and again
  await scanner.waitForTimeout(1_500);
  const res = await request.get(`${process.env.E2E_API_URL || 'http://localhost:3005'}/api/v1/participants/${guest.ticket_code}`, { headers: { Authorization: `Bearer ${admin.token}` } });
  expect((await res.json()).data.status).toBe('Checked-in');
  await scanner.getByRole('button', { name: 'ปิดกล้อง' }).click();
  await expect(scanner.getByRole('button', { name: 'เปิดกล้องสแกน QR' })).toBeVisible();
});

test('typing / scanner-gun input: success, repeat and unknown ticket', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const gate = await browser.newContext();
  await signIn(gate, admin);
  const scanner = await gate.newPage();
  await scanner.goto('/scanner');
  const input = scanner.getByPlaceholder(/กรอกรหัสตั๋ว/).filter({ visible: true });
  await input.fill(guest.ticket_code);
  await input.press('Enter');
  await expect(scanner.getByText(guest.name).first()).toBeVisible();
  await input.fill(guest.ticket_code);
  await input.press('Enter');
  await expect(scanner.getByText(`${guest.name} เช็คอินไปแล้ว`)).toBeVisible();
  await input.fill('SER99999999999999');
  await input.press('Enter');
  await expect(scanner.getByText('ไม่พบรหัสตั๋วนี้ในระบบ')).toBeVisible();
});
