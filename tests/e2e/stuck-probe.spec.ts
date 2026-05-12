import { test } from '@playwright/test';
import * as fs from 'fs';

test.setTimeout(30000);
test('probe stuck agents', async ({ page }) => {
  await page.goto(process.env.AUDIT_URL || 'http://localhost:3737');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const states = (window as any).agentStates;
    const grid = (window as any).obstacleGrid as Uint8Array[] | undefined;
    if (!states) return { error: 'no agentStates' };
    const out: any[] = [];
    for (const s of Object.values(states) as any[]) {
      const cx = Math.round(s.tx),
        cy = Math.round(s.ty);
      out.push({
        id: s.id,
        slug: s.slug,
        tx: +s.tx.toFixed(2),
        ty: +s.ty.toFixed(2),
        targetTx: +(s.targetTx ?? -1).toFixed(2),
        targetTy: +(s.targetTy ?? -1).toFixed(2),
        arrived: s.arrived,
        slotIdx: s.slotIdx,
        walkTimer: +s.walkTimer.toFixed(1),
        waypoints: s.waypoints?.length ?? 0,
        wp0: s.waypoints?.[0]
          ? `${s.waypoints[0].tx.toFixed(1)},${s.waypoints[0].ty.toFixed(1)}`
          : null,
        state: s.state,
        facing: s.facing,
        isWorking: s.isWorking,
        celebrating: s.celebrating,
        cleaning: s.isCleaning,
        evicted: !!(window as any).evictedAgents?.has?.(s.id),
        onWall: grid?.[cy]?.[cx] ? true : false,
        cell: `${cx},${cy}`,
      });
    }
    return { agents: out };
  });

  console.log(JSON.stringify(data, null, 2));
  fs.writeFileSync('stuck-probe.json', JSON.stringify(data, null, 2));
});
