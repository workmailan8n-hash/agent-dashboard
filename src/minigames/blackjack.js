// ════════════════════════════════════════════════════════════════
//  BLACKJACK (21) MINIGAME — burgundy felt, curved dealer arc
//  Visually distinct from poker (green felt). Dealer hits soft 17.
// ════════════════════════════════════════════════════════════════

import { makeDeck, shuffle, dealOne, drawCard, drawCardBack } from './_card_helpers.js';

const START_CHIPS = 100;
const BET = 10;

// Returns {total, soft}
function handTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      total += 11;
      aces++;
    } else if (c.rank === 'K' || c.rank === 'Q' || c.rank === 'J') {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

export function launchBlackjackGame() {
  let chips = START_CHIPS;
  let deck = shuffle(makeDeck());
  let playerHand = [];
  let dealerHand = [];
  let currentBet = 0;
  let phase = 'bet'; // bet | player | dealer | resolved
  let message = 'PRESS DEAL TO START';
  let messageCol = '#ffd090';
  let rafId = null;
  let tick = 0;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(15,5,8,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement('div');
  title.style.cssText =
    'color:#ffd090;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #ffb060aa;letter-spacing:2px;';
  title.textContent = '🂡 BLACKJACK 21';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 480,
    GH = 320;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #60101a;border-radius:4px;display:block;image-rendering:pixelated;background:#3a0812;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#ffd090;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  overlay.appendChild(msgEl);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
  overlay.appendChild(btnRow);

  // Round "casino chip" styled buttons
  function mkChipBtn(label, bg, fg, border) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = [
      `background:radial-gradient(circle at 35% 30%, ${bg} 0%, ${bg} 60%, ${border} 100%)`,
      `color:${fg}`,
      `border:3px dashed ${border}`,
      `width:64px`,
      `height:64px`,
      `border-radius:50%`,
      `font-family:inherit`,
      `font-size:6px`,
      `cursor:pointer`,
      `letter-spacing:1px`,
      `text-shadow:1px 1px 0 rgba(0,0,0,0.4)`,
      `box-shadow:0 4px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)`,
    ].join(';');
    btnRow.appendChild(b);
    return b;
  }

  const dealBtn = mkChipBtn('DEAL\n10', '#1a8a3a', '#fff', '#0a5a22');
  const hitBtn = mkChipBtn('HIT', '#b01828', '#fff', '#600a14');
  const standBtn = mkChipBtn('STAND', '#1a4a9a', '#fff', '#0a2a60');
  const doubleBtn = mkChipBtn('DOUBLE', '#8a48b0', '#fff', '#4a186a');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ EXIT';
  closeBtn.style.cssText =
    'background:#2a1018;color:#f7768e;border:1px solid #f7768e50;padding:8px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;margin-left:6px;align-self:center;';
  btnRow.appendChild(closeBtn);

  const instr = document.createElement('div');
  instr.style.cssText = 'color:#ffd09050;font-size:5px;margin-top:10px;letter-spacing:1px;';
  instr.textContent = 'HIT / STAND / DOUBLE (FIRST TURN ONLY)  |  ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  // ── Layout ────────────────────────────────────────────────────
  const CARD_W = 48,
    CARD_H = 68;
  // Dealer arc: splay cards along top arc
  const DEALER_ARC_CX = GW / 2;
  const DEALER_ARC_CY = GH / 2 + 80; // center of arc is below; cards curve along top
  const DEALER_ARC_R = 220; // radius of dealer arc

  // Player cards fanned just above chip stack at bottom center
  const PLAYER_CX = GW / 2;
  const PLAYER_Y = GH - CARD_H - 70;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.blackjack || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function updateButtons() {
    const showActions = phase === 'player';
    dealBtn.style.display = phase === 'bet' || phase === 'resolved' ? '' : 'none';
    hitBtn.style.display = showActions ? '' : 'none';
    standBtn.style.display = showActions ? '' : 'none';
    doubleBtn.style.display =
      showActions && playerHand.length === 2 && chips >= currentBet ? '' : 'none';
  }

  // ── Game logic ────────────────────────────────────────────────
  function beginDeal() {
    if (chips < BET) {
      message = 'NOT ENOUGH CHIPS — EXIT TO CASH OUT';
      messageCol = '#f7768e';
      updateButtons();
      return;
    }
    deck = shuffle(makeDeck());
    playerHand = [dealOne(deck), dealOne(deck)];
    dealerHand = [dealOne(deck), dealOne(deck)];
    currentBet = BET;
    chips -= BET;
    phase = 'player';
    message = 'HIT, STAND, OR DOUBLE';
    messageCol = '#ffd090';

    const pt = handTotal(playerHand).total;
    if (pt === 21) {
      phase = 'dealer';
      playDealer(true);
    }
    updateButtons();
  }

  function doHit() {
    if (phase !== 'player') return;
    playerHand.push(dealOne(deck));
    const pt = handTotal(playerHand).total;
    if (pt > 21) {
      message = `BUST! ${pt}`;
      messageCol = '#f7768e';
      phase = 'resolved';
    } else if (pt === 21) {
      phase = 'dealer';
      playDealer(false);
    }
    updateButtons();
  }

  function doStand() {
    if (phase !== 'player') return;
    phase = 'dealer';
    playDealer(false);
  }

  function doDouble() {
    if (phase !== 'player' || playerHand.length !== 2) return;
    if (chips < currentBet) return;
    chips -= currentBet;
    currentBet *= 2;
    playerHand.push(dealOne(deck));
    const pt = handTotal(playerHand).total;
    if (pt > 21) {
      message = `BUST ON DOUBLE! ${pt}`;
      messageCol = '#f7768e';
      phase = 'resolved';
    } else {
      phase = 'dealer';
      playDealer(false);
    }
    updateButtons();
  }

  function playDealer(playerBlackjack) {
    const step = () => {
      const h = handTotal(dealerHand);
      if (h.total < 17 || (h.total === 17 && h.soft)) {
        dealerHand.push(dealOne(deck));
        setTimeout(step, 500);
      } else {
        resolve(playerBlackjack);
      }
    };
    setTimeout(step, 500);
  }

  function resolve(playerBlackjack) {
    const pt = handTotal(playerHand).total;
    const dt = handTotal(dealerHand).total;
    let payout = 0;
    if (pt > 21) {
      message = `BUST — DEALER ${dt}`;
      messageCol = '#f7768e';
    } else if (playerBlackjack && dt !== 21) {
      payout = Math.floor(currentBet * 2.5);
      message = `BLACKJACK! +${payout - currentBet}`;
      messageCol = '#9ece6a';
    } else if (dt > 21) {
      payout = currentBet * 2;
      message = `DEALER BUSTS (${dt}) — YOU WIN +${payout - currentBet}`;
      messageCol = '#9ece6a';
    } else if (pt > dt) {
      payout = currentBet * 2;
      message = `YOU WIN ${pt} VS ${dt} (+${payout - currentBet})`;
      messageCol = '#9ece6a';
    } else if (pt < dt) {
      message = `DEALER WINS ${dt} VS ${pt}`;
      messageCol = '#f7768e';
    } else {
      payout = currentBet;
      message = `PUSH ${pt} — BET RETURNED`;
      messageCol = '#ffd090';
    }
    chips += payout;
    phase = 'resolved';
    updateButtons();
  }

  dealBtn.addEventListener('click', beginDeal);
  hitBtn.addEventListener('click', doHit);
  standBtn.addEventListener('click', doStand);
  doubleBtn.addEventListener('click', doDouble);

  // ── Render ────────────────────────────────────────────────────
  function render() {
    // Burgundy felt
    ctx.fillStyle = '#3a0812';
    ctx.fillRect(0, 0, GW, GH);
    // Felt texture (darker dots)
    ctx.fillStyle = '#4a0a18';
    for (let gy = 0; gy < GH; gy += 8) {
      for (let gx = (gy / 8) % 2 ? 4 : 0; gx < GW; gx += 8) {
        ctx.fillRect(gx, gy, 4, 4);
      }
    }

    // Curved dealer arc — darker crescent overlay at top
    ctx.save();
    ctx.fillStyle = '#2a0508';
    ctx.beginPath();
    ctx.ellipse(GW / 2, -20, GW * 0.6, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gold arc outline
    ctx.strokeStyle = '#e0af68';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(GW / 2, -20, GW * 0.6, 110, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Classic "Blackjack pays 3:2" curve text along the arc
    ctx.fillStyle = '#e0af68';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('DEALER  •  BLACKJACK PAYS 3:2  •  DEALER MUST HIT SOFT 17', GW / 2, 100);
    ctx.restore();

    // Outer border
    ctx.strokeStyle = '#60101a';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, GW - 8, GH - 8);

    // Dealer label
    ctx.fillStyle = '#ffd090';
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('DEALER', GW / 2, 10);

    // ── Dealer cards: splayed along top arc ──────────────────
    drawDealerArc();

    // Dealer total (top-right)
    if (dealerHand.length) {
      let dTotal;
      if (phase === 'player') {
        const first = dealerHand[0];
        const v =
          first.rank === 'A'
            ? 11
            : first.rank === 'K' || first.rank === 'Q' || first.rank === 'J'
              ? 10
              : parseInt(first.rank, 10);
        dTotal = v + ' + ?';
      } else {
        dTotal = handTotal(dealerHand).total;
      }
      ctx.fillStyle = '#ffd090';
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('DEALER: ' + dTotal, GW - 16, 10);
    }

    // ── Player: chip stacks on sides + fanned cards ──────────
    drawChipStacks();
    drawPlayerFan();

    // Player label + total
    ctx.fillStyle = '#ffd090';
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('YOU', GW / 2, GH - 44);
    if (playerHand.length) {
      const pt = handTotal(playerHand);
      ctx.fillStyle = pt.total > 21 ? '#f7768e' : '#ffee88';
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL: ' + pt.total, 16, GH - 44);
    }

    // Chips readout (bottom bar)
    ctx.fillStyle = '#1a0308';
    ctx.fillRect(8, GH - 24, GW - 16, 18);
    ctx.fillStyle = chips >= BET ? '#9ece6a' : '#f7768e';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHIPS: ' + chips, 16, GH - 15);
    ctx.fillStyle = '#ffd090';
    ctx.fillText('BET: ' + currentBet, 130, GH - 15);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 16, GH - 15);

    msgEl.textContent = message;
    msgEl.style.color = messageCol;

    tick++;
    rafId = requestAnimationFrame(render);
  }

  function drawDealerArc() {
    const n = dealerHand.length;
    if (n === 0) return;
    // Arrange cards along top arc (angle range in radians)
    const maxSpread = Math.PI * 0.18; // ~32°
    const spread = Math.min(maxSpread, (n - 1) * 0.06 + 0.08);
    const startA = -Math.PI / 2 - spread / 2;
    const stepA = n > 1 ? spread / (n - 1) : 0;
    for (let i = 0; i < n; i++) {
      const a = startA + i * stepA;
      const cardCx = DEALER_ARC_CX + Math.cos(a) * DEALER_ARC_R;
      const cardCy = DEALER_ARC_CY + Math.sin(a) * DEALER_ARC_R;
      const rot = a + Math.PI / 2; // card tangent to arc
      ctx.save();
      ctx.translate(cardCx, cardCy);
      ctx.rotate(rot);
      const x = -CARD_W / 2;
      const y = -CARD_H / 2;
      if (i === 1 && phase === 'player') {
        drawCardBack(ctx, x, y, { w: CARD_W, h: CARD_H });
      } else {
        drawCard(ctx, x, y, dealerHand[i], { w: CARD_W, h: CARD_H });
      }
      ctx.restore();
    }
  }

  function drawPlayerFan() {
    const n = playerHand.length;
    if (n === 0) return;
    const fanAngle = Math.PI * 0.05; // small fan
    const totalSpread = fanAngle * (n - 1);
    const startA = -totalSpread / 2;
    for (let i = 0; i < n; i++) {
      const a = startA + i * fanAngle;
      const offX = (i - (n - 1) / 2) * 28;
      ctx.save();
      ctx.translate(PLAYER_CX + offX, PLAYER_Y + CARD_H / 2);
      ctx.rotate(a);
      drawCard(ctx, -CARD_W / 2, -CARD_H / 2, playerHand[i], {
        w: CARD_W,
        h: CARD_H,
      });
      ctx.restore();
    }
  }

  function drawChipStacks() {
    // Left + right chip stacks; height = chips/10 discs, max 10
    const stackCount = Math.min(10, Math.max(0, Math.floor(chips / 10)));
    const colors = ['#b01828', '#1a4a9a', '#1a8a3a', '#8a48b0', '#e0af68'];
    // Left stack
    const lx = 36,
      ly = GH - 50;
    for (let i = 0; i < stackCount; i++) {
      const col = colors[i % colors.length];
      drawChip(lx, ly - i * 4, col);
    }
    // Right stack
    const rx = GW - 36,
      ry = GH - 50;
    for (let i = 0; i < stackCount; i++) {
      const col = colors[i % colors.length];
      drawChip(rx, ry - i * 4, col);
    }
    // Stack label
    ctx.fillStyle = '#ffd090';
    ctx.font = "5px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(chips + '', lx, ly - stackCount * 4 - 8);
    ctx.fillText(chips + '', rx, ry - stackCount * 4 - 8);
  }

  function drawChip(cx, cy, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 1, 2, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Close / cleanup ───────────────────────────────────────────
  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (chips > START_CHIPS && window.saveGameScore) {
      window.saveGameScore('blackjack', chips);
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (phase === 'player') {
      if (e.key === 'h' || e.key === 'H') doHit();
      else if (e.key === 's' || e.key === 'S') doStand();
      else if (e.key === 'd' || e.key === 'D') doDouble();
    } else if ((phase === 'bet' || phase === 'resolved') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      beginDeal();
    }
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  updateButtons();
  render();
}
