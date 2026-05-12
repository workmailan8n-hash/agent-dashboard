import { test, expect } from '@playwright/test';

const URL = process.env.AUDIT_URL || 'http://localhost:3737';

test.setTimeout(90000);
test('agents do not orbit at choke points after 30s', async ({ page }) => {
  await page.goto(URL);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(30000);

  const positions = await page.evaluate(() => {
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

  console.log('Agents:', positions.length);
  console.log(JSON.stringify(positions, null, 2));

  // Primary bug: agents clumped together (overlap) at a choke point.
  // After the fix, any two agents must keep >= 0.5 tiles separation.
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i],
        b = positions[j];
      const dx = a.tx - b.tx,
        dy = a.ty - b.ty;
      const d = Math.sqrt(dx * dx + dy * dy);
      expect(d, `${a.id} & ${b.id} overlap at d=${d.toFixed(2)}`).toBeGreaterThan(0.5);
    }
  }

  await page.screenshot({ path: 'orbit-check.png', fullPage: false });
});
