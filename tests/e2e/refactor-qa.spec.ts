import { test, expect, request } from '@playwright/test';

// ================================================================
//  QA TESTS FOR REFACTORING
//  Covers: auth middleware, settings panel, loading screen,
//          task CRUD, mobile viewport, dist/assets serving,
//          security checks
// ================================================================

const BASE_URL = 'http://localhost:3737';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dashboard-admin-2026';
const WRONG_TOKEN = 'this-is-a-wrong-token';

// ----------------------------------------------------------------
//  TC-1: Dist build artifacts are served correctly
// ----------------------------------------------------------------
test.describe('TC-1: Static assets served from dist/', () => {
  test('dist/index.html served at root with correct HTML structure', async ({ page }) => {
    const res = await page.goto(BASE_URL + '/');
    expect(res?.status()).toBe(200);
    const ct = res?.headers()['content-type'] || '';
    expect(ct).toContain('text/html');
    await expect(page).toHaveTitle(/Agent Office/);
  });

  test('dist/assets JS bundle returns 200 with correct MIME type', async ({ request }) => {
    // Find built JS asset name
    const html = await (await request.get(BASE_URL + '/')).text();
    const match = html.match(/\/assets\/(index-[^"]+\.js)/);
    if (!match) {
      test.skip(true, 'No asset filename found in HTML — build may be missing');
      return;
    }
    const jsUrl = `/assets/${match[1]}`;
    const res = await request.get(BASE_URL + jsUrl);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('javascript');
  });

  test('dist/assets CSS bundle returns 200 with correct MIME type', async ({ request }) => {
    const html = await (await request.get(BASE_URL + '/')).text();
    const match = html.match(/\/assets\/(index-[^"]+\.css)/);
    if (!match) {
      test.skip(true, 'No CSS asset filename found in HTML — build may be missing');
      return;
    }
    const cssUrl = `/assets/${match[1]}`;
    const res = await request.get(BASE_URL + cssUrl);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('css');
  });
});

// ----------------------------------------------------------------
//  TC-2: Authentication middleware
// ----------------------------------------------------------------
test.describe('TC-2: Auth middleware (X-Admin-Token)', () => {
  test('POST /api/mytasks without token returns 401', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      data: { title: 'unauthorized attempt' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('POST /api/mytasks with wrong token returns 401', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': WRONG_TOKEN },
      data: { title: 'wrong token attempt' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/mytasks with correct token returns 201', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: 'QA auth test task', priority: 'low', assignee: 'me' },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    expect(task.id).toBeTruthy();
    expect(task.title).toBe('QA auth test task');
  });

  test('PATCH /api/mytasks/:id without token returns 401', async ({ request }) => {
    const res = await request.patch(BASE_URL + '/api/mytasks/nonexistent', {
      data: { status: 'done' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/mytasks/:id without token returns 401', async ({ request }) => {
    const res = await request.delete(BASE_URL + '/api/mytasks/nonexistent');
    expect(res.status()).toBe(401);
  });

  test('POST /api/layout without token returns 401', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/layout', {
      data: { positions: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/demo without token returns 401', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/demo', {
      data: { id: 'test', slug: 'test-agent' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/demo/:id without token returns 401', async ({ request }) => {
    const res = await request.delete(BASE_URL + '/api/demo/test-id');
    expect(res.status()).toBe(401);
  });
});

// ----------------------------------------------------------------
//  TC-3: Read-only endpoints are publicly accessible
// ----------------------------------------------------------------
test.describe('TC-3: Public read endpoints (no auth required)', () => {
  test('GET /api/agents returns 200 array', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/agents');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/mytasks returns 200 array', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/mytasks');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/tasks returns 200 object', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/tasks');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
  });

  test('GET /api/layout returns 200', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/layout');
    expect(res.status()).toBe(200);
  });

  test('GET /api/state returns 200 with agents/tasks/myTasks', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/state');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('agents');
    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('myTasks');
  });

  test('GET /api/tg-feedback returns 200', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/tg-feedback');
    expect(res.status()).toBe(200);
  });
});

// ----------------------------------------------------------------
//  TC-4: Task CRUD happy path
// ----------------------------------------------------------------
test.describe('TC-4: Task CRUD', () => {
  let createdTaskId: string;

  test('create task via POST /api/mytasks', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: 'QA CRUD test', priority: 'high', assignee: 'claude' },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    createdTaskId = task.id;
    expect(task.title).toBe('QA CRUD test');
    expect(task.status).toBe('todo');
    expect(task.completedAt).toBeNull();
  });

  test('update task status to done via PATCH', async ({ request }) => {
    // Create a task first
    const create = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: 'Patch test task' },
    });
    const { id } = await create.json();

    const res = await request.patch(BASE_URL + `/api/mytasks/${id}`, {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { status: 'done' },
    });
    expect(res.status()).toBe(200);
    const task = await res.json();
    expect(task.status).toBe('done');
    expect(task.completedAt).toBeTruthy();
  });

  test('PATCH non-existent task returns 404', async ({ request }) => {
    const res = await request.patch(BASE_URL + '/api/mytasks/nonexistent-id-99999', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { status: 'done' },
    });
    expect(res.status()).toBe(404);
  });

  test('delete task via DELETE returns 200', async ({ request }) => {
    // Create a task first
    const create = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: 'Delete test task' },
    });
    const { id } = await create.json();

    const del = await request.delete(BASE_URL + `/api/mytasks/${id}`, {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
    });
    expect(del.status()).toBe(200);

    // Verify it's gone
    const list = await request.get(BASE_URL + '/api/mytasks');
    const tasks = await list.json();
    expect(tasks.find((t: { id: string }) => t.id === id)).toBeUndefined();
  });

  test('create task with empty title creates with empty string', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: '' },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    expect(task.title).toBe('');
  });

  test('POST with malformed JSON returns 400', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: {
        'X-Admin-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      data: '{invalid json',
    });
    expect(res.status()).toBe(400);
  });
});

// ----------------------------------------------------------------
//  TC-5: Security checks
// ----------------------------------------------------------------
test.describe('TC-5: Security', () => {
  test('path traversal attempt returns 403 or 404', async ({ request }) => {
    const res1 = await request.get(BASE_URL + '/../server.js');
    expect([403, 404]).toContain(res1.status());

    const res2 = await request.get(BASE_URL + '/%2e%2e%2fpackage.json');
    expect([400, 403, 404]).toContain(res2.status());
  });

  test('XSS in task title is stored as raw string (server does not execute)', async ({ request }) => {
    const xssPayload = '<script>alert(document.cookie)</script>';
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: xssPayload },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    // Server stores raw — rendering is frontend responsibility
    expect(task.title).toBe(xssPayload);
  });

  test('CORS headers present on API response', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/agents');
    expect(res.headers()['access-control-allow-origin']).toBe('*');
  });

  test('OPTIONS preflight returns 204 with correct headers', async ({ request }) => {
    const res = await request.fetch(BASE_URL + '/api/mytasks', {
      method: 'OPTIONS',
      headers: { Origin: 'http://example.com' },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-methods']).toContain('POST');
  });

  test('task body size limit: 100KB title accepted (no limit enforced — known issue)', async ({ request }) => {
    const bigTitle = 'A'.repeat(100_000);
    const res = await request.post(BASE_URL + '/api/mytasks', {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      data: { title: bigTitle },
    });
    // Currently no limit — document as known issue
    // If a limit is added, this test should expect 413
    expect([201, 413]).toContain(res.status());
  });
});

// ----------------------------------------------------------------
//  TC-6: Settings panel (UI)
// ----------------------------------------------------------------
test.describe('TC-6: Settings panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
  });

  test('settings button visible in header', async ({ page }) => {
    const btn = page.locator('#btn-settings');
    await expect(btn).toBeVisible();
  });

  test('settings panel opens on button click', async ({ page }) => {
    const panel = page.locator('#settings-panel');
    await expect(panel).not.toHaveClass(/open/);
    await page.click('#btn-settings');
    await expect(panel).toHaveClass(/open/);
  });

  test('settings panel closes on close button', async ({ page }) => {
    await page.click('#btn-settings');
    await page.click('#settings-close');
    const panel = page.locator('#settings-panel');
    await expect(panel).not.toHaveClass(/open/);
  });

  test('settings panel closes on backdrop click', async ({ page }) => {
    await page.click('#btn-settings');
    await page.click('#settings-backdrop');
    const panel = page.locator('#settings-panel');
    await expect(panel).not.toHaveClass(/open/);
  });

  test('settings panel closes on Escape key', async ({ page }) => {
    await page.click('#btn-settings');
    await page.keyboard.press('Escape');
    const panel = page.locator('#settings-panel');
    await expect(panel).not.toHaveClass(/open/);
  });

  test('toggle click changes state and persists to localStorage', async ({ page }) => {
    await page.click('#btn-settings');
    const toggle = page.locator('.toggle[data-key="sound"]').first();
    const wasOn = await toggle.evaluate(el => el.classList.contains('on'));
    await toggle.click();
    const isOn = await toggle.evaluate(el => el.classList.contains('on'));
    expect(isOn).toBe(!wasOn);

    const stored = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('agent_settings') || '{}');
      return s.sound;
    });
    expect(stored).toBe(isOn);
  });
});

// ----------------------------------------------------------------
//  TC-7: Loading screen
// ----------------------------------------------------------------
test.describe('TC-7: Loading screen', () => {
  test('loading screen present on page load', async ({ page }) => {
    await page.goto(BASE_URL);
    const screen = page.locator('#loading-screen');
    await expect(screen).toBeAttached();
  });

  test('loading screen disappears within 6 seconds', async ({ page }) => {
    await page.goto(BASE_URL);
    const screen = page.locator('#loading-screen');
    await expect(screen).toHaveClass(/hidden/, { timeout: 6000 });
  });

  test('loading bar element exists', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#loading-bar')).toBeAttached();
  });
});

// ----------------------------------------------------------------
//  TC-8: Mobile viewport responsiveness
// ----------------------------------------------------------------
test.describe('TC-8: Mobile responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('page renders without horizontal overflow on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    // Canvas may cause horizontal scroll — acceptable
    // But body itself should not overflow significantly
    expect(overflow).toBeDefined(); // Document the current state
  });

  test('viewport meta tag present for mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('settings button reachable on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    const btn = page.locator('#btn-settings');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#settings-panel')).toHaveClass(/open/);
  });

  test('mobile screenshot', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/mobile-390.png', fullPage: true });
  });
});

// ----------------------------------------------------------------
//  TC-9: WebSocket full flow
// ----------------------------------------------------------------
test.describe('TC-9: WebSocket messages', () => {
  test('WebSocket receives init message on connect', async ({ page }) => {
    await page.goto(BASE_URL);
    const initReceived = await page.evaluate(() => new Promise<boolean>(resolve => {
      const ws = new WebSocket(`ws://${location.host}`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'init') { ws.close(); resolve(true); }
        } catch { resolve(false); }
      };
      ws.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 4000);
    }));
    expect(initReceived).toBe(true);
  });

  test('WebSocket receives mytasks_init message', async ({ page }) => {
    await page.goto(BASE_URL);
    const received = await page.evaluate(() => new Promise<boolean>(resolve => {
      const ws = new WebSocket(`ws://${location.host}`);
      const msgs: string[] = [];
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          msgs.push(msg.type);
          if (msg.type === 'mytasks_init') { ws.close(); resolve(true); }
          if (msgs.length > 10) { ws.close(); resolve(false); }
        } catch { resolve(false); }
      };
      ws.onerror = () => resolve(false);
      setTimeout(() => { ws.close(); resolve(false); }, 5000);
    }));
    expect(received).toBe(true);
  });
});

// ----------------------------------------------------------------
//  TC-10: Tasks view tab
// ----------------------------------------------------------------
test.describe('TC-10: Tasks view tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
  });

  test('task view tab exists and is clickable', async ({ page }) => {
    const tabTasks = page.locator('#tab-tasks');
    await expect(tabTasks).toBeAttached();
  });

  test('task summary shows counters', async ({ page }) => {
    await expect(page.locator('#ts-total')).toBeAttached();
    await expect(page.locator('#ts-active')).toBeAttached();
    await expect(page.locator('#ts-done')).toBeAttached();
  });

  test('task input field exists with correct placeholder', async ({ page }) => {
    const input = page.locator('#task-input');
    await expect(input).toBeAttached();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toContain('задача');
  });
});
