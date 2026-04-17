import { test, expect } from '@playwright/test';

test.describe('Agent Dashboard Visual Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3737');
    await page.waitForTimeout(3000); // let agents load + animations start
  });

  test('page loads and canvas renders', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Agent');
    const canvas = page.locator('canvas#office');
    await expect(canvas).toBeVisible();
    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(500);
    expect(box!.height).toBeGreaterThan(300);
  });

  test('agents panel shows agents', async ({ page }) => {
    const agentCount = page.locator('#agent-count');
    await expect(agentCount).toBeVisible();
    const text = await agentCount.textContent();
    expect(text).toMatch(/\d+ agents/);
  });

  test('stats panel renders', async ({ page }) => {
    // Right panel should show STATS, UPTIME, ONLINE etc
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/full-page.png', fullPage: true });
  });

  test('top area — desks, header, windows', async ({ page }) => {
    const canvas = page.locator('canvas#office');
    const box = await canvas.boundingBox();
    // Screenshot top portion
    await page.screenshot({
      path: 'tests/screenshots/top-area.png',
      clip: { x: box!.x, y: box!.y, width: box!.width, height: 400 },
    });
  });

  test('middle area — kitchen, couches', async ({ page }) => {
    const canvas = page.locator('canvas#office');
    const box = await canvas.boundingBox();
    await page.screenshot({
      path: 'tests/screenshots/middle-area.png',
      clip: { x: box!.x, y: box!.y + 400, width: box!.width, height: 400 },
    });
  });

  test('bottom area — entertainment zone', async ({ page }) => {
    // Scroll down to see entertainment zone
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/bottom-area.png',
      fullPage: false,
    });
  });

  test('admin editor opens with password', async ({ page }) => {
    // Find EDIT button and click
    const editBtn = page.locator('button', { hasText: 'EDIT' });
    if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // Password dialog should appear
      const pwInput = page.locator('#admin-pw');
      if ((await pwInput.count()) > 0) {
        await pwInput.fill('noadmin');
        await page.locator('#admin-pw-ok').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/admin-mode.png', fullPage: true });
      }
    }
  });

  test('click animation works', async ({ page }) => {
    const canvas = page.locator('canvas#office');
    const box = await canvas.boundingBox();
    // Click somewhere in the middle of the office (near a desk)
    await page.mouse.click(box!.x + 250, box!.y + 150);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/click-anim.png' });
  });

  test('no JS errors in console', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('http://localhost:3737');
    await page.waitForTimeout(5000);
    // Filter out non-critical errors
    const critical = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('fetch'));
    expect(critical).toHaveLength(0);
  });

  test('WebSocket connects', async ({ page }) => {
    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket(`ws://${location.host}`);
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
      });
    });
    expect(wsConnected).toBe(true);
  });

  test('API state endpoint works', async ({ page }) => {
    const response = await page.request.get('http://localhost:3737/api/state');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('agents');
    expect(Array.isArray(data.agents)).toBe(true);
  });
});
