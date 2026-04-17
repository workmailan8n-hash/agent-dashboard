// ════════════════════════════════════════════════════════════════
//  ROULETTE MINIGAME — European 0..36 with ball physics + bet layout
//  Self-contained overlay.
// ════════════════════════════════════════════════════════════════

const START_CHIPS = 100;
const CHIP_UNIT = 5;

// European wheel order (0 green, alternating red/black)
const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function colorOf(n) {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

export function launchRouletteGame() {
  let chips = START_CHIPS;
  // bets map: key (e.g. "n_17", "red", "even") → staked chips
  const bets = {};
  let spinning = false;
  let wheelAngle = 0;
  let ballAngle = 0;
  let ballRadius = 0;
  let targetSlotAngle = 0;
  let spinStartTick = 0;
  let spinDurationTicks = 0;
  let resultNum = null;
  let message = 'PLACE BETS ON THE LAYOUT, THEN SPIN';
  let messageCol = '#e0af68';
  let rafId = null;
  let tick = 0;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:10px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '🎡 EUROPEAN ROULETTE';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 620,
    GH = 420;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;background:#071a10;cursor:pointer;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:8px;height:14px;letter-spacing:1px;';
  overlay.appendChild(msgEl);

  const ctrlRow = document.createElement('div');
  ctrlRow.style.cssText = 'display:flex;gap:10px;margin-top:6px;';
  overlay.appendChild(ctrlRow);

  function mkBtn(label, bg, fg) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `background:${bg};color:${fg};border:none;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;letter-spacing:1px;`;
    ctrlRow.appendChild(b);
    return b;
  }

  const spinBtn = mkBtn('▶ SPIN', '#e0af68', '#0a0a18');
  const clearBtn = mkBtn('↺ CLEAR BETS', '#3a3860', '#a9b1d6');
  const closeBtn = mkBtn('✕ EXIT', '#2a2848', '#f7768e');
  closeBtn.style.border = '1px solid #f7768e50';

  const instr = document.createElement('div');
  instr.style.cssText = 'color:#a9b1d630;font-size:5px;margin-top:6px;letter-spacing:1px;';
  instr.textContent =
    'LEFT-CLICK: +5 CHIPS  |  RIGHT-CLICK: REMOVE CHIPS  |  NUMBERS 35:1, OUTSIDE 1:1  |  ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  // ── Layout regions ────────────────────────────────────────────
  // Wheel on LEFT half, bet table on RIGHT half
  const WHEEL_CX = 140;
  const WHEEL_CY = 180;
  const R_OUT = 110;
  const R_BALL_ORBIT = R_OUT - 10;
  const R_IN = 58;

  // Bet table on right side
  const TABLE_X = 280;
  const TABLE_Y = 30;
  const CELL_W = 24;
  const CELL_H = 24;
  // 3 rows × 12 cols grid of numbers
  // Row 0: 3,6,9,12,...,36
  // Row 1: 2,5,8,...,35
  // Row 2: 1,4,7,...,34
  // 0 sits to the left of col 0 spanning rows 0..2

  function numberAt(col, row) {
    // row 0 top → 3,6,9,...; row 1 → 2,5,...; row 2 → 1,4,...
    return 2 - row + 1 + col * 3;
  }

  function cellRect(col, row) {
    return {
      x: TABLE_X + CELL_W + col * CELL_W,
      y: TABLE_Y + row * CELL_H,
      w: CELL_W,
      h: CELL_H,
    };
  }

  function zeroRect() {
    return {
      x: TABLE_X,
      y: TABLE_Y,
      w: CELL_W,
      h: CELL_H * 3,
    };
  }

  // Outside bets (below the grid)
  const OUT_Y = TABLE_Y + CELL_H * 3 + 8;
  const OUT_H = 22;
  const OUT_W = (12 * CELL_W) / 6; // 6 bets across grid width (48px each)
  const OUTSIDE_BETS = [
    { key: 'red', label: 'RED', bg: '#a01020', fg: '#fff' },
    { key: 'black', label: 'BLACK', bg: '#101018', fg: '#fff' },
    { key: 'even', label: 'EVEN', bg: '#1a2a4e', fg: '#8abbff' },
    { key: 'odd', label: 'ODD', bg: '#1a2a4e', fg: '#ffbb88' },
    { key: 'low', label: '1-18', bg: '#2a2848', fg: '#e0af68' },
    { key: 'high', label: '19-36', bg: '#2a2848', fg: '#e0af68' },
  ];

  function outsideRect(i) {
    return {
      x: TABLE_X + CELL_W + i * OUT_W,
      y: OUT_Y,
      w: OUT_W,
      h: OUT_H,
    };
  }

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.roulette || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function totalBet() {
    let t = 0;
    for (const k in bets) t += bets[k];
    return t;
  }

  // ── Bet handlers ─────────────────────────────────────────────
  function addChip(key, delta) {
    if (spinning) return;
    const current = bets[key] || 0;
    const next = current + delta;
    if (delta > 0 && chips < CHIP_UNIT) {
      message = 'NOT ENOUGH CHIPS';
      messageCol = '#f7768e';
      return;
    }
    if (next < 0) return;
    if (delta > 0) {
      chips -= CHIP_UNIT;
      bets[key] = next;
    } else {
      if (current <= 0) return;
      chips += CHIP_UNIT;
      bets[key] = next;
      if (bets[key] === 0) delete bets[key];
    }
    message = `BET: ${totalBet()} CHIPS ON ${Object.keys(bets).length} SPOT(S)`;
    messageCol = '#e0af68';
  }

  function clearAllBets() {
    if (spinning) return;
    for (const k in bets) chips += bets[k];
    for (const k in bets) delete bets[k];
    message = 'BETS CLEARED';
    messageCol = '#e0af68';
  }

  gc.addEventListener('contextmenu', (e) => e.preventDefault());

  gc.addEventListener('mousedown', (e) => {
    if (spinning) return;
    const r = gc.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * GW;
    const my = ((e.clientY - r.top) / r.height) * GH;
    const delta = e.button === 2 ? -CHIP_UNIT : CHIP_UNIT;

    // Zero
    const z = zeroRect();
    if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
      addChip('n_0', delta);
      return;
    }
    // Numbers grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        const cr = cellRect(col, row);
        if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
          const n = numberAt(col, row);
          addChip('n_' + n, delta);
          return;
        }
      }
    }
    // Outside bets
    for (let i = 0; i < OUTSIDE_BETS.length; i++) {
      const or = outsideRect(i);
      if (mx >= or.x && mx <= or.x + or.w && my >= or.y && my <= or.y + or.h) {
        addChip(OUTSIDE_BETS[i].key, delta);
        return;
      }
    }
  });

  // ── Spin ──────────────────────────────────────────────────────
  function doSpin() {
    if (spinning) return;
    if (totalBet() === 0) {
      message = 'PLACE AT LEAST ONE BET FIRST';
      messageCol = '#f7768e';
      return;
    }
    spinning = true;
    resultNum = WHEEL[Math.floor(Math.random() * WHEEL.length)];
    const idx = WHEEL.indexOf(resultNum);
    targetSlotAngle = (idx / WHEEL.length) * Math.PI * 2;

    spinStartTick = tick;
    spinDurationTicks = 210; // ~3.5s at 60fps
    ballRadius = R_BALL_ORBIT;
    message = 'SPINNING…';
    messageCol = '#e0af68';
    // Settle result after duration
    setTimeout(resolveSpin, (spinDurationTicks / 60) * 1000 + 80);
  }

  function resolveSpin() {
    spinning = false;
    const n = resultNum;
    const col = colorOf(n);
    let payout = 0;
    let totalStaked = totalBet();
    // Evaluate each bet
    for (const key in bets) {
      const stake = bets[key];
      if (key.startsWith('n_')) {
        const betNum = parseInt(key.slice(2), 10);
        if (betNum === n) payout += stake * 36; // 35:1 + stake back
      } else if (key === 'red') {
        if (col === 'red') payout += stake * 2;
      } else if (key === 'black') {
        if (col === 'black') payout += stake * 2;
      } else if (key === 'even') {
        if (n !== 0 && n % 2 === 0) payout += stake * 2;
      } else if (key === 'odd') {
        if (n !== 0 && n % 2 === 1) payout += stake * 2;
      } else if (key === 'low') {
        if (n >= 1 && n <= 18) payout += stake * 2;
      } else if (key === 'high') {
        if (n >= 19 && n <= 36) payout += stake * 2;
      }
    }
    chips += payout;
    const net = payout - totalStaked;
    if (net > 0) {
      message = `WIN! #${n} ${col.toUpperCase()} — NET +${net}`;
      messageCol = '#9ece6a';
    } else if (net === 0) {
      message = `PUSH — #${n} ${col.toUpperCase()}`;
      messageCol = '#e0af68';
    } else {
      message = `LOSS — #${n} ${col.toUpperCase()} (${net})`;
      messageCol = '#f7768e';
    }
    // Clear bets after resolve
    for (const k in bets) delete bets[k];
  }

  spinBtn.addEventListener('click', doSpin);
  clearBtn.addEventListener('click', clearAllBets);

  // ── Render ────────────────────────────────────────────────────
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function render() {
    ctx.fillStyle = '#071a10';
    ctx.fillRect(0, 0, GW, GH);

    // Spin physics update
    if (spinning) {
      const t = Math.min(1, (tick - spinStartTick) / spinDurationTicks);
      const eased = easeOutCubic(t);
      // Wheel rotates one direction (decelerating)
      const totalWheelSpin = Math.PI * 6; // 3 full turns
      const wheelProgress = eased * totalWheelSpin;
      // Land so resultNum slot is at the top pointer (-π/2):
      // wheelAngle_final + targetSlotAngle = -π/2 (mod 2π)
      const finalWheelAngle = -Math.PI / 2 - targetSlotAngle;
      wheelAngle = finalWheelAngle - (totalWheelSpin - wheelProgress);
      // Ball rotates opposite, faster, decelerates
      const totalBallSpin = Math.PI * 14; // 7 full turns opposite
      const ballProgress = eased * totalBallSpin;
      ballAngle = -Math.PI / 2 + (totalBallSpin - ballProgress);
      // Ball radius eases inward in last 30% toward the slot rim
      if (t > 0.7) {
        const inT = (t - 0.7) / 0.3;
        ballRadius = R_BALL_ORBIT - easeOutCubic(inT) * 6;
      } else {
        ballRadius = R_BALL_ORBIT;
      }
    } else if (resultNum !== null) {
      // Resting: snap wheel so result slot sits at top pointer, ball atop it
      const idx = WHEEL.indexOf(resultNum);
      const slotAng = (idx / WHEEL.length) * Math.PI * 2;
      wheelAngle = -Math.PI / 2 - slotAng;
      ballAngle = -Math.PI / 2;
      ballRadius = R_BALL_ORBIT - 6;
    } else {
      // Idle drift
      wheelAngle += 0.003;
    }

    // ── Wheel ────────────────────────────────────────────────
    // Wood outer rim
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(WHEEL_CX, WHEEL_CY, R_OUT + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wheel slices
    const N = WHEEL.length;
    for (let i = 0; i < N; i++) {
      const a0 = wheelAngle + (i / N) * Math.PI * 2;
      const a1 = wheelAngle + ((i + 1) / N) * Math.PI * 2;
      const num = WHEEL[i];
      const col = colorOf(num);
      ctx.beginPath();
      ctx.moveTo(WHEEL_CX, WHEEL_CY);
      ctx.arc(WHEEL_CX, WHEEL_CY, R_OUT, a0, a1);
      ctx.closePath();
      ctx.fillStyle = col === 'red' ? '#b01828' : col === 'black' ? '#0a0a12' : '#1a8a3a';
      ctx.fill();
      ctx.strokeStyle = '#e0af68';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Number
      const mid = (a0 + a1) / 2;
      const lx = WHEEL_CX + Math.cos(mid) * (R_OUT - 13);
      const ly = WHEEL_CY + Math.sin(mid) * (R_OUT - 13);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = "6px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), 0, 0);
      ctx.restore();
    }

    // Inner hub (doesn't rotate visually the same way — simple)
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(WHEEL_CX, WHEEL_CY, R_IN, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(WHEEL_CX, WHEEL_CY, R_IN - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0af68';
    ctx.beginPath();
    ctx.arc(WHEEL_CX, WHEEL_CY, 6, 0, Math.PI * 2);
    ctx.fill();
    // Spokes (rotate with wheel)
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2;
    for (let s = 0; s < 8; s++) {
      const a = wheelAngle + (s / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(WHEEL_CX, WHEEL_CY);
      ctx.lineTo(WHEEL_CX + Math.cos(a) * (R_IN - 4), WHEEL_CY + Math.sin(a) * (R_IN - 4));
      ctx.stroke();
    }

    // Pointer (top)
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    ctx.moveTo(WHEEL_CX, WHEEL_CY - R_OUT - 12);
    ctx.lineTo(WHEEL_CX - 6, WHEEL_CY - R_OUT - 2);
    ctx.lineTo(WHEEL_CX + 6, WHEEL_CY - R_OUT - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a08010';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ball
    const bx = WHEEL_CX + Math.cos(ballAngle) * ballRadius;
    const by = WHEEL_CY + Math.sin(ballAngle) * ballRadius;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── Bet table ────────────────────────────────────────────
    // Zero cell
    const z = zeroRect();
    ctx.fillStyle = '#1a8a3a';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = '#e0af68';
    ctx.lineWidth = 1;
    ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
    ctx.fillStyle = '#fff';
    ctx.font = "9px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', z.x + z.w / 2, z.y + z.h / 2);
    drawBetChips(bets['n_0'], z.x + z.w / 2, z.y + z.h / 2 + 10);

    // Number grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        const cr = cellRect(col, row);
        const n = numberAt(col, row);
        const c = colorOf(n);
        ctx.fillStyle = c === 'red' ? '#b01828' : '#0a0a12';
        ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
        ctx.strokeStyle = '#e0af68';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cr.x + 0.5, cr.y + 0.5, cr.w - 1, cr.h - 1);
        ctx.fillStyle = '#fff';
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), cr.x + cr.w / 2, cr.y + cr.h / 2 - 2);
        drawBetChips(bets['n_' + n], cr.x + cr.w / 2, cr.y + cr.h - 5);
      }
    }

    // Outside bets row
    for (let i = 0; i < OUTSIDE_BETS.length; i++) {
      const b = OUTSIDE_BETS[i];
      const or = outsideRect(i);
      ctx.fillStyle = b.bg;
      ctx.fillRect(or.x, or.y, or.w, or.h);
      ctx.strokeStyle = '#e0af68';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(or.x + 0.5, or.y + 0.5, or.w - 1, or.h - 1);
      ctx.fillStyle = b.fg;
      ctx.font = "6px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, or.x + or.w / 2, or.y + or.h / 2 - 2);
      drawBetChips(bets[b.key], or.x + or.w / 2, or.y + or.h - 5);
    }

    // Result banner (when settled)
    if (resultNum !== null && !spinning) {
      const rc = colorOf(resultNum);
      const rcCol = rc === 'red' ? '#b01828' : rc === 'black' ? '#101018' : '#1a8a3a';
      ctx.fillStyle = rcCol;
      ctx.fillRect(TABLE_X, OUT_Y + OUT_H + 10, 12 * CELL_W + CELL_W, 34);
      ctx.strokeStyle = '#e0af68';
      ctx.lineWidth = 2;
      ctx.strokeRect(TABLE_X + 0.5, OUT_Y + OUT_H + 10.5, 12 * CELL_W + CELL_W - 1, 33);
      ctx.fillStyle = '#fff';
      ctx.font = "16px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '#' + resultNum + ' ' + rc.toUpperCase(),
        TABLE_X + (12 * CELL_W + CELL_W) / 2,
        OUT_Y + OUT_H + 27
      );
    }

    // Chips + total-bet readout
    ctx.fillStyle = '#111122';
    ctx.fillRect(8, GH - 22, GW - 16, 16);
    ctx.fillStyle = chips >= CHIP_UNIT ? '#9ece6a' : '#f7768e';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHIPS: ' + chips, 16, GH - 14);
    ctx.fillStyle = '#e0af68';
    ctx.fillText('STAKED: ' + totalBet(), 130, GH - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 16, GH - 14);

    msgEl.textContent = message;
    msgEl.style.color = messageCol;

    tick++;
    rafId = requestAnimationFrame(render);
  }

  function drawBetChips(amount, cx, cy) {
    if (!amount) return;
    // Draw a small chip stack
    ctx.save();
    const stacks = Math.min(4, Math.ceil(amount / CHIP_UNIT));
    for (let i = 0; i < stacks; i++) {
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.ellipse(cx, cy - i * 2, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a08010';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    // Amount label
    ctx.fillStyle = '#000';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(amount), cx, cy - stacks * 2);
    ctx.restore();
  }

  // ── Close / cleanup ───────────────────────────────────────────
  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (chips > START_CHIPS && window.saveGameScore) {
      window.saveGameScore('roulette', chips);
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      doSpin();
    }
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  render();
}
