// ════════════════════════════════════════════════════════════════
//  COFFEE MACHINE MINIGAME  — timing bar, no external deps
//  Triggered when user clicks the coffee machine object.
// ════════════════════════════════════════════════════════════════

const BREW_ROUNDS = 3;
const BAR_W = 260;
const BAR_H = 22;
const ZONE_W = 54; // perfect green zone width

// Tier thresholds (fraction 0-1 distance from center of green zone)
const TIER = [
  { label: "☕ PERFECT BREW!", col: "#9ece6a", pts: 30 },
  { label: "✓ GOOD CUP", col: "#e0af68", pts: 15 },
  { label: "✗ WEAK COFFEE", col: "#f7768e", pts: 5 },
];

export function launchCoffeeGame() {
  let round = 0;
  let score = 0;
  let barPos = 0; // 0..BAR_W
  let barDir = 1;
  const barSpeed = 180; // pixels per second
  let running = true;
  let result = null; // {label, col, pts} for current round flash
  let resultTimer = 0;
  let gameOver = false;
  let rafId = null;
  let lastTime = null;
  let tick = 0;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#e0af68;font-size:11px;margin-bottom:14px;" +
    "text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;";
  title.textContent = "☕ COFFEE MACHINE";
  overlay.appendChild(title);

  const gc = document.createElement("canvas");
  const GW = 320,
    GH = 200;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;" +
    "image-rendering:pixelated;cursor:pointer;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const resultEl = document.createElement("div");
  resultEl.style.cssText =
    "font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;color:#9ece6a;";
  overlay.appendChild(resultEl);

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d640;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instrEl.textContent =
    "CLICK or SPACE to stop the bar in the green zone  |  ESC: exit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#2a2848;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  // ── Draw ─────────────────────────────────────────────────────
  function render(ts) {
    if (!running) return;
    if (lastTime === null) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    tick++;

    if (!gameOver) {
      // Advance bar
      barPos += barDir * barSpeed * dt;
      if (barPos >= BAR_W) {
        barPos = BAR_W;
        barDir = -1;
      }
      if (barPos <= 0) {
        barPos = 0;
        barDir = 1;
      }

      // Decay result flash
      if (resultTimer > 0) resultTimer -= dt;
    }

    ctx.clearRect(0, 0, GW, GH);

    // Background
    ctx.fillStyle = "#080814";
    ctx.fillRect(0, 0, GW, GH);

    // Coffee cup art (pixel style) ─────────────────────────────
    const cupX = GW / 2,
      cupY = 44;
    // Steam wisps
    for (let s = 0; s < 3; s++) {
      const phase = tick * 0.04 + s * 1.9;
      const sy = cupY - 16 - ((tick * 0.4 + s * 9) % 20);
      const sx = cupX - 18 + s * 18 + Math.sin(phase) * 2.5;
      const sa = 0.4 - ((tick * 0.4 + s * 9) % 20) / 50;
      if (sa > 0) {
        ctx.save();
        ctx.globalAlpha = sa;
        ctx.fillStyle = "#c8d0e0";
        ctx.fillRect(sx | 0, sy | 0, 2, 3);
        ctx.restore();
      }
    }
    // Cup body
    ctx.fillStyle = "#2a2848";
    ctx.fillRect(cupX - 22, cupY - 6, 44, 28);
    ctx.fillStyle = "#1a1830";
    ctx.fillRect(cupX - 20, cupY - 4, 40, 24);
    // Coffee surface
    const coffeeColor =
      score > 45 ? "#6b3a1a" : score > 20 ? "#7a4520" : "#5a3015";
    ctx.fillStyle = coffeeColor;
    ctx.fillRect(cupX - 18, cupY - 2, 36, 4);
    // Handle
    ctx.strokeStyle = "#2a2848";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cupX + 22, cupY + 8, 8, -0.5, 1.3);
    ctx.stroke();
    // Saucer
    ctx.fillStyle = "#3a3858";
    ctx.fillRect(cupX - 28, cupY + 23, 56, 5);

    // Round indicator dots
    for (let i = 0; i < BREW_ROUNDS; i++) {
      ctx.fillStyle = i < round ? "#9ece6a" : "#2a2848";
      ctx.beginPath();
      ctx.arc(
        GW / 2 - (BREW_ROUNDS - 1) * 8 + i * 16,
        cupY + 38,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "#3a3860";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (!gameOver) {
      // Timing bar ──────────────────────────────────────────────
      const bx = (GW - BAR_W) / 2,
        by = GH - 50;

      // Track background
      ctx.fillStyle = "#1a1830";
      ctx.fillRect(bx, by, BAR_W, BAR_H);

      // Outer zone (yellow)
      const outerW = ZONE_W + 40;
      const outerX = bx + (BAR_W - outerW) / 2;
      ctx.fillStyle = "#4a3800";
      ctx.fillRect(outerX, by, outerW, BAR_H);

      // Inner green zone
      const zoneX = bx + (BAR_W - ZONE_W) / 2;
      ctx.fillStyle = "#1a3818";
      ctx.fillRect(zoneX, by, ZONE_W, BAR_H);
      // Green zone border glow
      ctx.save();
      ctx.strokeStyle = "#9ece6a";
      ctx.lineWidth = 1;
      ctx.shadowColor = "#9ece6a";
      ctx.shadowBlur = 6;
      ctx.strokeRect(zoneX, by, ZONE_W, BAR_H);
      ctx.restore();

      // Track border
      ctx.strokeStyle = "#3a3860";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, BAR_W, BAR_H);

      // Moving marker
      const mx = bx + barPos;
      ctx.save();
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx - 3, by, 6, BAR_H);
      ctx.restore();

      // Zone labels
      ctx.font = "4px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#9ece6a80";
      ctx.fillText("PERFECT", zoneX + ZONE_W / 2, by + BAR_H + 10);
    } else {
      // Game over summary
      const hiScore = getBestScore();
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle =
        score >= 75 ? "#ffd700" : score >= 45 ? "#9ece6a" : "#e0af68";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      const msg =
        score >= 75
          ? "MASTER BARISTA!"
          : score >= 45
            ? "GOOD BREW!"
            : "NEEDS PRACTICE";
      ctx.fillText(msg, GW / 2, GH - 55);
      ctx.shadowBlur = 0;
      ctx.font = "6px 'Press Start 2P', monospace";
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText("SCORE: " + score + "  BEST: " + hiScore, GW / 2, GH - 36);
    }

    // Score
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#a9b1d6";
    ctx.fillText("SCORE: " + score, GW - 12, 14);

    rafId = requestAnimationFrame(render);
  }

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem("game_leaderboard") || "{}");
      return (lb.coffee || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Stop logic ────────────────────────────────────────────────
  function stop() {
    if (gameOver) return;
    const center = BAR_W / 2;
    const dist = Math.abs(barPos - center);
    const halfGreen = ZONE_W / 2;
    const halfYellow = (ZONE_W + 40) / 2;

    let tier;
    if (dist <= halfGreen) tier = TIER[0];
    else if (dist <= halfYellow) tier = TIER[1];
    else tier = TIER[2];

    score += tier.pts;
    result = tier;
    resultTimer = 1.2;
    resultEl.textContent = tier.label;
    resultEl.style.color = tier.col;
    round++;

    if (round >= BREW_ROUNDS) {
      gameOver = true;
      if (window.saveGameScore) window.saveGameScore("coffee", score);
      instrEl.textContent = "CLICK or ESC to exit";
    }
  }

  gc.addEventListener("click", () => {
    if (gameOver) {
      close();
      return;
    }
    stop();
  });

  function close() {
    running = false;
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (gameOver) {
        close();
        return;
      }
      stop();
    }
  }
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  rafId = requestAnimationFrame(render);
}
