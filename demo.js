/**
 * demo.js — демонстрирует живых агентов через /api/demo endpoint
 * Запуск: node demo.js
 * Ctrl+C — останавливает и убирает всех демо-агентов
 */
const http = require("http");

const BASE = "http://localhost:3737";

const TOOL_LABELS = {
  Bash:"⚡ Выполняет команду", Read:"📖 Читает файл", Write:"✍️ Пишет файл",
  Edit:"✏️ Редактирует файл", Grep:"🔍 Ищет в коде", Glob:"📂 Ищет файлы",
  WebFetch:"🌐 Загружает страницу", WebSearch:"🔎 Ищет в интернете",
  Agent:"🤖 Запускает субагента", TodoWrite:"📋 Обновляет задачи",
};

// 6 агентов с разными паттернами активности
const AGENTS = [
  {
    id: "demo-aaaa1111",
    slug: "blazing-fast-builder",
    // furious typist: быстрая смена Bash/Write
    sequence: [
      { status:"working", tool:"Bash",   ms:1800 },
      { status:"thinking",tool:null,     ms:600  },
      { status:"working", tool:"Write",  ms:1200 },
      { status:"thinking",tool:null,     ms:400  },
      { status:"working", tool:"Bash",   ms:2200 },
      { status:"thinking",tool:null,     ms:800  },
      { status:"working", tool:"Edit",   ms:1500 },
      { status:"thinking",tool:null,     ms:500  },
    ],
  },
  {
    id: "demo-bbbb2222",
    slug: "curious-file-explorer",
    // методичный: Read + Glob + Grep
    sequence: [
      { status:"working", tool:"Glob",   ms:2000 },
      { status:"thinking",tool:null,     ms:1200 },
      { status:"working", tool:"Read",   ms:3000 },
      { status:"thinking",tool:null,     ms:1500 },
      { status:"working", tool:"Grep",   ms:2500 },
      { status:"thinking",tool:null,     ms:1000 },
      { status:"working", tool:"Read",   ms:2200 },
      { status:"thinking",tool:null,     ms:800  },
    ],
  },
  {
    id: "demo-cccc3333",
    slug: "deep-web-researcher",
    // веб: WebSearch + WebFetch
    sequence: [
      { status:"working", tool:"WebSearch", ms:3000 },
      { status:"thinking",tool:null,        ms:2000 },
      { status:"working", tool:"WebFetch",  ms:4000 },
      { status:"thinking",tool:null,        ms:2500 },
      { status:"working", tool:"WebSearch", ms:2800 },
      { status:"thinking",tool:null,        ms:1800 },
    ],
  },
  {
    id: "demo-dddd4444",
    slug: "smart-code-debugger",
    // дебаггер: Grep тяжёлый, редкие Edit
    sequence: [
      { status:"working", tool:"Grep",  ms:3500 },
      { status:"thinking",tool:null,    ms:2000 },
      { status:"working", tool:"Read",  ms:2000 },
      { status:"thinking",tool:null,    ms:1500 },
      { status:"working", tool:"Grep",  ms:4000 },
      { status:"thinking",tool:null,    ms:2500 },
      { status:"working", tool:"Edit",  ms:1800 },
      { status:"thinking",tool:null,    ms:1200 },
    ],
  },
  {
    id: "demo-eeee5555",
    slug: "architect-planner",
    // планировщик: долгие паузы, TodoWrite + Agent
    sequence: [
      { status:"thinking", tool:null,       ms:3000 },
      { status:"working",  tool:"TodoWrite", ms:1500 },
      { status:"thinking", tool:null,        ms:4000 },
      { status:"working",  tool:"Agent",     ms:2000 },
      { status:"thinking", tool:null,        ms:3500 },
      { status:"working",  tool:"Read",      ms:2500 },
    ],
  },
  {
    id: "demo-ffff6666",
    slug: "pixel-art-developer",
    // разработчик: Read → Write → Bash
    sequence: [
      { status:"working", tool:"Read",  ms:2500 },
      { status:"thinking",tool:null,    ms:1000 },
      { status:"working", tool:"Write", ms:3000 },
      { status:"thinking",tool:null,    ms:800  },
      { status:"working", tool:"Bash",  ms:1600 },
      { status:"thinking",tool:null,    ms:1200 },
      { status:"working", tool:"Read",  ms:2000 },
      { status:"thinking",tool:null,    ms:700  },
    ],
  },
];

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, res => { res.resume(); resolve(); });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

function del(id) {
  return new Promise((resolve) => {
    const req = http.request(`${BASE}/api/demo/${id}`, { method: "DELETE" }, res => { res.resume(); resolve(); });
    req.on("error", resolve);
    req.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runAgent(agent) {
  let idx = 0;
  while (true) {
    const step = agent.sequence[idx % agent.sequence.length];
    await post("/api/demo", {
      id: agent.id,
      slug: agent.slug,
      status: step.status,
      currentTool: step.tool,
      currentToolLabel: step.tool ? TOOL_LABELS[step.tool] : null,
      messageCount: Math.floor(idx / 2) + 1,
    });
    await sleep(step.ms);
    idx++;
  }
}

async function cleanup() {
  console.log("\n🧹 Убираем демо-агентов...");
  await Promise.all(AGENTS.map(a => del(a.id)));
  console.log("✓ Дашборд вернулся в обычный режим.");
  process.exit(0);
}

process.on("SIGINT",  cleanup);
process.on("SIGTERM", cleanup);

async function main() {
  // Ждём пока сервер поднимется (если только что перезапущен)
  await sleep(500);
  console.log("🎬 Запускаем демо-агентов...");
  for (const a of AGENTS) {
    await post("/api/demo", { id: a.id, slug: a.slug, status: "working", currentTool: "Bash", currentToolLabel: TOOL_LABELS.Bash });
    console.log(`  ✓ ${a.slug}`);
  }
  console.log("\n✅ Открой http://localhost:3737");
  console.log("   Ctrl+C — остановить демо\n");

  // Запускаем все агенты параллельно
  await Promise.all(AGENTS.map(a => runAgent(a)));
}

main().catch(console.error);
