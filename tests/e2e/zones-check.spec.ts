import { test } from '@playwright/test';

test.describe('Zone screenshots for visual review', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3737');
    await page.waitForTimeout(4000);
  });

  test('zone 1 — desks area (top)', async ({ page }) => {
    const canvas = page.locator('canvas#office');
    const box = await canvas.boundingBox();
    await page.screenshot({
      path: 'tests/screenshots/zone-desks.png',
      clip: { x: box!.x + 130, y: box!.y, width: box!.width - 260, height: 500 }
    });
  });

  test('zone 2 — kitchen + right panel', async ({ page }) => {
    const canvas = page.locator('canvas#office');
    const box = await canvas.boundingBox();
    await page.screenshot({
      path: 'tests/screenshots/zone-kitchen.png',
      clip: { x: box!.x + 450, y: box!.y + 200, width: 500, height: 500 }
    });
  });

  test('zone 3 — couches + lounge', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/screenshots/zone-couches.png',
      clip: { x: 130, y: 100, width: 600, height: 500 }
    });
  });

  test('zone 4 — entertainment (bottom)', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 999));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/screenshots/zone-entertainment.png' });
  });

  test('zone 5 — full office wide', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/zone-full-wide.png', fullPage: true });
  });
});
