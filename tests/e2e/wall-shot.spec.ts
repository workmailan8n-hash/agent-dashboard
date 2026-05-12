import { test } from '@playwright/test';

test.setTimeout(30000);
test('full screenshot for wall review', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 2200 });
  await page.goto(process.env.AUDIT_URL || 'http://localhost:3737');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'wall-shot.png', fullPage: true });
});
