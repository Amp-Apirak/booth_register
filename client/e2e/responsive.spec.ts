import { test, expect, type Page } from '@playwright/test';
import { apiLogin, signIn, type Session } from './helpers';

/**
 * Every page fits phone and tablet screens: no card, button or text sticks out past the edge.
 * (Elements inside a scroll box or a clipped area do not count.)
 */
const PUBLIC = ['/', '/register', '/ticket', '/login', '/privacy', '/signage?screen=welcome', '/signage?screen=overview', '/signage?screen=agenda', '/signage?screen=lucky'];
const STAFF = ['/scanner', '/dashboard', '/dashboard?tab=analytics', '/dashboard/report', '/lucky-draw', '/settings?tab=general', '/settings?tab=agenda', '/settings?tab=registration', '/settings?tab=organizations', '/settings?tab=prizes'];
const WIDTHS = [360, 390, 768];

async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const clipped = (el: Element) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(a).overflowX)) return true;
      }
      return false;
    };
    const bad: Element[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.02) continue;
      if (cs.pointerEvents === 'none' && !(el as HTMLElement).innerText?.trim()) continue; // decorative glow
      if (el.closest('[hidden]') || clipped(el)) continue;
      bad.push(el);
    }
    return bad.filter((el) => !bad.includes(el.parentElement!)).slice(0, 5).map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()} [${Math.round(r.left)}→${Math.round(r.right)}] ${String((el as HTMLElement).className).slice(0, 60)}`;
    });
  });
}

let admin: Session;
test.beforeAll(async ({ request }) => {
  admin = await apiLogin(request, 'admin');
});

for (const width of WIDTHS) {
  test(`public pages fit a ${width}px screen`, async ({ browser }) => {
    const page = await (await browser.newContext({ viewport: { width, height: 800 }, isMobile: width < 768, hasTouch: width < 768 })).newPage();
    for (const path of PUBLIC) {
      await page.goto(path);
      await page.waitForTimeout(600);
      expect(await overflowing(page), `${path} at ${width}px`).toEqual([]);
    }
  });

  test(`staff pages fit a ${width}px screen`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: width < 768, hasTouch: width < 768 });
    await signIn(context, admin);
    const page = await context.newPage();
    for (const path of STAFF) {
      await page.goto(path);
      await page.waitForTimeout(800);
      expect(await overflowing(page), `${path} at ${width}px`).toEqual([]);
    }
  });
}
