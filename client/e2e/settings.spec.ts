import { test, expect, type Page } from '@playwright/test';
import { API, apiLogin, signIn, type Session } from './helpers';
import { closeDb, sql } from './db';

/**
 * Settings (Admin): every tab opens and stays selected after a reload, saving works,
 * the Excel templates download, and a new organization type shows up on the sign-up form.
 */
const ORG = `E2E ประเภททดสอบ ${Date.now().toString(36)}`;
let admin: Session;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
});
test.afterAll(async () => {
  await sql("DELETE FROM organization_types WHERE name_th LIKE 'E2E ประเภททดสอบ%'");
  await closeDb();
});

async function openSettings(page: Page, tab: string) {
  await page.goto(`/settings?tab=${tab}`);
}

test('each tab opens and stays selected after reload', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(context, admin);
  const page = await context.newPage();
  const expectations: [string, RegExp][] = [
    ['general', /ชื่องาน \(Event Name\)/],
    ['agenda', /จัดการ Event Agenda/],
    ['registration', /เนื้อหาหน้าลงทะเบียน/],
    ['organizations', /จัดการประเภทองค์กร/],
    ['prizes', /จัดการของรางวัล/],
  ];
  for (const [tab, heading] of expectations) {
    await openSettings(page, tab);
    await expect(page.getByText(heading).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
    await expect(page.getByText(heading).first()).toBeVisible();
  }
});

test('saving the general settings (unchanged) succeeds', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(context, admin);
  const page = await context.newPage();
  await openSettings(page, 'general');
  await expect(page.getByText(/ชื่องาน \(Event Name\)/)).toBeVisible();
  await page.waitForTimeout(800); // the form fills from the saved settings
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
  await expect(page.getByText('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว')).toBeVisible();
});

test('agenda and prize Excel templates download', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await signIn(context, admin);
  const page = await context.newPage();
  for (const tab of ['agenda', 'prizes']) {
    await openSettings(page, tab);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ไฟล์ตัวอย่าง' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  }
});

test('a new organization type appears on the sign-up form, and can be removed', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(context, admin);
  const page = await context.newPage();
  await openSettings(page, 'organizations');
  await page.getByRole('button', { name: 'เพิ่มประเภทองค์กร' }).click();
  await page.getByPlaceholder('เช่น หน่วยงานราชการ / รัฐวิสาหกิจ').first().fill(ORG);
  await page.getByRole('button', { name: 'บันทึก', exact: true }).first().click();
  await expect(page.getByText('บันทึกประเภทองค์กรแล้ว')).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto('/register');
  await expect(visitor.locator('#register-org-select option', { hasText: ORG })).toHaveCount(1);

  const list = (await (await request.get(`${API}/api/v1/events/1/organization-types`)).json()).data as { id: number; name_th: string }[];
  const created = list.find((o) => o.name_th === ORG);
  expect(created).toBeDefined();
  const card = page.locator(`input[value="${ORG}"]`).locator('xpath=ancestor::*[.//button[@aria-label="ลบ"]][1]');
  await card.getByRole('button', { name: 'ลบ' }).click();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByText('ลบแล้ว')).toBeVisible();
  await visitor.reload();
  await expect(visitor.locator('#register-org-select option', { hasText: ORG })).toHaveCount(0);
});
