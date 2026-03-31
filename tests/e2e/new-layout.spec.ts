import { test } from '@playwright/test';

test('new compact layout screenshot', async ({ page }) => {
  await page.goto('http://localhost:3737');
  // Clear old saved positions to see BUILTIN
  await page.evaluate(() => {
    localStorage.removeItem('admin_positions');
    localStorage.removeItem('admin_walls');
  });
  await page.reload();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'tests/screenshots/new-layout-full.png', fullPage: true });

  // Top half
  const canvas = page.locator('canvas#office');
  const box = await canvas.boundingBox();
  await page.screenshot({
    path: 'tests/screenshots/new-layout-top.png',
    clip: { x: box!.x, y: box!.y, width: box!.width, height: 600 }
  });

  // Bottom half
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/screenshots/new-layout-bottom.png' });
});
