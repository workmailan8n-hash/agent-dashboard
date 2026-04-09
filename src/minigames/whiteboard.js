// ════════════════════════════════════════════════════════════════
//  WHITEBOARD MINIGAME  — memory card match (4x3 grid), no external deps
//  Triggered when user clicks the whiteboard object.
// ════════════════════════════════════════════════════════════════

const SYMBOLS = ["★", "♦", "♠", "♣", "⬟", "◉"];
const GRID_COLS = 4;
const GRID_ROWS = 3;
const CARD_W = 52;
const CARD_H = 52;
const GAP = 8;

export function launchWhiteboardGame() {
  // Build deck: 6 pairs shuffled into 12 cards
  const deck = [...SYMBOLS, ...SYMBOLS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const cards = deck.map((sym, idx) => ({
    sym,
    col: ["#f7768e", "#e0af68", "#9ece6a", "#7aa2f7", "#bb9af7", "#2ac3de"][
      SYMBOLS.indexOf(sym)
    ],
    flipped: false,
    matched: false,
    flipAnim: 0, // 0=face-down, 1=face-up
    flipDir: 0, // +1 flipping open, -1 flipping closed
    row: (idx / GRID_COLS) | 0,
    col_idx: idx % GRID_COLS,
  }));

  let flippedIndices = [];
  let lockBoard = false;
  let moves = 0;
  let matchCount = 0;
  let score = 0;
  let gameOver = false;
  let tick = 0;
  let rafId = null;

  const GW = GRID_COLS * (CARD_W + GAP) + GAP;
  const GH = GRID_ROWS * (CARD_H + GAP) + GAP + 60; // extra for header

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.96);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#7aa2f7;font-size:11px;margin-bottom:12px;" +
    "text-shadow:0 0 14px #7aa2f7aa;letter-spacing:2px;";
  title.textContent = "📋 WHITEBOARD MATCH";
  overlay.appendChild(title);

  const gc = document.createElement("canvas");
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;" +
    "image-rendering:pixelated;cursor:pointer;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d640;font-size:5px;margin-top:10px;letter-spacing:1px;";
  instrEl.textContent = "CLICK cards to flip  |  Find all pairs  |  ESC: exit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#2a2848;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  // ── Card geometry helpers ─────────────────────────────────────
  function cardX(c) {
    return GAP + c * (CARD_W + GAP);
  }
  function cardY(r) {
    return 52 + GAP + r * (CARD_H + GAP);
  } // 52px header

  function hitCard(px, py) {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const x = cardX(c.col_idx),
        y = cardY(c.row);
      if (px >= x && px <= x + CARD_W && py >= y && py <= y + CARD_H) return i;
    }
    return -1;
  }

  // ── Draw ─────────────────────────────────────────────────────
  function drawCard(c, idx) {
    const x = cardX(c.col_idx),
      y = cardY(c.row);

    // Animate flip: scale X between 0 and 1
    if (c.flipDir !== 0) {
      c.flipAnim += c.flipDir * 0.18;
      if (c.flipAnim >= 1) {
        c.flipAnim = 1;
        c.flipDir = 0;
      }
      if (c.flipAnim <= 0) {
        c.flipAnim = 0;
        c.flipDir = 0;
      }
    }

    // Flip math: at flipAnim 0 (face-down) and 1 (face-up) scale = 1;
    // crosses 0 at midpoint (flipAnim=0.5) — that's where the card "spins".
    const scaleX = Math.abs(Math.cos(c.flipAnim * Math.PI));
    const faceUp = c.flipAnim >= 0.5;

    ctx.save();
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
    ctx.scale(scaleX, 1);

    if (c.matched) {
      // Matched: bright green glow
      ctx.fillStyle = "#0a2a14";
      ctx.shadowColor = "#9ece6a";
      ctx.shadowBlur = 10 + 4 * Math.sin(tick * 0.08 + idx);
      ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      ctx.shadowBlur = 0;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = c.col;
      ctx.fillText(c.sym, 0, 0);
    } else if (faceUp || c.flipped) {
      // Face up
      ctx.fillStyle = "#1a1830";
      ctx.strokeStyle = c.col + "88";
      ctx.lineWidth = 2;
      ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      ctx.strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = c.col;
      ctx.shadowColor = c.col;
      ctx.shadowBlur = 8;
      ctx.fillText(c.sym, 0, 0);
      ctx.shadowBlur = 0;
    } else {
      // Face down
      ctx.fillStyle = "#0d1226";
      ctx.strokeStyle = "#3a3860";
      ctx.lineWidth = 2;
      ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      ctx.strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      // Grid pattern
      ctx.strokeStyle = "#1e2240";
      ctx.lineWidth = 1;
      for (let gx = -CARD_W / 2 + 10; gx < CARD_W / 2; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(gx, -CARD_H / 2);
        ctx.lineTo(gx, CARD_H / 2);
        ctx.stroke();
      }
      for (let gy = -CARD_H / 2 + 10; gy < CARD_H / 2; gy += 10) {
        ctx.beginPath();
        ctx.moveTo(-CARD_W / 2, gy);
        ctx.lineTo(CARD_W / 2, gy);
        ctx.stroke();
      }
      // Question mark
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#3a3870";
      ctx.fillText("?", 0, 0);
    }
    ctx.restore();
  }

  function render() {
    tick++;
    ctx.clearRect(0, 0, GW, GH);
    // Background
    ctx.fillStyle = "#080814";
    ctx.fillRect(0, 0, GW, GH);

    // Header bar (whiteboard look)
    ctx.fillStyle = "#0e1828";
    ctx.fillRect(0, 0, GW, 48);
    ctx.fillStyle = "#7aa2f7";
    ctx.font = "7px 'Press Start 2P',monospace";
    ctx.textAlign = "left";
    ctx.fillText("MOVES: " + moves, 10, 20);
    ctx.fillStyle = "#9ece6a";
    ctx.fillText("PAIRS: " + matchCount + "/6", 10, 36);
    ctx.fillStyle = "#a9b1d6";
    ctx.textAlign = "right";
    ctx.fillText("SCORE: " + score, GW - 10, 20);

    // Progress dots
    ctx.textAlign = "right";
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i < matchCount ? "#9ece6a" : "#2a2848";
      ctx.beginPath();
      ctx.arc(GW - 10 - i * 12, 34, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cards
    for (let i = 0; i < cards.length; i++) drawCard(cards[i], i);

    // Game over overlay
    if (gameOver) {
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, GW, GH);
      ctx.globalAlpha = 1;
      const grade =
        moves <= 10 ? "GENIUS!" : moves <= 14 ? "NICE WORK!" : "KEEP TRYING";
      const gradeCol =
        moves <= 10 ? "#ffd700" : moves <= 14 ? "#9ece6a" : "#e0af68";
      ctx.font = "8px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = gradeCol;
      ctx.shadowColor = gradeCol;
      ctx.shadowBlur = 14;
      ctx.fillText(grade, GW / 2, GH / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = "6px 'Press Start 2P',monospace";
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText("SCORE: " + score + "  MOVES: " + moves, GW / 2, GH / 2 + 4);
      ctx.font = "5px 'Press Start 2P',monospace";
      ctx.fillStyle = "#565f89";
      ctx.fillText("CLICK TO CLOSE", GW / 2, GH / 2 + 24);
      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Click logic ───────────────────────────────────────────────
  gc.addEventListener("click", (e) => {
    if (gameOver) {
      close();
      return;
    }
    if (lockBoard) return;
    const rect = gc.getBoundingClientRect();
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top;
    const idx = hitCard(mx, my);
    if (idx < 0) return;
    const c = cards[idx];
    if (c.matched || c.flipped) return;
    if (flippedIndices.includes(idx)) return;

    // Flip card open
    c.flipped = true;
    c.flipDir = 1;
    flippedIndices.push(idx);

    if (flippedIndices.length === 2) {
      moves++;
      lockBoard = true;
      const [a, b] = flippedIndices;
      if (cards[a].sym === cards[b].sym) {
        // Match!
        matchCount++;
        const bonus = Math.max(10, 30 - moves * 2);
        score += bonus;
        cards[a].matched = true;
        cards[b].matched = true;
        flippedIndices = [];
        lockBoard = false;
        if (matchCount === 6) {
          gameOver = true;
          score += Math.max(0, 60 - moves * 5);
          if (window.saveGameScore) window.saveGameScore("whiteboard", score);
        }
      } else {
        // No match — flip back after 900ms
        setTimeout(() => {
          cards[a].flipped = false;
          cards[a].flipDir = -1;
          cards[b].flipped = false;
          cards[b].flipDir = -1;
          flippedIndices = [];
          lockBoard = false;
        }, 900);
      }
    }
  });

  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  rafId = requestAnimationFrame(render);
}
