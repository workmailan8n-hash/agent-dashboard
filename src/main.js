// ════════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT — Vite module
// ════════════════════════════════════════════════════════════════
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/header.css";
import "./styles/canvas.css";
import "./styles/cards.css";
import "./styles/tabs.css";
import "./styles/tasks.css";
import "./styles/connection.css";
import "./styles/admin.css";
import "./styles/settings.css";
import "./styles/leaderboard.css";
import "./styles/loading.css";
import "./styles/mobile.css";
import "./app.js";
import { validateCanonicalLayout } from "./collision.js";

// Boot-time collision validator (non-fatal — logs to DevTools)
if (typeof window !== "undefined") {
  setTimeout(() => {
    try {
      validateCanonicalLayout();
    } catch (e) {
      console.warn("[collision] validator failed:", e);
    }
  }, 100);
}

// ════════════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ════════════════════════════════════════════════════════════════
(function initSettings() {
  const DEFAULTS = { sound: true, particles: true, animations: true };
  let settings;
  try {
    settings = Object.assign(
      {},
      DEFAULTS,
      JSON.parse(localStorage.getItem("agent_settings")),
    );
  } catch {
    settings = Object.assign({}, DEFAULTS);
  }
  window.__settings = settings;

  const panel = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");
  const btnOpen = document.getElementById("btn-settings");
  const btnClose = document.getElementById("settings-close");

  // apply saved state to toggles
  panel.querySelectorAll(".toggle").forEach((t) => {
    const key = t.dataset.key;
    if (settings[key] === false) t.classList.remove("on");
  });

  function open() {
    panel.classList.add("open");
    backdrop.classList.add("open");
  }
  function close() {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
  }

  btnOpen.addEventListener("click", () =>
    panel.classList.contains("open") ? close() : open(),
  );
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  panel.querySelectorAll(".toggle").forEach((t) => {
    t.addEventListener("click", () => {
      t.classList.toggle("on");
      const key = t.dataset.key;
      settings[key] = t.classList.contains("on");
      localStorage.setItem("agent_settings", JSON.stringify(settings));
    });
  });
})();

// ════════════════════════════════════════════════════════════════
//  LOADING SCREEN — pixel art progress bar + walking agent
// ════════════════════════════════════════════════════════════════
(function initLoading() {
  const screen = document.getElementById("loading-screen");
  const canvas = document.getElementById("loading-canvas");
  const statusEl = document.getElementById("loading-status");
  if (!screen || !canvas) return;

  const ctx = canvas.getContext("2d");
  const W = 320,
    H = 80;

  // Block bar config
  const BLOCKS = 26;
  const BLK_W = 10;
  const BLK_GAP = 2;
  const BAR_W = BLOCKS * BLK_W + (BLOCKS - 1) * BLK_GAP; // 310px
  const BAR_X = (W - BAR_W) / 2; // 5px
  const BAR_Y = 54;
  const BAR_H = 18;

  // Pseudo-progress phases
  const PHASES = [
    { t: 0, label: "BOOTING SYSTEM...", target: 0.08 },
    { t: 500, label: "LOADING AGENTS...", target: 0.25 },
    { t: 1500, label: "INITIALIZING OFFICE...", target: 0.5 },
    { t: 3000, label: "CONNECTING TO MATRIX...", target: 0.72 },
    { t: 4500, label: "SYNCING DATA...", target: 0.88 },
  ];

  let progress = 0;
  let target = 0;
  let tick = 0;
  let rafId = null;
  let dismissed = false;

  PHASES.forEach(({ t, label, target: tgt }) => {
    setTimeout(() => {
      if (!dismissed) {
        target = tgt;
        if (statusEl) statusEl.textContent = label;
      }
    }, t);
  });

  const origParse = JSON.parse;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    JSON.parse = origParse;
    target = 1;
    if (statusEl) statusEl.textContent = "READY!";
    setTimeout(() => {
      cancelAnimationFrame(rafId);
      screen.classList.add("hidden");
    }, 700);
  }

  setTimeout(dismiss, 5500);

  JSON.parse = function (text) {
    const obj = origParse.call(JSON, text);
    if (obj && obj.type === "init") dismiss();
    return obj;
  };

  // ── Pixel art walking agent ────────────────────────────────────
  function drawChar(cx, cy, frame) {
    const walk = (frame >> 2) & 1; // alternates every 4 frames
    // shadow
    ctx.fillStyle = "rgba(0,0,30,0.4)";
    ctx.fillRect(cx - 5, cy + 1, 10, 2);
    // hair
    ctx.fillStyle = "#7aa2f7";
    ctx.fillRect(cx - 3, cy - 14, 6, 3);
    // head
    ctx.fillStyle = "#c89060";
    ctx.fillRect(cx - 3, cy - 11, 6, 6);
    // eyes
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(cx - 2, cy - 9, 1, 2);
    ctx.fillRect(cx + 1, cy - 9, 1, 2);
    // body
    ctx.fillStyle = "#7aa2f7";
    ctx.fillRect(cx - 3, cy - 5, 6, 5);
    // arms
    ctx.fillStyle = "#c89060";
    if (walk) {
      ctx.fillRect(cx - 5, cy - 4, 2, 3);
      ctx.fillRect(cx + 3, cy - 3, 2, 3);
    } else {
      ctx.fillRect(cx - 5, cy - 3, 2, 3);
      ctx.fillRect(cx + 3, cy - 4, 2, 3);
    }
    // pants
    ctx.fillStyle = "#3d59a1";
    ctx.fillRect(cx - 3, cy, 6, 3);
    // legs
    ctx.fillStyle = "#c89060";
    if (walk) {
      ctx.fillRect(cx - 3, cy + 3, 2, 4);
      ctx.fillRect(cx + 1, cy + 1, 2, 4);
    } else {
      ctx.fillRect(cx - 3, cy + 1, 2, 4);
      ctx.fillRect(cx + 1, cy + 3, 2, 4);
    }
    // shoes
    ctx.fillStyle = "#1a1b26";
    if (walk) {
      ctx.fillRect(cx - 4, cy + 7, 3, 2);
      ctx.fillRect(cx + 1, cy + 5, 3, 2);
    } else {
      ctx.fillRect(cx - 4, cy + 5, 3, 2);
      ctx.fillRect(cx + 1, cy + 7, 3, 2);
    }
  }

  // ── Render loop ────────────────────────────────────────────────
  function render() {
    tick++;
    progress += (target - progress) * 0.04;
    if (target - progress < 0.001) progress = target;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0a18";
    ctx.fillRect(0, 0, W, H);

    // Outer border
    ctx.strokeStyle = "#3a3860";
    ctx.lineWidth = 1;
    ctx.strokeRect(BAR_X - 3, BAR_Y - 3, BAR_W + 6, BAR_H + 6);

    // Pixel blocks
    const litCount = Math.round(progress * BLOCKS);
    for (let i = 0; i < BLOCKS; i++) {
      const bx = BAR_X + i * (BLK_W + BLK_GAP);
      if (i < litCount) {
        ctx.fillStyle = "#7aa2f7";
        ctx.fillRect(bx, BAR_Y, BLK_W, BAR_H);
        // top highlight
        ctx.fillStyle = "#a9c7ff";
        ctx.fillRect(bx, BAR_Y, BLK_W, 2);
        // scanlines
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(bx, BAR_Y + 7, BLK_W, 2);
        ctx.fillRect(bx, BAR_Y + 14, BLK_W, 2);
        // glow edge on leading block
        if (i === litCount - 1) {
          ctx.shadowColor = "#7aa2f7";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#c8d8ff";
          ctx.fillRect(bx + BLK_W - 2, BAR_Y, 2, BAR_H);
          ctx.shadowBlur = 0;
        }
      } else {
        // unlit
        ctx.fillStyle = "#0d1226";
        ctx.fillRect(bx, BAR_Y, BLK_W, BAR_H);
        ctx.fillStyle = "#1a1e3a";
        ctx.fillRect(bx, BAR_Y, BLK_W, 1);
        ctx.fillRect(bx, BAR_Y, 1, BAR_H);
      }
    }

    // Percentage label
    const pct = Math.round(progress * 100);
    ctx.font = '6px "Press Start 2P",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = progress > 0.45 ? "#0a0a18" : "#3a4870";
    ctx.fillText(pct + "%", W / 2, BAR_Y + BAR_H / 2);

    // Walking agent on top of bar
    const charX = BAR_X + Math.min(progress, 0.99) * BAR_W;
    drawChar(charX, BAR_Y, tick);

    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);
})();

// ════════════════════════════════════════════════════════════════
//  DEMO MODE — 3-minute scripted agent scenario
// ════════════════════════════════════════════════════════════════
(function initDemo() {
  const toolbar = document.getElementById("canvas-toolbar");
  if (!toolbar) return;

  const demoBtn = document.createElement("button");
  demoBtn.id = "btn-demo";
  demoBtn.textContent = "🎬 DEMO";
  toolbar.appendChild(demoBtn);

  let demoRunning = false;
  let demoTimers = [];

  const AGENTS = {
    frontend: { id: "demo-frontend-01", slug: "frontend" },
    backend: { id: "demo-backend-02", slug: "backend" },
    devops: { id: "demo-devops-03", slug: "devops" },
    designer: { id: "demo-designer-04", slug: "designer" },
    qa: { id: "demo-qa-05", slug: "qa" },
    reviewer: { id: "demo-reviewer-06", slug: "reviewer" },
  };

  const TOOL_LABELS = {
    Bash: "⚡ Выполняет команду",
    Read: "📖 Читает файл",
    Write: "✍️ Пишет файл",
    Edit: "✏️ Редактирует файл",
    Grep: "🔍 Ищет в коде",
  };

  function post(data) {
    fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }
  function del(id) {
    fetch("/api/demo/" + id, { method: "DELETE" }).catch(() => {});
  }
  function send(n, ov) {
    const a = AGENTS[n];
    post({ id: a.id, slug: a.slug, ...ov });
  }
  function work(n, tool) {
    send(n, {
      status: "working",
      currentTool: tool,
      currentToolLabel: TOOL_LABELS[tool] || tool,
    });
  }
  function think(n) {
    send(n, { status: "thinking", currentTool: null, currentToolLabel: null });
  }
  function idle(n) {
    send(n, { status: "idle", currentTool: null, currentToolLabel: null });
  }
  function remove(n) {
    del(AGENTS[n].id);
  }
  function at(sec, fn) {
    demoTimers.push(setTimeout(fn, sec * 1000));
  }

  function startScenario() {
    const main5 = ["frontend", "backend", "devops", "designer", "qa"];
    const tools = {
      frontend: ["Edit", "Write", "Bash", "Read"],
      backend: ["Bash", "Read", "Write", "Grep"],
      devops: ["Bash", "Bash", "Read", "Edit"],
      designer: ["Write", "Edit", "Read", "Write"],
      qa: ["Grep", "Read", "Bash", "Edit"],
    };

    // Phase 1: Arrival (0:00-0:30)
    main5.forEach((n, i) => {
      at(i * 6, () => idle(n));
      at(i * 6 + 3, () =>
        work(n, ["Read", "Edit", "Bash", "Write", "Grep"][i]),
      );
    });

    // Phase 2: Working (0:30-1:00)
    main5.forEach((n) => {
      at(30, () => work(n, tools[n][0]));
      at(35, () => think(n));
      at(37, () => work(n, tools[n][1]));
      at(42, () => work(n, tools[n][2]));
      at(47, () => think(n));
      at(49, () => work(n, tools[n][3]));
    });

    // Phase 3: Break (1:00-1:30)
    at(60, () => idle("designer"));
    at(62, () => idle("qa"));
    at(65, () => idle("devops"));
    at(60, () => work("frontend", "Edit"));
    at(65, () => work("backend", "Bash"));
    at(70, () => think("frontend"));
    at(72, () => work("frontend", "Write"));
    at(75, () => think("backend"));
    at(77, () => work("backend", "Read"));

    // Phase 4: Collaboration (1:30-2:00)
    at(90, () => think("designer"));
    at(91, () => think("qa"));
    at(95, () => work("qa", "Grep"));
    at(97, () => idle("reviewer"));
    at(100, () => work("reviewer", "Read"));
    at(105, () => work("reviewer", "Edit"));
    at(100, () => work("designer", "Write"));
    at(102, () => work("devops", "Bash"));
    at(110, () => work("frontend", "Bash"));
    at(114, () => idle("frontend"));
    at(116, () => work("frontend", "Read"));

    // Phase 5: Activities (2:00-2:30)
    at(120, () => idle("qa"));
    at(122, () => idle("designer"));
    at(124, () => idle("devops"));
    at(120, () => work("frontend", "Edit"));
    at(125, () => work("backend", "Write"));
    at(130, () => work("reviewer", "Grep"));
    at(140, () => work("reviewer", "Write"));

    // Phase 6: End of day (2:30-3:00)
    ["reviewer", "designer", "qa", "devops", "backend", "frontend"].forEach(
      (n, i) => {
        at(150 + i * 4, () => idle(n));
        at(153 + i * 4, () => remove(n));
      },
    );

    // Loop
    at(183, () => {
      if (demoRunning) startScenario();
    });
  }

  function stop() {
    demoTimers.forEach((t) => clearTimeout(t));
    demoTimers = [];
    Object.values(AGENTS).forEach((a) => del(a.id));
  }

  demoBtn.onclick = () => {
    if (demoRunning) {
      demoRunning = false;
      demoBtn.textContent = "🎬 DEMO";
      demoBtn.style.background = "#2a2848";
      demoBtn.style.color = "#c8d3f5";
      stop();
    } else {
      demoRunning = true;
      demoBtn.textContent = "⏹ STOP";
      demoBtn.style.background = "#e0af68";
      demoBtn.style.color = "#0a0a18";
      startScenario();
    }
  };
})();

// ════════════════════════════════════════════════════════════════
//  LEADERBOARD PANEL
// ════════════════════════════════════════════════════════════════
(function initLeaderboard() {
  const panel = document.getElementById("leaderboard-panel");
  const backdrop = document.getElementById("leaderboard-backdrop");
  const btnOpen = document.getElementById("btn-leaderboard");
  const btnClose = document.getElementById("lb-close");
  const body = document.getElementById("lb-body");
  const tabs = panel.querySelectorAll(".lb-tab");
  if (!panel || !body) return;

  let activeGame = "snake";

  const GAME_LABELS = {
    snake: { unit: "pts", icon: "🐍" },
    darts: { unit: "pts", icon: "🎯" },
    pingpong: { unit: "wins", icon: "🏓" },
  };

  function loadScores(game) {
    try {
      const lb = JSON.parse(localStorage.getItem("game_leaderboard") || "{}");
      return (lb[game] || []).slice(0, 10);
    } catch {
      return [];
    }
  }

  function renderScores(game) {
    const scores = loadScores(game);
    const { unit } = GAME_LABELS[game];
    body.innerHTML = "";
    if (!scores.length) {
      body.innerHTML =
        '<div class="lb-empty">NO SCORES YET<br>PLAY A GAME!</div>';
      return;
    }
    scores.forEach((entry, i) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      const rankClass =
        i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "other";
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1);
      row.innerHTML =
        '<span class="lb-rank ' +
        rankClass +
        '">' +
        medal +
        "</span>" +
        '<span class="lb-score">' +
        entry.score +
        " " +
        unit +
        "</span>" +
        '<span class="lb-meta">' +
        (entry.date || "") +
        "<br>" +
        (entry.time || "") +
        "</span>";
      body.appendChild(row);
    });
  }

  function open() {
    renderScores(activeGame);
    panel.classList.add("open");
    backdrop.classList.add("open");
  }
  function close() {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
  }

  btnOpen.addEventListener("click", () =>
    panel.classList.contains("open") ? close() : open(),
  );
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) close();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeGame = tab.dataset.game;
      renderScores(activeGame);
    });
  });

  // Expose save function globally so app.js games can call it
  window.saveGameScore = function (game, score) {
    const key = "game_leaderboard";
    let lb;
    try {
      lb = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      lb = {};
    }
    if (!lb[game]) lb[game] = [];
    const now = new Date();
    lb[game].unshift({
      score,
      date: now.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    lb[game] = lb[game].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(key, JSON.stringify(lb));
  };
})();
