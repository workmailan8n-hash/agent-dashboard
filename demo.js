/**
 * demo.js — 3-minute scripted office demo scenario
 * Запуск: node demo.js
 * Ctrl+C — останавливает и убирает всех демо-агентов
 *
 * Сценарий (180 секунд, зацикленный):
 *   0:00-0:30  Morning arrival — 5 агентов заходят по одному
 *   0:30-1:00  Working phase — все работают
 *   1:00-1:30  Break time — перерыв, кофе, сон
 *   1:30-2:00  Collaboration — чат, новый агент, конфетти
 *   2:00-2:30  Activity phase — пинг-понг, йога, аркада
 *   2:30-3:00  End of day — уходят по одному, свет гаснет
 */
const http = require("http");
require("dotenv").config();

const BASE = process.env.DEMO_URL || "http://localhost:3737";
const TOKEN = process.env.ADMIN_TOKEN || "";

const TOOL_LABELS = {
  Bash:      "⚡ Выполняет команду",
  Read:      "📖 Читает файл",
  Write:     "✍️ Пишет файл",
  Edit:      "✏️ Редактирует файл",
  Grep:      "🔍 Ищет в коде",
  Glob:      "📂 Ищет файлы",
  WebFetch:  "🌐 Загружает страницу",
  WebSearch: "🔎 Ищет в интернете",
  Agent:     "🤖 Запускает субагента",
  TodoWrite: "📋 Обновляет задачи",
};

// 5 main agents + 1 late joiner
const AGENTS = {
  frontend: { id: "demo-frontend-01", slug: "frontend" },
  backend:  { id: "demo-backend-02",  slug: "backend" },
  devops:   { id: "demo-devops-03",   slug: "devops" },
  designer: { id: "demo-designer-04", slug: "designer" },
  qa:       { id: "demo-qa-05",       slug: "qa" },
  reviewer: { id: "demo-reviewer-06", slug: "reviewer" },
};

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    };
    if (TOKEN) headers["X-Admin-Token"] = TOKEN;
    const url = new URL(path, BASE);
    const req = http.request(url, { method: "POST", headers }, res => {
      res.resume();
      resolve();
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function del(id) {
  return new Promise((resolve) => {
    const url = new URL(`/api/demo/${id}`, BASE);
    const headers = {};
    if (TOKEN) headers["X-Admin-Token"] = TOKEN;
    const req = http.request(url, { method: "DELETE", headers }, res => {
      res.resume();
      resolve();
    });
    req.on("error", resolve);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Send agent state update
function send(name, overrides) {
  const agent = AGENTS[name];
  return post("/api/demo", {
    id: agent.id,
    slug: agent.slug,
    ...overrides,
  });
}

// Send working status with tool cycling
function sendWorking(name, tool) {
  return send(name, {
    status: "working",
    currentTool: tool,
    currentToolLabel: TOOL_LABELS[tool] || tool,
  });
}

function sendThinking(name) {
  return send(name, {
    status: "thinking",
    currentTool: null,
    currentToolLabel: null,
  });
}

function sendIdle(name) {
  return send(name, {
    status: "idle",
    currentTool: null,
    currentToolLabel: null,
  });
}

function remove(name) {
  return del(AGENTS[name].id);
}

// ════════════════════════════════════════════════════════════════
// SCENARIO — 180 seconds total
// ════════════════════════════════════════════════════════════════

// Helper: schedule event at offset (seconds from cycle start)
function buildTimeline() {
  const events = [];

  function at(sec, fn) {
    events.push({ sec, fn });
  }

  // ── Phase 1: Morning arrival (0:00 - 0:30) ──────────────────
  // Agents spawn one by one every 6 seconds
  const mainAgents = ["frontend", "backend", "devops", "designer", "qa"];

  mainAgents.forEach((name, i) => {
    at(i * 6, () => {
      console.log(`  → ${name} arrives`);
      return sendIdle(name);
    });
    // After 3 seconds, they start working
    at(i * 6 + 3, () => {
      const tools = ["Read", "Edit", "Bash", "Write", "Grep"];
      return sendWorking(name, tools[i]);
    });
  });

  // ── Phase 2: Working phase (0:30 - 1:00) ────────────────────
  // Agents cycle through tools, occasional thinking pauses
  const toolCycles = {
    frontend: ["Edit", "Write", "Bash", "Read"],
    backend:  ["Bash", "Read", "Write", "Grep"],
    devops:   ["Bash", "Bash", "Read", "Edit"],
    designer: ["Write", "Edit", "Read", "Write"],
    qa:       ["Grep", "Read", "Bash", "Edit"],
  };

  mainAgents.forEach((name, i) => {
    // Tool cycle every ~5 sec
    at(30, () => sendWorking(name, toolCycles[name][0]));
    at(35, () => sendThinking(name));
    at(37, () => sendWorking(name, toolCycles[name][1]));
    at(42, () => sendWorking(name, toolCycles[name][2]));
    at(47, () => sendThinking(name));
    at(49, () => sendWorking(name, toolCycles[name][3]));
  });

  // One agent gets a speech bubble moment
  at(40, () => {
    console.log("  → frontend: shipping!");
    return sendWorking("frontend", "Bash");
  });
  at(55, () => sendWorking("frontend", "Write"));

  // ── Phase 3: Break time (1:00 - 1:30) ───────────────────────
  // 2 agents go to kitchen (idle), 1 to couch (idle), 2 keep working
  at(60, () => {
    console.log("  → designer goes to kitchen");
    return sendIdle("designer");
  });
  at(62, () => {
    console.log("  → qa goes to kitchen");
    return sendIdle("qa");
  });
  at(65, () => {
    console.log("  → devops takes a nap");
    return sendIdle("devops");
  });
  // frontend and backend keep working
  at(60, () => sendWorking("frontend", "Edit"));
  at(65, () => sendWorking("backend", "Bash"));
  at(70, () => sendThinking("frontend"));
  at(72, () => sendWorking("frontend", "Write"));
  at(75, () => sendThinking("backend"));
  at(77, () => sendWorking("backend", "Read"));
  at(80, () => sendWorking("frontend", "Bash"));
  at(85, () => sendWorking("backend", "Edit"));

  // ── Phase 4: Collaboration (1:30 - 2:00) ────────────────────
  // Kitchen agents start chatting (thinking = chat bubble)
  at(90, () => {
    console.log("  → designer and qa chatting");
    return sendThinking("designer");
  });
  at(91, () => sendThinking("qa"));

  // One returns to desk
  at(95, () => {
    console.log("  → qa returns to work");
    return sendWorking("qa", "Grep");
  });

  // New agent spawns: reviewer
  at(97, () => {
    console.log("  → reviewer arrives!");
    return sendIdle("reviewer");
  });
  at(100, () => sendWorking("reviewer", "Read"));
  at(103, () => sendThinking("reviewer"));
  at(105, () => sendWorking("reviewer", "Edit"));

  // designer returns to work
  at(100, () => {
    console.log("  → designer back to work");
    return sendWorking("designer", "Write");
  });

  // devops wakes up and works
  at(102, () => {
    console.log("  → devops back to work");
    return sendWorking("devops", "Bash");
  });

  // Agent finishes a task — confetti! (rapid tool cycling then idle)
  at(110, () => {
    console.log("  → frontend finishes task!");
    return sendWorking("frontend", "Bash");
  });
  at(112, () => sendThinking("frontend"));
  // The dashboard auto-celebrates when status goes from working→idle
  at(114, () => sendIdle("frontend"));
  at(116, () => sendWorking("frontend", "Read"));

  // ── Phase 5: Activity phase (2:00 - 2:30) ───────────────────
  // One agent plays ping pong
  at(120, () => {
    console.log("  → qa plays ping pong");
    return sendIdle("qa");
  });
  // One agent does yoga
  at(122, () => {
    console.log("  → designer does yoga");
    return sendIdle("designer");
  });
  // One agent plays arcade
  at(124, () => {
    console.log("  → devops plays arcade");
    return sendIdle("devops");
  });
  // Others keep working
  at(120, () => sendWorking("frontend", "Edit"));
  at(125, () => sendWorking("backend", "Write"));
  at(128, () => sendThinking("frontend"));
  at(130, () => sendWorking("frontend", "Bash"));
  at(130, () => sendWorking("reviewer", "Grep"));
  at(135, () => sendThinking("backend"));
  at(137, () => sendWorking("backend", "Read"));
  at(140, () => sendWorking("reviewer", "Write"));
  at(145, () => sendThinking("reviewer"));

  // ── Phase 6: End of day (2:30 - 3:00) ───────────────────────
  // Agents finish one by one, walk to door and despawn

  const despawnOrder = ["reviewer", "designer", "qa", "devops", "backend", "frontend"];
  despawnOrder.forEach((name, i) => {
    // Go idle first (walk to door)
    at(150 + i * 4, () => {
      console.log(`  ← ${name} leaves`);
      return sendIdle(name);
    });
    // Remove after 3 seconds
    at(153 + i * 4, () => remove(name));
  });

  // Sort events by time
  events.sort((a, b) => a.sec - b.sec);
  return events;
}


async function cleanup() {
  console.log("\n🧹 Убираем демо-агентов...");
  const all = Object.values(AGENTS);
  await Promise.all(all.map(a => del(a.id)));
  console.log("✓ Дашборд вернулся в обычный режим.");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function checkRealAgents() {
  return new Promise((resolve) => {
    const url = new URL("/api/agents", BASE);
    const req = http.request(url, { method: "GET" }, res => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try {
          const agents = JSON.parse(body);
          const real = agents.filter(a => !a.id.startsWith("demo-"));
          resolve(real.length);
        } catch { resolve(0); }
      });
    });
    req.on("error", () => resolve(0));
    req.end();
  });
}

async function runCycle() {
  const timeline = buildTimeline();
  const startTime = Date.now();

  console.log("\n🎬 Цикл начинается...");
  console.log("   0:00 — Morning arrival");

  let phaseAnnounced = { 30: false, 60: false, 90: false, 120: false, 150: false };

  for (const event of timeline) {
    const elapsed = (Date.now() - startTime) / 1000;
    const wait = event.sec - elapsed;
    if (wait > 0) await sleep(wait * 1000);

    // Phase announcements
    const sec = event.sec;
    if (sec >= 30 && !phaseAnnounced[30])  { phaseAnnounced[30] = true;  console.log("   0:30 — Working phase"); }
    if (sec >= 60 && !phaseAnnounced[60])  { phaseAnnounced[60] = true;  console.log("   1:00 — Break time"); }
    if (sec >= 90 && !phaseAnnounced[90])  { phaseAnnounced[90] = true;  console.log("   1:30 — Collaboration"); }
    if (sec >= 120 && !phaseAnnounced[120]) { phaseAnnounced[120] = true; console.log("   2:00 — Activity phase"); }
    if (sec >= 150 && !phaseAnnounced[150]) { phaseAnnounced[150] = true; console.log("   2:30 — End of day"); }

    try { await event.fn(); } catch (e) { /* ignore network errors */ }
  }

  // Wait for last agent to despawn (3 seconds after last event)
  await sleep(3000);
  console.log("   3:00 — Cycle complete\n");
}

async function main() {
  console.log("🎬 Agent Dashboard — 3 Minute Demo");
  console.log(`   Server: ${BASE}`);

  // Check for real agents
  const realCount = await checkRealAgents();
  if (realCount > 0) {
    console.log(`\n⚠  ${realCount} real agent(s) connected.`);
    console.log("   Demo agents will be mixed in with real ones.");
    console.log("   Press Ctrl+C within 3 seconds to cancel...\n");
    await sleep(3000);
  }

  console.log("✅ Открой http://localhost:3737");
  console.log("   Ctrl+C — остановить демо\n");

  // Loop forever
  while (true) {
    await runCycle();
    console.log("   ↻ Restarting in 3 seconds...");
    await sleep(3000);
  }
}

main().catch(console.error);
