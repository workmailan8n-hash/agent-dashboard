// ════════════════════════════════════════════════════════════════
//  JUKEBOX MINIGAME — rhythm tap, no external deps
//  Press A / S / D / F when colored notes reach the hit bar.
//  20 notes total, then game over with rank display.
// ════════════════════════════════════════════════════════════════

const GW = 320,
  GH = 340;
const LANES = [
  { key: "a", col: "#f7768e", dark: "#3a0a18", label: "A" },
  { key: "s", col: "#e0af68", dark: "#3a2a08", label: "S" },
  { key: "d", col: "#9ece6a", dark: "#0e2a08", label: "D" },
  { key: "f", col: "#7aa2f7", dark: "#08183a", label: "F" },
];
const LANE_W = 58;
const LANE_GAP = 6;
const TOTAL_LANE_W = LANES.length * LANE_W + (LANES.length - 1) * LANE_GAP;
const OFFSET_X = (GW - TOTAL_LANE_W) / 2;
const HIT_Y = GH - 56;
const HIT_ZONE_H = 26;
const NOTE_H = 16;
const NOTE_SPEED = 160; // px/s
const TOTAL_NOTES = 20;
const PERFECT_RANGE = 7; // px from HIT_Y center = perfect

// Musical note sequence (lane 0-3)
const NOTE_SEQ = [0, 2, 1, 3, 0, 1, 2, 3, 1, 0, 3, 2, 0, 3, 1, 2, 0, 1, 3, 2];

export function launchJukeboxGame() {
  let score = 0;
  let notesSpawned = 0;
  let notesResolved = 0;
  let notes = [];
  let spawnCountdown = 0.35;
  let running = true;
  let rafId = null;
  let lastTime = null;
  let tick = 0;
  let feedback = []; // { lane, label, col, timer, fy }
  let laneFlash = [0, 0, 0, 0]; // flash timer per lane
  let gameOver = false;

  // ── Overlay ──────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#bb9af7;font-size:11px;margin-bottom:12px;" +
    "text-shadow:0 0 14px #bb9af7aa;letter-spacing:2px;";
  title.textContent = "♫ JUKEBOX";
  overlay.appendChild(title);

  const gc = document.createElement("canvas");
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;" +
    "image-rendering:pixelated;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d640;font-size:5px;margin-top:10px;letter-spacing:1px;";
  instrEl.textContent =
    "PRESS  A  S  D  F  WHEN NOTES HIT THE BAR  |  ESC: exit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#2a2848;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  // ── Helpers ──────────────────────────────────────────────────
  function laneX(i) {
    return OFFSET_X + i * (LANE_W + LANE_GAP);
  }

  function spawnNote() {
    if (notesSpawned >= TOTAL_NOTES) return;
    notes.push({
      lane: NOTE_SEQ[notesSpawned],
      y: -NOTE_H,
      hit: false,
      missed: false,
    });
    notesSpawned++;
  }

  function pressLane(i) {
    if (gameOver) {
      close();
      return;
    }
    laneFlash[i] = 0.12;

    // Find the nearest unhit note in this lane
    let best = null,
      bestDist = Infinity;
    for (const n of notes) {
      if (n.lane !== i || n.hit || n.missed) continue;
      const dist = Math.abs(n.y + NOTE_H / 2 - HIT_Y);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }

    if (best && bestDist <= HIT_ZONE_H) {
      best.hit = true;
      notesResolved++;
      const perfect = bestDist <= PERFECT_RANGE;
      const pts = perfect ? 100 : 50;
      score += pts;
      feedback.push({
        lane: i,
        label: perfect ? "PERFECT!" : "GOOD",
        col: perfect ? "#ffd700" : "#9ece6a",
        timer: 0.75,
        fy: HIT_Y - 22,
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────
  function render(ts) {
    if (!running) return;
    if (lastTime === null) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    tick++;

    if (!gameOver) {
      // Spawn
      spawnCountdown -= dt;
      if (spawnCountdown <= 0 && notesSpawned < TOTAL_NOTES) {
        spawnNote();
        spawnCountdown = 0.5 + Math.random() * 0.3;
      }
      // Move notes
      for (const n of notes) {
        if (n.hit || n.missed) continue;
        n.y += NOTE_SPEED * dt;
        if (n.y > HIT_Y + HIT_ZONE_H + NOTE_H) {
          n.missed = true;
          notesResolved++;
          feedback.push({
            lane: n.lane,
            label: "MISS",
            col: "#f7768e",
            timer: 0.6,
            fy: HIT_Y - 22,
          });
        }
      }
      // Timers
      for (let i = 0; i < 4; i++) laneFlash[i] = Math.max(0, laneFlash[i] - dt);
      for (const f of feedback) {
        f.timer -= dt;
        f.fy -= 30 * dt;
      }
      feedback = feedback.filter((f) => f.timer > 0);

      if (notesResolved >= TOTAL_NOTES) {
        gameOver = true;
        if (window.saveGameScore) window.saveGameScore("jukebox", score);
        instrEl.textContent = "PRESS ANY KEY OR CLICK TO EXIT";
      }
    }

    // ── Draw background ────────────────────────────────────────
    ctx.fillStyle = "#080814";
    ctx.fillRect(0, 0, GW, GH);

    // Music notes floating (decorative)
    const noteChars = ["♩", "♪", "♫", "♬"];
    ctx.font = "8px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    for (let n = 0; n < 6; n++) {
      const nx = 12 + n * 50;
      const ny = ((tick * 0.6 + n * 28) % (GH + 20)) - 10;
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#bb9af7";
      ctx.fillText(noteChars[n % 4], nx, ny);
    }
    ctx.globalAlpha = 1;

    // ── Draw lanes ────────────────────────────────────────────
    for (let i = 0; i < LANES.length; i++) {
      const { col, dark } = LANES[i];
      const lx = laneX(i);
      const flash = laneFlash[i];

      // Lane bg
      ctx.fillStyle = dark;
      ctx.fillRect(lx, 0, LANE_W, GH);

      // Subtle lane dividers
      ctx.strokeStyle = col + "22";
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, 0, LANE_W, GH);

      // Hit zone
      ctx.fillStyle = flash > 0 ? col + "55" : col + "18";
      ctx.fillRect(lx, HIT_Y - HIT_ZONE_H / 2, LANE_W, HIT_ZONE_H);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = flash > 0 ? 14 : 4;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.strokeRect(lx, HIT_Y - HIT_ZONE_H / 2, LANE_W, HIT_ZONE_H);
      ctx.restore();

      // Key label
      ctx.font = "8px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = flash > 0 ? col : col + "90";
      ctx.shadowColor = flash > 0 ? col : "transparent";
      ctx.shadowBlur = flash > 0 ? 10 : 0;
      ctx.fillText(LANES[i].label, lx + LANE_W / 2, HIT_Y + 5);
      ctx.shadowBlur = 0;
    }

    // ── Draw notes ────────────────────────────────────────────
    for (const n of notes) {
      if (n.hit || n.missed) continue;
      const lx = laneX(n.lane);
      const { col } = LANES[n.lane];
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.fillStyle = col;
      ctx.fillRect(lx + 4, n.y, LANE_W - 8, NOTE_H);
      ctx.shadowBlur = 0;
      // Highlight stripe
      ctx.fillStyle = "#ffffff50";
      ctx.fillRect(lx + 4, n.y, LANE_W - 8, 3);
      ctx.restore();
    }

    // ── Draw feedback ─────────────────────────────────────────
    for (const f of feedback) {
      const alpha = Math.min(f.timer * 2.5, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = f.col;
      ctx.shadowColor = f.col;
      ctx.shadowBlur = 10;
      ctx.fillText(f.label, laneX(f.lane) + LANE_W / 2, f.fy);
      ctx.restore();
    }

    // ── HUD ───────────────────────────────────────────────────
    // Progress bar
    ctx.fillStyle = "#1a1a30";
    ctx.fillRect(10, 8, GW - 20, 5);
    const prog = Math.min(notesResolved / TOTAL_NOTES, 1);
    ctx.fillStyle = "#bb9af7";
    ctx.fillRect(10, 8, (GW - 20) * prog, 5);

    // Score
    ctx.font = "7px 'Press Start 2P',monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#a9b1d6";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillText("SCORE: " + score, GW - 10, 22);

    // Notes counter
    ctx.font = "5px 'Press Start 2P',monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#a9b1d650";
    ctx.fillText(notesResolved + "/" + TOTAL_NOTES, 10, 22);

    // ── Game over screen ──────────────────────────────────────
    if (gameOver) {
      ctx.fillStyle = "rgba(5,5,15,0.75)";
      ctx.fillRect(0, GH / 2 - 55, GW, 110);

      const rank =
        score >= 1600
          ? "S RANK!"
          : score >= 1100
            ? "A RANK!"
            : score >= 700
              ? "B RANK"
              : "C RANK";
      const rankCol =
        score >= 1600
          ? "#ffd700"
          : score >= 1100
            ? "#9ece6a"
            : score >= 700
              ? "#e0af68"
              : "#a9b1d6";

      ctx.font = "13px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = rankCol;
      ctx.shadowColor = rankCol;
      ctx.shadowBlur = 18;
      ctx.fillText(rank, GW / 2, GH / 2 - 8);
      ctx.shadowBlur = 0;
      ctx.font = "6px 'Press Start 2P',monospace";
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText("SCORE: " + score, GW / 2, GH / 2 + 14);
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Controls ──────────────────────────────────────────────────
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
    if (gameOver) {
      close();
      return;
    }
    const map = { a: 0, s: 1, d: 2, f: 3 };
    const i = map[e.key.toLowerCase()];
    if (i !== undefined) {
      e.preventDefault();
      pressLane(i);
    }
  }

  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  rafId = requestAnimationFrame(render);
}
