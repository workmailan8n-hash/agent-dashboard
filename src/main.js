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
//  LOADING SCREEN
// ════════════════════════════════════════════════════════════════
(function initLoading() {
  const screen = document.getElementById("loading-screen");
  const bar = document.getElementById("loading-bar");
  if (!screen || !bar) return;

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    JSON.parse = origParse; // restore native JSON.parse
    bar.style.width = "100%";
    setTimeout(() => {
      screen.classList.add("hidden");
    }, 400);
  }

  // pseudo-progress
  setTimeout(() => {
    bar.style.width = "25%";
  }, 500);
  setTimeout(() => {
    bar.style.width = "60%";
  }, 2000);
  setTimeout(() => {
    bar.style.width = "88%";
  }, 4500);

  // fallback: hide after 5s regardless
  setTimeout(dismiss, 5000);

  // hook into WebSocket init message
  const origParse = JSON.parse;
  const _parse = function (text) {
    const obj = origParse.call(JSON, text);
    if (obj && obj.type === "init") dismiss();
    return obj;
  };
  JSON.parse = _parse;
})();

// ════════════════════════════════════════════════════════════════
//  DEMO MODE — 3-minute scripted agent scenario
// ════════════════════════════════════════════════════════════════
(function initDemo() {
  const tabs = document.querySelector("header");
  if (!tabs) return;

  const demoBtn = document.createElement("button");
  demoBtn.id = "btn-demo";
  demoBtn.textContent = "🎬 DEMO";
  demoBtn.style.cssText =
    "background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:4px 10px;font-family:inherit;font-size:7px;cursor:pointer;margin-left:4px;border-radius:4px;";
  // Insert after SET button
  const setBtn = document.getElementById("btn-settings");
  if (setBtn) setBtn.after(demoBtn);
  else tabs.appendChild(demoBtn);

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
