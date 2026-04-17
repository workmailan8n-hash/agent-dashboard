// ════════════════════════════════════════════════════════════════
//  POKER MINIGAME — Simplified Texas Hold'em vs. CPU
//  Self-contained overlay, no external deps beyond _card_helpers.
// ════════════════════════════════════════════════════════════════

import {
  makeDeck,
  shuffle,
  dealOne,
  drawCard,
  drawCardBack,
  evaluatePokerHand,
  comparePokerHands,
} from './_card_helpers.js';

const START_CHIPS = 100;
const ANTE = 10;
const BET = 10;

// Evaluate best 5-card hand out of 7 (hole + 5 community)
function bestOfSeven(cards) {
  let best = null;
  const n = cards.length;
  // All 5-card subsets from 7 cards (21 combos)
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const hand = [cards[a], cards[b], cards[c], cards[d], cards[e]];
            const ev = evaluatePokerHand(hand);
            if (!best || comparePokerHands(ev, best) > 0) best = ev;
          }
        }
      }
    }
  }
  return best;
}

// Quick preflop hand strength 0..1 based on 2 hole cards
function preflopStrength(hole) {
  const v1 = rankVal(hole[0].rank);
  const v2 = rankVal(hole[1].rank);
  const hi = Math.max(v1, v2);
  const lo = Math.min(v1, v2);
  const pair = v1 === v2;
  const suited = hole[0].suit === hole[1].suit;
  // Base from high card (0..1 where 14 -> 1)
  let s = (hi - 2) / 12;
  if (pair)
    s = 0.5 + (hi - 2) / 24; // pairs 0.5..1
  else {
    // Adjustments
    s += (lo - 2) / 36;
    if (suited) s += 0.08;
    const gap = hi - lo;
    if (gap === 1)
      s += 0.05; // connected
    else if (gap > 4) s -= 0.06;
  }
  return Math.max(0, Math.min(1, s));
}

function rankVal(r) {
  if (r === 'A') return 14;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  return parseInt(r, 10);
}

export function launchPokerGame() {
  let chips = START_CHIPS;
  let deck = shuffle(makeDeck());
  let playerHole = [];
  let cpuHole = [];
  let community = [];
  let pot = 0;
  let phase = 'bet'; // bet → preflop → flop → turn → river → showdown
  let cpuFolded = false;
  let playerFolded = false;
  // When set, player must respond to a CPU bet/raise:
  //   { toCall: <number>, afterAction: 'advance' | 'end' }
  // Only CALL and FOLD buttons are visible while this is active.
  let awaitingPlayerResponse = null;
  let message = 'PRESS DEAL TO START';
  let messageCol = '#e0af68';
  let rafId = null;
  let tick = 0;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = "🃏 TEXAS HOLD'EM";
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 520,
    GH = 320;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;cursor:default;background:#0a2a18;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  overlay.appendChild(msgEl);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
  overlay.appendChild(btnRow);

  function mkBtn(label, bg, fg) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `background:${bg};color:${fg};border:none;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;letter-spacing:1px;`;
    btnRow.appendChild(b);
    return b;
  }

  const dealBtn = mkBtn('▶ DEAL (10 ANTE)', '#e0af68', '#0a0a18');
  const checkBtn = mkBtn('✓ CHECK', '#9ece6a', '#0a0a18');
  const betBtn = mkBtn('$ BET 10', '#ffbb44', '#0a0a18');
  const callBtn = mkBtn('↳ CALL', '#7dcfff', '#0a0a18');
  const foldBtn = mkBtn('✕ FOLD', '#f7768e', '#0a0a18');
  const closeBtn = mkBtn('✕ EXIT', '#2a2848', '#f7768e');
  closeBtn.style.border = '1px solid #f7768e50';

  const instr = document.createElement('div');
  instr.style.cssText = 'color:#a9b1d630;font-size:5px;margin-top:8px;letter-spacing:1px;';
  instr.textContent = 'ANTE 10 → FLOP → TURN → RIVER → SHOWDOWN  |  ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  // ── Layout ────────────────────────────────────────────────────
  const CARD_W = 44,
    CARD_H = 62;
  const CARD_GAP = 8;

  // Community row: 5 cards centered
  const COMM_TOTAL = 5 * CARD_W + 4 * CARD_GAP;
  const COMM_X = (GW - COMM_TOTAL) / 2;
  const COMM_Y = (GH - CARD_H) / 2 - 4;

  // CPU hole cards: top center, 2 cards
  const HOLE_TOTAL = 2 * CARD_W + CARD_GAP;
  const CPU_X = (GW - HOLE_TOTAL) / 2;
  const CPU_Y = 30;

  // Player hole cards: bottom center
  const PLAYER_X = (GW - HOLE_TOTAL) / 2;
  const PLAYER_Y = GH - CARD_H - 44;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.poker || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function updateButtons() {
    const bettingPhase = phase === 'flop' || phase === 'turn' || phase === 'river';
    const responding = !!awaitingPlayerResponse;
    dealBtn.style.display = phase === 'bet' || phase === 'showdown' ? '' : 'none';
    // Main action buttons: only when in a betting phase AND not responding
    checkBtn.style.display = bettingPhase && !responding ? '' : 'none';
    betBtn.style.display = bettingPhase && !responding ? '' : 'none';
    // CALL button: only when responding to a CPU bet/raise
    callBtn.style.display = bettingPhase && responding ? '' : 'none';
    // FOLD available both in main turn and when responding
    foldBtn.style.display = bettingPhase ? '' : 'none';

    if (responding) {
      const toCall = awaitingPlayerResponse.toCall;
      callBtn.textContent = `↳ CALL ${toCall}`;
      if (chips < toCall) {
        callBtn.disabled = true;
        callBtn.style.opacity = '0.5';
      } else {
        callBtn.disabled = false;
        callBtn.style.opacity = '1';
      }
    }

    if (chips < ANTE && (phase === 'bet' || phase === 'showdown')) {
      dealBtn.disabled = true;
      dealBtn.style.opacity = '0.5';
    } else {
      dealBtn.disabled = false;
      dealBtn.style.opacity = '1';
    }
    if (chips < BET) {
      betBtn.disabled = true;
      betBtn.style.opacity = '0.5';
    } else {
      betBtn.disabled = false;
      betBtn.style.opacity = '1';
    }
  }

  // ── Game logic ────────────────────────────────────────────────
  function beginHand() {
    if (chips < ANTE) {
      message = 'NOT ENOUGH CHIPS — EXIT TO CASH OUT';
      messageCol = '#f7768e';
      updateButtons();
      return;
    }
    chips -= ANTE;
    pot = ANTE * 2; // player ante + implicit CPU ante
    deck = shuffle(makeDeck());
    playerHole = [dealOne(deck), dealOne(deck)];
    cpuHole = [dealOne(deck), dealOne(deck)];
    // Bias: ~70% of hands, CPU starts with stronger hole cards (house edge by cards)
    if (Math.random() < 0.7 && preflopStrength(playerHole) > preflopStrength(cpuHole)) {
      const tmp = playerHole;
      playerHole = cpuHole;
      cpuHole = tmp;
    }
    community = [];
    cpuFolded = false;
    playerFolded = false;
    // Deal flop immediately
    community.push(dealOne(deck), dealOne(deck), dealOne(deck));
    phase = 'flop';
    awaitingPlayerResponse = null;
    message = 'FLOP — CHECK, BET 10, OR FOLD';
    messageCol = '#e0af68';
    updateButtons();
  }

  function estimateCpuStrength() {
    let base;
    if (community.length === 0) base = preflopStrength(cpuHole);
    else {
      const cpuEval = bestOfSeven([...cpuHole, ...community]);
      // Map rank 0..9 to 0.3..0.95; use preflop as floor so premium pairs (AA/KK) never fold
      const rankBase = 0.3 + Math.min(0.65, (cpuEval.rank / 9) * 0.65);
      base = Math.max(rankBase, preflopStrength(cpuHole));
    }
    // ±0.12 noise for unpredictability
    return Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.24));
  }

  // Player opens with BET 10
  function playerBet() {
    if (chips < BET) return;
    if (awaitingPlayerResponse) return;
    chips -= BET;
    pot += BET;
    const str = estimateCpuStrength();
    if (str < 0.35) {
      // CPU folds
      chips += pot;
      const won = pot - ANTE;
      message = `CPU FOLDS — YOU WIN +${won}`;
      messageCol = '#9ece6a';
      phase = 'showdown';
      pot = 0;
      updateButtons();
      return;
    }
    if (str < 0.75) {
      // CPU calls
      pot += BET;
      message = `CPU CALLS 10`;
      messageCol = '#e0af68';
      advancePhase();
      return;
    }
    // CPU raises: matches 10 + raises 10; player must call 10 more or fold
    pot += BET * 2;
    awaitingPlayerResponse = { toCall: BET, afterAction: 'advance' };
    message = 'CPU RAISES +10 — CALL 10 OR FOLD';
    messageCol = '#ffbb44';
    updateButtons();
  }

  // Player opens with CHECK
  function playerCheck() {
    if (awaitingPlayerResponse) return;
    const str = estimateCpuStrength();
    if (str < 0.5) {
      // CPU checks back
      message = 'CPU CHECKS';
      messageCol = '#e0af68';
      advancePhase();
      return;
    }
    // CPU bets
    const cpuBet = str >= 0.8 ? BET * 2 : BET;
    pot += cpuBet;
    awaitingPlayerResponse = { toCall: cpuBet, afterAction: 'advance' };
    message = `CPU BETS ${cpuBet} — CALL ${cpuBet} OR FOLD`;
    messageCol = '#ffbb44';
    updateButtons();
  }

  // Player CALLs in response to a CPU bet/raise
  function playerCall() {
    if (!awaitingPlayerResponse) return;
    const toCall = awaitingPlayerResponse.toCall;
    if (chips < toCall) {
      // Edge case: not enough chips — treat as all-in call up to what we have
      const allIn = chips;
      chips = 0;
      pot += allIn;
    } else {
      chips -= toCall;
      pot += toCall;
    }
    const after = awaitingPlayerResponse.afterAction;
    awaitingPlayerResponse = null;
    message = `YOU CALL ${toCall}`;
    messageCol = '#9ece6a';
    if (after === 'advance') advancePhase();
    else updateButtons();
  }

  function playerFold() {
    playerFolded = true;
    awaitingPlayerResponse = null;
    message = `YOU FOLD — CPU WINS POT`;
    messageCol = '#f7768e';
    phase = 'showdown';
    pot = 0;
    updateButtons();
  }

  function advancePhase() {
    if (phase === 'flop') {
      community.push(dealOne(deck));
      phase = 'turn';
      message = 'TURN — CHECK, BET 10, OR FOLD';
      messageCol = '#e0af68';
    } else if (phase === 'turn') {
      community.push(dealOne(deck));
      phase = 'river';
      message = 'RIVER — CHECK, BET 10, OR FOLD';
      messageCol = '#e0af68';
    } else if (phase === 'river') {
      doShowdown();
    }
    updateButtons();
  }

  function doShowdown() {
    const pEval = bestOfSeven([...playerHole, ...community]);
    const cEval = bestOfSeven([...cpuHole, ...community]);
    const cmp = comparePokerHands(pEval, cEval);
    if (cmp > 0) {
      chips += pot;
      message = `YOU WIN! ${pEval.name.toUpperCase()} BEATS ${cEval.name.toUpperCase()} (+${pot - ANTE})`;
      messageCol = '#9ece6a';
    } else if (cmp < 0) {
      message = `CPU WINS — ${cEval.name.toUpperCase()} BEATS ${pEval.name.toUpperCase()}`;
      messageCol = '#f7768e';
    } else {
      chips += Math.floor(pot / 2);
      message = `SPLIT POT — ${pEval.name.toUpperCase()}`;
      messageCol = '#e0af68';
    }
    phase = 'showdown';
    pot = 0;
    dealBtn.textContent = '▶ NEW HAND (10 ANTE)';
  }

  dealBtn.addEventListener('click', () => {
    if (phase === 'bet' || phase === 'showdown') beginHand();
  });
  checkBtn.addEventListener('click', () => {
    if (phase === 'flop' || phase === 'turn' || phase === 'river') playerCheck();
  });
  betBtn.addEventListener('click', () => {
    if (phase === 'flop' || phase === 'turn' || phase === 'river') playerBet();
  });
  callBtn.addEventListener('click', () => {
    if (phase === 'flop' || phase === 'turn' || phase === 'river') playerCall();
  });
  foldBtn.addEventListener('click', () => {
    if (phase === 'flop' || phase === 'turn' || phase === 'river') playerFold();
  });

  // ── Render ────────────────────────────────────────────────────
  function render() {
    // Felt background (green)
    ctx.fillStyle = '#0a2a18';
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#0c3a22';
    for (let gy = 0; gy < GH; gy += 8) {
      for (let gx = (gy / 8) % 2 ? 4 : 0; gx < GW; gx += 8) {
        ctx.fillRect(gx, gy, 4, 4);
      }
    }
    // Oval table highlight
    ctx.save();
    ctx.fillStyle = '#0e4a2a';
    ctx.beginPath();
    ctx.ellipse(GW / 2, GH / 2, GW * 0.44, GH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Outer border
    ctx.strokeStyle = '#3a2a0a';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, GW - 8, GH - 8);

    // Labels
    ctx.fillStyle = '#e0af68';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CPU', GW / 2, CPU_Y - 10);
    ctx.fillText('YOU', GW / 2, PLAYER_Y - 10);

    // CPU hole cards
    const revealCpu = phase === 'showdown' && !playerFolded;
    for (let i = 0; i < cpuHole.length; i++) {
      const cx = CPU_X + i * (CARD_W + CARD_GAP);
      if (revealCpu) {
        drawCard(ctx, cx, CPU_Y, cpuHole[i], { w: CARD_W, h: CARD_H });
      } else {
        drawCardBack(ctx, cx, CPU_Y, { w: CARD_W, h: CARD_H });
      }
    }

    // Community cards row (5 slots; drawn as we go)
    for (let i = 0; i < 5; i++) {
      const cx = COMM_X + i * (CARD_W + CARD_GAP);
      if (community[i]) {
        drawCard(ctx, cx, COMM_Y, community[i], { w: CARD_W, h: CARD_H });
      } else {
        // Empty slot
        ctx.save();
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, COMM_Y + 0.5, CARD_W - 1, CARD_H - 1);
        ctx.restore();
      }
    }

    // Player hole cards
    for (let i = 0; i < playerHole.length; i++) {
      const cx = PLAYER_X + i * (CARD_W + CARD_GAP);
      drawCard(ctx, cx, PLAYER_Y, playerHole[i], { w: CARD_W, h: CARD_H });
    }

    // Pot counter — under community row
    if (pot > 0 || phase === 'showdown') {
      ctx.fillStyle = '#ffee88';
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POT: ' + pot, GW / 2, COMM_Y + CARD_H + 12);
    }

    // Chips readout
    ctx.fillStyle = '#111122';
    ctx.fillRect(8, GH - 22, GW - 16, 16);
    ctx.fillStyle = chips >= ANTE ? '#9ece6a' : '#f7768e';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHIPS: ' + chips, 16, GH - 14);
    ctx.fillStyle = '#e0af68';
    ctx.fillText('PHASE: ' + phase.toUpperCase(), 140, GH - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 16, GH - 14);

    msgEl.textContent = message;
    msgEl.style.color = messageCol;

    tick++;
    rafId = requestAnimationFrame(render);
  }

  // ── Close / cleanup ───────────────────────────────────────────
  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (chips > START_CHIPS && window.saveGameScore) {
      window.saveGameScore('poker', chips);
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    if (phase === 'bet' || phase === 'showdown') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        beginHand();
      }
    } else if (phase === 'flop' || phase === 'turn' || phase === 'river') {
      if (awaitingPlayerResponse) {
        if (e.key === 'c' || e.key === 'C') playerCall();
        else if (e.key === 'f' || e.key === 'F') playerFold();
      } else {
        if (e.key === 'c' || e.key === 'C') playerCheck();
        else if (e.key === 'b' || e.key === 'B') playerBet();
        else if (e.key === 'f' || e.key === 'F') playerFold();
      }
    }
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  updateButtons();
  render();
}
