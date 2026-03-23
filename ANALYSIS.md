# Agent Dashboard — Analysis

Generated: 2026-03-22

---

## Project Overview

`agent-dashboard` is a real-time monitoring dashboard that watches Claude AI agent
session files on the local filesystem and displays their live status in a browser
via a pixel-art isometric office scene. It is a single-process Node.js application
with no build step.

---

## File Structure

```
agent-dashboard/
  server.js          — Node.js HTTP + WebSocket backend
  package.json       — project manifest and dependencies
  public/
    index.html       — single-file frontend (HTML + CSS + canvas JS)
  node_modules/      — installed dependencies
```

---

## server.js

### Entry point and constants

- Requires Node built-ins: `http`, `fs`, `path`, `os`.
- Requires third-party: `ws` (WebSocket server), `chokidar` (file watcher).
- Watches `~/.claude/projects` recursively for `.jsonl` files.
- Listens on port **3737**, bound to `0.0.0.0`.

### Agent state model

Each discovered session is stored in an in-memory `agents` object keyed by session
ID. Each agent record carries:

| Field            | Description                                      |
|------------------|--------------------------------------------------|
| `id`             | Session or subagent UUID                         |
| `slug`           | Short human-readable label (from JSONL or meta)  |
| `cwd`            | Working directory of the agent                   |
| `status`         | `idle` / `thinking` / `working`                  |
| `currentTool`    | Name of the tool currently in use                |
| `currentToolLabel` | Localised (Russian) display label for the tool |
| `toolHistory`    | Last 5 tools used (most-recent first)            |
| `messageCount`   | Total assistant messages seen                    |
| `isSubagent`     | Boolean — true if file is in a `subagents/` dir  |
| `agentType`      | Read from `.meta.json` sidecar file              |

### JSONL parsing (`parseNewLines`)

- Reads only newly appended bytes using stored file positions (`filePositions` map),
  making it efficient for large files.
- Parses each line as JSON. Malformed lines are silently skipped.
- Distinguishes `assistant` messages (tool use or text) from `user` messages.
- On `tool_use` content: sets status to `working`, records tool name and label.
- On `text` content: sets status to `thinking`, stores last 120 chars of text.
- On `user` message: sets status to `thinking`.
- Broadcasts an `agent_update` event to all connected WebSocket clients after every
  relevant line.

### Subagent support

- Files under a `subagents/` path with names beginning `agent-` are treated as
  subagents.
- A `.meta.json` sidecar (same path, different extension) can supply `agentType`
  and `description` to override the display slug.
- Stale `general-purpose` subagents idle for more than 1 hour are automatically
  removed and a `agent_remove` broadcast is sent.

### File watching — chokidar

`chokidar` is required at line 6 and used at line 231.

```js
const chokidar = require("chokidar");
// ...
chokidar
  .watch(watchPattern, {
    ignoreInitial: false,
    usePolling: false,
    awaitWriteFinish: { stabilityThreshold: 100 }
  })
  .on("change", parseNewLines)
  .on("add", (filePath) => { ... parseNewLines(filePath); });
```

- Pattern: `~/.claude/projects/**/*.jsonl`
- `usePolling: false` — uses native OS filesystem events (inotify / FSEvents / etc.)
- `awaitWriteFinish` with a 100 ms stability threshold avoids reading partially
  written lines.
- Handles both new files (`add`) and appended content (`change`).
- On startup, `scanExistingFiles()` reads all pre-existing JSONL files sorted by
  modification time (oldest first) before the watcher is attached.

### WebSocket layer

- `WebSocketServer` from the `ws` package is attached to the same `http.Server`
  instance (no separate port).
- Connected clients are kept in a `Set`. Dead sockets (readyState !== 1) are
  skipped on broadcast.
- On connection: immediately sends an `init` message with the full current agent
  list.
- Message types broadcast from server to clients:
  - `init` — full snapshot on connect
  - `agent_update` — single agent state change
  - `agent_remove` — subagent cleanup
  - `public_url` — Serveo tunnel URL once available

### Inactivity / cleanup timer

A `setInterval` runs every 5 seconds:
- Marks any agent as `idle` if its last activity was more than 90 seconds ago.
- Deletes `general-purpose` subagents idle for more than 1 hour.

### Serveo SSH tunnel

After the server starts, it spawns an SSH process to create a reverse tunnel via
`serveo.net` (port 80 → localhost:3737). The public HTTPS URL is extracted from
stdout/stderr with a regex and broadcast to clients as a `public_url` message. If
the tunnel fails or closes, `null` is broadcast.

### HTTP file serving

- `GET /api/agents` returns the full agents state as JSON.
- All other requests are served as static files from the `public/` directory with
  correct MIME types for `.html`, `.js`, and `.css`.

---

## public/index.html

A single self-contained HTML file. No external JS framework is used. The Google
Fonts CDN is used for the "Press Start 2P" pixel font.

### Isometric office canvas renderer

The `<canvas id="office">` element (920×440 px) renders a pixel-art isometric
office using the browser 2D canvas API.

Key constants:
- `TW = 72, TH = 36` — tile pixel dimensions
- `GW = 9, GH = 7` — grid size in tiles
- `WALL_H = 88` — wall height in pixels
- `OX = CW/2, OY = 108` — isometric origin (screen coordinates)

The `iso(tx, ty)` function converts isometric grid coordinates to screen
coordinates using the standard formula:
```
screenX = OX + (tx - ty) * TW/2
screenY = OY + (tx + ty) * TH/2
```

The background (walls, floor tiles, couches, desks, rug, plant, clock) is rendered
once into an off-screen `<canvas>` buffer (`bgBuf`) and composited onto the main
canvas on each animation frame, avoiding redundant redraws of static geometry.

### Layout

| Furniture | Position          | Capacity       |
|-----------|-------------------|----------------|
| Couches   | Left wall (tx=0)  | 6 lying slots  |
| Desks     | Back-right area   | 4 sitting slots |

Slot arrays (`COUCH_SLOTS`, `DESK_SLOTS`) are pre-defined isometric positions
where agent characters are placed.

### Agent character rendering

Each agent is drawn as a pixel-art character at its assigned slot. Characters are
color-coded using one of 8 palettes (`PALETTES`), selected deterministically from
the agent's slug via a simple hash. Active (`working`) agents animate; idle agents
are shown lying on couches.

### Card grid

Below the canvas, a CSS grid (`#grid`) renders one `.card` per agent showing:
- Agent name/slug (uppercase, truncated)
- Current status, tool label, and last text snippet
- A CSS scan-line animation bar (blue for `working`, purple for `thinking`)
- Card border color changes: blue for `working`, purple for `thinking`

### WebSocket client

```js
const ws = new WebSocket(`${proto}//${location.host}`);
```

- Protocol is automatically chosen: `wss:` for HTTPS pages, `ws:` for HTTP.
- Handles `init` and `agent_update` messages to maintain a local `agentMap`.
- Handles `agent_remove` to delete agents from the map.
- Handles `public_url` to update the tunnel link in the header.
- On disconnect, the LED indicator turns red and reconnects after 3 seconds.

WebSocket is used in two places within the project source files:
- `server.js` line 5: `const { WebSocketServer } = require("ws")`
- `server.js` lines 17–18, 218–225: server-side client management
- `public/index.html` line 831: `const ws = new WebSocket(...)` — browser client

---

## package.json

```json
{
  "name": "agent-dashboard",
  "version": "1.0.0",
  "type": "commonjs",
  "dependencies": {
    "chokidar": "^5.0.0",
    "localtunnel": "^2.0.2",
    "ws": "^8.20.0"
  }
}
```

- **chokidar ^5.0.0** — filesystem watcher (actively used in server.js)
- **ws ^8.20.0** — WebSocket server (actively used in server.js)
- **localtunnel ^2.0.2** — listed as a dependency but NOT used in server.js;
  the tunnel is instead implemented via a raw `ssh` subprocess to `serveo.net`
- No start script is defined; the server is run directly with `node server.js`
- No test suite is configured

---

## Key Observations

1. **localtunnel is an unused dependency.** It appears in `package.json` but the
   actual tunneling in `server.js` is done by spawning `ssh` to `serveo.net`.

2. **No authentication or access control.** The `/api/agents` endpoint and the
   WebSocket connection are open to anyone who can reach port 3737. The Serveo
   tunnel makes this publicly accessible.

3. **Russian-language UI labels.** Tool labels (`getToolLabel`) and server console
   output are written in Russian, suggesting this was built for a Russian-speaking
   developer audience.

4. **All frontend logic is inline in index.html.** There are no separate `.js` or
   `.css` files in `public/`; everything is bundled in the single HTML file.

5. **Static background optimisation.** The isometric office background is rendered
   to an off-screen canvas once and blitted each frame, which is a good canvas
   performance pattern.

6. **Subagent meta sidecar pattern.** The server reads `.meta.json` files alongside
   `.jsonl` files to enrich subagent display names and types — a custom convention
   specific to this project.
