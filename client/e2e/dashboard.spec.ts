import { test, expect, type Page } from '@playwright/test';
import { API, TEST_COMPANY, apiLogin, auth, cleanupTestParticipants, signIn, type Session } from './helpers';

/**
 * Dashboard (Admin): add an attendee with an organization type, edit, change the type in the row,
 * check in, save the QR image, export Excel, the charts tab, the A4 report and delete.
 */
let admin: Session;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  await cleanupTestParticipants(request, admin);
});
test.afterAll(async ({ request }) => {
  await cleanupTestParticipants(request, admin);
});

async function openDashboard(page: Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /แดชบอร์ดจัดการข้อมูล/ })).toBeVisible();
}

test('full attendee workflow from the dashboard', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await signIn(context, admin);
  const page = await context.newPage();
  await openDashboard(page);
  const name = `ทดสอบ แดชบอร์ด ${Date.now().toString(36)}`;

  // add (with an organization type)
  await page.getByRole('button', { name: 'เพิ่มผู้ร่วมงาน' }).click();
  await page.getByLabel('ชื่อ-นามสกุล').fill(name);
  await page.getByLabel('บริษัท / องค์กร').fill(TEST_COMPANY);
  await page.locator('#add-org-select').selectOption({ label: 'สถานศึกษา' });
  await page.getByRole('button', { name: 'บันทึกข้อมูลผู้เข้าร่วมงาน' }).click();

  await page.getByPlaceholder(/ค้นหาชื่อ/).filter({ visible: true }).fill(name);
  const row = page.locator('tr', { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByRole('combobox')).toHaveValue(/\d+/);

  // change the organization type right in the row
  await row.getByRole('combobox').selectOption({ label: 'ประชาชนทั่วไป' });
  await expect.poll(async () => {
    const list = (await (await request.get(`${API}/api/v1/participants`, { headers: auth(admin) })).json()).data as { name: string; organization_type_id: number | null }[];
    return list.find((p) => p.name === name)?.organization_type_id ?? null;
  }).not.toBeNull();

  // edit
  await row.getByRole('button', { name: 'แก้ไขข้อมูล' }).click();
  await page.getByLabel('ตำแหน่งงาน').fill('QA Lead');
  await page.getByLabel('เบอร์โทรศัพท์').fill('0812223333');
  await page.getByRole('button', { name: 'บันทึกการแก้ไขข้อมูล' }).click();
  await expect(row.getByText('QA Lead')).toBeVisible();
  await expect(row.getByText('0812223333')).toBeVisible();

  // check in → status changes without reload
  await row.getByRole('button', { name: 'สแกนเข้า' }).click();
  await expect(row.getByText('เช็คอินแล้ว')).toBeVisible();

  // save the QR image
  await row.getByRole('button', { name: 'ดู QR Code' }).click();
  const qrDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'บันทึกรูป QR Code' }).click();
  expect((await qrDownload).suggestedFilename()).toMatch(/^QR_.+\.png$/);
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);

  // export Excel
  const excel = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ส่งออก Excel' }).click();
  expect((await excel).suggestedFilename()).toMatch(/\.xlsx$/);

  // delete (confirm dialog)
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'ลบข้อมูล' }).click();
  await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
});

test('charts tab reacts to clicks, and the A4 report opens with the same filters', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(context, admin);
  const page = await context.newPage();
  await openDashboard(page);
  await page.getByRole('tab', { name: 'รายงานและกราฟ' }).click();
  await expect(page).toHaveURL(/tab=analytics/);
  await expect(page.getByText('สัดส่วนผู้ลงทะเบียนตามประเภทองค์กร')).toBeVisible();
  await expect(page.getByText('การเข้างานแยกตามประเภทองค์กร')).toBeVisible();

  // a status filter changes the "showing" count
  const showing = page.getByText(/แสดง \d+ จาก \d+ คน/);
  const before = await showing.innerText();
  await page.getByLabel('สถานะ').selectOption('checked');
  await expect(showing).not.toHaveText(before);

  const [report] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'พิมพ์รายงาน A4' }).click(),
  ]);
  await expect(report).toHaveURL(/\/dashboard\/report\?.*status=checked/);
  await expect(report.getByRole('heading', { name: 'รายงานสรุปผลการลงทะเบียนและการเข้าร่วมงาน' })).toBeVisible();
  await expect(report.getByText('ช่วงเช็คอินหนาแน่น').first()).toBeVisible();
});
