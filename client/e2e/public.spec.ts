import { test, expect } from '@playwright/test';
import { TEST_COMPANY, apiLogin, cleanupTestParticipants, type Session } from './helpers';

/**
 * What attendees and visitors use without logging in: the home page, sign-up (organization type
 * required), saving the ticket, finding it again with the ticket code + phone digits,
 * language and theme switches, the privacy page and the LED screen tabs.
 */
let admin: Session;
test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  await cleanupTestParticipants(request, admin);
});
test.afterAll(async ({ request }) => {
  await cleanupTestParticipants(request, admin);
});

test('home page opens and leads to sign-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await page.goto('/register');
  await expect(page.getByRole('button', { name: /ยืนยันการลงทะเบียน/ })).toBeVisible();
});

test('sign-up → ticket → save image → find it again with code + last 4 phone digits', async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto('/register');
  const name = `ทดสอบ สมัคร ${Date.now().toString(36)}`;
  await page.getByPlaceholder(/ฐากูร/).fill(name);
  await page.getByPlaceholder(/Google DeepMind/).fill(TEST_COMPANY);
  await page.locator('input[type="tel"]').fill('081-765-4321');

  // organization type is required
  await page.getByRole('button', { name: /ยืนยันการลงทะเบียน/ }).click();
  await expect(page.getByText('กรุณาเลือกประเภทองค์กร').first()).toBeVisible();
  await page.getByRole('button', { name: 'ตกลง' }).click();
  await page.locator('#register-org-select').selectOption({ label: 'สถานศึกษา' });
  await page.getByRole('button', { name: /ยืนยันการลงทะเบียน/ }).click();

  const code = page.locator('#printable-ticket').getByText(/^SER\d{14}$/);
  await expect(code).toBeVisible({ timeout: 15_000 });
  const ticketCode = (await code.innerText()).trim();
  await page.getByRole('button', { name: 'OK' }).or(page.getByRole('button', { name: 'ดูตั๋วเข้างาน' })).first().click().catch(() => {});

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /บันทึกรูป QR/ }).click();
  expect((await download).suggestedFilename()).toBe(`ticket_pass_${ticketCode}.png`);

  // later, from another browser: find the ticket
  const again = await (await browser.newContext()).newPage();
  await again.goto('/ticket');
  await again.getByLabel('รหัสตั๋ว').fill(ticketCode);
  await again.getByLabel('เบอร์โทร 4 ตัวท้าย หรืออีเมล').fill('9999');
  await again.getByRole('button', { name: 'ค้นหาตั๋ว' }).click();
  await expect(again.getByText('ไม่พบตั๋ว หรือเบอร์โทร/อีเมลไม่ตรงกับที่ลงทะเบียนไว้')).toBeVisible();
  await again.getByLabel('เบอร์โทร 4 ตัวท้าย หรืออีเมล').fill('4321');
  await again.getByRole('button', { name: 'ค้นหาตั๋ว' }).click();
  await expect(again.locator('#printable-ticket').getByText(name)).toBeVisible();
  await expect(again).toHaveURL(/\/ticket$/); // never sent to the staff login
});

test('language and theme switches apply everywhere and are remembered', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'EN' }).first().click();
  await expect(page.getByRole('button', { name: /Register|Confirm/i }).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/ticket');
  await expect(page.getByRole('button', { name: 'Find ticket' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to (light|dark)/ }).first().click();
  await expect(html).not.toHaveAttribute('data-theme', before!);
  await page.reload();
  await expect(html).not.toHaveAttribute('data-theme', before!);
});

test('privacy page opens', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'นโยบายความเป็นส่วนตัว' })).toBeVisible();
});

test('LED screen tabs stay in the address (one link per screen)', async ({ page }) => {
  await page.goto('/signage?screen=welcome');
  await page.getByRole('button', { name: 'ภาพรวมสด' }).click();
  await expect(page).toHaveURL(/screen=overview/);
  await page.getByRole('button', { name: 'กำหนดการ' }).click();
  await expect(page).toHaveURL(/screen=agenda/);
  await page.getByRole('button', { name: 'ลุ้นรางวัล' }).click();
  await expect(page).toHaveURL(/screen=lucky/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'ลุ้นรางวัล' })).toHaveAttribute('aria-pressed', 'true');
});
