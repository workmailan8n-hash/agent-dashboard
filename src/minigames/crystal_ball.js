// ════════════════════════════════════════════════════════════════
//  CRYSTAL BALL MINIGAME — fortune teller, no external deps
//  Click the ball → it swirls → fortune appears typewriter-style.
//  5 fortunes total. Player picks BELIEVE / DOUBT each time.
//  Reveal: random outcome (true/false). Match = +20 pts.
// ════════════════════════════════════════════════════════════════

const CW = 280;
const CH = 320;
const ROUNDS = 5;

const FORTUNES = [
  "A great commit awaits you today.",
  "Your next PR will be approved instantly.",
  "The bug you seek is on line 42.",
  "Coffee will solve your current problem.",
  "A refactor is in your destiny.",
  "Your tests will pass on first run.",
  "A new feature idea will strike at midnight.",
  "The senior dev will praise your code.",
  "Production deploy will be smooth.",
  "Stack Overflow has your answer.",
  "A rubber duck will reveal all truths.",
  "Your environment vars are correctly set.",
  "The merge conflict will resolve itself.",
  "A second monitor is in your future.",
  "You will ship before the deadline.",
];

export function launchCrystalBallGame() {
  let round = 0;
  let score = 0;
  let tick = 0;
  let rafId = null;
  let phase = "start"; // start | swirl | reveal | result | over
  let fortune = "";
  let typeIdx = 0;
  let typeTick = 0;
  let swirlTick = 0;
  let playerChoice = null; // "believe" | "doubt"
  let outcome = false; // true = fortune came true
  let resultTimer = 0;
  const usedFortunes = new Set();

  // Swirl particles inside the ball
  const particles = Array.from({ length: 22 }, (_, i) => ({
    angle: (i / 22) * Math.PI * 2,
    r: 10 + Math.random() * 26,
    speed: 0.018 + Math.random() * 0.024,
    size: 1 + Math.random() * 2.5,
    col: ["#bb9af7", "#7aa2f7", "#2ac3de", "#9ece6a", "#e0af68"][i % 5],
    alpha: 0.4 + Math.random() * 0.5,
  }));

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(4,4,16,0.97);display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;" +
    "z-index:1000;font-family:'Press Start 2P',monospace;";

  const titleEl = document.createElement("div");
  titleEl.style.cssText =
    "color:#bb9af7;font-size:10px;margin-bottom:10px;" +
    "text-shadow:0 0 18px #bb9af7cc;letter-spacing:2px;";
  titleEl.textContent = "🔮 CRYSTAL BALL";
  overlay.appendChild(titleEl);

  const gc = document.createElement("canvas");
  gc.width = CW;
  gc.height = CH;
  gc.style.cssText =
    "border:2px solid #3a2060;display:block;" +
    "image-rendering:pixelated;cursor:pointer;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const instrEl = document.createElement("div");
  instrEl.style.cssText =
    "color:#a9b1d640;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instrEl.textContent = "CLICK BALL TO ASK  |  ESC: quit";
  overlay.appendChild(instrEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#200a40;color:#f7768e;" +
    "border:1px solid #f7768e50;padding:6px 14px;" +
    "font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  // ── Helpers ───────────────────────────────────────────────────
  function px(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function pickFortune() {
    const pool = FORTUNES.filter((_, i) => !usedFortunes.has(i));
    const idx = Math.floor(Math.random() * pool.length);
    const globalIdx = FORTUNES.indexOf(pool[idx]);
    usedFortunes.add(globalIdx);
    return pool[idx];
  }

  // ── Draw ball ─────────────────────────────────────────────────
  const BX = CW / 2;
  const BY = 130;
  const BR = 54; // ball radius

  function drawBall(glowStrength) {
    // Stand
    px(BX - 26, BY + BR, 52, 10, "#2a1a50");
    px(BX - 20, BY + BR + 10, 40, 6, "#1e1440");
    px(BX - 32, BY + BR + 16, 64, 5, "#1e1440");

    // Outer glow
    const grd = ctx.createRadialGradient(BX, BY, BR * 0.3, BX, BY, BR * 1.6);
    grd.addColorStop(0, `rgba(187,154,247,${glowStrength * 0.18})`);
    grd.addColorStop(0.5, `rgba(122,162,247,${glowStrength * 0.1})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(BX, BY, BR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Ball body gradient
    const ballGrd = ctx.createRadialGradient(
      BX - BR * 0.3,
      BY - BR * 0.3,
      BR * 0.05,
      BX,
      BY,
      BR,
    );
    ballGrd.addColorStop(0, "#c8b0ff");
    ballGrd.addColorStop(0.35, "#6a40b8");
    ballGrd.addColorStop(0.7, "#2a0a60");
    ballGrd.addColorStop(1, "#0a0020");
    ctx.fillStyle = ballGrd;
    ctx.beginPath();
    ctx.arc(BX, BY, BR, 0, Math.PI * 2);
    ctx.fill();

    // Swirl particles (only when swirling or reveal)
    if (phase === "swirl" || phase === "reveal") {
      const intensity = phase === "swirl" ? 1 : Math.max(0, 1 - swirlTick / 60);
      ctx.save();
      ctx.beginPath();
      ctx.arc(BX, BY, BR - 2, 0, Math.PI * 2);
      ctx.clip();
      for (const p of particles) {
        p.angle += p.speed * (phase === "swirl" ? 1.8 : 0.6);
        const px_ = BX + Math.cos(p.angle) * p.r;
        const py_ = BY + Math.sin(p.angle) * p.r * 0.55;
        ctx.globalAlpha = p.alpha * intensity;
        ctx.fillStyle = p.col;
        ctx.fillRect(px_ - p.size / 2, py_ - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Highlight shine
    ctx.save();
    ctx.globalAlpha = 0.55;
    const shineGrd = ctx.createRadialGradient(
      BX - BR * 0.38,
      BY - BR * 0.38,
      1,
      BX - BR * 0.28,
      BY - BR * 0.28,
      BR * 0.48,
    );
    shineGrd.addColorStop(0, "rgba(255,255,255,0.75)");
    shineGrd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shineGrd;
    ctx.beginPath();
    ctx.arc(BX, BY, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Draw fortune text (word-wrapped) ─────────────────────────
  function drawFortuneText(text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '6px "Press Start 2P",monospace';
    ctx.fillStyle = "#e0d4ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    // Simple word-wrap at ~22 chars
    const words = text.split(" ");
    let lines = [],
      cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 22) {
        lines.push(cur.trim());
        cur = w;
      } else {
        cur = cur ? cur + " " + w : w;
      }
    }
    if (cur) lines.push(cur.trim());
    const lineH = 12;
    const startY = BY + BR + 30;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], CW / 2, startY + i * lineH);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Draw choice buttons ───────────────────────────────────────
  function drawChoiceButtons(hover) {
    // BELIEVE
    const bx1 = 24,
      bx2 = CW / 2 + 8;
    const by_ = BY + BR + 82,
      bw = 96,
      bh = 22;
    ctx.fillStyle = hover === "believe" ? "#3a1880" : "#1e0a50";
    ctx.strokeStyle = "#9ece6a80";
    ctx.lineWidth = 1;
    ctx.fillRect(bx1, by_, bw, bh);
    ctx.strokeRect(bx1, by_, bw, bh);
    ctx.font = '5px "Press Start 2P",monospace';
    ctx.fillStyle = "#9ece6a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓ BELIEVE", bx1 + bw / 2, by_ + bh / 2);

    // DOUBT
    ctx.fillStyle = hover === "doubt" ? "#500a1e" : "#200614";
    ctx.strokeStyle = "#f7768e80";
    ctx.fillRect(bx2, by_, bw, bh);
    ctx.strokeRect(bx2, by_, bw, bh);
    ctx.fillStyle = "#f7768e";
    ctx.fillText("✗ DOUBT", bx2 + bw / 2, by_ + bh / 2);
  }

  // ── HUD ───────────────────────────────────────────────────────
  function drawHUD() {
    px(0, 0, CW, 28, "#0a0620");
    ctx.font = '6px "Press Start 2P",monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#bb9af7";
    ctx.fillText("FATE " + Math.min(round + 1, ROUNDS) + "/" + ROUNDS, 8, 8);
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.fillText(score + " pts", CW - 8, 8);
  }

  // ── Main render ───────────────────────────────────────────────
  function render() {
    tick++;
    ctx.fillStyle = "#060214";
    ctx.fillRect(0, 0, CW, CH);

    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.05);

    if (phase === "start") {
      drawBall(pulse * 0.6);
      ctx.font = '7px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(187,154,247,${0.5 + pulse * 0.5})`;
      ctx.shadowColor = "#bb9af7";
      ctx.shadowBlur = 10;
      ctx.fillText("CLICK TO SEE", CW / 2, BY + BR + 36);
      ctx.fillText("YOUR FATE", CW / 2, BY + BR + 54);
      ctx.shadowBlur = 0;
    }

    if (phase === "swirl") {
      swirlTick++;
      drawBall(0.6 + pulse * 0.4);
      if (swirlTick > 70) {
        phase = "reveal";
        swirlTick = 0;
        fortune = pickFortune();
        typeIdx = 0;
        typeTick = 0;
      }
    }

    if (phase === "reveal") {
      swirlTick++;
      drawBall(0.4 + pulse * 0.3);
      // Typewriter
      typeTick++;
      if (typeTick % 3 === 0 && typeIdx < fortune.length) typeIdx++;
      const shown = fortune.slice(0, typeIdx);
      drawFortuneText(shown, 1);
      if (typeIdx >= fortune.length) {
        drawChoiceButtons(null);
        ctx.font = '5px "Press Start 2P",monospace';
        ctx.fillStyle = "#bb9af780";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Do you believe this fate?", CW / 2, BY + BR + 74);
      }
      drawHUD();
    }

    if (phase === "result") {
      resultTimer--;
      drawBall(pulse * 0.3);
      const outcomeText = outcome ? "IT CAME TRUE!" : "FATE LIED...";
      const matchText =
        (playerChoice === "believe" && outcome) ||
        (playerChoice === "doubt" && !outcome)
          ? "+20 pts  YOU KNEW!"
          : "no match";
      const matchCol = matchText.startsWith("+") ? "#ffd700" : "#565f89";
      const col = outcome ? "#9ece6a" : "#f7768e";

      ctx.font = '7px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.fillText(outcomeText, CW / 2, BY + BR + 36);
      ctx.shadowBlur = 0;
      ctx.font = '6px "Press Start 2P",monospace';
      ctx.fillStyle = matchCol;
      ctx.fillText(matchText, CW / 2, BY + BR + 56);
      drawHUD();
      if (resultTimer <= 0) {
        round++;
        if (round >= ROUNDS) {
          phase = "over";
        } else {
          phase = "start";
          playerChoice = null;
        }
      }
    }

    if (phase === "over") {
      drawBall(pulse * 0.5);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#04020e";
      ctx.fillRect(0, BY - BR - 30, CW, CH - (BY - BR - 30));
      ctx.globalAlpha = 1;
      const grade =
        score >= 80 ? "ORACLE!" : score >= 40 ? "BELIEVER!" : "SKEPTIC";
      const gradeCol =
        score >= 80 ? "#ffd700" : score >= 40 ? "#bb9af7" : "#a9b1d6";
      ctx.font = '9px "Press Start 2P",monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = gradeCol;
      ctx.shadowColor = gradeCol;
      ctx.shadowBlur = 14;
      ctx.fillText(grade, CW / 2, BY + 20);
      ctx.shadowBlur = 0;
      ctx.font = '6px "Press Start 2P",monospace';
      ctx.fillStyle = "#a9b1d6";
      ctx.fillText("FINAL SCORE: " + score, CW / 2, BY + 46);
      ctx.font = '5px "Press Start 2P",monospace';
      ctx.fillStyle = "#565f89";
      ctx.fillText("CLICK TO CLOSE", CW / 2, BY + 68);
      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Input ─────────────────────────────────────────────────────
  gc.addEventListener("click", (e) => {
    if (phase === "start") {
      phase = "swirl";
      swirlTick = 0;
      return;
    }
    if (phase === "over") {
      close();
      return;
    }
    if (phase === "reveal" && typeIdx >= fortune.length) {
      // Check if clicked on believe/doubt buttons
      const rect = gc.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CW / rect.width);
      const my = (e.clientY - rect.top) * (CH / rect.height);
      const by_ = BY + BR + 82,
        bh = 22;
      if (my >= by_ && my <= by_ + bh) {
        if (mx >= 24 && mx <= 120) playerChoice = "believe";
        else if (mx >= CW / 2 + 8 && mx <= CW / 2 + 104) playerChoice = "doubt";
        if (playerChoice) {
          outcome = Math.random() < 0.5;
          const matched =
            (playerChoice === "believe" && outcome) ||
            (playerChoice === "doubt" && !outcome);
          if (matched) score += 20;
          phase = "result";
          resultTimer = 110;
        }
      }
    }
    if (phase === "reveal" && typeIdx < fortune.length) {
      // Skip typewriter
      typeIdx = fortune.length;
    }
  });

  function onKey(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);

  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  closeBtn.addEventListener("click", close);
  rafId = requestAnimationFrame(render);
}
