// ════════════════════════════════════════════════════════════════
//  DYNAMIC EFFECTS
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from './constants.js';
import { COLS, ROWS } from './layout.js';
import { DESK_DEFS, KITCHEN_WALL_COL } from './layout.js';
import { getAdminPos } from './adminPos.js';
import { agentStates } from './state.js';
import { ts } from './background.js';

// ════════════════════════════════════════════════════════════════
//  DYNAMIC EFFECTS  (monitor glow, animated light shafts, coffee steam)
// ════════════════════════════════════════════════════════════════
function drawDynamicEffects(ctx, tick) {
  // Animated monitor content + glow for working agents
  for (const [id, sp] of Object.entries(agentStates)) {
    if (!sp.arrived || !sp.isWorking || sp.state==='walking') continue;
    const def = DESK_DEFS[Math.min(sp.slotIdx, DESK_DEFS.length-1)];
    if (!def) continue;
    const [dx,dy] = ts(def.tx, def.ty);
    const W = T*2;
    const sx = dx+W/2-9, sy = dy+8;
    ctx.save();
    // Bright code lines on screen
    const lineC = ['#7aa2f7','#9ece6a','#bb9af7','#ff9e64','#2ac3de'];
    for (let li=0; li<4; li++) {
      const lw = (4 + ((tick*0.4 + li*6 + sp.slotIdx*4)|0) % 16);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = lineC[(li+(tick/20|0))%lineC.length];
      ctx.fillRect(sx+1, sy+li*3, lw, 2);
    }
    // Cursor blink
    if ((tick>>3)&1) {
      ctx.globalAlpha=1; ctx.fillStyle='#ffffff';
      const lw=(4+((tick*0.4+3*6+sp.slotIdx*4)|0)%16);
      ctx.fillRect(sx+1+lw, sy+9, 2, 2);
    }
    // Screen glow — bright halo around desk
    ctx.globalAlpha = 0.12+Math.sin(tick*0.04)*0.04;
    const g=ctx.createRadialGradient(sx+11,sy+7,0,sx+11,sy+7,50);
    g.addColorStop(0,sp.palette.accent); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(sx-30,sy-20,82,70);
    ctx.restore();
  }

  // Animated window light shafts — more visible
  for (let i=0; i<4; i++) {
    const wx=OX+(3+i*6)*T+4, wy=OY+5;
    const alpha=0.07+Math.sin(tick*0.012+i*2.1)*0.025;
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.fillStyle='#ffe8a0';
    ctx.beginPath();
    ctx.moveTo(wx,wy+T-10); ctx.lineTo(wx+T-8,wy+T-10);
    ctx.lineTo(wx+T+6,wy+T*3.5); ctx.lineTo(wx-14,wy+T*3.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ── Kitchen appliance animations (steam, water, microwave glow) ──
  if (ROWS > 6 && KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1;
    const [_kcTx2,_kcTy2] = getAdminPos('kitchen_counter', kitIntX, KITCHEN_START_ROW);
    const [kx2, ky2] = ts(_kcTx2, _kcTy2);

    // Coffee steam particles (always rising gently)
    const steamX = kx2 + 17, steamBaseY = ky2 - 28;
    ctx.save();
    for (let si=0; si<4; si++) {
      const phase = tick * 0.06 + si * 1.8;
      const sy2 = steamBaseY - ((tick * 0.3 + si * 8) % 18);
      const sx2 = steamX + Math.sin(phase) * 2;
      const sa = 0.35 - ((tick * 0.3 + si * 8) % 18) / 50;
      if (sa > 0) {
        ctx.globalAlpha = sa;
        ctx.fillStyle = '#d0d8e8';
        ctx.fillRect(sx2|0, sy2|0, 2, 2);
      }
    }
    ctx.restore();

    // Microwave interior glow (subtle pulse)
    const mgx = kx2 + T + 12, mgy = ky2 - 17;
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(tick * 0.08) * 0.04;
    const mg = ctx.createRadialGradient(mgx, mgy, 0, mgx, mgy, 10);
    mg.addColorStop(0, '#40a0ff'); mg.addColorStop(1, 'transparent');
    ctx.fillStyle = mg; ctx.fillRect(mgx-10, mgy-8, 20, 16);
    ctx.restore();

    // Sink water drops (intermittent dripping)
    const wdx = kx2 + T*7 + T - 6, wdy = ky2 - 10;
    ctx.save();
    const drip = (tick % 80);
    if (drip < 30) {
      const dy = drip * 0.4;
      ctx.globalAlpha = 0.6 - drip * 0.015;
      ctx.fillStyle = '#80c0e0';
      ctx.fillRect((wdx)|0, (wdy + dy)|0, 1, 2);
    }
    // Tiny splash at bottom
    if (drip > 25 && drip < 35) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#80c0e0';
      ctx.fillRect((wdx-1)|0, (wdy+12)|0, 1, 1);
      ctx.fillRect((wdx+1)|0, (wdy+11)|0, 1, 1);
    }
    ctx.restore();
  }
}


export { drawDynamicEffects };
