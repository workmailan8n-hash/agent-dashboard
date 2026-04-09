// ════════════════════════════════════════════════════════════════
//  PLANT MINIGAME — click-to-water timing sequence, no external deps
//  Triggered when user clicks the plant object.
//  5 rounds: water drop falls, click when it enters the green zone.
//  Plant grows through 5 stages with each successful hit.
// ════════════════════════════════════════════════════════════════

const ROUNDS = 5;
const CW = 260;
const CH = 300;
const PLANT_X = 130;
const PLANT_Y = 240;
const ZONE_TOP = PLANT_Y - 58;
const ZONE_BTM = PLANT_Y - 12;
const DROP_START_Y = 82;
const BASE_SPEED = 1.4;

export function launchPlantGame() {
  let round = 0;
  let score = 0;
  let hits = 0;
  let dropY = DROP_START_Y;
  let dropX = PLANT_X;
  let dropSpeed = BASE_SPEED;
  let dropping = false;
  let tipAngle = 0;
  let phase = "start"; // 'start'|'tipping'|'dropping'|'result'|'over'
  let result = null;
  let resultTimer = 0;
  let tick = 0;
  let rafId = null;
  let tipTimeout = null;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.96);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const titleEl = document.createElement("div");
  titleEl.style.cssText =
    "color:#9ece6a;font-size:11px;margin-bottom:12px;" +
    "text-shadow:0 0 14px #9ece6aaa;letter-spacing:2px;";
  titleEl.textContent = "🌱 WATER THE PLANT";
  overlay.appendChild(titleEl);

  const gc = document.createElement("canvas");
  gc.width = CW;
  gc.height = CH;
  gc.style.cssText =
    "border:2px solid #3a3860;display:block;" +
    "image-rendering:pixelated;cursor:pointer;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d650;font-size:5px;margin-top:10px;letter-spacing:1px;";
  instrEl.textContent = "CLICK or SPACE when drop is in the zone  |  ESC: quit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#2a2848;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  // ── Drawing helpers ───────────────────────────────────────────
  function px(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  function drawBackground() {
    ctx.fillStyle = "#080820";
    ctx.fillRect(0, 0, CW, CH);
    px(0, PLANT_Y + 28, CW, CH - PLANT_Y - 28, "#1a1830");
    ctx.fillStyle = "#22204a";
    for (let x = 8; x < CW; x += 20) ctx.fillRect(x, PLANT_Y + 34, 2, 2);
  }

  function drawPlant(stage) {
    // Pot
    px(PLANT_X - 16, PLANT_Y + 6, 32, 4, "#8a5030");
    px(PLANT_X - 14, PLANT_Y + 10, 28, 18, "#a06030");
    px(PLANT_X - 12, PLANT_Y + 10, 24, 8, "#3a2410");

    if (stage === 0) {
      // Tiny sprout
      px(PLANT_X - 1, PLANT_Y - 6, 2, 12, "#5a8a30");
      px(PLANT_X - 7, PLANT_Y - 3, 7, 4, "#5a8a30");
    } else if (stage === 1) {
      px(PLANT_X - 1, PLANT_Y - 22, 2, 28, "#5a8a30");
      px(PLANT_X - 14, PLANT_Y - 16, 14, 6, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 8, 12, 6, "#5a8a30");
    } else if (stage === 2) {
      px(PLANT_X - 1, PLANT_Y - 44, 2, 50, "#5a8a30");
      px(PLANT_X - 20, PLANT_Y - 34, 20, 7, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 20, 18, 7, "#5a8a30");
      px(PLANT_X - 16, PLANT_Y - 8, 16, 7, "#5a8a30");
      px(PLANT_X - 22, PLANT_Y - 38, 8, 4, "#7ab840");
      px(PLANT_X + 16, PLANT_Y - 24, 8, 4, "#7ab840");
    } else if (stage === 3) {
      px(PLANT_X - 1, PLANT_Y - 64, 2, 70, "#5a8a30");
      px(PLANT_X - 24, PLANT_Y - 54, 24, 7, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 40, 22, 7, "#5a8a30");
      px(PLANT_X - 22, PLANT_Y - 26, 22, 7, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 12, 20, 7, "#5a8a30");
      px(PLANT_X - 28, PLANT_Y - 58, 8, 5, "#7ab840");
      px(PLANT_X + 22, PLANT_Y - 44, 8, 5, "#7ab840");
      px(PLANT_X - 26, PLANT_Y - 30, 8, 5, "#7ab840");
    } else {
      // Full bloom + flower
      px(PLANT_X - 1, PLANT_Y - 84, 2, 90, "#5a8a30");
      px(PLANT_X - 26, PLANT_Y - 70, 26, 7, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 56, 24, 7, "#5a8a30");
      px(PLANT_X - 24, PLANT_Y - 38, 24, 7, "#5a8a30");
      px(PLANT_X + 2, PLANT_Y - 22, 22, 7, "#5a8a30");
      px(PLANT_X - 30, PLANT_Y - 74, 8, 5, "#7ab840");
      px(PLANT_X + 24, PLANT_Y - 60, 8, 5, "#7ab840");
      // Flower
      px(PLANT_X - 8, PLANT_Y - 96, 16, 10, "#ff9900");
      px(PLANT_X - 10, PLANT_Y - 92, 20, 6, "#ff9900");
      px(PLANT_X - 5, PLANT_Y - 95, 10, 10, "#ffdd00");
      px(PLANT_X - 3, PLANT_Y - 93, 6, 6, "#ff6600");
    }
  }

  function drawCan(angle) {
    const cx = 72,
      cy = 74;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // can body
    px(-16, -12, 32, 26, "#4a7a9a");
    px(-14, -14, 28, 4, "#3a6a8a");
    px(14, -10, 5, 18, "#3a6a8a");
    // spout pointing left-down when tilted
    px(-24, -6, 10, 5, "#3a6a8a");
    px(-28, -10, 8, 6, "#3a6a8a");
    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(-14, -12, 22, 6);
    ctx.restore();
  }

  function drawDrop(x, y) {
    // teardrop
    ctx.fillStyle = "rgba(100,200,255,0.45)";
    ctx.fillRect(x - 2, y - 7, 4, 7);
    ctx.fillStyle = "#44aaff";
    ctx.fillRect(x - 4, y, 8, 6);
    ctx.fillRect(x - 3, y + 1, 6, 6);
    ctx.fillRect(x - 2, y + 2, 4, 4);
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x - 2, y + 1, 2, 2);
  }

  function drawZone() {
    const a = 0.12 + 0.06 * Math.sin(tick * 0.12);
    ctx.fillStyle = `rgba(158,206,106,${a})`;
    ctx.fillRect(PLANT_X - 24, ZONE_TOP, 48, ZONE_BTM - ZONE_TOP);
    ctx.strokeStyle = `rgba(158,206,106,${a * 3})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(PLANT_X - 24, ZONE_TOP, 48, ZONE_BTM - ZONE_TOP);
  }

  function drawHUD() {
    px(0, 0, CW, 36, "#0d1020");
    ctx.font = '7px "Press Start 2P",monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#9ece6a";
    ctx.fillText("ROUND " + Math.min(round + 1, ROUNDS) + "/" + ROUNDS, 8, 8);
    ctx.fillStyle = "#7aa2f7";
    ctx.fillText("SCORE " + score, 8, 22);
    // watered indicator dots (right side)
    for (let i = 0; i < ROUNDS; i++) {
      px(CW - 14 - i * 16, 11, 10, 14, i < hits ? "#9ece6a" : "#1a2040");
      if (i < hits) px(CW - 13 - i * 16, 12, 8, 4, "#7ab840");
    }
  }

  // ── Game logic ────────────────────────────────────────────────
  function startRound() {
    dropY = DROP_START_Y;
    dropX = 52; // near can spout
    dropSpeed = BASE_SPEED + round * 0.12;
    dropping = false;
    tipAngle = 0;
    result = null;
    phase = "tipping";
    if (tipTimeout) clearTimeout(tipTimeout);
    tipTimeout = setTimeout(() => {
      if (phase === "tipping") {
        dropping = true;
        phase = "dropping";
      }
    }, 650);
  }

  function checkHit() {
    if (phase !== "dropping" || !dropping) return;
    dropping = false;
    phase = "result";

    const inZone = dropY >= ZONE_TOP && dropY <= ZONE_BTM + 18;
    if (inZone) {
      const center = (ZONE_TOP + ZONE_BTM) / 2;
      const zonePct = Math.abs(dropY - center) / ((ZONE_BTM - ZONE_TOP) / 2);
      const pts = zonePct < 0.3 ? 30 : zonePct < 0.7 ? 20 : 10;
      score += pts;
      hits++;
      result = {
        ok: true,
        label: zonePct < 0.3 ? "💧 PERFECT!" : "✓ GOOD HIT",
        col: "#9ece6a",
        pts,
      };
    } else {
      result = { ok: false, label: "✗ MISSED!", col: "#f7768e", pts: 0 };
    }
    resultTimer = 80;
  }

  // ── Render loop ───────────────────────────────────────────────
  function render() {
    tick++;
    drawBackground();
    drawPlant(Math.min(hits, 4));

    if (phase === "dropping") drawZone();

    // Animate can tip
    if (phase === "tipping") tipAngle = Math.min(tipAngle + 0.045, 0.7);
    else if (phase === "dropping") tipAngle = 0.7;
    else tipAngle = Math.max(tipAngle - 0.045, 0);
    drawCan(tipAngle);

    // Drop physics
    if (dropping) {
      dropSpeed += 0.032;
      dropY += dropSpeed;
      // arc drop from can spout toward plant center
      const frac = Math.max(
        0,
        Math.min(1, (dropY - DROP_START_Y) / (ZONE_BTM - DROP_START_Y)),
      );
      dropX = 52 + (PLANT_X - 52) * frac;
      drawDrop(dropX, dropY);

      if (dropY > ZONE_BTM + 44) {
        dropping = false;
        phase = "result";
        result = { ok: false, label: "✗ TOO SLOW!", col: "#f7768e", pts: 0 };
        resultTimer = 80;
      }
    }

    drawHUD();

    // Result flash
    if (phase === "result") {
      resultTimer--;
      ctx.font = '9px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = result.col;
      ctx.shadowColor = result.col;
      ctx.shadowBlur = 12;
      ctx.fillText(result.label, CW / 2, CH / 2 - 18);
      ctx.shadowBlur = 0;
      if (result.pts) {
        ctx.font = '7px "Press Start 2P",monospace';
        ctx.fillStyle = "#ffd700";
        ctx.fillText("+" + result.pts + " pts", CW / 2, CH / 2 + 6);
      }
      if (resultTimer <= 0) {
        round++;
        if (round >= ROUNDS) {
          phase = "over";
          if (window.saveGameScore) window.saveGameScore("plant", score);
        } else {
          startRound();
        }
      }
    }

    // Game over
    if (phase === "over") {
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, CW, CH);
      ctx.globalAlpha = 1;
      const grade =
        hits >= 5
          ? "MASTER GARDENER!"
          : hits >= 3
            ? "NICE WORK!"
            : "KEEP TRYING";
      const gradeCol =
        hits >= 5 ? "#ffd700" : hits >= 3 ? "#9ece6a" : "#e0af68";
      ctx.font = '8px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = gradeCol;
      ctx.shadowColor = gradeCol;
      ctx.shadowBlur = 14;
      ctx.fillText(grade, CW / 2, CH / 2 - 28);
      ctx.shadowBlur = 0;
      ctx.font = '6px "Press Start 2P",monospace';
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText(
        "SCORE: " + score + "  HITS: " + hits + "/" + ROUNDS,
        CW / 2,
        CH / 2 - 4,
      );
      ctx.font = '5px "Press Start 2P",monospace';
      ctx.fillStyle = "#565f89";
      ctx.fillText("CLICK TO CLOSE", CW / 2, CW / 2 + 26);
      ctx.restore();
    }

    // Start screen
    if (phase === "start") {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, CW, CH);
      ctx.globalAlpha = 1;
      ctx.font = '7px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#9ece6a";
      ctx.shadowColor = "#9ece6a";
      ctx.shadowBlur = 10;
      ctx.fillText("WATER THE PLANT!", CW / 2, CH / 2 - 18);
      ctx.shadowBlur = 0;
      ctx.font = '5px "Press Start 2P",monospace';
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText("Click when drop enters the zone", CW / 2, CH / 2 + 6);
      ctx.fillStyle = "#565f89";
      ctx.fillText("CLICK TO START", CW / 2, CH / 2 + 26);
      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Input ─────────────────────────────────────────────────────
  gc.addEventListener("click", () => {
    if (phase === "start") {
      startRound();
      return;
    }
    if (phase === "over") {
      close();
      return;
    }
    checkHit();
  });

  function onKey(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (phase === "start") startRound();
      else if (phase === "dropping") checkHit();
      else if (phase === "over") close();
    }
  }
  document.addEventListener("keydown", onKey);

  function close() {
    if (tipTimeout) clearTimeout(tipTimeout);
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  closeBtn.addEventListener("click", close);
  rafId = requestAnimationFrame(render);
}
