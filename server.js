require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');

const log = require('./src/server/logger');
const { requireAuth } = require('./src/server/auth');
const { handleGetAgents } = require('./src/server/handlers/agents');
const { handleGetTasks } = require('./src/server/handlers/tasks');
const { handleGetLayout, handlePostLayout } = require('./src/server/handlers/layout');
const { handlePostSync, handleGetState } = require('./src/server/handlers/sync');
const { handlePostDemo, handleDeleteDemo } = require('./src/server/handlers/demo');
const { handleTgWebhook, handleGetTgFeedback } = require('./src/server/handlers/telegram');
const { handleRailwayWebhook } = require('./src/server/handlers/railway-webhook');

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const PORT = process.env.PORT || 3737;

// Agent state: sessionId -> agent info
const agents = {};
const agentTasks = {}; // agentId -> { todos: [{id,content,status,priority}], updatedAt }

// Shared layout — synced to all clients when admin moves objects
let sharedLayout = { positions: null, walls: null };

// Public tunnel URL (set by Serveo)
let publicUrl = null;

// Telegram bot
const TG_TOKEN = process.env.TG_TOKEN || '';
const TG_CHAT = process.env.TG_CHAT || '';
if (!TG_TOKEN) log.warn('TG_TOKEN not set — Telegram functions disabled');
let lastTgFeedback = { action: null, text: null, timestamp: null };

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
    Bash: '⚡ Выполняет команду',
    Read: '📖 Читает файл',
    Write: '✍️ Пишет файл',
    Edit: '✏️ Редактирует файл',
    Grep: '🔍 Ищет в коде',
    Glob: '📂 Ищет файлы',
    WebFetch: '🌐 Загружает страницу',
    WebSearch: '🔎 Ищет в интернете',
    Agent: '🤖 Запускает субагента',
    TodoWrite: '📋 Обновляет задачи',
  };
  return labels[toolName] || `🔧 ${toolName}`;
}

// Read meta.json for subagents to get type/description
function readSubagentMeta(filePath) {
  const metaPath = filePath.replace('.jsonl', '.meta.json');
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return meta;
  } catch (e) {
    log.debug('No meta for', filePath, e.message);
    return null;
  }
}

// Derive project name from cwd path (e.g. "C:\AI\courseai" → "courseai")
function deriveProjectName(cwdPath) {
  if (!cwdPath) return '';
  // Normalize path and extract the last meaningful directory
  const normalized = cwdPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/');
  // Walk up from the end to find a non-generic directory name
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].toLowerCase();
    if (
      part &&
      part !== 'src' &&
      part !== 'public' &&
      part !== 'dist' &&
      part !== 'node_modules' &&
      part !== '.claude' &&
      part !== 'projects'
    ) {
      return part;
    }
  }
  return '';
}

// Check if a file is in a subagents directory
function isSubagentFile(filePath) {
  return filePath.includes('subagents') && path.basename(filePath).startsWith('agent-');
}

function parseNewLines(filePath) {
  const fileBaseName = path.basename(filePath, '.jsonl');
  const projectDir = path.dirname(filePath);

  // For subagent files, use the agent ID from filename as the unique ID
  const isSubagent = isSubagentFile(filePath);
  const subagentId = isSubagent ? fileBaseName.replace('agent-', '') : null;

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    log.debug('stat failed', filePath, e.message);
    return;
  }

  const prevPos = filePositions[filePath] || 0;
  if (stat.size <= prevPos) return;

  let buf;
  const fd = fs.openSync(filePath, 'r');
  try {
    buf = Buffer.alloc(stat.size - prevPos);
    fs.readSync(fd, buf, 0, buf.length, prevPos);
  } finally {
    fs.closeSync(fd);
  }

  const lines = buf.toString('utf8').split('\n').filter(Boolean);

  // Read meta once for subagents
  const meta = isSubagent ? readSubagentMeta(filePath) : null;

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (e) {
      log.debug('JSON parse error in', filePath, e.message);
      continue;
    }

    const { type, message, sessionId: sid, slug, cwd, timestamp, version } = entry;
    // Subagents: always use their own ID, not the parent session ID
    const id = isSubagent ? subagentId : sid || fileBaseName;

    if (!agents[id]) {
      // Slug = project name from cwd path (e.g. "courseai", "agent-dashboard")
      let agentSlug = slug || id.slice(0, 8);
      const agentCwd = cwd || projectDir;
      const projectName = deriveProjectName(agentCwd);
      if (meta) {
        // Subagents: project + type (e.g. "dashboard/reviewer")
        const typeLabel = meta.agentType || 'agent';
        agentSlug = projectName ? `${projectName}/${typeLabel}` : typeLabel;
      } else if (projectName) {
        agentSlug = projectName;
      }
      agents[id] = {
        id,
        slug: agentSlug,
        cwd: agentCwd,
        version: version || '',
        status: 'idle',
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
    if (cwd && cwd !== agent.cwd) {
      agent.cwd = cwd;
      // Update slug when project changes (agent moved to different project)
      if (!isSubagent) {
        const newProject = deriveProjectName(cwd);
        if (newProject) agent.slug = newProject;
      }
    }
    if (timestamp) agent.lastActivity = timestamp;

    if (type === 'assistant' && message) {
      const content = message.content || [];
      agent.messageCount++;

      const toolUse = content.find((c) => c.type === 'tool_use');
      const textContent = content.find((c) => c.type === 'text');

      if (toolUse) {
        agent.status = 'working';
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
        agent.status = 'thinking';
        agent.currentTool = null;
        agent.currentToolLabel = null;
        agent.lastText = textContent.text?.slice(0, 120) || '';
      }
    }

    if (type === 'user' && message) {
      agent.status = 'thinking';
      agent.currentTool = null;
      agent.currentToolLabel = null;
    }

    broadcast({ type: 'agent_update', agent: { ...agent } });
  }

  // Update position only after successful parse
  filePositions[filePath] = stat.size;
}

// Skip .jsonl files older than this on initial scan — keeps memory bounded
const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
// Max number of agents kept in memory (used by pruneAgents, defined here for hoisting)
const MAX_AGENTS = 20;
// Demo agents (flabber, content, etc — posted via /api/demo) stay on-screen for 15 min
// of idleness before exiting. Users like seeing their bot "hang around the office".
const DEMO_IDLE_REMOVAL_MS = 15 * 60 * 1000;

function collectJsonlFiles(dir, results = [], depth = 0) {
  if (depth > 4) return results;
  const cutoff = Date.now() - SCAN_MAX_AGE_MS;
  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const s = fs.statSync(full);
        if (s.isDirectory()) {
          collectJsonlFiles(full, results, depth + 1);
        } else if (entry.endsWith('.jsonl') && s.mtimeMs >= cutoff) {
          results.push(full);
        }
      } catch (e) {
        log.debug('stat error', full, e.message);
      }
    }
  } catch (e) {
    log.debug('readdir error', dir, e.message);
  }
  return results;
}

function scanExistingFiles() {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return;

  const allJsonl = collectJsonlFiles(CLAUDE_PROJECTS_DIR);

  // Sort by modification time - parse oldest first
  allJsonl.sort((a, b) => {
    try {
      return fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs;
    } catch (e) {
      log.debug(e.message);
      return 0;
    }
  });

  for (const filePath of allJsonl) {
    filePositions[filePath] = 0;
    parseNewLines(filePath);
  }

  // Run cleanup immediately so initial /api/health never reports stale 200+ count
  pruneAgents();
  log.info(
    `Initial scan: ${allJsonl.length} files, ${Object.keys(agents).length} active agents (after prune)`
  );
}

// HTTP server
const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Key, X-Admin-Token');

  // Route dispatcher
  if (method === 'GET' && url === '/api/agents') return handleGetAgents(req, res, agents);
  if (method === 'GET' && url === '/api/tasks') return handleGetTasks(req, res, agentTasks);

  if (method === 'POST' && url === '/api/tg-webhook')
    return handleTgWebhook(req, res, TG_TOKEN, TG_CHAT, lastTgFeedback);
  if (method === 'GET' && url === '/api/tg-feedback')
    return handleGetTgFeedback(req, res, lastTgFeedback);

  if (method === 'POST' && url.split('?')[0] === '/railway-webhook')
    return handleRailwayWebhook(req, res);

  if (method === 'GET' && url === '/api/layout') return handleGetLayout(req, res, sharedLayout);
  if (method === 'POST' && url === '/api/layout') {
    if (!requireAuth(req, res)) return;
    return handlePostLayout(req, res, sharedLayout, broadcast);
  }

  if (method === 'GET' && url === '/api/state') return handleGetState(req, res, agents, agentTasks);

  if (method === 'POST' && url === '/api/sync')
    return handlePostSync(req, res, agents, agentTasks, broadcast);

  if (method === 'POST' && url === '/api/demo') {
    return handlePostDemo(req, res, agents, broadcast);
  }

  if (method === 'DELETE' && url.startsWith('/api/demo/')) {
    const demoId = url.slice('/api/demo/'.length);
    return handleDeleteDemo(req, res, agents, broadcast, demoId);
  }

  // Health check (used by Railway and monitoring)
  if (method === 'GET' && url === '/api/health') {
    const mem = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        version: '2.0.0',
        uptime: process.uptime(),
        agents: Object.keys(agents).length,
        wsClients: clients.size,
        tasks: Object.keys(agentTasks).length,
        memMB: Math.round(mem.heapUsed / 1024 / 1024),
        publicUrl: publicUrl || null,
      })
    );
    return;
  }

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key, X-Admin-Token',
    });
    res.end();
    return;
  }

  // Static files
  const publicDir = fs.existsSync(path.join(__dirname, 'dist'))
    ? path.join(__dirname, 'dist')
    : path.join(__dirname, 'public');
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch (e) {
    log.warn('Bad URL encoding:', e.message);
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  const filePath =
    decodedUrl === '/'
      ? path.join(publicDir, 'index.html')
      : path.resolve(publicDir, '.' + decodedUrl);

  // Prevent path traversal attacks
  if (
    !filePath.startsWith(publicDir + path.sep) &&
    filePath !== path.join(publicDir, 'index.html')
  ) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const mime =
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
      }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.on('error', (err) => log.error('HTTP server error:', err));

// WebSocket server
const wss = new WebSocketServer({ server });
wss.on('error', (err) => log.error('WebSocket server error:', err));
wss.on('connection', (ws) => {
  clients.add(ws);
  // Send current state
  ws.send(JSON.stringify({ type: 'init', agents: Object.values(agents) }));
  ws.send(JSON.stringify({ type: 'tasks_init', tasks: agentTasks }));
  if (sharedLayout.positions)
    ws.send(JSON.stringify({ type: 'layout_update', layout: sharedLayout }));
  ws.on('close', () => clients.delete(ws));
});

// File watcher
scanExistingFiles();

const watchPattern = path.join(CLAUDE_PROJECTS_DIR, '**', '*.jsonl');
if (fs.existsSync(CLAUDE_PROJECTS_DIR)) {
  chokidar
    .watch(watchPattern, {
      ignoreInitial: true,
      usePolling: true,
      interval: 500,
      awaitWriteFinish: { stabilityThreshold: 100 },
    })
    .on('change', parseNewLines)
    .on('add', (filePath) => {
      if (filePositions[filePath] === undefined) filePositions[filePath] = 0;
      parseNewLines(filePath);
    })
    .on('unlink', (filePath) => {
      delete filePositions[filePath];
    });
} else {
  log.info('Claude projects dir not found, running in demo mode (no file watcher)');
}

// Mark agents as idle after 20s; reap demo agents after 15 min of idleness; cap non-demo to MAX_AGENTS
function pruneAgents() {
  const now = Date.now();
  for (const agent of Object.values(agents)) {
    const lastMs = new Date(agent.lastActivity).getTime();
    const ageMs = now - lastMs;

    if (agent.status !== 'idle' && ageMs > 20000) {
      agent.status = 'idle';
      agent.currentTool = null;
      agent.currentToolLabel = null;
      broadcast({ type: 'agent_update', agent: { ...agent } });
    }

    // Demo agents (manually posted bots) exit after 15 min of inactivity.
    if (agent.version === 'demo' && ageMs > DEMO_IDLE_REMOVAL_MS) {
      delete agents[agent.id];
      broadcast({ type: 'agent_remove', id: agent.id });
    }
  }

  // Non-demo agents (Claude Code via .jsonl): keep only MAX_AGENTS most recent
  const nonDemo = Object.values(agents).filter((a) => a.version !== 'demo');
  nonDemo.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  if (nonDemo.length > MAX_AGENTS) {
    for (const stale of nonDemo.slice(MAX_AGENTS)) {
      delete agents[stale.id];
      broadcast({ type: 'agent_remove', id: stale.id });
    }
  }
}

setInterval(pruneAgents, 5000);

server.listen(PORT, '0.0.0.0', async () => {
  log.info(`Agent Dashboard started: http://localhost:${PORT}`);
  log.info(`Watching: ${CLAUDE_PROJECTS_DIR}`);

  // Get local network IP
  const nets = require('os').networkInterfaces();
  for (const iface of Object.values(nets).flat()) {
    if (iface.family === 'IPv4' && !iface.internal) {
      log.info(`LAN: http://${iface.address}:${PORT}`);
    }
  }

  // Serveo SSH tunnel (no password)
  try {
    const { spawn } = require('child_process');
    const ssh = spawn(
      'ssh',
      [
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'ServerAliveInterval=30',
        '-R',
        `80:localhost:${PORT}`,
        'serveo.net',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let urlSent = false;
    const onData = (data) => {
      if (urlSent) return;
      const match = data.toString().match(/https?:\/\/[^\s]+serveousercontent\.com/);
      if (match) {
        urlSent = true;
        const url = match[0].replace(/^http:/, 'https:');
        publicUrl = url;
        log.info(`Public URL: ${url}`);
        broadcast({ type: 'public_url', url });
        // Remove listeners once URL is captured
        ssh.stdout.off('data', onData);
        ssh.stderr.off('data', onData);
      }
    };
    ssh.stdout.on('data', onData);
    ssh.stderr.on('data', onData);
    ssh.on('exit', () => {
      log.info('Tunnel closed');
      broadcast({ type: 'public_url', url: null });
    });
    ssh.on('error', () => broadcast({ type: 'public_url', url: null }));

    // Kill tunnel when server exits
    process.on('SIGINT', () => {
      ssh.kill();
      process.exit();
    });
    process.on('SIGTERM', () => {
      ssh.kill();
      process.exit();
    });
  } catch (e) {
    broadcast({ type: 'public_url', url: null });
  }
});
