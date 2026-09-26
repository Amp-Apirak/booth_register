import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { API, apiLogin, auth, createParticipant, signIn, waitForLive, type Session } from './helpers';
import { closeDb, sql, sqlScript } from './db';
import { th } from '../src/i18n/th';
import { detectColumns } from '../src/lib/participantImport';

/**
 * Backup & reset (ADR-0017): every settings tab exports Excel and resets to defaults behind a clear
 * confirmation; Settings → สำรองและรีเซ็ต exports everything in one file and resets the whole system.
 *
 * The resets really run against this machine's database, so the event's data and all settings are first
 * copied into schema e2e_snapshot (inside the database: exact values, same ids) and put back afterwards.
 * If a run is killed before that, the next run puts the copy back before it starts.
 */
test.describe.configure({ mode: 'serial' });

const d = th.dataReset;
const EVENT_TABLES = ['organization_types', 'participants', 'checkins', 'lucky_draw_winners', 'agenda_items', 'lucky_draw_prizes'];
const DEFAULT_EVENT_NAME = 'SMART EVENT REGISTRATION';

type Counts = { participants: number; checkins: number; winners: number; agenda: number; prizes: number; types: number; typed: number };
const counts = async (): Promise<Counts> => (await sql<Counts>(`
  SELECT (SELECT COUNT(*) FROM participants WHERE event_id = 1)::int AS participants,
         (SELECT COUNT(*) FROM checkins WHERE event_id = 1)::int AS checkins,
         (SELECT COUNT(*) FROM lucky_draw_winners WHERE event_id = 1)::int AS winners,
         (SELECT COUNT(*) FROM agenda_items WHERE event_id = 1)::int AS agenda,
         (SELECT COUNT(*) FROM lucky_draw_prizes WHERE event_id = 1)::int AS prizes,
         (SELECT COUNT(*) FROM organization_types WHERE event_id = 1)::int AS types,
         (SELECT COUNT(*) FROM participants WHERE event_id = 1 AND organization_type_id IS NOT NULL)::int AS typed`))[0];
const settingValue = async (key: string) => (await sql<{ value: string }>('SELECT value FROM settings WHERE key = $1', [key]))[0]?.value;
const snapshotExists = async () => (await sql("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'e2e_snapshot'")).length > 0;

async function takeSnapshot() {
  const copies = EVENT_TABLES.map((table) => `CREATE TABLE e2e_snapshot.${table} AS SELECT * FROM public.${table} WHERE event_id = 1;`).join('\n');
  await sqlScript(`CREATE SCHEMA e2e_snapshot;\n${copies}\nCREATE TABLE e2e_snapshot.settings AS SELECT * FROM public.settings;`);
}

async function putSnapshotBack() {
  const removals = [...EVENT_TABLES].reverse().map((table) => `DELETE FROM public.${table} WHERE event_id = 1;`).join('\n');
  const inserts = EVENT_TABLES.map((table) => `INSERT INTO public.${table} SELECT * FROM e2e_snapshot.${table};`).join('\n');
  await sqlScript(`BEGIN;
${removals}
${inserts}
INSERT INTO public.settings SELECT * FROM e2e_snapshot.settings ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
COMMIT;
DROP SCHEMA e2e_snapshot CASCADE;`);
}

let admin: Session;
let before: Counts;
let eventName: string;

test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
  if (await snapshotExists()) await putSnapshotBack(); // an earlier run was interrupted before putting its copy back
  await takeSnapshot();
  before = await counts();
  eventName = await settingValue('event_name');
});

test.afterAll(async () => {
  await putSnapshotBack();
  expect(await counts()).toEqual(before);
  expect(await settingValue('event_name')).toBe(eventName);
  await closeDb();
});

async function adminPage(browser: Browser, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, acceptDownloads: true });
  await signIn(context, admin);
  return context.newPage();
}

async function downloadBook(page: Page, button: Locator) {
  const [file] = await Promise.all([page.waitForEvent('download'), button.click()]);
  return { name: file.suggestedFilename(), book: XLSX.readFile(await file.path()) };
}
const rowsOf = (book: XLSX.WorkBook, sheet = book.SheetNames[0]) =>
  XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets[sheet], { header: 1, defval: '' });
const valueOf = (rows: (string | number)[][], label: string) => rows.find((row) => row[0] === label)?.[1];

const dialog = (page: Page) => page.locator('.swal2-popup');

test('each settings tab exports what it holds to Excel', async ({ browser, request }) => {
  const page = await adminPage(browser);
  const settings = (await (await request.get(`${API}/api/v1/settings`)).json()).data;
  const exportButton = page.getByRole('button', { name: d.actions.export, exact: true });

  await page.goto('/settings?tab=general');
  let file = await downloadBook(page, exportButton);
  expect(file.name).toMatch(/^event-general-\d{8}-\d{4}\.xlsx$/);
  expect(valueOf(rowsOf(file.book), th.settings.event.name)).toBe(settings.event_name);
  expect(valueOf(rowsOf(file.book), th.settings.contact.phone)).toBe(settings.contact_phone);

  await page.goto('/settings?tab=registration');
  file = await downloadBook(page, exportButton);
  expect(file.name).toMatch(/^event-registration-page-\d{8}-\d{4}\.xlsx$/);
  expect(valueOf(rowsOf(file.book), th.registrationPage.intro)).toBe(settings.registration_intro);

  await page.goto('/settings?tab=organizations');
  file = await downloadBook(page, exportButton);
  expect(file.name).toMatch(/^organization-types-\d{8}-\d{4}\.xlsx$/);
  const types = (await (await request.get(`${API}/api/v1/events/1/organization-types`)).json()).data as { name_th: string }[];
  const typeRows = rowsOf(file.book);
  expect(typeRows.length - 1).toBe(types.length);
  expect(typeRows[1][1]).toBe(types[0].name_th);

  await page.goto('/settings?tab=agenda');
  file = await downloadBook(page, exportButton);
  expect(rowsOf(file.book).length - 1).toBe(Math.max(before.agenda, 1)); // an empty agenda still gets one blank row

  await page.goto('/settings?tab=prizes');
  file = await downloadBook(page, exportButton);
  expect(rowsOf(file.book).length - 1).toBe(before.prizes);
});

test('the backup tab exports every section in one file', async ({ browser, request }) => {
  const page = await adminPage(browser);
  await page.goto('/settings?tab=backup');
  await expect(page.locator('[data-backup-section="attendees"] [data-section-count]')).toHaveText(d.counts.attendees(before.participants, before.checkins, before.winners));

  const { name, book } = await downloadBook(page, page.locator('[data-export-all]'));
  expect(name).toMatch(/^event-backup-\d{8}-\d{4}\.xlsx$/);
  const s = d.excel.sheets;
  expect(book.SheetNames).toEqual([s.summary, s.general, s.registration, s.organizations, s.agenda, s.prizes, s.attendees, s.winners]);
  expect(valueOf(rowsOf(book, s.summary), d.excel.summary.eventName)).toBe(eventName);
  expect(rowsOf(book, s.attendees).length - 1).toBe(before.participants);
  expect(rowsOf(book, s.winners).length - 1).toBe(before.winners);
  expect(rowsOf(book, s.agenda).length - 1).toBe(before.agenda);
  expect(rowsOf(book, s.prizes).length - 1).toBe(before.prizes);

  // checked-in attendees carry their check-in time; images are never written into cells
  const attendees = rowsOf(book, s.attendees);
  const status = attendees[0].indexOf(th.dashboard.exportColumns.status);
  const checkedInAt = attendees[0].indexOf(th.dashboard.exportColumns.checkedInAt);
  const checkedIn = attendees.slice(1).filter((row) => row[status] === 'Checked-in');
  expect(checkedIn).toHaveLength(before.checkins);
  expect(checkedIn.every((row) => String(row[checkedInAt]).length > 0)).toBe(true);
  for (const sheet of book.SheetNames) {
    for (const row of rowsOf(book, sheet)) for (const cell of row) expect(String(cell).startsWith('data:')).toBe(false);
  }

  // the attendee section's own file can go straight back into the attendee import
  const single = await downloadBook(page, page.locator('[data-backup-section="attendees"]').getByRole('button', { name: d.actions.export, exact: true }));
  expect(single.name).toMatch(/^event-attendees-\d{8}-\d{4}\.xlsx$/);
  expect(Object.keys(detectColumns(rowsOf(single.book)[0].map(String)))).toEqual(expect.arrayContaining(['name', 'company', 'email', 'phone', 'organization_type']));
  expect((await (await request.get(`${API}/api/v1/participants`, { headers: auth(admin) })).json()).data).toHaveLength(before.participants);
});

test('every reset asks first; Cancel changes nothing; "Export Excel first" keeps the window open', async ({ browser, request }) => {
  const page = await adminPage(browser);
  const summary = (await (await request.get(`${API}/api/v1/events/1/reset-summary`, { headers: auth(admin) })).json()).data;
  const tabs: [string, string, string][] = [
    ['general', 'general', d.confirm.general(summary.general_changed)],
    ['registration', 'registration', d.confirm.registration(summary.registration_changed)],
    ['organizations', 'organizations', d.confirm.organizations(before.types, 6)],
    ['agenda', 'agenda', d.confirm.agenda(before.agenda)],
    ['prizes', 'prizes', d.confirm.prizes(before.prizes)],
  ];
  for (const [tab, section, line] of tabs) {
    await page.goto(`/settings?tab=${tab}`);
    await page.locator(`[data-reset-section="${section}"]`).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).locator('.swal2-title')).toHaveText(d.confirm.title(d.sections[section as keyof typeof d.sections]));
    await expect(dialog(page)).toContainText(line);
    await expect(dialog(page)).toContainText(d.confirm.accountsKept);
    if (section === 'organizations' && before.typed > 0) await expect(dialog(page)).toContainText(d.confirm.organizationsInUse(before.typed));
    if (section === 'prizes' && before.winners > 0) await expect(dialog(page)).toContainText(d.confirm.prizesWinnersKept(before.winners));
    if (section === 'agenda') {
      const { name } = await downloadBook(page, dialog(page).getByRole('button', { name: d.confirm.exportFirst }));
      expect(name).toMatch(/^event-agenda-\d{8}-\d{4}\.xlsx$/);
      await expect(dialog(page)).toContainText(d.confirm.exported);
      await expect(dialog(page)).toBeVisible();
    }
    await dialog(page).getByRole('button', { name: th.common.cancel }).click();
    await expect(dialog(page)).toBeHidden();
  }

  // attendee data and the whole system also need the word RESET
  await page.goto('/settings?tab=backup');
  for (const trigger of [page.locator('[data-backup-section="attendees"] [data-reset-section="attendees"]'), page.locator('[data-reset-all]')]) {
    await trigger.click();
    await expect(dialog(page)).toContainText(d.confirm.attendees(before.participants, before.checkins, before.winners));
    await expect(dialog(page)).toContainText(d.confirm.typeToConfirm('RESET'));
    await dialog(page).getByRole('button', { name: d.confirm.confirm }).click();
    await expect(dialog(page).locator('.swal2-validation-message')).toHaveText(d.confirm.typeMismatch('RESET'));
    await dialog(page).locator('.swal2-input').fill('reset now');
    await dialog(page).getByRole('button', { name: d.confirm.confirm }).click();
    await expect(dialog(page).locator('.swal2-validation-message')).toHaveText(d.confirm.typeMismatch('RESET'));
    await dialog(page).getByRole('button', { name: th.common.cancel }).click();
    await expect(dialog(page)).toBeHidden();
  }
  await page.locator('[data-reset-all]').click();
  await expect(dialog(page).locator('.swal2-title')).toHaveText(d.confirm.titleAll);
  for (const line of [d.confirm.general(summary.general_changed), d.confirm.registration(summary.registration_changed), d.confirm.organizations(before.types, 6), d.confirm.agenda(before.agenda), d.confirm.prizes(before.prizes)]) {
    await expect(dialog(page)).toContainText(line);
  }
  await dialog(page).getByRole('button', { name: th.common.cancel }).click();

  expect(await counts()).toEqual(before);
  expect(await settingValue('event_name')).toBe(eventName);
});

test('resetting a section puts it back to defaults, and an open LED screen follows at once', async ({ browser, request }) => {
  const led = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await led.goto('/signage?screen=overview');
  await waitForLive(led);
  await expect(led.getByText(eventName).first()).toBeVisible();

  const page = await adminPage(browser);
  const confirm = async (section: string) => {
    await page.locator(`[data-reset-section="${section}"]`).click();
    await dialog(page).getByRole('button', { name: d.confirm.confirm }).click();
    await expect(page.locator('.swal2-title')).toHaveText(d.confirm.doneTitle);
  };

  await page.goto('/settings?tab=general');
  await confirm('general');
  await expect(led.getByText(DEFAULT_EVENT_NAME).first()).toBeVisible(); // no reload
  await expect(page.getByPlaceholder(th.settings.event.namePlaceholder)).toHaveValue(DEFAULT_EVENT_NAME);
  expect(await settingValue('contact_phone')).toBe('');

  await page.goto('/settings?tab=registration');
  await confirm('registration');
  await expect(page.getByPlaceholder(th.registrationPage.introPlaceholder)).toHaveValue('');
  expect(await settingValue('registration_intro')).toBe('');

  await page.goto('/settings?tab=agenda');
  await confirm('agenda');
  expect((await (await request.get(`${API}/api/v1/events/1/agenda`)).json()).data).toHaveLength(0);

  await page.goto('/settings?tab=organizations');
  await confirm('organizations');
  const types = (await (await request.get(`${API}/api/v1/events/1/organization-types`)).json()).data as { name_th: string }[];
  expect(types).toHaveLength(6);
  await expect(page.locator(`input[value="${types[0].name_th}"]`)).toBeVisible();

  await page.goto('/settings?tab=prizes');
  await confirm('prizes');
  await expect(page.getByText(th.prizes.empty)).toBeVisible();

  const now = await counts();
  expect(now).toMatchObject({ agenda: 0, prizes: 0, types: 6, typed: 0, participants: before.participants, checkins: before.checkins, winners: before.winners });
});

test('full reset for a new event: type RESET, everything back to defaults, LED screens clear at once', async ({ browser, request }) => {
  // a guest checks in while the LED welcome screen is open
  const guest = await createParticipant(request, admin);
  const welcome = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await welcome.goto('/signage?screen=welcome');
  await waitForLive(welcome);
  await request.post(`${API}/api/v1/checkin`, { headers: auth(admin), data: { ticket_code: guest.ticket_code } });
  await expect(welcome.getByText(guest.name).first()).toBeVisible();

  const overview = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await overview.goto('/signage?screen=overview');
  await waitForLive(overview);
  await expect(overview.locator('[data-stat="registered"]').filter({ visible: true })).toHaveText(String(before.participants + 1));

  const page = await adminPage(browser);
  await page.goto('/settings?tab=backup');
  await page.locator('[data-reset-all]').click();
  await expect(dialog(page).locator('.swal2-title')).toHaveText(d.confirm.titleAll);
  await expect(dialog(page)).toContainText(d.confirm.attendees(before.participants + 1, before.checkins + 1, before.winners));
  await dialog(page).locator('.swal2-input').fill('RESET');
  await dialog(page).getByRole('button', { name: d.confirm.confirm }).click();
  await expect(page.locator('.swal2-title')).toHaveText(d.confirm.doneTitle);

  // open screens follow without a reload
  await expect(overview.locator('[data-stat="registered"]').filter({ visible: true })).toHaveText('0');
  await expect(overview.locator('[data-stat="checked_in"]').filter({ visible: true })).toHaveText('0');
  await expect(welcome.getByText(guest.name)).toHaveCount(0);
  await expect(page.locator('[data-backup-section="attendees"] [data-section-count]')).toHaveText(d.counts.attendees(0, 0, 0));

  expect(await counts()).toEqual({ participants: 0, checkins: 0, winners: 0, agenda: 0, prizes: 0, types: 6, typed: 0 });
  expect(await settingValue('event_name')).toBe(DEFAULT_EVENT_NAME);
  expect((await (await request.get(`${API}/api/v1/events/1/lucky-draw/winners`)).json()).data).toHaveLength(0);

  // user accounts were kept
  await apiLogin(request, 'admin');
  await apiLogin(request, 'staff');
});

test('Staff cannot open backup & reset (page and API)', async ({ browser, request }) => {
  const staff = await apiLogin(request, 'staff');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await signIn(context, staff);
  const page = await context.newPage();
  await page.goto('/settings?tab=backup');
  await expect(page.getByText(th.staffGate.forbiddenTitle)).toBeVisible();
  await expect(page.locator('[data-reset-all]')).toHaveCount(0);
  expect((await request.post(`${API}/api/v1/events/1/reset`, { headers: auth(staff), data: { sections: ['agenda'] } })).status()).toBe(403);
  expect((await request.get(`${API}/api/v1/events/1/reset-summary`, { headers: auth(staff) })).status()).toBe(403);
});

test('the backup tab and its confirmation window fit a phone screen', async ({ browser }) => {
  const page = await adminPage(browser, 360);
  await page.goto('/settings?tab=backup');
  await expect(page.locator('[data-reset-all]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator('[data-reset-all]').click();
  const box = await dialog(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
  await expect(dialog(page).getByRole('button', { name: d.confirm.confirm })).toBeInViewport();
  await dialog(page).getByRole('button', { name: th.common.cancel }).click();
});
