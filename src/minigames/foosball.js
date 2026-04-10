// ════════════════════════════════════════════════════════════════
//  FOOSBALL MINIGAME — top-down table football, no external deps
//  Triggered when user clicks the foosball table object.
// ════════════════════════════════════════════════════════════════

const GW = 360,
  GH = 240;
const GOAL_W = 24,
  GOAL_H = 70;
const PLAYER_R = 8,
  BALL_R = 6;
const WIN_SCORE = 5;
const CPU_SPEED = 2.8;

export function launchFoosballGame() {
  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#e0af68;font-size:11px;margin-bottom:10px;" +
    "text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;";
  title.textContent = "⚽ FOOSBALL";
  overlay.appendChild(title);

  const gc = document.createElement("canvas");
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;" +
    "image-rendering:pixelated;outline:none;";
  gc.setAttribute("tabindex", "0");
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d640;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instrEl.textContent = "↑↓ or W/S to move your players  |  ESC: exit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:8px;background:#2a2848;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  gc.focus();

  // ── Game state ─────────────────────────────────────────────────
  let playerScore = 0,
    cpuScore = 0;
  let running = true,
    rafId = null;
  let flashMsg = null,
    flashTimer = 0,
    gameOver = false;
  let keys = {};

  // Players: user row at x=90 (3 players), cpu row at x=270 (3 players)
  const USER_X = 90,
    CPU_X = 270;
  const ROW_SPACING = 55;
  let userY = GH / 2; // center of user's row (moves as unit)
  let cpuY = GH / 2;

  function makeRow(cx, cy) {
    return [-ROW_SPACING, 0, ROW_SPACING].map((dy) => ({ x: cx, y: cy + dy }));
  }

  function resetBall(dir) {
    const angle = Math.random() * 0.6 - 0.3;
    return {
      x: GW / 2,
      y: GH / 2,
      vx: dir * (3.2 + Math.random() * 1.2),
      vy: Math.sin(angle) * 2.5,
    };
  }

  let ball = resetBall(1);

  // ── Physics ────────────────────────────────────────────────────
  function deflectByRow(rowX, rowCY, col) {
    const PR = PLAYER_R + BALL_R;
    for (const dy of [-ROW_SPACING, 0, ROW_SPACING]) {
      const py = rowCY + dy;
      const dx = ball.x - rowX,
        ddy = ball.y - py;
      const dist = Math.sqrt(dx * dx + ddy * ddy);
      if (dist < PR) {
        // Push ball away
        const nx = dx / dist,
          ny = ddy / dist;
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const boost = col === "user" ? 1.1 : 1.0;
        ball.vx = nx * speed * boost;
        ball.vy =
          ny * speed * boost +
          (col === "user"
            ? keys["ArrowUp"]
              ? -1
              : keys["ArrowDown"]
                ? 1
                : 0
            : 0);
        // Separate
        const overlap = PR - dist + 1;
        ball.x += nx * overlap;
        ball.y += ny * overlap;
        // Clamp speed
        const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (spd > 7) {
          ball.vx = (ball.vx / spd) * 7;
          ball.vy = (ball.vy / spd) * 7;
        }
        return true;
      }
    }
    return false;
  }

  function update() {
    if (gameOver || flashTimer > 0) {
      if (flashTimer > 0) flashTimer--;
      if (flashTimer === 0 && flashMsg) {
        flashMsg = null;
        if (!gameOver) ball = resetBall(cpuScore > playerScore ? 1 : -1);
      }
      return;
    }

    // User input
    const MOVE = 4;
    if (keys["ArrowUp"] || keys["w"] || keys["W"])
      userY = Math.max(GOAL_H / 2 + 10, userY - MOVE);
    if (keys["ArrowDown"] || keys["s"] || keys["S"])
      userY = Math.min(GH - GOAL_H / 2 - 10, userY + MOVE);

    // CPU tracks ball
    const cpuDy = ball.y - cpuY;
    cpuY += Math.sign(cpuDy) * Math.min(CPU_SPEED, Math.abs(cpuDy));
    cpuY = Math.max(GOAL_H / 2 + 10, Math.min(GH - GOAL_H / 2 - 10, cpuY));

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top / bottom wall bounce
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy *= -1;
    }
    if (ball.y + BALL_R > GH) {
      ball.y = GH - BALL_R;
      ball.vy *= -1;
    }

    // Deflect by player rows
    deflectByRow(USER_X, userY, "user");
    deflectByRow(CPU_X, cpuY, "cpu");

    // Goals: left edge = CPU scores, right edge = user scores
    const goalTop = (GH - GOAL_H) / 2,
      goalBot = (GH + GOAL_H) / 2;
    if (ball.x - BALL_R < 0) {
      if (ball.y >= goalTop && ball.y <= goalBot) {
        cpuScore++;
        flashMsg = cpuScore >= WIN_SCORE ? "CPU WINS!" : "CPU GOAL!";
        if (cpuScore >= WIN_SCORE) gameOver = true;
        flashTimer = 80;
        ball.vx = 0;
        ball.vy = 0;
      } else {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx);
      }
    }
    if (ball.x + BALL_R > GW) {
      if (ball.y >= goalTop && ball.y <= goalBot) {
        playerScore++;
        if (
          playerScore >= WIN_SCORE &&
          typeof window.saveGameScore === "function"
        )
          window.saveGameScore("foosball", playerScore);
        flashMsg = playerScore >= WIN_SCORE ? "YOU WIN!" : "GOAL!";
        if (playerScore >= WIN_SCORE) gameOver = true;
        flashTimer = 80;
        ball.vx = 0;
        ball.vy = 0;
      } else {
        ball.x = GW - BALL_R;
        ball.vx = -Math.abs(ball.vx);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  function render() {
    if (!running) return;
    update();

    ctx.clearRect(0, 0, GW, GH);

    // Field
    ctx.fillStyle = "#1a3a18";
    ctx.fillRect(0, 0, GW, GH);

    // Field lines
    ctx.strokeStyle = "#2a5a28";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GW / 2, 0);
    ctx.lineTo(GW / 2, GH);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(GW / 2, GH / 2, 30, 0, Math.PI * 2);
    ctx.stroke();

    // Goals (left = user, right = cpu)
    const gTop = (GH - GOAL_H) / 2,
      gBot = (GH + GOAL_H) / 2;
    ctx.fillStyle = "#7aa2f720";
    ctx.fillRect(0, gTop, GOAL_W, GOAL_H);
    ctx.fillStyle = "#f7768e20";
    ctx.fillRect(GW - GOAL_W, gTop, GOAL_W, GOAL_H);
    ctx.strokeStyle = "#7aa2f7";
    ctx.strokeRect(0, gTop, GOAL_W, GOAL_H);
    ctx.strokeStyle = "#f7768e";
    ctx.strokeRect(GW - GOAL_W, gTop, GOAL_W, GOAL_H);

    // Player rows
    const drawRow = (cx, cy, col) => {
      for (const dy of [-ROW_SPACING, 0, ROW_SPACING]) {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy + dy, PLAYER_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#000a";
        ctx.beginPath();
        ctx.arc(cx, cy + dy, PLAYER_R - 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawRow(USER_X, userY, "#7aa2f7");
    drawRow(CPU_X, cpuY, "#f7768e");

    // Ball
    ctx.save();
    ctx.shadowColor = "#ffffff80";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(ball.x - 2, ball.y - 2, 2, 2);

    // Scoreboard
    ctx.font = "10px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#7aa2f7";
    ctx.fillText(playerScore, GW / 2 - 28, 20);
    ctx.fillStyle = "#a9b1d6";
    ctx.fillText("-", GW / 2, 20);
    ctx.fillStyle = "#f7768e";
    ctx.fillText(cpuScore, GW / 2 + 28, 20);

    // Flash message
    if (flashMsg) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#0a0a18";
      ctx.fillRect(GW / 2 - 70, GH / 2 - 18, 140, 32);
      ctx.globalAlpha = 1;
      ctx.font = "9px 'Press Start 2P',monospace";
      ctx.fillStyle = flashMsg.includes("WIN")
        ? "#ffd700"
        : flashMsg === "GOAL!"
          ? "#9ece6a"
          : "#f7768e";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.fillText(flashMsg, GW / 2, GH / 2 + 4);
      ctx.restore();
    }

    if (gameOver) {
      ctx.font = "6px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#a9b1d680";
      ctx.fillText("CLICK or ESC to exit", GW / 2, GH - 10);
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Input ─────────────────────────────────────────────────────
  function onKey(e) {
    if (e.type === "keydown") {
      keys[e.key] = true;
      if (e.key === "Escape") {
        close();
        return;
      }
      if ((e.key === " " || e.key === "Enter") && gameOver) close();
      if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    } else {
      keys[e.key] = false;
    }
  }
  gc.addEventListener("click", () => {
    if (gameOver) close();
  });
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKey);

  function close() {
    running = false;
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("keyup", onKey);
  }

  closeBtn.addEventListener("click", close);
  rafId = requestAnimationFrame(render);
}
