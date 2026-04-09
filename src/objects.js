// ════════════════════════════════════════════════════════════════
//  INTERACTIVE OFFICE OBJECTS — draw functions
// ════════════════════════════════════════════════════════════════
import { T } from "./constants.js";

function fillR(ctx, x, y, w, h, c) {
  if (!c) return;
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// ── Zen Garden (sand tray with rake) ────────────────────────────
export function drawZenGarden(ctx, x, y, tick) {
  const tw = T * 2,
    th = T * 1.4;
  // Wooden tray frame
  ctx.save();
  ctx.shadowColor = "#00000060";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#5a3010";
  ctx.fillRect(x, y + 6, tw, th);
  ctx.restore();
  ctx.fillStyle = "#6e3c14";
  ctx.fillRect(x + 2, y + 4, tw - 4, th - 2);
  // Sand fill
  ctx.fillStyle = "#e8dfc0";
  ctx.fillRect(x + 4, y + 6, tw - 8, th - 6);
  // Subtle sand gradient tint
  const sg = ctx.createLinearGradient(x + 4, y + 6, x + tw - 4, y + th);
  sg.addColorStop(0, "rgba(255,255,220,0.15)");
  sg.addColorStop(1, "rgba(180,160,100,0.15)");
  ctx.fillStyle = sg;
  ctx.fillRect(x + 4, y + 6, tw - 8, th - 6);
  // Raked lines (horizontal grooves)
  ctx.strokeStyle = "#c8b898";
  ctx.lineWidth = 0.8;
  for (let li = 0; li < 5; li++) {
    const ly = y + 9 + li * ((th - 8) / 5);
    ctx.beginPath();
    ctx.moveTo(x + 5, ly);
    ctx.lineTo(x + tw - 5, ly);
    ctx.stroke();
  }
  // Small stones
  const rocks = [
    { rx: x + 12, ry: y + 12, r: 4 },
    { rx: x + tw - 18, ry: y + th - 10, r: 3 },
    { rx: x + tw / 2 + 6, ry: y + 14, r: 2.5 },
  ];
  for (const rk of rocks) {
    ctx.fillStyle = "#707878";
    ctx.beginPath();
    ctx.ellipse(rk.rx, rk.ry, rk.r + 1, rk.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a9090";
    ctx.beginPath();
    ctx.ellipse(rk.rx - 0.5, rk.ry - 0.5, rk.r, rk.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Concentric ripple rings around rocks
    const ring = 0.5 + 0.5 * Math.sin(tick * 0.03 + rk.r);
    ctx.strokeStyle = `rgba(180,160,120,${ring * 0.25})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(rk.rx, rk.ry, rk.r + 4, (rk.r + 4) * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(rk.rx, rk.ry, rk.r + 7, (rk.r + 7) * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Bamboo rake (leaning on right edge)
  ctx.strokeStyle = "#a06820";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + tw - 6, y + 2);
  ctx.lineTo(x + tw - 9, y + th + 2);
  ctx.stroke();
  // Rake head tines
  for (let ti = 0; ti < 4; ti++) {
    ctx.beginPath();
    ctx.moveTo(x + tw - 10 + ti * 2, y + th - 2);
    ctx.lineTo(x + tw - 11 + ti * 2, y + th + 4);
    ctx.stroke();
  }
  // Label
  ctx.fillStyle = "#a08060";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("ZEN", x + tw / 2, y + th + 14);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Rubber Duck ─────────────────────────────────────────────────
export function drawRubberDuck(ctx, x, y, tick) {
  ctx.save();
  // Base: water/tray (blue-ish platform)
  ctx.fillStyle = "#1a3a5a";
  ctx.fillRect(x + 2, y + T + 10, T - 4, 6);
  ctx.fillStyle = "#1e5080";
  ctx.fillRect(x + 3, y + T + 8, T - 6, 4);
  // Water shimmer
  const wShim = Math.sin(tick * 0.07) * 1.5;
  ctx.fillStyle = "#2a90c040";
  ctx.fillRect(x + 3, y + T + 8 + wShim, T - 6, 2);

  // Duck body (yellow, slightly bobs)
  const bob = Math.sin(tick * 0.05) * 1.2;
  ctx.fillStyle = "#f7d060";
  // Body oval
  ctx.beginPath();
  ctx.ellipse(x + T / 2, y + T - 4 + bob, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.ellipse(x + T / 2 + 3, y + T - 13 + bob, 6, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beak (orange)
  ctx.fillStyle = "#e07820";
  ctx.beginPath();
  ctx.moveTo(x + T / 2 + 8, y + T - 12 + bob);
  ctx.lineTo(x + T / 2 + 12, y + T - 11 + bob);
  ctx.lineTo(x + T / 2 + 8, y + T - 10 + bob);
  ctx.closePath();
  ctx.fill();
  // Eye
  ctx.fillStyle = "#1a1a28";
  ctx.beginPath();
  ctx.arc(x + T / 2 + 5, y + T - 14 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = "#ffffffaa";
  ctx.beginPath();
  ctx.arc(x + T / 2 + 5.5, y + T - 14.5 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Wing
  ctx.fillStyle = "#e8ba40";
  ctx.beginPath();
  ctx.ellipse(x + T / 2 - 5, y + T - 4 + bob, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Label under tray
  ctx.fillStyle = "#e07820";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("QUACK", x + T / 2, y + T + 20);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Newton's Cradle ──────────────────────────────────────────────
export function drawNewtonsCradle(ctx, x, y, tick) {
  ctx.save();
  const fw = T * 1.4,
    fh = T * 0.9;
  const cx = x + fw / 2;
  // Base
  ctx.fillStyle = "#3a2810";
  ctx.fillRect(x + 2, y + fh + 2, fw - 4, 6);
  // Frame legs
  ctx.strokeStyle = "#8a6840";
  ctx.lineWidth = 2;
  // Left upright
  ctx.beginPath();
  ctx.moveTo(x + 6, y + fh + 2);
  ctx.lineTo(x + 6, y + 4);
  ctx.stroke();
  // Right upright
  ctx.beginPath();
  ctx.moveTo(x + fw - 6, y + fh + 2);
  ctx.lineTo(x + fw - 6, y + 4);
  ctx.stroke();
  // Top bar
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + fw - 4, y + 4);
  ctx.stroke();
  // 5 balls on strings
  const nBalls = 5;
  const ballR = 4;
  const spacing = (fw - 16) / (nBalls - 1);
  const strLen = fh - 8;
  // Cradle swing: leftmost and rightmost alternate
  const swingT = tick * 0.08;
  const maxAng = 0.55;
  const leftSwing = Math.sin(swingT) > 0 ? Math.sin(swingT) * maxAng : 0;
  const rightSwing = Math.sin(swingT) < 0 ? Math.sin(swingT) * maxAng : 0;
  for (let i = 0; i < nBalls; i++) {
    const bx0 = x + 8 + i * spacing;
    let ang = 0;
    if (i === 0) ang = leftSwing;
    else if (i === nBalls - 1) ang = rightSwing;
    const bx = bx0 + Math.sin(ang) * strLen;
    const by = y + 4 + Math.cos(ang) * strLen;
    // String
    ctx.strokeStyle = "#c8c0a0";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx0, y + 4);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // Ball
    const grad = ctx.createRadialGradient(
      bx - 1.5,
      by - 1.5,
      0.5,
      bx,
      by,
      ballR,
    );
    grad.addColorStop(0, "#e0e0e8");
    grad.addColorStop(0.4, "#b0b0c0");
    grad.addColorStop(1, "#606070");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, ballR, 0, Math.PI * 2);
    ctx.fill();
  }
  // Label
  ctx.fillStyle = "#8a7060";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("CRADLE", cx, y + fh + 16);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Gumball Machine ──────────────────────────────────────────────
export function drawGumballMachine(ctx, x, y, tick) {
  ctx.save();
  const cx = x + T * 0.7;
  // Stand leg
  ctx.fillStyle = "#5a3820";
  ctx.fillRect(cx - 3, y + T * 1.1, 6, T * 0.5);
  // Base plate
  ctx.fillStyle = "#7a4a28";
  ctx.fillRect(cx - 10, y + T * 1.55, 20, 5);
  // Dispenser housing (lower cylinder)
  ctx.fillStyle = "#cc2222";
  ctx.beginPath();
  ctx.ellipse(cx, y + T * 1.05, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cc2222";
  ctx.fillRect(cx - 10, y + T * 0.72, 20, T * 0.34);
  ctx.fillStyle = "#991a1a";
  ctx.fillRect(cx - 10, y + T * 0.72, 20, 3);
  // Coin slot (tiny slit on side)
  ctx.fillStyle = "#441010";
  ctx.fillRect(cx + 6, y + T * 0.82, 5, 2);
  // Glass globe
  const globeR = T * 0.6;
  const globeY = y + T * 0.7 - globeR;
  // Globe shadow/depth
  const globeGrad = ctx.createRadialGradient(
    cx - globeR * 0.3,
    globeY - globeR * 0.2,
    globeR * 0.1,
    cx,
    globeY,
    globeR,
  );
  globeGrad.addColorStop(0, "rgba(255,255,255,0.18)");
  globeGrad.addColorStop(0.55, "rgba(160,210,240,0.25)");
  globeGrad.addColorStop(1, "rgba(80,140,200,0.45)");
  ctx.fillStyle = globeGrad;
  ctx.beginPath();
  ctx.arc(cx, globeY, globeR, 0, Math.PI * 2);
  ctx.fill();
  // Gumballs inside globe (colorful circles)
  const GBALL_COLORS = [
    "#f7768e",
    "#9ece6a",
    "#e0af68",
    "#7aa2f7",
    "#bb9af7",
    "#ff9e64",
    "#2ac3de",
  ];
  const ballData = [
    { ox: -8, oy: 10 },
    { ox: 4, oy: 12 },
    { ox: -3, oy: 18 },
    { ox: 8, oy: 16 },
    { ox: -10, oy: 18 },
    { ox: 1, oy: 4 },
    { ox: -5, oy: 7 },
    { ox: 9, oy: 8 },
    { ox: -1, oy: 22 },
    { ox: 6, oy: 21 },
    { ox: -7, oy: 14 },
    { ox: 11, oy: 20 },
  ];
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, globeY, globeR - 2, 0, Math.PI * 2);
  ctx.clip();
  ballData.forEach((b, i) => {
    const wobble = Math.sin(tick * 0.015 + i * 1.3) * 0.8;
    const bx = cx + b.ox + wobble;
    const by = globeY + b.oy - globeR * 0.05;
    const col = GBALL_COLORS[i % GBALL_COLORS.length];
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.arc(bx + 0.5, by + 0.8, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Ball
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(bx - 1, by - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // Globe rim (top cap)
  ctx.fillStyle = "#cc2222";
  ctx.beginPath();
  ctx.ellipse(cx, globeY - globeR + 3, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Globe glass shine overlay
  ctx.save();
  ctx.globalAlpha = 0.22 + 0.06 * Math.sin(tick * 0.04);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    cx - globeR * 0.28,
    globeY - globeR * 0.3,
    globeR * 0.22,
    globeR * 0.35,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  // Label
  ctx.fillStyle = "#e0af68";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("GUMBALL", cx, y + T * 1.7);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Terrarium (glass vivarium with gecko) ───────────────────────
export function drawTerrarium(ctx, x, y, tick) {
  ctx.save();
  const tw = T * 1.6,
    th = T * 1.2;
  const cx = x + tw / 2,
    cy = y + th / 2;
  // Glass box back wall (dark green tint)
  ctx.fillStyle = "#0d1a10";
  ctx.fillRect(x + 2, y + 2, tw - 4, th - 4);
  // Sand floor (bottom strip)
  ctx.fillStyle = "#c8a060";
  ctx.fillRect(x + 2, y + th - 8, tw - 4, 6);
  // Sand texture dots
  ctx.fillStyle = "#a07840";
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 4 + i * 6, y + th - 6, 2, 2);
  // Small cactus
  ctx.fillStyle = "#3a8040";
  ctx.fillRect(x + 6, y + th - 14, 3, 10); // trunk
  ctx.fillRect(x + 3, y + th - 12, 3, 3); // left arm
  ctx.fillRect(x + 9, y + th - 11, 3, 3); // right arm
  ctx.fillStyle = "#2a6030";
  ctx.fillRect(x + 7, y + th - 15, 1, 2); // spine
  // Gecko (lizard) body — bobs slightly
  const bob = Math.sin(tick * 0.04) * 1.5;
  const gx = x + tw - 20,
    gy = y + th - 14 + bob;
  ctx.fillStyle = "#70c840";
  ctx.beginPath();
  ctx.ellipse(gx + 8, gy + 4, 7, 4, 0.2, 0, Math.PI * 2); // body
  ctx.fill();
  ctx.fillStyle = "#58a030";
  ctx.beginPath();
  ctx.ellipse(gx + 13, gy + 3, 4, 3, 0.1, 0, Math.PI * 2); // head
  ctx.fill();
  // Tail
  ctx.strokeStyle = "#70c840";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx + 2, gy + 5);
  ctx.quadraticCurveTo(
    gx - 4,
    gy + 8,
    gx - 7,
    gy + 5 + Math.sin(tick * 0.06) * 3,
  );
  ctx.stroke();
  // Legs
  ctx.strokeStyle = "#58a030";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx + 5, gy + 6);
  ctx.lineTo(gx + 3, gy + 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gx + 10, gy + 6);
  ctx.lineTo(gx + 12, gy + 10);
  ctx.stroke();
  // Eye
  ctx.fillStyle = "#1a1a28";
  ctx.beginPath();
  ctx.arc(gx + 15, gy + 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff80";
  ctx.beginPath();
  ctx.arc(gx + 15.4, gy + 1.6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Glass frame
  ctx.strokeStyle = "#506870";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, tw - 4, th - 4);
  // Glass sheen
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#a0d8f0";
  ctx.fillRect(x + 3, y + 3, 4, th - 6);
  ctx.fillRect(x + 3, y + 3, tw - 6, 3);
  ctx.globalAlpha = 1;
  // Label
  ctx.fillStyle = "#506870";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("TERRARIUM", cx, y + th + 13);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Lava Lamp (right zone, animated blobs) ────────────────────────
export function drawLavaLamp(ctx, x, y, tick) {
  const t = tick * 0.02;
  const lampW = 20,
    lampH = 52;
  const bx = x + 6; // center x of lamp
  // Base
  fillR(ctx, x + 2, y + lampH, lampW - 4, 6, "#2a2a3a");
  fillR(ctx, x + 4, y + lampH + 5, lampW - 8, 3, "#202028");
  // Glass body (tapered cylinder)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 8);
  ctx.lineTo(x + lampW - 2, y + 8);
  ctx.lineTo(x + lampW, y + lampH);
  ctx.lineTo(x, y + lampH);
  ctx.closePath();
  ctx.fillStyle = "#1a1a2a90";
  ctx.fill();
  ctx.strokeStyle = "#4a4a6a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // Liquid fill (warm glow)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 9);
  ctx.lineTo(x + lampW - 3, y + 9);
  ctx.lineTo(x + lampW - 1, y + lampH - 1);
  ctx.lineTo(x + 1, y + lampH - 1);
  ctx.closePath();
  ctx.fillStyle = "#ff401040";
  ctx.fill();
  ctx.restore();
  // Animated blobs
  const blobDefs = [
    { phase: 0, size: 7, col: "#ff6030" },
    { phase: 2.1, size: 5, col: "#ff8040" },
    { phase: 4.2, size: 6, col: "#ff4820" },
  ];
  for (const b of blobDefs) {
    const blobT = (t + b.phase) % (Math.PI * 2);
    const rise = Math.sin(blobT); // -1..1
    const blobY = y + 12 + (lampH - 20) * (0.5 - rise * 0.45);
    const wobble = Math.sin(blobT * 1.7 + b.phase) * 2;
    const blobX = bx + wobble;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.ellipse(
      blobX,
      blobY,
      b.size,
      b.size * 0.75,
      wobble * 0.1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
  // Glass shine
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 10);
  ctx.lineTo(x + 5, y + 10);
  ctx.lineTo(x + 4, y + lampH - 4);
  ctx.lineTo(x + 2, y + lampH - 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Top cap
  fillR(ctx, x + 1, y + 4, lampW - 2, 5, "#303048");
  fillR(ctx, x + 4, y, lampW - 8, 5, "#404058");
  // Glow underneath (LED base)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.shadowColor = "#ff6030";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ff6030";
  ctx.beginPath();
  ctx.arc(bx, y + lampH + 3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Label
  ctx.fillStyle = "#ff8040";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("LAVA", x + lampW / 2, y + lampH + 16);
  ctx.textAlign = "left";
}

export function drawPinballMachine(ctx, x, y, tick) {
  const t = tick * 0.03;
  const pW = 20,
    pH = 44;
  // Cabinet legs
  fillR(ctx, x + 2, y + pH + 2, 4, 6, "#1a1a28");
  fillR(ctx, x + pW - 6, y + pH + 2, 4, 6, "#1a1a28");
  // Main cabinet body (slightly angled top)
  ctx.save();
  ctx.shadowColor = "#6040ff60";
  ctx.shadowBlur = 10;
  fillR(ctx, x, y + 12, pW, pH - 8, "#1a1030");
  ctx.restore();
  fillR(ctx, x + 1, y + 13, pW - 2, pH - 12, "#22183c");
  // Backglass top panel (angled)
  ctx.save();
  ctx.fillStyle = "#2a1848";
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + pW, y + 12);
  ctx.lineTo(x + pW - 2, y);
  ctx.lineTo(x + 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Backglass artwork — neon-style
  ctx.save();
  const hue = (tick * 1.5) % 360;
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = `hsl(${hue},100%,55%)`;
  fillR(ctx, x + 3, y + 1, pW - 6, 3, `hsl(${hue},100%,55%)`);
  ctx.fillStyle = `hsl(${(hue + 120) % 360},100%,55%)`;
  fillR(ctx, x + 3, y + 6, pW - 6, 3, `hsl(${(hue + 120) % 360},100%,55%)`);
  ctx.restore();
  // Backglass star (center)
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = "#ffee40";
  ctx.beginPath();
  ctx.arc(x + pW / 2, y + 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Playfield window (glass top)
  ctx.save();
  ctx.shadowColor = "#4020a060";
  ctx.shadowBlur = 8;
  fillR(ctx, x + 3, y + 16, pW - 6, pH - 22, "#0a0618");
  ctx.restore();
  // Playfield: bumpers
  const bumpCols = ["#f7768e", "#9ece6a", "#7aa2f7"];
  for (let bi = 0; bi < 3; bi++) {
    const bx = x + 5 + bi * 5,
      by2 = y + 20 + bi * 4;
    const bump = 0.6 + Math.sin(t * 4 + bi * 2.1) * 0.3;
    ctx.save();
    ctx.globalAlpha = bump;
    ctx.shadowColor = bumpCols[bi];
    ctx.shadowBlur = 6;
    ctx.fillStyle = bumpCols[bi];
    ctx.beginPath();
    ctx.arc(bx, by2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Ball (animated rolling)
  const ballX = x + 6 + Math.sin(t * 2.3) * 4;
  const ballY = y + 32 + Math.cos(t * 1.7) * 4;
  ctx.save();
  ctx.shadowColor = "#c0c0ff";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#d0d0e8";
  ctx.beginPath();
  ctx.arc(ballX, ballY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Flippers (animated)
  const flipL = Math.sin(t * 6) > 0.4 ? -0.3 : 0.15;
  const flipR = Math.sin(t * 6 + 1.5) > 0.4 ? 0.3 : -0.15;
  ctx.save();
  ctx.strokeStyle = "#c0a0ff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#c0a0ff";
  ctx.shadowBlur = 5;
  // Left flipper
  ctx.save();
  ctx.translate(x + 5, y + pH - 10);
  ctx.rotate(flipL);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 3);
  ctx.stroke();
  ctx.restore();
  // Right flipper
  ctx.save();
  ctx.translate(x + pW - 5, y + pH - 10);
  ctx.rotate(flipR);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-7, 3);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Control panel (bottom)
  fillR(ctx, x + 2, y + pH - 6, pW - 4, 6, "#2a1840");
  // Plunger
  fillR(ctx, x + pW - 4, y + pH - 4, 3, 4, "#808090");
  fillR(ctx, x + pW - 3, y + pH - 2, 1, 2, "#c0c0d0");
  // Label
  ctx.fillStyle = "#bb9af7";
  ctx.font = "4px monospace";
  ctx.textAlign = "center";
  ctx.fillText("PINBALL", x + pW / 2, y + pH + 1);
  ctx.textAlign = "left";
}

// ── Hammock object (between two wooden posts) ───────────────────
export function drawHammock(ctx, x, y, tick) {
  const swing = Math.sin(tick * 0.04) * 4;
  // Left post
  fillR(ctx, x + 2, y - 28, 5, 36, "#7a4a1e");
  fillR(ctx, x - 2, y + 4, 9, 4, "#5a3410"); // base
  fillR(ctx, x + 3, y - 30, 3, 5, "#9a6a2e"); // cap
  // Right post
  fillR(ctx, x + 50, y - 28, 5, 36, "#7a4a1e");
  fillR(ctx, x + 46, y + 4, 9, 4, "#5a3410"); // base
  fillR(ctx, x + 51, y - 30, 3, 5, "#9a6a2e"); // cap
  // Rope anchors
  ctx.strokeStyle = "#c8a050";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 7, y - 16);
  ctx.lineTo(x + 15 + swing, y - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 50, y - 16);
  ctx.lineTo(x + 42 + swing, y - 6);
  ctx.stroke();
  // Hammock fabric (curved, swings slightly)
  const hx = swing;
  ctx.strokeStyle = "#e88040";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 14 + hx, y - 8);
  ctx.quadraticCurveTo(x + 28 + hx, y + 10, x + 42 + hx, y - 8);
  ctx.stroke();
  ctx.strokeStyle = "#d06828";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 14 + hx, y - 6);
  ctx.quadraticCurveTo(x + 28 + hx, y + 8, x + 42 + hx, y - 6);
  ctx.stroke();
  // Decorative stripes on fabric
  ctx.strokeStyle = "#f09850";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const px2 = x + 18 + i * 8 + hx;
    const py2 = y + 2 + Math.sin((i + 1) * 0.8) * 3;
    ctx.beginPath();
    ctx.moveTo(px2, py2 - 3);
    ctx.lineTo(px2 + 2, py2 + 3);
    ctx.stroke();
  }
}

export function drawJukebox(ctx, x, y, tick) {
  const t = tick * 0.025;
  // Scale up 1.7x — was too small next to pingpong table
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.7, 1.7);
  x = 0;
  y = 0;
  const jW = 22,
    jH = 48;
  // Cabinet base
  fillR(ctx, x + 1, y + jH - 6, jW - 2, 6, "#2a1a08");
  fillR(ctx, x + 3, y + jH - 8, jW - 6, 4, "#3a2a10");
  // Main body
  ctx.save();
  ctx.shadowColor = "#ff880060";
  ctx.shadowBlur = 10;
  fillR(ctx, x, y + 8, jW, jH - 14, "#3a1a08");
  ctx.restore();
  // Top arch dome
  ctx.save();
  ctx.fillStyle = "#ff9030";
  ctx.beginPath();
  ctx.ellipse(x + jW / 2, y + 9, jW / 2, 10, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#ffb040";
  ctx.beginPath();
  ctx.ellipse(x + jW / 2, y + 9, jW / 2 - 3, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  // Speaker grill (center)
  ctx.save();
  ctx.fillStyle = "#1a1008";
  fillR(ctx, x + 4, y + 18, jW - 8, 18, "#1a1008");
  // Grill lines
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 1;
  for (let gi = 0; gi < 5; gi++) {
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 20 + gi * 3);
    ctx.lineTo(x + jW - 5, y + 20 + gi * 3);
    ctx.stroke();
  }
  ctx.restore();
  // Animated color band (rainbow pulse)
  const hue = (tick * 2) % 360;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = `hsl(${hue},100%,55%)`;
  fillR(ctx, x + 2, y + 16, jW - 4, 3, `hsl(${hue},100%,55%)`);
  ctx.fillStyle = `hsl(${(hue + 120) % 360},100%,55%)`;
  fillR(ctx, x + 2, y + 37, jW - 4, 3, `hsl(${(hue + 120) % 360},100%,55%)`);
  ctx.restore();
  // Dome glow (animated)
  ctx.save();
  ctx.globalAlpha = 0.3 + Math.sin(t * 3) * 0.15;
  ctx.shadowColor = "#ff8820";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ff8820";
  ctx.beginPath();
  ctx.ellipse(x + jW / 2, y + 5, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Buttons row
  const btnCols = ["#f7768e", "#9ece6a", "#7aa2f7", "#e0af68"];
  for (let bi = 0; bi < 4; bi++) {
    const pulse = Math.sin(t * 4 + bi * 1.1) > 0.3;
    ctx.fillStyle = pulse ? btnCols[bi] : btnCols[bi] + "60";
    ctx.beginPath();
    ctx.arc(x + 5 + bi * 5, y + 42, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Label
  ctx.save();
  ctx.fillStyle = "#ffcc60";
  ctx.font = "bold 5px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("JUKE", x + jW / 2, y + 15);
  ctx.textAlign = "left";
  ctx.restore();
  ctx.restore(); // scale
}

export function drawCrystalBall(ctx, x, y, tick) {
  const t = tick * 0.018;
  const cbR = 14; // radius of the sphere
  const cx = x + 16,
    cy = y + 20;
  // Pedestal
  fillR(ctx, x + 6, y + 36, 20, 4, "#2a2035");
  fillR(ctx, x + 9, y + 33, 14, 4, "#3a2a4a");
  fillR(ctx, x + 11, y + 32, 10, 2, "#4a3a5a");
  // Inner mist — clipped inside sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, cbR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#100820";
  ctx.fillRect(cx - cbR, cy - cbR, cbR * 2, cbR * 2);
  // Swirling mist clouds
  const mistCols = ["#7040c0", "#4080c0", "#c040a0"];
  for (let i = 0; i < 3; i++) {
    const a = t * 0.7 + i * 2.094;
    const mx = cx + Math.cos(a) * 5;
    const my = cy + Math.sin(a * 0.8) * 4;
    ctx.globalAlpha = 0.28 + Math.sin(t * 1.5 + i) * 0.1;
    ctx.fillStyle = mistCols[i];
    ctx.beginPath();
    ctx.ellipse(
      mx,
      my,
      9 + Math.sin(t + i) * 2,
      6 + Math.cos(t * 1.3 + i) * 2,
      a * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
  // Stars inside (orbiting)
  const starCols = ["#ffffff", "#e0c0ff", "#c0e0ff", "#ffd0ff", "#d0ffff"];
  for (let i = 0; i < 6; i++) {
    const sa = t * 1.2 + i * 1.047;
    const sr = 7 + Math.sin(t * 0.9 + i * 1.3) * 4;
    const sx = cx + Math.cos(sa) * sr;
    const sy2 = cy + Math.sin(sa * 1.2) * (sr * 0.6);
    // Clip to sphere
    const dist = Math.sqrt((sx - cx) ** 2 + (sy2 - cy) ** 2);
    if (dist > cbR - 1) continue;
    const blink = 0.3 + Math.abs(Math.sin(t * 2.5 + i)) * 0.7;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.fillStyle = starCols[i % 5];
    ctx.fillRect(Math.round(sx) - 1, Math.round(sy2) - 1, 2, 2);
    ctx.restore();
  }
  // Glass sphere outline
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "#c0a0ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, cbR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Highlight (top-left shine)
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy - 7, 4, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Ambient glow
  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(t * 1.8) * 0.05;
  ctx.shadowColor = "#8040ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#8040ff";
  ctx.beginPath();
  ctx.arc(cx, cy, cbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Label on pedestal
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#c0a0e0";
  ctx.font = "bold 4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("ORACLE", cx, y + 42);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Record Player (spinning vinyl turntable) ─────────────────────
export function drawRecordPlayer(ctx, x, y, tick) {
  ctx.save();
  const t = tick * 0.04; // rotation speed
  const pw = 44,
    ph = 36; // platter base dimensions
  const cx = x + pw / 2,
    cy = y + ph / 2 + 4;

  // Wooden cabinet base
  ctx.fillStyle = "#5a3010";
  ctx.fillRect(x, y + ph - 2, pw, 10);
  ctx.fillStyle = "#7a4820";
  ctx.fillRect(x + 2, y + ph, pw - 4, 7);

  // Platter mat (felt)
  ctx.save();
  ctx.shadowColor = "#00000050";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#1a1a28";
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Spinning vinyl record
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t);

  // Grooves (concentric rings)
  for (let r = 16; r > 7; r -= 2) {
    ctx.strokeStyle = r % 4 === 0 ? "#2a2a38" : "#222230";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label circle (center of record)
  const labelGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
  labelGrad.addColorStop(0, "#e04020");
  labelGrad.addColorStop(1, "#a02010");
  ctx.fillStyle = labelGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  // Tiny label lines
  ctx.strokeStyle = "#ff806080";
  ctx.lineWidth = 0.6;
  for (let li = 0; li < 3; li++) {
    ctx.beginPath();
    ctx.moveTo(-4, -3 + li * 2.5);
    ctx.lineTo(4, -3 + li * 2.5);
    ctx.stroke();
  }

  // Spindle hole
  ctx.fillStyle = "#0a0a18";
  ctx.beginPath();
  ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end vinyl rotation

  // Record shine overlay (static)
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.04 * Math.sin(tick * 0.06);
  const shineGrad = ctx.createRadialGradient(cx - 6, cy - 6, 1, cx, cy, 18);
  shineGrad.addColorStop(0, "#ffffff");
  shineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tonearm pivot point (top-right of platter)
  const pivotX = x + pw - 4,
    pivotY = y + 4;
  const armAngle = -0.52 + Math.sin(tick * 0.008) * 0.06; // subtle sway
  const armLen = 22;
  const armEndX = pivotX + Math.cos(armAngle) * armLen;
  const armEndY = pivotY + Math.sin(armAngle) * armLen;

  // Tonearm shadow
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX + 1, pivotY + 1);
  ctx.lineTo(armEndX + 1, armEndY + 1);
  ctx.stroke();
  ctx.restore();

  // Tonearm body
  ctx.strokeStyle = "#c0c0d0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(armEndX, armEndY);
  ctx.stroke();

  // Cartridge head (end of arm)
  ctx.fillStyle = "#909090";
  ctx.fillRect(armEndX - 3, armEndY - 1, 5, 3);

  // Pivot dot
  ctx.fillStyle = "#a0a0b0";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0e0f0";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = "#a08060";
  ctx.font = "bold 4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("VINYL", cx, y + ph + 18);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Popcorn Machine (movie-style, animated kernels & glow) ─────────
export function drawPopcornMachine(ctx, x, y, tick) {
  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 52, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs
  ctx.fillStyle = "#7a0000";
  ctx.fillRect(x + 7, y + 46, 4, 7);
  ctx.fillRect(x + 24, y + 46, 4, 7);

  // Base tray
  ctx.fillStyle = "#c0c0c0";
  ctx.fillRect(x + 4, y + 42, 28, 5);
  ctx.fillStyle = "#909090";
  ctx.fillRect(x + 4, y + 45, 28, 2);

  // Body frame (red)
  ctx.fillStyle = "#cc1010";
  ctx.fillRect(x + 4, y + 8, 28, 35);

  // White vertical stripes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 9, y + 8, 6, 35);
  ctx.fillRect(x + 21, y + 8, 6, 35);

  // Glass window (dark backing)
  ctx.fillStyle = "#100800";
  ctx.fillRect(x + 6, y + 11, 24, 27);

  // Inner warm glow
  const glow = 0.28 + Math.sin(tick * 0.06) * 0.07;
  ctx.save();
  ctx.globalAlpha = glow;
  const ig = ctx.createRadialGradient(x + 18, y + 25, 0, x + 18, y + 25, 14);
  ig.addColorStop(0, "#ffe060");
  ig.addColorStop(0.5, "#ff8820");
  ig.addColorStop(1, "transparent");
  ctx.fillStyle = ig;
  ctx.fillRect(x + 6, y + 11, 24, 27);
  ctx.restore();

  // Animated popcorn kernels inside
  const pcols = ["#f8e840", "#f0c030", "#fff8d0", "#e8b820", "#ffe890"];
  for (let pi = 0; pi < 9; pi++) {
    const px2 = x + 9 + (pi % 3) * 7 + Math.sin(tick * 0.03 + pi * 1.3) * 1.2;
    const py2 =
      y + 19 + Math.floor(pi / 3) * 7 + Math.cos(tick * 0.04 + pi * 0.8) * 1;
    ctx.fillStyle = pcols[pi % pcols.length];
    ctx.beginPath();
    ctx.arc(px2 | 0, py2 | 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Extra fluffy bump
    ctx.beginPath();
    ctx.arc((px2 + 2) | 0, (py2 - 1) | 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glass left-edge reflection
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 7, y + 12, 3, 25);
  ctx.restore();

  // Top canopy (striped tent)
  ctx.fillStyle = "#cc1010";
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 10);
  ctx.lineTo(x + 35, y + 10);
  ctx.lineTo(x + 30, y + 2);
  ctx.lineTo(x + 6, y + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  // Stripe 1
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 10);
  ctx.lineTo(x + 13, y + 10);
  ctx.lineTo(x + 11, y + 2);
  ctx.lineTo(x + 6, y + 2);
  ctx.closePath();
  ctx.fill();
  // Stripe 2
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 10);
  ctx.lineTo(x + 26, y + 10);
  ctx.lineTo(x + 24, y + 2);
  ctx.lineTo(x + 19, y + 2);
  ctx.closePath();
  ctx.fill();

  // Gold finial
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(x + 16, y - 5, 4, 7);
  ctx.beginPath();
  ctx.arc(x + 18, y - 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffee88";
  ctx.beginPath();
  ctx.arc(x + 17, y - 6, 2, 0, Math.PI * 2);
  ctx.fill();

  // POPCORN label on base
  ctx.save();
  ctx.fillStyle = "#cc1010";
  ctx.font = "bold 4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("POP!", x + 18, y + 40);
  ctx.restore();

  // Animated popcorn bits floating up (2 staggered streams)
  for (let si = 0; si < 2; si++) {
    const st = (tick * 0.9 + si * 12) % 22;
    if (st < 9) {
      const alpha = 0.7 - st * 0.07;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = si === 0 ? "#f8e840" : "#fff8d0";
      const bx = x + 12 + si * 10 + Math.sin(tick * 0.12 + si * 2) * 2;
      ctx.beginPath();
      ctx.arc(bx, y - 3 - st * 0.9, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── Photo Booth (curtained kiosk, animated flash & iris) ─────────
export function drawPhotoBooth(ctx, x, y, tick) {
  ctx.save();
  const bW = T * 1.5, // booth width  (~48px)
    bH = T * 2.5; // booth height (~80px)
  const cx = x + bW / 2;

  // ── Drop shadow ──────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, y + bH + 4, bW / 2 - 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Booth body (dark frame) ──────────────────────────────────────
  fillR(ctx, x, y, bW, bH, "#1a1a2a");
  fillR(ctx, x + 2, y + 2, bW - 4, bH - 4, "#22223a");

  // ── Top marquee sign ─────────────────────────────────────────────
  const signH = 14;
  fillR(ctx, x + 1, y + 1, bW - 2, signH, "#8b0000");
  fillR(ctx, x + 2, y + 2, bW - 4, signH - 2, "#aa1010");
  // Tiny pixel border dots on sign
  for (let di = 0; di < 5; di++) {
    const dotX = x + 4 + di * 8;
    const flashDot = Math.sin(tick * 0.12 + di * 1.2) > 0.3;
    fillR(ctx, dotX, y + 2, 3, 3, flashDot ? "#ffe840" : "#884400");
  }
  // PHOTO label text
  ctx.save();
  ctx.fillStyle = "#ffe840";
  ctx.font = "bold 5px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PHOTO", cx, y + 11);
  ctx.textAlign = "left";
  ctx.restore();

  // ── Camera section (upper half of booth interior) ─────────────────
  const camSectionY = y + signH + 2;
  const camSectionH = bH * 0.42;
  fillR(ctx, x + 3, camSectionY, bW - 6, camSectionH, "#16162a");

  // Flash bulb (top-right corner of camera section)
  const flashPulse = 0.5 + 0.5 * Math.sin(tick * 0.07);
  const isFlashing = Math.sin(tick * 0.04) > 0.85;
  ctx.save();
  ctx.globalAlpha = isFlashing ? 0.95 : 0.35 + flashPulse * 0.35;
  ctx.shadowColor = "#ffffc0";
  ctx.shadowBlur = isFlashing ? 18 : 8;
  ctx.fillStyle = isFlashing ? "#ffffff" : "#e8e060";
  ctx.beginPath();
  ctx.arc(x + bW - 11, camSectionY + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Flash bulb ring
  ctx.strokeStyle = "#c0c040";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + bW - 11, camSectionY + 8, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Camera lens (center of camera section, circular with iris)
  const lensX = x + 16,
    lensY = camSectionY + camSectionH / 2;
  const lensR = 9;
  // Iris breathing animation
  const irisBreath = 0.5 + 0.5 * Math.sin(tick * 0.035);
  const irisR = 4 + irisBreath * 2;

  // Outer lens barrel
  ctx.save();
  ctx.shadowColor = "#00000080";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#303040";
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensR + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Lens glass (dark blue-grey)
  ctx.fillStyle = "#1a2030";
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
  ctx.fill();
  // Iris petals (6 blades)
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (let ip = 0; ip < 6; ip++) {
    const ang = (ip / 6) * Math.PI * 2 + tick * 0.008;
    ctx.fillStyle = "#2a3050";
    ctx.beginPath();
    ctx.ellipse(
      lensX + Math.cos(ang) * (irisR * 0.55),
      lensY + Math.sin(ang) * (irisR * 0.55),
      irisR * 0.5,
      irisR * 0.28,
      ang,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
  // Inner lens (bright pupil)
  const pupilR = lensR - irisR * 0.7;
  ctx.fillStyle = "#0a0a18";
  ctx.beginPath();
  ctx.arc(lensX, lensY, Math.max(pupilR, 1.5), 0, Math.PI * 2);
  ctx.fill();
  // Lens highlight
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#c0d8ff";
  ctx.beginPath();
  ctx.ellipse(lensX - 3, lensY - 3, 3, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Curtain section (lower half of booth) ─────────────────────────
  const curtainY = y + signH + 2 + camSectionH + 2;
  const curtainH = bH - signH - camSectionH - 8;
  // Dark curtain base
  fillR(ctx, x + 3, curtainY, bW - 6, curtainH, "#3a0a0a");
  // Alternating stripe panels (5 stripes)
  const stripeW = Math.floor((bW - 6) / 5);
  for (let si = 0; si < 5; si++) {
    if (si % 2 === 0) {
      fillR(ctx, x + 3 + si * stripeW, curtainY, stripeW, curtainH, "#5a1010");
    }
  }
  // Tie-back rope (horizontal line at 60% down curtain)
  const tieY = curtainY + curtainH * 0.55;
  ctx.strokeStyle = "#c8a050";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, tieY);
  ctx.lineTo(x + bW - 3, tieY);
  ctx.stroke();
  // Tie-back knot at center
  fillR(ctx, cx - 3, tieY - 3, 6, 6, "#c8a050");
  fillR(ctx, cx - 2, tieY - 4, 4, 8, "#e0b860");

  // Curtain fold highlights (scalloped top edge)
  ctx.fillStyle = "#7a2020";
  for (let fi = 0; fi < 4; fi++) {
    const foldX = x + 3 + fi * stripeW + stripeW / 2;
    ctx.beginPath();
    ctx.arc(foldX, curtainY, stripeW / 2, Math.PI, 0);
    ctx.fill();
  }

  // ── Film strip emerging from right side ──────────────────────────
  const filmX = x + bW - 1;
  const filmY = y + signH + 8;
  const filmW = 10,
    filmH = 32;
  // Film strip base (dark)
  fillR(ctx, filmX, filmY, filmW, filmH, "#1a1a18");
  fillR(ctx, filmX + 1, filmY + 1, filmW - 2, filmH - 2, "#282820");
  // Sprocket holes (left edge of strip)
  for (let sp = 0; sp < 4; sp++) {
    fillR(ctx, filmX + 1, filmY + 3 + sp * 7, 2, 4, "#1a1a18");
  }
  // 3 mini photo frames on strip
  const photoColors = ["#4060a0", "#806030", "#407050"];
  for (let ph = 0; ph < 3; ph++) {
    const pfY = filmY + 2 + ph * 10;
    // Photo frame
    fillR(ctx, filmX + 4, pfY, filmW - 5, 8, "#0a0a0a");
    // Tiny photo content (solid color block with lighter center)
    fillR(ctx, filmX + 5, pfY + 1, filmW - 7, 6, photoColors[ph]);
    fillR(ctx, filmX + 6, pfY + 2, filmW - 10, 4, photoColors[ph] + "cc");
  }

  // ── Outer frame trim ─────────────────────────────────────────────
  ctx.strokeStyle = "#404058";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, bW - 1.5, bH - 1.5);

  // ── Label under booth ─────────────────────────────────────────────
  ctx.fillStyle = "#aa8080";
  ctx.font = "4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("BOOTH", cx, y + bH + 14);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Retro Telephone ──────────────────────────────────────────────
export function drawRetroTelephone(ctx, x, y, tick) {
  ctx.save();

  const bw = 28,
    bh = 18;
  // Body — dark gray rounded base
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.roundRect(x, y + 8, bw, bh, 3);
  ctx.fill();
  // Body highlight
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 9, bw - 4, 4, 2);
  ctx.fill();

  // Dial — circular with number dots, slight rotation animation
  const dialAngle = Math.sin(tick * 0.04) * 0.08;
  const dialCx = x + bw / 2 + 2;
  const dialCy = y + 17;
  ctx.save();
  ctx.translate(dialCx, dialCy);
  ctx.rotate(dialAngle);
  // Dial outer ring
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.stroke();
  // Dial center
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // Number holes around dial
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const hx = Math.cos(ang) * 4.5;
    const hy = Math.sin(ang) * 4.5;
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(hx, hy, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Handset — curved piece in cradle with wobble
  const wobble = Math.sin(tick * 0.05) * 1.5;
  ctx.fillStyle = "#1e1e1e";
  ctx.save();
  ctx.translate(x + 4, y + 8 + wobble);
  // Left ear piece
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Handset bar
  ctx.strokeStyle = "#1e1e1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.quadraticCurveTo(10, -3, 18, 1);
  ctx.stroke();
  // Right ear piece
  ctx.beginPath();
  ctx.ellipse(20, 0, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cord — curly line on left side
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  for (let ci = 0; ci < 4; ci++) {
    const cx2 = x - 2;
    const csy = y + 14 + ci * 3;
    ctx.beginPath();
    ctx.arc(
      cx2 - (ci % 2 === 0 ? 2 : 0),
      csy,
      1.5,
      0,
      Math.PI * (ci % 2 === 0 ? 1 : -1),
    );
    ctx.stroke();
  }

  // Ring indicator — flashes when (tick >> 6) % 8 === 0
  if ((tick >> 6) % 8 === 0) {
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.3);
    ctx.fillStyle = `rgba(255,${(80 + pulse * 100) | 0},0,${0.7 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(x + bw - 5, y + 11, 3, 0, Math.PI * 2);
    ctx.fill();
    // Outer ring glow
    ctx.strokeStyle = `rgba(255,200,0,${pulse * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + bw - 5, y + 11, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label below
  ctx.fillStyle = "#606060";
  ctx.font = "4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PHONE", x + bw / 2, y + bh + 20);
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Trophy Cabinet ────────────────────────────────────────────────
export function drawTrophyCabinet(ctx, x, y, tick) {
  ctx.save();

  const cw = 44,
    ch = 52;

  // Cabinet body — dark walnut wood
  ctx.fillStyle = "#4a2c0a";
  ctx.fillRect(x | 0, (y + 4) | 0, cw, ch);

  // Wood grain highlight
  ctx.fillStyle = "#5a3614";
  for (let gi = 0; gi < 3; gi++) {
    ctx.fillRect((x + 4 + gi * 14) | 0, (y + 8) | 0, 2, ch - 8);
  }

  // Glass door panel
  ctx.fillStyle = "rgba(160,200,255,0.18)";
  ctx.fillRect((x + 4) | 0, (y + 8) | 0, cw - 8, ch - 12);
  // Glass shine
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect((x + 5) | 0, (y + 9) | 0, 6, ch - 14);

  // Door frame
  ctx.strokeStyle = "#6b3a10";
  ctx.lineWidth = 2;
  ctx.strokeRect((x + 4) | 0, (y + 8) | 0, cw - 8, ch - 12);

  // Cabinet top
  ctx.fillStyle = "#3a1e06";
  ctx.fillRect((x - 2) | 0, (y + 2) | 0, cw + 4, 5);
  // Cabinet base
  ctx.fillStyle = "#3a1e06";
  ctx.fillRect((x - 2) | 0, (y + ch) | 0, cw + 4, 5);

  // ── Shelf lines ────────────────────────────────────────────────
  ctx.fillStyle = "#6b3a10";
  ctx.fillRect((x + 4) | 0, (y + 26) | 0, cw - 8, 2);
  ctx.fillRect((x + 4) | 0, (y + 44) | 0, cw - 8, 2);

  // ── Trophies ──────────────────────────────────────────────────
  // Gold trophy (top shelf, center)
  const goldX = x + cw / 2;
  const goldY = y + 20;
  const goldBob = Math.sin(tick * 0.06) * 1.5;
  _drawTrophy(ctx, goldX, goldY + goldBob, "#ffd700", "#e6a000", tick, 0);

  // Silver trophy (middle shelf, left)
  const silverX = x + 14;
  const silverY = y + 38;
  const silverBob = Math.sin(tick * 0.06 + 1.2) * 1.2;
  _drawTrophy(ctx, silverX, silverY + silverBob, "#c0c0c0", "#909090", tick, 1);

  // Bronze trophy (middle shelf, right)
  const bronzeX = x + 30;
  const bronzeY = y + 38;
  const bronzeBob = Math.sin(tick * 0.06 + 2.4) * 1.2;
  _drawTrophy(ctx, bronzeX, bronzeY + bronzeBob, "#cd7f32", "#9e5a0a", tick, 2);

  // ── Sparkles on trophies (animated) ───────────────────────────
  const sparkPhase = (tick * 0.08) % (Math.PI * 2);
  const sparkles = [
    { bx: goldX - 4, by: goldY - 12 },
    { bx: goldX + 4, by: goldY - 8 },
    { bx: silverX - 3, by: silverY - 10 },
    { bx: bronzeX + 2, by: bronzeY - 9 },
  ];
  for (let si = 0; si < sparkles.length; si++) {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(sparkPhase + si * 1.1));
    const sz = 1.5 + Math.abs(Math.sin(sparkPhase + si * 0.8)) * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffa0";
    ctx.translate(sparkles[si].bx, sparkles[si].by - goldBob * 0.5);
    // 4-point star
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(sz * 0.3, -sz * 0.3);
    ctx.lineTo(sz, 0);
    ctx.lineTo(sz * 0.3, sz * 0.3);
    ctx.lineTo(0, sz);
    ctx.lineTo(-sz * 0.3, sz * 0.3);
    ctx.lineTo(-sz, 0);
    ctx.lineTo(-sz * 0.3, -sz * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Door handle
  ctx.fillStyle = "#c8a040";
  ctx.beginPath();
  ctx.arc((x + cw / 2) | 0, (y + 28) | 0, 2, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = "#c8a040";
  ctx.font = "4px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("TROPHIES", x + cw / 2, y + ch + 16);
  ctx.textAlign = "left";

  ctx.restore();
}

export function drawSlotMachine(ctx, x, y, tick) {
  const tw = T * 1.2;
  const th = T * 2;
  ctx.save();

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + tw / 2, y + th + 3, tw * 0.45, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cabinet body
  ctx.fillStyle = "#1a0a2e";
  ctx.beginPath();
  ctx.roundRect(x, y, tw, th, 4);
  ctx.fill();

  // Top trim
  ctx.fillStyle = "#2a0a4e";
  ctx.fillRect((x + 2) | 0, (y + 2) | 0, (tw - 4) | 0, 6);

  // "SLOTS" label
  ctx.fillStyle = "#ffee44";
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("SLOTS", (x + tw / 2) | 0, (y + 8) | 0);
  ctx.textAlign = "left";

  // Side light dots (blinking)
  const litCols = ["#ff4488", "#44ffaa", "#ffaa22", "#44aaff"];
  for (let li = 0; li < 4; li++) {
    const ly = y + 14 + li * 7;
    const blink = (tick + li * 7) % 20 < 10;
    ctx.fillStyle = blink ? litCols[li % litCols.length] : "#330033";
    ctx.beginPath();
    ctx.arc((x + 3) | 0, ly | 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc((x + tw - 3) | 0, ly | 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Three symbol windows
  const symbols = ["7", "★", "♥", "♦", "BAR"];
  const winW = 12;
  const winH = 14;
  const winY = y + 14;
  const totalWinW = 3 * winW + 2 * 3; // 3 windows + 2 gaps of 3px
  const winStartX = x + (tw - totalWinW) / 2;
  for (let wi = 0; wi < 3; wi++) {
    const wx = winStartX + wi * (winW + 3);
    // Window background
    ctx.fillStyle = "#000011";
    ctx.fillRect(wx | 0, winY | 0, winW, winH);
    // White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(wx | 0, winY | 0, winW, winH);
    // Symbol
    const symIdx = Math.floor((tick * 0.05 + wi) % 5);
    const sym = symbols[symIdx];
    const symCols = ["#ff4444", "#ffee44", "#ff4488", "#ff4488", "#aaffaa"];
    ctx.fillStyle = symCols[symIdx];
    ctx.font = sym === "BAR" ? "4px 'Press Start 2P', monospace" : "8px serif";
    ctx.textAlign = "center";
    ctx.fillText(sym, (wx + winW / 2) | 0, (winY + winH - 3) | 0);
    ctx.textAlign = "left";
  }

  // Coin tray at bottom
  ctx.fillStyle = "#2a0a4e";
  ctx.fillRect((x + 4) | 0, (y + th - 8) | 0, (tw - 8) | 0, 6);
  ctx.strokeStyle = "#6644aa";
  ctx.lineWidth = 1;
  ctx.strokeRect((x + 4) | 0, (y + th - 8) | 0, (tw - 8) | 0, 6);

  // Handle on right side
  const hx = x + tw;
  const hy = y + th * 0.45;
  // Stick
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + 5, hy + 8);
  ctx.stroke();
  // Red knob
  ctx.fillStyle = "#dd2222";
  ctx.beginPath();
  ctx.arc((hx + 5) | 0, (hy + 9) | 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff6644";
  ctx.beginPath();
  ctx.arc((hx + 4) | 0, (hy + 8) | 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _drawTrophy(ctx, cx, cy, colorTop, colorBase, tick, idx) {
  // Cup
  ctx.fillStyle = colorTop;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx + 4, cy - 10);
  ctx.lineTo(cx - 4, cy - 10);
  ctx.closePath();
  ctx.fill();
  // Cup shine
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect((cx - 3) | 0, (cy - 9) | 0, 2, 6);
  // Handles
  ctx.strokeStyle = colorTop;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 5, 3, 0.5 * Math.PI, 1.5 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 5, 3, -0.5 * Math.PI, 0.5 * Math.PI);
  ctx.stroke();
  // Stem
  ctx.fillStyle = colorBase;
  ctx.fillRect((cx - 2) | 0, cy | 0, 4, 4);
  // Base
  ctx.fillStyle = colorBase;
  ctx.fillRect((cx - 5) | 0, (cy + 4) | 0, 10, 3);
  // Star on cup
  ctx.fillStyle = "#ffffc0";
  ctx.font = "5px serif";
  ctx.textAlign = "center";
  ctx.fillText("★", cx, cy - 3);
  ctx.textAlign = "left";
}

// ── Water Cooler (break room hydration) ─────────────────────────
export function drawWaterCooler(ctx, x, y, tick) {
  const tw = T * 0.9;
  const th = T * 1.6;
  const cx = x + tw / 2;

  ctx.save();

  // Base / cabinet — light gray
  ctx.fillStyle = "#c0c0c0";
  ctx.fillRect(x | 0, (y + th * 0.45) | 0, tw | 0, (th * 0.55) | 0);

  // Cabinet highlight
  ctx.fillStyle = "#d8d8d8";
  ctx.fillRect((x + 2) | 0, (y + th * 0.45 + 2) | 0, (tw - 4) | 0, 4);

  // Water bottle on top — inverted trapezoid, light blue
  ctx.fillStyle = "#a0d8ef";
  ctx.beginPath();
  ctx.moveTo((x + tw * 0.15) | 0, (y + th * 0.45) | 0);
  ctx.lineTo((x + tw * 0.85) | 0, (y + th * 0.45) | 0);
  ctx.lineTo((x + tw * 0.7) | 0, y | 0);
  ctx.lineTo((x + tw * 0.3) | 0, y | 0);
  ctx.closePath();
  ctx.fill();

  // Water level inside bottle — animated subtle wave
  const waveOffset = Math.sin(tick * 0.04) * 2;
  const waterTop = y + th * 0.12 + waveOffset;
  ctx.fillStyle = "#70b8df";
  ctx.beginPath();
  ctx.moveTo((x + tw * 0.3) | 0, y | 0);
  ctx.lineTo((x + tw * 0.7) | 0, y | 0);
  ctx.lineTo((x + tw * 0.68) | 0, waterTop | 0);
  ctx.lineTo((x + tw * 0.32) | 0, waterTop | 0);
  ctx.closePath();
  ctx.fill();

  // Bottle shine
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(
    (x + tw * 0.35) | 0,
    (y + 3) | 0,
    (tw * 0.1) | 0,
    (th * 0.28) | 0,
  );

  // Bottle outline
  ctx.strokeStyle = "#80b8cf";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo((x + tw * 0.15) | 0, (y + th * 0.45) | 0);
  ctx.lineTo((x + tw * 0.85) | 0, (y + th * 0.45) | 0);
  ctx.lineTo((x + tw * 0.7) | 0, y | 0);
  ctx.lineTo((x + tw * 0.3) | 0, y | 0);
  ctx.closePath();
  ctx.stroke();

  // Dispenser nozzle area
  ctx.fillStyle = "#a8a8a8";
  ctx.fillRect((x + tw * 0.3) | 0, (y + th * 0.62) | 0, (tw * 0.4) | 0, 8);

  // Blue tap button (cold)
  ctx.fillStyle = "#3399ff";
  ctx.beginPath();
  ctx.arc((cx - 5) | 0, (y + th * 0.72) | 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Red tap button (hot)
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc((cx + 5) | 0, (y + th * 0.72) | 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Button highlights
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc((cx - 6) | 0, (y + th * 0.72 - 1) | 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc((cx + 4) | 0, (y + th * 0.72 - 1) | 0, 2, 0, Math.PI * 2);
  ctx.fill();

  // Drip animation
  if (Math.sin(tick * 0.3) > 0.9) {
    const dropProgress = (Math.sin(tick * 0.3) - 0.9) / 0.1;
    const dropY = y + th * 0.76 + dropProgress * 8;
    ctx.fillStyle = "#a0d8ef";
    ctx.beginPath();
    ctx.ellipse(cx | 0, dropY | 0, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cup holder at bottom — small gray rectangle
  ctx.fillStyle = "#888888";
  ctx.fillRect((x + tw * 0.2) | 0, (y + th * 0.88) | 0, (tw * 0.6) | 0, 4);
  ctx.fillStyle = "#999999";
  ctx.fillRect(
    (x + tw * 0.22) | 0,
    (y + th * 0.88 + 1) | 0,
    (tw * 0.56) | 0,
    2,
  );

  // Shadow under base
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect((x + 2) | 0, (y + th) | 0, (tw - 4) | 0, 3);

  ctx.restore();
}

// ── Disco Ball (hangs from ceiling, party trigger) ───────────────
export function drawDiscoBall(ctx, x, y, tick) {
  const r = T * 0.65;
  const cx = (x + T * 0.75) | 0;
  const cy = (y + r + 4) | 0;

  ctx.save();

  // Hanging wire / string
  ctx.strokeStyle = "#606070";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, cy - r);
  ctx.stroke();

  // Shadow on floor
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r + 2, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ball base — dark sphere
  const bg = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.3,
    r * 0.05,
    cx,
    cy,
    r,
  );
  bg.addColorStop(0, "#888898");
  bg.addColorStop(1, "#1a1a2a");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Mirror tiles — 5×5 grid mapped onto sphere surface
  const tileColors = [
    "#ffffff",
    "#d0d8ff",
    "#ffd0e8",
    "#d0ffe8",
    "#fff0d0",
    "#c0c8f0",
    "#f0c0d8",
    "#c0f0d8",
    "#f0e8c0",
    "#e8d0f0",
  ];
  const rows = 5,
    cols = 6;
  const spinAngle = tick * 0.03;

  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      const phi = (ri / rows) * Math.PI; // 0→π (top to bottom)
      const theta = (ci / cols) * Math.PI * 2 + spinAngle;

      // 3D→2D projection (simple orthographic)
      const px = Math.sin(phi) * Math.cos(theta);
      const py = -Math.cos(phi);
      const pz = Math.sin(phi) * Math.sin(theta);

      // Only front-facing tiles
      if (pz < -0.1) continue;

      const tx2 = cx + px * r;
      const ty2 = cy + py * r;

      // Tile size shrinks toward poles
      const tileW = Math.max(2, (r * 0.38 * Math.sin(phi)) | 0);
      const tileH = Math.max(2, (r * 0.32) | 0);

      // Shimmer based on angle + tick
      const shimmer =
        0.3 + 0.7 * Math.max(0, Math.sin(theta - spinAngle * 2 + ri));
      ctx.globalAlpha = shimmer * (0.5 + pz * 0.5);
      ctx.fillStyle = tileColors[(ri * cols + ci) % tileColors.length];
      ctx.fillRect((tx2 - tileW / 2) | 0, (ty2 - tileH / 2) | 0, tileW, tileH);
    }
  }

  ctx.globalAlpha = 1;

  // Bright specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc((cx - r * 0.3) | 0, (cy - r * 0.35) | 0, r * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Tiny secondary sparkle
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc((cx + r * 0.25) | 0, (cy - r * 0.5) | 0, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#c090ff";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("DISCO", cx, cy + r + 10);
  ctx.textAlign = "left";

  ctx.restore();
}
