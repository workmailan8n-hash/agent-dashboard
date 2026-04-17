// ════════════════════════════════════════════════════════════════
//  CARD HELPERS — shared between poker.js and blackjack.js
//  Pixel-art playing cards (4 suits × 13 ranks) + deck utilities.
// ════════════════════════════════════════════════════════════════

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Blackjack values; override in poker (A can be 1 or 14 there)
export function blackjackValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

// Poker rank order: A high by default (returns 2..14)
export function pokerRankValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

export function makeDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r });
  return d;
}

export function shuffle(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealOne(deck) {
  return deck.pop();
}

// ── Draw a single card (face-up) ────────────────────────────────
// (ctx, x, y, card, {w, h, highlight})
export function drawCard(ctx, x, y, card, opts = {}) {
  const w = opts.w || 36;
  const h = opts.h || 52;
  const highlight = !!opts.highlight;

  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2, y + 3, w, h);

  // Body
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = highlight ? '#ffd700' : '#1a1a2a';
  ctx.lineWidth = highlight ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const isRed = card.suit === '♥' || card.suit === '♦';
  const col = isRed ? '#d03040' : '#101018';

  // Top-left rank+suit
  ctx.fillStyle = col;
  ctx.font = "bold 9px 'Press Start 2P', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, x + 3, y + 3);
  ctx.font = '10px monospace';
  ctx.fillText(card.suit, x + 3, y + 14);

  // Center big suit
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '20px monospace';
  ctx.fillText(card.suit, x + w / 2, y + h / 2 + 2);

  // Bottom-right rank (rotated)
  ctx.save();
  ctx.translate(x + w - 3, y + h - 3);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = col;
  ctx.font = "bold 9px 'Press Start 2P', monospace";
  ctx.fillText(card.rank, 0, 0);
  ctx.font = '10px monospace';
  ctx.fillText(card.suit, 0, 11);
  ctx.restore();

  ctx.restore();
}

// ── Draw card back (face-down) ──────────────────────────────────
export function drawCardBack(ctx, x, y, opts = {}) {
  const w = opts.w || 36;
  const h = opts.h || 52;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2, y + 3, w, h);

  ctx.fillStyle = '#1a2a4e';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#3a5a8e';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // Diamond lattice
  ctx.strokeStyle = '#3a5a8e';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }

  // Inner border
  ctx.strokeStyle = '#e0af68';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);

  ctx.restore();
}

// ── Poker hand evaluation ───────────────────────────────────────
// Returns { rank: 0..9, name: string, tiebreak: number[] }
// rank: 0 high card … 9 royal flush
export function evaluatePokerHand(cards) {
  const vals = cards.map((c) => pokerRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const countEntries = Object.entries(counts)
    .map(([v, c]) => [parseInt(v, 10), c])
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]));
  const countPattern = countEntries.map((e) => e[1]).join('');

  const isFlush = suits.every((s) => s === suits[0]);

  // Straight detection (A-high and A-low 5-4-3-2-A)
  const uniq = [...new Set(vals)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) {
      isStraight = true;
      straightHigh = uniq[0];
    } else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const tiebreak = countEntries.flatMap(([v, c]) => Array(c).fill(v));

  if (isStraight && isFlush && straightHigh === 14) {
    return { rank: 9, name: 'Royal Flush', tiebreak: [14] };
  }
  if (isStraight && isFlush) {
    return { rank: 8, name: 'Straight Flush', tiebreak: [straightHigh] };
  }
  if (countPattern === '41') {
    return { rank: 7, name: 'Four of a Kind', tiebreak };
  }
  if (countPattern === '32') {
    return { rank: 6, name: 'Full House', tiebreak };
  }
  if (isFlush) {
    return { rank: 5, name: 'Flush', tiebreak: vals };
  }
  if (isStraight) {
    return { rank: 4, name: 'Straight', tiebreak: [straightHigh] };
  }
  if (countPattern === '311') {
    return { rank: 3, name: 'Three of a Kind', tiebreak };
  }
  if (countPattern === '221') {
    return { rank: 2, name: 'Two Pair', tiebreak };
  }
  if (countPattern === '2111') {
    return { rank: 1, name: 'One Pair', tiebreak };
  }
  return { rank: 0, name: 'High Card', tiebreak: vals };
}

// Returns 1 if a > b, -1 if a < b, 0 if equal
export function comparePokerHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  const n = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < n; i++) {
    const av = a.tiebreak[i] || 0;
    const bv = b.tiebreak[i] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}
