import { test, expect } from '@playwright/test';
import { API, apiLogin, auth, cleanupTestParticipants, createParticipant, signIn, type Session } from './helpers';

/**
 * Logins and roles (ADR-0015): signed-out visitors get a login button on staff pages and come
 * back after logging in; Staff do event-day work but not settings, deletes or bulk import; Admin does all.
 */
let admin: Session;
let staff: Session;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  staff = await apiLogin(request, 'staff');
  await cleanupTestParticipants(request, admin);
});
test.afterAll(async ({ request }) => {
  await cleanupTestParticipants(request, admin);
});

test('wrong password shows a clear message; the right one opens the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('superadmin').fill(process.env.E2E_STAFF_USER!);
  await page.locator('input[type="password"]').fill('definitely-wrong');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page.getByText('Username หรือ Password ไม่ถูกต้อง')).toBeVisible();
  await page.locator('input[type="password"]').fill(process.env.E2E_STAFF_PASSWORD!);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

for (const path of ['/scanner', '/lucky-draw', '/dashboard', '/dashboard/report', '/settings?tab=prizes']) {
  test(`signed out: ${path} offers a login and comes back after it`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('link', { name: 'เข้าสู่ระบบเจ้าหน้าที่' }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByPlaceholder('superadmin').fill(process.env.E2E_ADMIN_USER!);
    await page.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replace(/[?]/g, '\\?')}$`));
    await expect(page.getByRole('link', { name: 'เข้าสู่ระบบเจ้าหน้าที่' })).toHaveCount(0);
  });
}

test('Staff: event-day work yes, settings / delete / import no', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signIn(context, staff);
  const page = await context.newPage();

  await page.goto('/dashboard');
  const nav = page.getByRole('navigation');
  await expect(nav.getByRole('link', { name: 'แดชบอร์ด CMS' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'ตั้งค่าระบบ' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'นำเข้า Excel' })).toHaveCount(0);
  await page.getByPlaceholder(/ค้นหาชื่อ/).filter({ visible: true }).fill(guest.name);
  const row = page.locator('tr', { hasText: guest.name });
  await expect(row.getByRole('button', { name: 'ลบข้อมูล' })).toHaveCount(0);
  await row.getByRole('button', { name: 'สแกนเข้า' }).click();
  await expect(row.getByText('เช็คอินแล้ว')).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('บัญชีนี้ไม่มีสิทธิ์ใช้หน้านี้')).toBeVisible();

  // the server refuses too, whatever the page shows
  const res = await request.delete(`${API}/api/v1/participants/${guest.id}`, { headers: auth(staff) });
  expect(res.status()).toBe(403);
});

test('Admin: settings, delete and import are available', async ({ browser, request }) => {
  const guest = await createParticipant(request, admin);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signIn(context, admin);
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'ตั้งค่าระบบ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'นำเข้า Excel' })).toBeVisible();
  await page.getByPlaceholder(/ค้นหาชื่อ/).filter({ visible: true }).fill(guest.name);
  const row = page.locator('tr', { hasText: guest.name });
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'ลบข้อมูล' }).click();
  await expect(page.locator('tr', { hasText: guest.name })).toHaveCount(0);
});

test('logging out hides staff menus and staff pages', async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('/login');
  await page.getByPlaceholder('superadmin').fill(process.env.E2E_ADMIN_USER!);
  await page.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'แดชบอร์ด CMS' })).toHaveCount(0);
  await page.goto('/scanner');
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบเจ้าหน้าที่' })).toBeVisible();
});
