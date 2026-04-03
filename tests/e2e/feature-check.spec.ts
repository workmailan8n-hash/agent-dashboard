import { test, expect } from '@playwright/test';

test.describe('Feature Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3737');
    await page.waitForTimeout(4000);
  });

  test('SIMS button exists in DOM', async ({ page }) => {
    const exists = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      return Array.from(btns).some(b => b.textContent?.includes('SIMS'));
    });
    expect(exists).toBe(true);
  });

  test('EDIT button opens password dialog', async ({ page }) => {
    const editBtn = page.locator('button:has-text("EDIT")').first();
    await expect(editBtn).toBeAttached();
    await editBtn.click();
    await page.waitForTimeout(500);
    const pwDialog = page.locator('#admin-pw');
    await expect(pwDialog).toBeAttached();
  });

  test('canvas renders non-blank content', async ({ page }) => {
    const isRendered = await page.evaluate(() => {
      const c = document.getElementById('office') as HTMLCanvasElement;
      if (!c) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const d = ctx.getImageData(300, 100, 1, 1).data;
      return d[0] + d[1] + d[2] > 10;
    });
    expect(isRendered).toBe(true);
  });

  test('WebSocket connects', async ({ page }) => {
    const ok = await page.evaluate(() => new Promise(r => {
      const ws = new WebSocket(`ws://${location.host}`);
      ws.onopen = () => { ws.close(); r(true); };
      ws.onerror = () => r(false);
      setTimeout(() => r(false), 3000);
    }));
    expect(ok).toBe(true);
  });

  test('API returns agents', async ({ page }) => {
    const res = await page.request.get('http://localhost:3737/api/state');
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.agents.length).toBeGreaterThan(0);
  });

  test('no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:3737');
    await page.waitForTimeout(5000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('full page screenshot', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/feature-check.png', fullPage: true });
  });
});
