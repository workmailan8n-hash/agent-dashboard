// ════════════════════════════════════════════════════════════════
//  FOOSBALL MINIGAME  — click the foosball table to play
//  Player controls all left rods with mouse Y.
//  First to 5 goals wins. No external dependencies.
// ════════════════════════════════════════════════════════════════

const GW = 500,
  GH = 300; // game canvas size
const SCORE_TO_WIN = 5;
const BALL_R = 6;
const BASE_SPEED = 3.8;

// Rod definitions: {side:'player'|'cpu', x, figures:[yOffset,...]}
const RODS = [
  { side: "player", x: 70, figures: [0] }, // player goalkeeper
  { side: "cpu", x: 140, figures: [-65, 0, 65] }, // cpu attack
  { side: "player", x: 210, figures: [-55, 0, 55] }, // player midfield
  { side: "cpu", x: 280, figures: [-55, 0, 55] }, // cpu midfield
  { side: "player", x: 360, figures: [-65, 0, 65] }, // player attack
  { side: "cpu", x: 430, figures: [0] }, // cpu goalkeeper
];

const FIG_H = 18; // figure hitbox half-height
const FIG_W = 7; // figure half-width

// ─── Pixel-art renderer ─────────────────────────────────────────

function drawTable(gc, gs) {
  // Background / pitch
  gc.fillStyle = "#1a4a2a";
  gc.fillRect(0, 0, GW, GH);

  // Pitch markings
  gc.strokeStyle = "#2a6a3a";
  gc.lineWidth = 1;
  gc.beginPath();
  gc.moveTo(GW / 2, 0);
  gc.lineTo(GW / 2, GH);
  gc.stroke();
  gc.beginPath();
  gc.arc(GW / 2, GH / 2, 32, 0, Math.PI * 2);
  gc.stroke();

  // Goals
  gc.fillStyle = "#ffffff20";
  gc.fillRect(0, GH / 2 - 36, 8, 72); // left goal
  gc.fillRect(GW - 8, GH / 2 - 36, 8, 72); // right goal
  gc.strokeStyle = "#ffffff60";
  gc.strokeRect(0, GH / 2 - 36, 8, 72);
  gc.strokeRect(GW - 8, GH / 2 - 36, 8, 72);

  // Rods and figures
  for (const rod of RODS) {
    const cy = gs.rodY[rod.x] || GH / 2;
    const isPlayer = rod.side === "player";

    // Rod line
    gc.strokeStyle = "#8a6a3a";
    gc.lineWidth = 3;
    gc.beginPath();
    gc.moveTo(rod.x, 0);
    gc.lineTo(rod.x, GH);
    gc.stroke();

    // Figures
    gc.fillStyle = isPlayer ? "#7aa2f7" : "#f7768e";
    gc.strokeStyle = isPlayer ? "#4a72c7" : "#c74658";
    gc.lineWidth = 1;
    for (const off of rod.figures) {
      const fy = cy + off;
      gc.fillRect(rod.x - FIG_W, fy - FIG_H, FIG_W * 2, FIG_H * 2);
      gc.strokeRect(rod.x - FIG_W, fy - FIG_H, FIG_W * 2, FIG_H * 2);
      // eyes
      gc.fillStyle = "#ffffff";
      gc.fillRect(rod.x - FIG_W + 2, fy - 3, 3, 3);
      gc.fillStyle = isPlayer ? "#7aa2f7" : "#f7768e";
    }
  }

  // Ball
  gc.beginPath();
  gc.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2);
  gc.fillStyle = "#e0e0e0";
  gc.fill();
  gc.strokeStyle = "#888";
  gc.lineWidth = 1;
  gc.stroke();
  // ball pattern
  gc.strokeStyle = "#aaa";
  gc.beginPath();
  gc.moveTo(gs.ball.x - 3, gs.ball.y);
  gc.lineTo(gs.ball.x + 3, gs.ball.y);
  gc.stroke();

  // Scores
  gc.font = "bold 13px 'Press Start 2P', monospace";
  gc.textAlign = "center";
  gc.fillStyle = "#7aa2f7";
  gc.fillText(gs.score.player, GW / 4, 22);
  gc.fillStyle = "#f7768e";
  gc.fillText(gs.score.cpu, (GW * 3) / 4, 22);

  // Flash on goal
  if (gs.flash > 0) {
    gc.fillStyle = `rgba(255,255,255,${gs.flash * 0.35})`;
    gc.fillRect(0, 0, GW, GH);
    gc.font = "bold 16px 'Press Start 2P', monospace";
    gc.textAlign = "center";
    gc.fillStyle = gs.flashSide === "player" ? "#7aa2f7" : "#f7768e";
    gc.fillText(
      gs.flashSide === "player" ? "GOAL!" : "CPU SCORES!",
      GW / 2,
      GH / 2 + 6,
    );
  }

  // Game over
  if (gs.over) {
    gc.fillStyle = "rgba(5,5,15,0.7)";
    gc.fillRect(0, 0, GW, GH);
    const won = gs.score.player >= SCORE_TO_WIN;
    gc.font = "bold 14px 'Press Start 2P', monospace";
    gc.textAlign = "center";
    gc.fillStyle = won ? "#9ece6a" : "#f7768e";
    gc.fillText(won ? "YOU WIN!" : "CPU WINS!", GW / 2, GH / 2 - 18);
    gc.font = "10px 'Press Start 2P', monospace";
    gc.fillStyle = "#c8d3f5";
    gc.fillText(`${gs.score.player} — ${gs.score.cpu}`, GW / 2, GH / 2 + 8);
    gc.font = "7px 'Press Start 2P', monospace";
    gc.fillStyle = "#5a5888";
    gc.fillText("CLICK TO PLAY AGAIN", GW / 2, GH / 2 + 28);
  }

  // Hint on serving
  if (!gs.serving && !gs.over && gs.flash <= 0) {
    // nothing extra
  } else if (gs.serving) {
    gc.font = "7px 'Press Start 2P', monospace";
    gc.textAlign = "center";
    gc.fillStyle = "#c8d3f580";
    gc.fillText("CLICK TO SERVE", GW / 2, GH - 14);
  }
}

// ─── Ball reset ──────────────────────────────────────────────────

function resetBall(gs, scoringSide) {
  gs.ball.x = GW / 2;
  gs.ball.y = GH / 2 + (Math.random() - 0.5) * 60;
  // Ball is served toward the team that just conceded
  const dir = scoringSide === "player" ? -1 : 1;
  const ang = (Math.random() - 0.5) * 0.8;
  gs.ball.vx = dir * BASE_SPEED * Math.cos(ang);
  gs.ball.vy = BASE_SPEED * Math.sin(ang);
  gs.serving = true;
}

// ─── Main game ──────────────────────────────────────────────────

export function launchFoosballGame() {
  // ── Modal ────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.88);display:flex;" +
    "align-items:center;justify-content:center;z-index:9000;";

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "background:#12121e;border:2px solid #3a3860;border-radius:10px;" +
    "padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center;" +
    "box-shadow:0 0 40px #0008;";

  const header = document.createElement("div");
  header.style.cssText =
    "font-family:'Press Start 2P',monospace;font-size:9px;color:#c8d3f5;display:flex;gap:24px;";
  header.innerHTML = `
    <span style="color:#7aa2f7">⚽ YOU</span>
    <span style="color:#5a5888">FOOSBALL — first to ${SCORE_TO_WIN}</span>
    <span style="color:#f7768e">CPU</span>`;

  const gc_canvas = document.createElement("canvas");
  gc_canvas.width = GW;
  gc_canvas.height = GH;
  gc_canvas.style.cssText =
    "display:block;cursor:crosshair;border:1px solid #3a3860;border-radius:4px;";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ CLOSE";
  closeBtn.style.cssText =
    "background:#2a2848;color:#5a5888;border:1px solid #3a3860;" +
    "padding:5px 16px;font-family:'Press Start 2P',monospace;" +
    "font-size:7px;cursor:pointer;border-radius:4px;";
  closeBtn.onclick = () => {
    running = false;
    overlay.remove();
  };

  wrap.append(header, gc_canvas, closeBtn);
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      running = false;
      overlay.remove();
    }
  });

  const gc = gc_canvas.getContext("2d");

  // ── Game state ───────────────────────────────────────────────
  const gs = {
    ball: { x: GW / 2, y: GH / 2, vx: BASE_SPEED, vy: 1.2 },
    rodY: {}, // rod.x → current center Y
    score: { player: 0, cpu: 0 },
    flash: 0,
    flashSide: null,
    serving: true,
    over: false,
    speed: BASE_SPEED,
  };
  for (const rod of RODS) gs.rodY[rod.x] = GH / 2;

  let mouseY = GH / 2;
  let running = true;
  let lastT = null;
  let rafId = null;

  gc_canvas.addEventListener("mousemove", (e) => {
    const rect = gc_canvas.getBoundingClientRect();
    mouseY = (e.clientY - rect.top) * (GH / rect.height);
  });

  gc_canvas.addEventListener("click", () => {
    if (gs.over) {
      resetGame();
      return;
    }
    if (gs.serving) gs.serving = false;
  });

  function resetGame() {
    gs.score.player = 0;
    gs.score.cpu = 0;
    gs.over = false;
    gs.flash = 0;
    gs.speed = BASE_SPEED;
    for (const rod of RODS) gs.rodY[rod.x] = GH / 2;
    resetBall(gs, "cpu");
  }

  // ── Game loop ────────────────────────────────────────────────
  function loop(t) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((t - (lastT || t)) / 1000, 0.05);
    lastT = t;

    if (!gs.over && !gs.serving) {
      // Move player rods with mouse
      for (const rod of RODS) {
        if (rod.side === "player") {
          gs.rodY[rod.x] = Math.max(
            FIG_H + 10,
            Math.min(GH - FIG_H - 10, mouseY),
          );
        }
      }

      // CPU rods track ball Y with slight lag
      for (const rod of RODS) {
        if (rod.side === "cpu") {
          const cy = gs.rodY[rod.x];
          const diff = gs.ball.y - cy;
          const step = Math.sign(diff) * Math.min(Math.abs(diff) * 5 * dt, 2.5);
          gs.rodY[rod.x] = Math.max(
            FIG_H + 10,
            Math.min(GH - FIG_H - 10, cy + step),
          );
        }
      }

      // Move ball
      gs.ball.x += gs.ball.vx;
      gs.ball.y += gs.ball.vy;

      // Bounce off top/bottom
      if (gs.ball.y - BALL_R < 0) {
        gs.ball.y = BALL_R;
        gs.ball.vy = Math.abs(gs.ball.vy);
      }
      if (gs.ball.y + BALL_R > GH) {
        gs.ball.y = GH - BALL_R;
        gs.ball.vy = -Math.abs(gs.ball.vy);
      }

      // Rod collision
      for (const rod of RODS) {
        const cy = gs.rodY[rod.x];
        const ballX = gs.ball.x;
        const ballY = gs.ball.y;
        const dx = Math.abs(ballX - rod.x);
        if (dx < FIG_W + BALL_R + 1) {
          for (const off of rod.figures) {
            const fy = cy + off;
            const dy = Math.abs(ballY - fy);
            if (dy < FIG_H + BALL_R) {
              // Hit!
              const side = rod.side === "player" ? 1 : -1;
              const spd = Math.hypot(gs.ball.vx, gs.ball.vy);
              const newSpd = Math.min(spd * 1.08, 8);
              gs.ball.vx =
                side * Math.abs(gs.ball.vx || 1) * (newSpd / spd) ||
                side * newSpd;
              gs.ball.vy += (ballY - fy) * 0.08;
              // Clamp vy
              const maxVY = newSpd * 0.9;
              gs.ball.vy = Math.max(-maxVY, Math.min(maxVY, gs.ball.vy));
              // Push ball clear of rod
              gs.ball.x += side * (FIG_W + BALL_R + 2);
              break;
            }
          }
        }
      }

      // Goal detection (left = cpu goal, right = player goal)
      if (gs.ball.x - BALL_R < 0) {
        // Ball in left goal → player scores
        gs.score.player++;
        gs.flash = 1.2;
        gs.flashSide = "player";
        checkWin("player");
      } else if (gs.ball.x + BALL_R > GW) {
        // Ball in right goal → cpu scores
        gs.score.cpu++;
        gs.flash = 1.2;
        gs.flashSide = "cpu";
        checkWin("cpu");
      }
    }

    // Decay flash
    if (gs.flash > 0) gs.flash = Math.max(0, gs.flash - dt * 2);

    drawTable(gc, gs);
  }

  function checkWin(side) {
    if (gs.score[side] >= SCORE_TO_WIN) {
      gs.over = true;
      if (side === "player" && typeof window.saveGameScore === "function") {
        window.saveGameScore("foosball", gs.score.player * 10);
      }
    } else {
      setTimeout(() => {
        if (running) resetBall(gs, side);
      }, 900);
    }
  }

  rafId = requestAnimationFrame(loop);
}
