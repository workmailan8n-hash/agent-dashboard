// ════════════════════════════════════════════════════════════════
//  SLOT MACHINE MINIGAME  — self-contained, no external deps
//  Triggered when agent interacts with the Slot Machine object.
// ════════════════════════════════════════════════════════════════

const SYMS = [
  { label: "7", col: "#ff4060", bg: "#200010" },
  { label: "BAR", col: "#e0af68", bg: "#1a1400" },
  { label: "★", col: "#ffd700", bg: "#1a1200" },
  { label: "🍒", col: "#ff8090", bg: "#180010" },
  { label: "🔔", col: "#ffcc00", bg: "#1a1400" },
  { label: "💎", col: "#2ac3de", bg: "#001a20" },
];

const REEL_COUNT = 3;

export function launchSlotMachineGame() {
  let spinning = false;
  let credits = 10;
  let reelSyms = [0, 1, 2];
  let spinningReels = [false, false, false];
  let lastWin = null;
  let rafId = null;
  let tick = 0;

  // ── Overlay ───────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#e0af68;font-size:11px;margin-bottom:16px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;";
  title.textContent = "🎰 SLOT MACHINE";
  overlay.appendChild(title);

  const gc = document.createElement("canvas");
  const GW = 320,
    GH = 170;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;";
  overlay.appendChild(gc);
  const ctx = gc.getContext("2d");

  const winMsg = document.createElement("div");
  winMsg.style.cssText =
    "color:#f7768e;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;";
  overlay.appendChild(winMsg);

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:10px;margin-top:8px;";
  overlay.appendChild(btnRow);

  const spinBtn = document.createElement("button");
  spinBtn.textContent = "▶ SPIN  (1 CREDIT)";
  spinBtn.style.cssText =
    "background:#e0af68;color:#0a0a18;border:none;padding:7px 16px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;letter-spacing:1px;";
  btnRow.appendChild(spinBtn);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;";
  btnRow.appendChild(closeBtn);

  const instr = document.createElement("div");
  instr.style.cssText =
    "color:#a9b1d630;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instr.textContent =
    "MATCH 3 = JACKPOT (×10)  |  MATCH 2 = WIN (×2)  |  ESC: exit";
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  // ── Draw ─────────────────────────────────────────────────────
  function drawReel(i, symIdx, isSpinning) {
    const RW = 72,
      RH = 100;
    const rx = 24 + i * (RW + 20);
    const ry = 18;

    // Frame with glow when spinning
    ctx.save();
    if (isSpinning) {
      ctx.shadowColor = "#e0af68";
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(rx, ry, RW, RH);
    ctx.strokeStyle = isSpinning ? "#e0af68" : "#3a3860";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, RW, RH);
    ctx.restore();

    // Symbol
    const displayIdx = isSpinning
      ? Math.floor(tick * 0.5 + i * 1.7) % SYMS.length
      : symIdx;
    const s = SYMS[displayIdx];

    ctx.fillStyle = s.bg;
    ctx.fillRect(rx + 2, ry + 2, RW - 4, RH - 4);

    ctx.save();
    const isEmoji = s.label.length > 2;
    ctx.font = isEmoji
      ? "26px monospace"
      : `bold 28px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = s.col;
    if (isSpinning)
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(tick * 0.35));
    ctx.fillText(s.label, rx + RW / 2, ry + RH / 2 + 2);
    ctx.restore();

    // Glass shine
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rx + 4, ry + 4, RW - 8, 8);
    ctx.restore();

    // Reel shadow bottom
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000000";
    ctx.fillRect(rx + 2, ry + RH - 10, RW - 4, 8);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, GW, GH);

    // Background
    ctx.fillStyle = "#080814";
    ctx.fillRect(0, 0, GW, GH);

    // Subtle grid
    ctx.save();
    ctx.strokeStyle = "#ffffff08";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < GW; gx += 16) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, GH);
      ctx.stroke();
    }
    ctx.restore();

    // Win flash
    if (lastWin && lastWin.timer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.abs(Math.sin(tick * 0.22)) * 0.18;
      ctx.fillStyle = lastWin.jackpot ? "#ffd700" : "#9ece6a";
      ctx.fillRect(0, 0, GW, GH);
      ctx.restore();
      lastWin.timer--;
    }

    // Pay-line
    ctx.save();
    ctx.strokeStyle = "#e0af6830";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, GH / 2 + 18);
    ctx.lineTo(GW - 10, GH / 2 + 18);
    ctx.stroke();
    ctx.restore();

    // Reels
    for (let i = 0; i < REEL_COUNT; i++) {
      drawReel(i, reelSyms[i], spinningReels[i]);
    }

    // Credits bar
    ctx.fillStyle = "#111122";
    ctx.fillRect(10, GH - 22, GW - 20, 16);
    ctx.fillStyle = credits > 0 ? "#9ece6a" : "#f7768e";
    ctx.font = "5px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("CREDITS: " + credits, 18, GH - 14);

    // High score hint
    ctx.textAlign = "right";
    ctx.fillStyle = "#a9b1d640";
    ctx.fillText("BEST: " + getBestScore(), GW - 18, GH - 14);

    tick++;
    rafId = requestAnimationFrame(render);
  }

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem("game_leaderboard") || "{}");
      return (lb.slots || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function updateUI() {
    spinBtn.disabled = spinning || credits < 1;
    spinBtn.style.opacity = spinBtn.disabled ? "0.35" : "1";
    spinBtn.style.cursor = spinBtn.disabled ? "not-allowed" : "pointer";
  }

  // ── Spin logic ────────────────────────────────────────────────
  function doSpin() {
    if (spinning || credits < 1) return;
    spinning = true;
    credits--;
    winMsg.textContent = "";
    lastWin = null;
    spinningReels = [true, true, true];
    updateUI();

    // Generate final symbols (10% jackpot nudge)
    const finals = [
      Math.floor(Math.random() * SYMS.length),
      Math.floor(Math.random() * SYMS.length),
      Math.floor(Math.random() * SYMS.length),
    ];
    if (Math.random() < 0.08) {
      finals[1] = finals[0];
      finals[2] = finals[0];
    } else if (Math.random() < 0.25) {
      finals[2] = finals[1];
    }

    const stopReel = (i) => {
      spinningReels[i] = false;
      reelSyms[i] = finals[i];
    };

    setTimeout(() => stopReel(0), 600);
    setTimeout(() => stopReel(1), 1100);
    setTimeout(() => {
      stopReel(2);
      spinning = false;

      const [a, b, c] = finals;
      const jackpot = a === b && b === c;
      const pair = a === b || b === c || a === c;
      const bet = 1;

      if (jackpot) {
        const prize = bet * 10;
        credits += prize;
        winMsg.textContent = "🎰 JACKPOT! +" + prize + " CREDITS!";
        winMsg.style.color = "#ffd700";
        lastWin = { timer: 100, jackpot: true };
        if (window.saveGameScore) window.saveGameScore("slots", prize);
      } else if (pair) {
        const prize = bet * 2;
        credits += prize;
        winMsg.textContent = "★ MATCH! +" + prize + " CREDITS";
        winMsg.style.color = "#9ece6a";
        lastWin = { timer: 60, jackpot: false };
        if (window.saveGameScore) window.saveGameScore("slots", prize);
      } else {
        winMsg.textContent = "NO MATCH — TRY AGAIN";
        winMsg.style.color = "#f7768e50";
        if (credits < 1) {
          setTimeout(() => {
            winMsg.textContent = "OUT OF CREDITS! GAME OVER";
          }, 800);
        }
      }
      updateUI();
    }, 1700);
  }

  spinBtn.addEventListener("click", doSpin);
  gc.addEventListener("click", () => {
    if (!spinning) doSpin();
  });

  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    if ((e.key === " " || e.key === "Enter") && !spinning) doSpin();
  }
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  updateUI();
  render();
}
