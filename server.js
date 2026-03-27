const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { WebSocketServer } = require("ws");
const chokidar = require("chokidar");

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const PORT = process.env.PORT || 3737;

// Agent state: sessionId -> agent info
const agents = {};
const agentTasks = {}; // agentId -> { todos: [{id,content,status,priority}], updatedAt }

// Shared layout — synced to all clients when admin moves objects
let sharedLayout = { positions: null, walls: null };

const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Load persisted tasks on startup
let myTasks = [];
try {
  if (fs.existsSync(TASKS_FILE)) myTasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
} catch { myTasks = []; }

function saveTasks() {
  try { fs.writeFileSync(TASKS_FILE, JSON.stringify(myTasks, null, 2)); } catch {}
}

// Track file read positions
const filePositions = {};

// WebSocket clients
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function getToolLabel(toolName) {
  const labels = {
    Bash: "⚡ Выполняет команду",
    Read: "📖 Читает файл",
    Write: "✍️ Пишет файл",
    Edit: "✏️ Редактирует файл",
    Grep: "🔍 Ищет в коде",
    Glob: "📂 Ищет файлы",
    WebFetch: "🌐 Загружает страницу",
    WebSearch: "🔎 Ищет в интернете",
    Agent: "🤖 Запускает субагента",
    TodoWrite: "📋 Обновляет задачи",
  };
  return labels[toolName] || `🔧 ${toolName}`;
}

// Read meta.json for subagents to get type/description
function readSubagentMeta(filePath) {
  const metaPath = filePath.replace(".jsonl", ".meta.json");
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    return meta;
  } catch {
    return null;
  }
}

// Check if a file is in a subagents directory
function isSubagentFile(filePath) {
  return filePath.includes("subagents") && path.basename(filePath).startsWith("agent-");
}

function parseNewLines(filePath) {
  const fileBaseName = path.basename(filePath, ".jsonl");
  const projectDir = path.dirname(filePath);

  // For subagent files, use the agent ID from filename as the unique ID
  const isSubagent = isSubagentFile(filePath);
  const subagentId = isSubagent ? fileBaseName.replace("agent-", "") : null;

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return;
  }

  const prevPos = filePositions[filePath] || 0;
  if (stat.size <= prevPos) return;

  let buf;
  const fd = fs.openSync(filePath, "r");
  try {
    buf = Buffer.alloc(stat.size - prevPos);
    fs.readSync(fd, buf, 0, buf.length, prevPos);
  } finally {
    fs.closeSync(fd);
  }

  const lines = buf.toString("utf8").split("\n").filter(Boolean);

  // Read meta once for subagents
  const meta = isSubagent ? readSubagentMeta(filePath) : null;

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const { type, message, sessionId: sid, slug, cwd, timestamp, version } = entry;
    // Subagents: always use their own ID, not the parent session ID
    const id = isSubagent ? subagentId : (sid || fileBaseName);

    if (!agents[id]) {
      // For subagents: use type+description from meta as the slug
      let agentSlug = slug || id.slice(0, 8);
      if (meta) {
        agentSlug = meta.description
          ? meta.description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28)
          : (meta.agentType || "agent");
      }
      agents[id] = {
        id,
        slug: agentSlug,
        cwd: cwd || projectDir,
        version: version || "",
        status: "idle",
        currentTool: null,
        lastActivity: timestamp || new Date().toISOString(),
        messageCount: 0,
        toolHistory: [],
        startedAt: timestamp || new Date().toISOString(),
        isSubagent: isSubagent,
        agentType: meta ? meta.agentType : null,
      };
    }

    const agent = agents[id];
    if (!isSubagent && slug) agent.slug = slug;
    if (cwd) agent.cwd = cwd;
    if (timestamp) agent.lastActivity = timestamp;

    if (type === "assistant" && message) {
      const content = message.content || [];
      agent.messageCount++;

      const toolUse = content.find((c) => c.type === "tool_use");
      const textContent = content.find((c) => c.type === "text");

      if (toolUse) {
        agent.status = "working";
        agent.currentTool = toolUse.name;
        agent.currentToolLabel = getToolLabel(toolUse.name);
        agent.toolHistory.unshift({ tool: toolUse.name, time: timestamp });
        if (agent.toolHistory.length > 5) agent.toolHistory.pop();

        // Parse TodoWrite to extract task list
        if (toolUse && toolUse.name === 'TodoWrite' && toolUse.input?.todos) {
          agentTasks[id] = {
            todos: toolUse.input.todos,
            updatedAt: timestamp || new Date().toISOString(),
          };
          broadcast({ type: 'tasks_update', agentId: id, ...agentTasks[id] });
        }
      } else if (textContent) {
        agent.status = "thinking";
        agent.currentTool = null;
        agent.currentToolLabel = null;
        agent.lastText = textContent.text?.slice(0, 120) || "";
      }
    }

    if (type === "user" && message) {
      agent.status = "thinking";
      agent.currentTool = null;
      agent.currentToolLabel = null;
    }

    broadcast({ type: "agent_update", agent: { ...agent } });
  }

  // Update position only after successful parse
  filePositions[filePath] = stat.size;
}

function collectJsonlFiles(dir, results = [], depth = 0) {
  if (depth > 4) return results;
  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const s = fs.statSync(full);
        if (s.isDirectory()) {
          collectJsonlFiles(full, results, depth + 1);
        } else if (entry.endsWith(".jsonl")) {
          results.push(full);
        }
      } catch {}
    }
  } catch {}
  return results;
}

function scanExistingFiles() {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return;

  const allJsonl = collectJsonlFiles(CLAUDE_PROJECTS_DIR);

  // Sort by modification time - parse oldest first
  allJsonl.sort((a, b) => {
    try { return fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs; } catch { return 0; }
  });

  for (const filePath of allJsonl) {
    filePositions[filePath] = 0;
    parseNewLines(filePath);
  }
}

// HTTP server
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/api/agents") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Object.values(agents)));
    return;
  }

  if (req.url === '/api/tasks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(agentTasks));
    return;
  }

  // Personal tasks — GET all
  if (req.url === '/api/mytasks' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(myTasks));
    return;
  }

  // Personal tasks — POST create
  if (req.url === '/api/mytasks' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const t = JSON.parse(body);
        const task = {
          id: Date.now().toString(),
          title: t.title || '',
          assignee: t.assignee || 'me',
          priority: t.priority || 'medium',
          status: 'todo',
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        myTasks.unshift(task);
        saveTasks();
        broadcast({ type: 'mytasks_update', tasks: myTasks });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }

  // Personal tasks — PATCH update (toggle done / change fields)
  if (req.url.startsWith('/api/mytasks/') && req.method === 'PATCH') {
    const id = req.url.slice('/api/mytasks/'.length);
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const patch = JSON.parse(body);
        const task = myTasks.find(t => t.id === id);
        if (!task) { res.writeHead(404); res.end('not found'); return; }
        Object.assign(task, patch);
        if (patch.status === 'done' && !task.completedAt) task.completedAt = new Date().toISOString();
        if (patch.status === 'todo') task.completedAt = null;
        saveTasks();
        broadcast({ type: 'mytasks_update', tasks: myTasks });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }

  // Personal tasks — DELETE
  if (req.url.startsWith('/api/mytasks/') && req.method === 'DELETE') {
    const id = req.url.slice('/api/mytasks/'.length);
    myTasks = myTasks.filter(t => t.id !== id);
    saveTasks();
    broadcast({ type: 'mytasks_update', tasks: myTasks });
    res.writeHead(200); res.end('ok');
    return;
  }

  // ── API: GET /api/layout — get shared layout positions ──
  if (req.url === '/api/layout' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(sharedLayout));
    return;
  }

  // ── API: POST /api/layout — save + broadcast layout to all clients ──
  if (req.url === '/api/layout' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.positions) sharedLayout.positions = data.positions;
        if (data.walls) sharedLayout.walls = data.walls;
        // Broadcast to all connected clients
        broadcast({ type: 'layout_update', layout: sharedLayout });
        res.writeHead(200); res.end('ok');
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }

  if (req.url === '/api/layout' && req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  // ── API: GET /api/state — full state snapshot for HTTP polling ──
  if (req.url === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ agents: Object.values(agents), tasks: agentTasks, myTasks }));
    return;
  }

  // ── API: POST /api/sync — receive full state push from local server ──
  if (req.url === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const key = req.headers['x-sync-key'] || '';
        if (process.env.SYNC_KEY && key !== process.env.SYNC_KEY) {
          res.writeHead(403); res.end('forbidden'); return;
        }
        // Replace agents state
        if (data.agents) {
          const incomingIds = new Set();
          for (const a of data.agents) {
            incomingIds.add(a.id);
            agents[a.id] = a;
          }
          // Remove agents not in sync payload
          for (const id of Object.keys(agents)) {
            if (!incomingIds.has(id)) delete agents[id];
          }
        }
        if (data.tasks) Object.assign(agentTasks, data.tasks);
        if (data.myTasks) myTasks = data.myTasks;
        // Broadcast to all connected WS clients
        broadcast({ type: 'init', agents: Object.values(agents) });
        broadcast({ type: 'tasks_init', tasks: agentTasks });
        broadcast({ type: 'mytasks_init', tasks: myTasks });
        res.writeHead(200); res.end('ok');
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }

  // CORS preflight for sync
  if (req.url === '/api/sync' && req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key' });
    res.end();
    return;
  }

  // Demo injection: POST /api/demo  {"id","slug","status","currentTool","currentToolLabel"}
  if (req.url === "/api/demo" && req.method === "POST") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      try {
        const a = JSON.parse(body);
        if (!agents[a.id]) {
          agents[a.id] = { id: a.id, slug: a.slug, cwd: "C:\\AI", version: "demo",
            status: "idle", currentTool: null, currentToolLabel: null,
            lastActivity: new Date().toISOString(), messageCount: 0,
            toolHistory: [], startedAt: new Date().toISOString(),
            isSubagent: false, agentType: null };
        }
        Object.assign(agents[a.id], a, { lastActivity: new Date().toISOString() });
        broadcast({ type: "agent_update", agent: { ...agents[a.id] } });
        res.writeHead(200); res.end("ok");
      } catch { res.writeHead(400); res.end("bad"); }
    });
    return;
  }

  // Demo remove: DELETE /api/demo/:id
  if (req.url.startsWith("/api/demo/") && req.method === "DELETE") {
    const id = req.url.slice("/api/demo/".length);
    delete agents[id];
    broadcast({ type: "agent_remove", id });
    res.writeHead(200); res.end("ok");
    return;
  }

  const publicDir = path.join(__dirname, "public");
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(req.url);
  } catch {
    res.writeHead(400); res.end("Bad Request"); return;
  }
  const filePath = decodedUrl === "/" ? path.join(publicDir, "index.html") : path.resolve(publicDir, "." + decodedUrl);

  // Prevent path traversal attacks
  if (!filePath.startsWith(publicDir + path.sep) && filePath !== path.join(publicDir, "index.html")) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[ext] || "text/plain";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.on("error", (err) => console.error("HTTP server error:", err));

// WebSocket server
const wss = new WebSocketServer({ server });
wss.on("error", (err) => console.error("WebSocket server error:", err));
wss.on("connection", (ws) => {
  clients.add(ws);
  // Send current state
  ws.send(JSON.stringify({ type: "init", agents: Object.values(agents) }));
  ws.send(JSON.stringify({ type: 'tasks_init', tasks: agentTasks }));
  ws.send(JSON.stringify({ type: 'mytasks_init', tasks: myTasks }));
  if (sharedLayout.positions) ws.send(JSON.stringify({ type: 'layout_update', layout: sharedLayout }));
  ws.on("close", () => clients.delete(ws));
});

// File watcher
scanExistingFiles();

const watchPattern = path.join(CLAUDE_PROJECTS_DIR, "**", "*.jsonl");
if (fs.existsSync(CLAUDE_PROJECTS_DIR)) {
chokidar
  .watch(watchPattern, { ignoreInitial: true, usePolling: true, interval: 500, awaitWriteFinish: { stabilityThreshold: 100 } })
  .on("change", parseNewLines)
  .on("add", (filePath) => {
    if (filePositions[filePath] === undefined) filePositions[filePath] = 0;
    parseNewLines(filePath);
  })
  .on("unlink", (filePath) => {
    // Fix: clean up filePositions to prevent memory leak
    delete filePositions[filePath];
  });
} else {
  console.log("⚠️  Claude projects dir not found, running in demo mode (no file watcher)");
}

// Mark agents as idle after 30s of inactivity
// Remove agents that have been idle for more than 24h AND are subagents (cleanup)
setInterval(() => {
  const now = Date.now();
  for (const agent of Object.values(agents)) {
    const lastMs = new Date(agent.lastActivity).getTime();
    const ageMs = now - lastMs;

    if (agent.status !== "idle" && ageMs > 20000) {
      agent.status = "idle";
      agent.currentTool = null;
      agent.currentToolLabel = null;
      broadcast({ type: "agent_update", agent: { ...agent } });
    }

    // Fix: remove stale agents to prevent memory leak
    const staleMs = agent.isSubagent ? 3600000 : 86400000 * 7; // 1h for subagents, 7d for sessions
    if (ageMs > staleMs) {
      delete agents[agent.id];
      broadcast({ type: "agent_remove", id: agent.id });
    }
  }
}, 5000);

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`\n🤖 Agent Dashboard запущен: http://localhost:${PORT}`);
  console.log(`Слежу за: ${CLAUDE_PROJECTS_DIR}\n`);

  // Get local network IP
  const nets = require("os").networkInterfaces();
  for (const iface of Object.values(nets).flat()) {
    if (iface.family === "IPv4" && !iface.internal) {
      console.log(`📡 Локальная сеть: http://${iface.address}:${PORT}`);
    }
  }

  // Serveo SSH tunnel (no password)
  try {
    const { spawn } = require("child_process");
    const ssh = spawn("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "ServerAliveInterval=30",
      "-R", `80:localhost:${PORT}`,
      "serveo.net"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let urlSent = false;
    const onData = (data) => {
      if (urlSent) return;
      const match = data.toString().match(/https?:\/\/[^\s]+serveousercontent\.com/);
      if (match) {
        urlSent = true;
        const url = match[0].replace(/^http:/, "https:");
        console.log(`\n🌐 Публичный URL: ${url}\n`);
        broadcast({ type: "public_url", url });
        // Remove listeners once URL is captured
        ssh.stdout.off("data", onData);
        ssh.stderr.off("data", onData);
      }
    };
    ssh.stdout.on("data", onData);
    ssh.stderr.on("data", onData);
    ssh.on("exit", () => { console.log("Tunnel closed"); broadcast({ type: "public_url", url: null }); });
    ssh.on("error", () => broadcast({ type: "public_url", url: null }));

    // Kill tunnel when server exits
    process.on("SIGINT", () => { ssh.kill(); process.exit(); });
    process.on("SIGTERM", () => { ssh.kill(); process.exit(); });
  } catch (e) {
    broadcast({ type: "public_url", url: null });
  }
});
