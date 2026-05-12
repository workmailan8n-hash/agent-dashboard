import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';

const URL = process.env.AUDIT_URL || 'http://localhost:3737';

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail?: string) {
  results.push({ id, name, pass, detail });
}

test.setTimeout(300000);

test("automated acceptance — fills what humans don't need to", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  let wsConnected = false;
  page.on('websocket', (ws) => {
    wsConnected = true;
    ws.on('framereceived', () => {
      /* ws is alive */
    });
  });

  await page.goto(URL);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(8000); // settle

  // ── 1.1 Console errors ───────────────────────────────────────────
  check(
    '1.1',
    'No red console errors at load',
    consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(' | ')
  );

  // ── 1.2 WebSocket connected ──────────────────────────────────────
  check('1.2', 'WebSocket connected', wsConnected);

  // ── 2.1 Agent count ──────────────────────────────────────────────
  const apiState = await page.evaluate(async () => {
    const r = await fetch('/api/state');
    return await r.json();
  });
  check(
    '2.1',
    'Agent count 10 (2 real + 8 filler)',
    apiState.agents.length === 10,
    `got ${apiState.agents.length}`
  );

  // Wait for clustering bug to manifest if present
  await page.waitForTimeout(15000);

  // ── 2.2 No agents inside walls ───────────────────────────────────
  const wallCheck = await page.evaluate(() => {
    const states = (window as any).agentStates;
    const grid = (window as any).obstacleGrid as Uint8Array[] | undefined;
    if (!states || !grid) return { ok: false, reason: 'no agentStates/obstacleGrid' };
    const offenders: any[] = [];
    for (const s of Object.values(states) as any[]) {
      const cx = Math.round(s.tx);
      const cy = Math.round(s.ty);
      if (grid[cy]?.[cx]) offenders.push({ id: s.id, tx: s.tx, ty: s.ty });
    }
    return { ok: offenders.length === 0, offenders };
  });
  check(
    '2.2',
    'No agents inside wall tiles',
    wallCheck.ok,
    wallCheck.offenders ? JSON.stringify(wallCheck.offenders) : wallCheck.reason
  );

  // ── 2.3 No clusters at doors (pairwise distance) ─────────────────
  const positions: any[] = await page.evaluate(() => {
    const states = (window as any).agentStates;
    if (!states) return [];
    return Object.values(states).map((s: any) => ({
      id: s.id,
      tx: s.tx,
      ty: s.ty,
      arrived: s.arrived,
      walkTimer: s.walkTimer,
    }));
  });
  let minDist = Infinity;
  let closestPair: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i],
        b = positions[j];
      const dx = a.tx - b.tx,
        dy = a.ty - b.ty;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        closestPair = [a.id, b.id];
      }
    }
  }
  check(
    '2.3',
    'No clustering (min pairwise dist > 0.5 tiles)',
    minDist > 0.5,
    `min=${minDist.toFixed(2)} between ${closestPair.join(' & ')}`
  );

  // ── 2.4 Left panel sync — list of agent names matches canvas labels
  const panelNames: string[] = await page.evaluate(() => {
    const items = document.querySelectorAll('#agentsList .agent-item, .card-name');
    return Array.from(items).map((el) => (el as HTMLElement).innerText.trim());
  });
  check(
    '2.4',
    'Left agents panel renders names',
    panelNames.length > 0,
    `${panelNames.length} entries`
  );

  // ── 3.1 / 3.2  Orbit / jitter — sample positions every 0.5s for 6s
  const samples: any[][] = [];
  for (let t = 0; t < 12; t++) {
    const snap = await page.evaluate(() => {
      const s = (window as any).agentStates;
      if (!s) return [];
      return Object.values(s).map((a: any) => ({ id: a.id, tx: a.tx, ty: a.ty }));
    });
    samples.push(snap);
    await page.waitForTimeout(500);
  }
  // Detect orbit: same agent's positions form tight cycle (oscillating <2 tile radius for whole window)
  const orbiters: string[] = [];
  if (samples[0]) {
    for (const a of samples[0]) {
      const xs = samples
        .map((s) => s.find((x: any) => x.id === a.id)?.tx)
        .filter(Boolean) as number[];
      const ys = samples
        .map((s) => s.find((x: any) => x.id === a.id)?.ty)
        .filter(Boolean) as number[];
      if (xs.length < 8) continue;
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const rangeX = maxX - minX,
        rangeY = maxY - minY;
      // Moved (>0.4 total) but stayed in <2.5 tile box
      const moved = rangeX + rangeY;
      if (moved > 0.4 && rangeX < 2.5 && rangeY < 2.5) orbiters.push(a.id);
    }
  }
  check('3.1', 'No orbit pattern detected (6s sample)', orbiters.length === 0, orbiters.join(', '));

  // ── 6.* Walls/doors — verify obstacleGrid shape
  const wallProbe = await page.evaluate(() => {
    const g = (window as any).obstacleGrid as Uint8Array[] | undefined;
    if (!g) return null;
    return {
      kitchenWallAt23_10: !!g[10]?.[23], // expect blocked
      kitchenDoorAt23_13: !g[13]?.[23], // expect open
      actWallAt43_5: !!g[43]?.[5], // expect blocked
      gymDoorAt43_28: !g[43]?.[28], // expect open
    };
  });
  if (wallProbe) {
    check(
      '6.1',
      'Kitchen wall col 23 row 10 is blocked',
      wallProbe.kitchenWallAt23_10,
      JSON.stringify(wallProbe)
    );
    check('6.1b', 'Kitchen door col 23 row 13 is open', wallProbe.kitchenDoorAt23_13);
    check('6.2', 'Activity wall row 43 is blocked at col 5', wallProbe.actWallAt43_5);
    check('6.2b', 'Gym door row 43 col 28 is open', wallProbe.gymDoorAt43_28);
  }

  // ── 10.2 / 10.3 Settings & Leaderboard buttons exist in DOM ─────
  const setExists = (await page.locator('text=/⚙|SETTINGS|^SET/i').count()) > 0;
  const topExists = (await page.locator('text=/🏆|LEADERBOARD|^TOP/i').count()) > 0;
  check('10.2', 'Settings (⚙) button present in DOM', setExists);
  check('10.3', 'Leaderboard (🏆) button present in DOM', topExists);

  // ── 11.1 Tab focus shows focus ring ──────────────────────────────
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      outline: style.outline,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  check(
    '11.1',
    'First Tab focuses an element with visible outline/boxShadow',
    !!focused &&
      ((focused.outlineWidth && focused.outlineWidth !== '0px') ||
        (focused.boxShadow && focused.boxShadow !== 'none')),
    JSON.stringify(focused)
  );

  // ── Save full report ─────────────────────────────────────────────
  await page.screenshot({ path: 'acceptance-auto.png', fullPage: false });
  fs.writeFileSync(
    'acceptance-auto.json',
    JSON.stringify({ results, positions, wallProbe }, null, 2)
  );

  // Print summary to console
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log('\n══════ ACCEPTANCE REPORT ══════');
  for (const r of results) {
    console.log(`${r.pass ? '✓' : '✗'} ${pad(r.id, 6)} ${pad(r.name, 60)} ${r.detail ?? ''}`);
  }
  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - fail}/${results.length} passed\n`);

  // Don't fail the test on individual checks — we report findings.
});
