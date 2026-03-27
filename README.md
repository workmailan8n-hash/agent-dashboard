# Agent Dashboard — Pixel Art Office Simulator

> Real-time visualization of Claude Code AI agents working in a pixel art office. Each agent gets a desk, walks around, takes breaks, plays games, and interacts with office furniture.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933) ![License](https://img.shields.io/badge/license-ISC-blue) ![WebSocket](https://img.shields.io/badge/transport-WebSocket-brightgreen)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Setup & Running](#setup--running)
- [Cloud Deployment](#cloud-deployment)
- [Admin Editor](#admin-editor)
- [API Endpoints](#api-endpoints)
- [Technical Details](#technical-details)
- [Development Tips](#development-tips)

---

## Overview

Agent Dashboard monitors Claude Code sessions by watching `.jsonl` log files in `~/.claude/projects/`. Each active session appears as a pixel art character in an animated office — sitting at desks when working, wandering around the office during idle time, and interacting with 30+ objects in the environment.

The frontend is a single-file Canvas 2D application (`public/index.html`, ~5500 lines) with no external JS dependencies. The backend is a lightweight Node.js server using only `ws` and `chokidar`.

---

## Features

### Real-Time Agent Tracking
- **WebSocket** push for instant updates when agents start/stop tools
- **HTTP polling fallback** (2-second interval) for environments where WebSocket is unavailable (e.g., Railway)
- Connection indicator in the bottom-right corner shows `online` or `polling` status

### Pixel Art Office
- **28-column tile grid** with dynamic row count based on agent count
- 18+ character appearances with diverse skin tones, hair colors, and fantasy variants (elf, alien, demon, robot, catfolk)
- **9-direction walking animations**: N, NE, E, SE, S, SW, W, NW, and idle
- Agents walk to desks when working and roam to activity spots when idle
- Celebration animation with confetti particles when an agent finishes a task
- Burnout tracking (0-4 levels) that affects walking speed

### Office Zones & Interactive Objects
- **Desks** — dynamically generated based on agent count, with typing and thinking animations
- **Lounge** — couches with sleeping, phone, stretching, and drinking animations
- **Kitchen** — coffee machine, fridge, dining table with eating spots, counter
- **Gym** — treadmills, yoga mats, stretching, headphones
- **TV / Gaming area** — couch with gaming controllers, reading spot
- **Ping Pong table** — paired activity (two agents play together, animated ball)
- **Dartboard** — solo dart-throwing with animated flying darts
- **Aquarium** — fish swimming with ambient animation
- **Water Cooler** — paired chatting activity
- **Vending Machine** — with product display
- **Bookshelf** — reading spot in the social zone
- **Kanban Board** — displays personal tasks on the office wall
- **Wall Clock** — shows real time
- **Trash Can** — with fill level indicator
- **Windows** — window-gazing idle activity
- **Plants** — plant care idle activity
- **Cat Bowls** — food and water bowls for the office cat
- **Printer** — activates on Write/Edit tool calls

### Office Cat
- Autonomous cat with its own state machine: `sitting`, `walking`, `sleeping`, `eating`, `pooping`
- Eats from food bowls (30% chance to head toward a full bowl)
- Creates messes that agents get assigned to clean up
- Agents near a sitting or sleeping cat may start petting it

### Agent Card Grid
Below the canvas, each agent gets an info card showing:
- Name/slug and current status (working / thinking / idle)
- Active tool with label (e.g., "Reads file", "Edits file")
- Color-coded accent based on assigned palette
- Animated status dot and scan bar

### Task Management
- **Kanban board** rendered on the office wall
- Add, complete, and delete personal tasks via the UI below the canvas
- Tasks persist to `tasks.json` on disk
- Agent `TodoWrite` tool calls are captured and displayed

### Cloud Sync
- `sync-to-cloud.js` pushes local state to a remote server every 2 seconds
- Serveo SSH tunnel for instant public URL (auto-configured on startup)

---

## Architecture

```
┌────────────────────────┐     ┌──────────────────────────┐
│  ~/.claude/projects/   │     │  public/index.html       │
│  *.jsonl log files     │     │  (Canvas 2D, ~5500 LOC)  │
└──────────┬─────────────┘     └──────────▲───────────────┘
           │ chokidar watch                │ WebSocket / HTTP
           ▼                               │
┌──────────────────────────────────────────┴──────────────┐
│  server.js  (HTTP + WebSocket on port 3737)             │
│  - Parses .jsonl files incrementally                    │
│  - Tracks agent state (working/thinking/idle)           │
│  - Broadcasts updates to all connected clients          │
│  - Serves static files from public/                     │
│  - Manages personal tasks (tasks.json)                  │
│  - Opens Serveo tunnel for public access                │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/sync
                           ▼
┌──────────────────────────────────────────────────────────┐
│  sync-to-cloud.js  (optional)                            │
│  - Fetches GET /api/state from local server              │
│  - Pushes to remote server POST /api/sync                │
│  - Runs every 2 seconds                                  │
└──────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | HTTP/WebSocket server, file watcher, API endpoints, Serveo tunnel |
| `public/index.html` | Single-file frontend: CSS, Canvas 2D rendering, all sprites, pathfinding, state machines |
| `sync-to-cloud.js` | Syncs local dashboard state to a remote deployment |
| `tasks.json` | Persisted personal task list (auto-created at runtime) |
| `package.json` | Dependencies: `ws` (WebSocket) and `chokidar` (file watching) |

---

## Setup & Running

### Prerequisites

- Node.js 18+
- Claude Code installed (creates `~/.claude/projects/` with `.jsonl` session logs)

### Install & Start

```bash
cd agent-dashboard
npm install
node server.js
```

Open **http://localhost:3737** in your browser.

The server will:
1. Scan all existing `.jsonl` files in `~/.claude/projects/`
2. Start watching for new file changes (polling every 500ms)
3. Print your local network IP for access from other devices
4. Attempt to open a Serveo tunnel for public access

If `~/.claude/projects/` does not exist, the server runs in **demo mode** with no file watcher. You can inject test agents via the demo API.

### Demo Mode

Inject a fake agent:
```bash
curl -X POST http://localhost:3737/api/demo \
  -H "Content-Type: application/json" \
  -d '{"id":"test-1","slug":"my-agent","status":"working","currentTool":"Read"}'
```

Remove it:
```bash
curl -X DELETE http://localhost:3737/api/demo/test-1
```

---

## Cloud Deployment

### Railway

1. Push the repo to GitHub
2. Create a new Railway project linked to the repo
3. Set environment variables:
   - `PORT` — Railway assigns this automatically
   - `SYNC_KEY` — optional shared secret for sync authentication
4. Deploy. The server starts via `npm start`

On Railway, WebSocket may be unavailable. The frontend automatically falls back to HTTP polling every 2 seconds.

### Syncing Local State to Cloud

Run `sync-to-cloud.js` on your local machine to push agent data to the remote server:

```bash
node sync-to-cloud.js https://your-app.up.railway.app [SYNC_KEY]
```

Environment variable alternatives:
```bash
REMOTE_URL=https://your-app.up.railway.app \
SYNC_KEY=your-secret \
LOCAL_URL=http://localhost:3737 \
SYNC_INTERVAL=2000 \
node sync-to-cloud.js
```

The sync script:
1. Fetches `GET /api/state` from the local server
2. Posts the full state to `POST /api/sync` on the remote server
3. Repeats every 2 seconds (configurable via `SYNC_INTERVAL`)

### Serveo Tunnel

On startup, the server attempts to open an SSH tunnel via [serveo.net](https://serveo.net):
```
ssh -R 80:localhost:3737 serveo.net
```

If successful, the public URL is printed to the console and broadcast to all connected clients. The URL appears in the top-right corner of the dashboard. Requires `ssh` on the system PATH.

---

## Admin Editor

The admin editor provides drag-and-drop layout customization for all office objects.

### How to Access

1. Click the **EDIT** button in the header bar
2. Enter the password: `noadmin`
3. The canvas switches to crosshair cursor mode

### Controls

- **Click** an object to select it (highlighted in yellow)
- **Drag** to reposition the selected object
- **Start Pos** button — resets all objects to their default positions
- **Export JSON** button — copies the current layout to clipboard

### Movable Objects

Desks, couches, gym, TV area, ping pong table, kitchen table, kitchen counter, fridge, vending machine, bookshelf, aquarium, dartboard, water cooler, gaming sofa.

### Persistence

Positions are saved to `localStorage` in the browser. Agents automatically re-path to updated positions when the layout changes.

---

## API Endpoints

All endpoints accept and return JSON. CORS is enabled (`Access-Control-Allow-Origin: *`).

### `GET /api/agents`

Returns an array of all tracked agents.

```json
[
  {
    "id": "session-abc123",
    "slug": "my-project",
    "cwd": "C:\\projects\\my-app",
    "status": "working",
    "currentTool": "Edit",
    "currentToolLabel": "Edits file",
    "lastActivity": "2026-03-26T12:00:00.000Z",
    "messageCount": 42,
    "toolHistory": [{"tool": "Edit", "time": "..."}],
    "startedAt": "2026-03-26T11:00:00.000Z",
    "isSubagent": false,
    "agentType": null
  }
]
```

### `GET /api/tasks`

Returns agent todo lists extracted from `TodoWrite` tool calls.

```json
{
  "agent-id": {
    "todos": [{"id": "1", "content": "Fix bug", "status": "in_progress", "priority": "high"}],
    "updatedAt": "2026-03-26T12:00:00.000Z"
  }
}
```

### `GET /api/state`

Full state snapshot used by HTTP polling and the sync script.

```json
{
  "agents": [...],
  "tasks": {...},
  "myTasks": [...]
}
```

### `POST /api/sync`

Receives a full state push from `sync-to-cloud.js`. Replaces all agent, task, and personal task state. Broadcasts updates to all WebSocket clients.

**Headers:**
- `X-Sync-Key` — must match the `SYNC_KEY` environment variable (if set on the server)

**Body:** Same shape as the `GET /api/state` response.

### `POST /api/demo`

Injects or updates a demo agent. Useful for testing without active Claude Code sessions.

```json
{
  "id": "demo-1",
  "slug": "test-agent",
  "status": "working",
  "currentTool": "Bash",
  "currentToolLabel": "Runs command"
}
```

### `DELETE /api/demo/:id`

Removes a demo agent by ID.

### `GET /api/mytasks`

Returns all personal tasks.

```json
[
  {
    "id": "1711234567890",
    "title": "Review PR",
    "assignee": "me",
    "priority": "high",
    "status": "todo",
    "createdAt": "2026-03-26T10:00:00.000Z",
    "completedAt": null
  }
]
```

### `POST /api/mytasks`

Creates a new personal task. Returns the created task with a generated `id`.

```json
{
  "title": "Deploy v2",
  "assignee": "me",
  "priority": "medium"
}
```

### `PATCH /api/mytasks/:id`

Updates fields on a task. Setting `status` to `"done"` auto-sets `completedAt`. Setting it back to `"todo"` clears `completedAt`.

```json
{
  "status": "done"
}
```

### `DELETE /api/mytasks/:id`

Deletes a task by ID.

---

## Technical Details

### Canvas Rendering Pipeline

The main `loop()` function runs via `requestAnimationFrame` and renders each frame in this order:

1. **Clear canvas** and draw floor, walls, grid lines
2. **Draw static objects** — desks, kitchen appliances, couches, gym equipment, aquarium, windows, plants
3. **Draw dynamic features** — Kanban board, wall clock, trash can, cat bowls, vending machine, dart animations
4. **Depth-sort all sprites** — agents and cat sorted by Y-position (`ty + tx * 0.001`) for correct overlap
5. **Draw agents** — each `AgentState` renders its current animation frame using the appropriate draw function
6. **Draw cat** — the `CatState` renders independently with its own sprite
7. **Draw particles** — confetti, steam, music notes, ZZZ bubbles
8. **Draw UI overlays** — left panel (agent list with status), right panel (stats summary), admin overlay if editing

**Key constants:**

| Name | Value | Meaning |
|------|-------|---------|
| `CW` | 1200 | Canvas width (px) |
| `T` | 32 | Tile size (px) |
| `OX` | 140 | Side panel width (px) |
| `COLS` | 28 | Office grid columns |

### A* Pathfinding

Agents navigate around obstacles using A* search on the tile grid:

- **Obstacle grid** — a 2D `Uint8Array` marks walls, furniture, kitchen partition walls, and desk areas as blocked
- **Bresenham pre-check** — before running A*, a line-of-sight check determines if direct movement is possible. If the path is unobstructed, A* is skipped entirely
- **8-directional movement** — cardinal moves cost 1.0, diagonal moves cost 1.414
- **Diagonal corner-cutting prevention** — diagonal moves are blocked if either adjacent cardinal cell is an obstacle
- **Search limit** — 3000 node expansions maximum to prevent frame drops
- **Fallback** — `nearestFree()` uses BFS to find the closest walkable tile when A* cannot reach the target
- **Walk timeout** — agents abandon unreachable idle slots after 10 seconds and pick a new destination

### Agent State Machine

Each agent is an instance of the `AgentState` class:

| Field | Purpose |
|-------|---------|
| `state` | Current animation: `walking`, `typing_normal`, `typing_furious`, `thinking`, `sleeping`, `gaming`, `yoga`, `celebrating`, etc. (40+ animation states) |
| `isWorking` | `true` when backend status is `working` or `thinking` |
| `slotIdx` | Index into `DESK_SLOTS` (when working) or `IDLE_SPOTS` (when idle) |
| `arrived` | `true` once the agent reaches its target tile |
| `waypoints` | A* path for current movement |
| `facing` | One of 9 directions; determines which walk sprite to draw |
| `burnout` | 0-4 counter; increments each time agent stops working; slows walk speed at level 3+ |
| `celebrating` | Plays confetti animation after finishing a task |
| `isCleaning` | Assigned to clean up a cat mess; overrides normal slot logic |

**Lifecycle:**
1. Agent appears in the log files — spawn flash animation, particle burst
2. Backend says `working` or `thinking` — agent walks to an available desk, sits down, types
3. Backend goes `idle` — agent picks a weighted-random idle spot, walks there, performs activity for 10-30 seconds, then picks another
4. Task completion detected (transition from working to idle) — celebration animation with confetti
5. Backend silent for 20 seconds — agent marked idle server-side
6. Stale cleanup: subagents removed after 1 hour; sessions after 7 days

### IDLE_SPOTS System

`IDLE_SPOTS` is a dynamically-built array of locations that idle agents choose from, with weighted random selection:

```javascript
{
  tx: 5.5,              // tile X position
  ty: 8.0,              // tile Y position
  anim: 'gaming',       // animation to play at this spot
  type: 'gaming',       // category (kitchen, gym, group, couch, darts, etc.)
  w: 10,                // selection weight (higher = more likely chosen)
  _objId: 'tv',         // links to admin editor object for position syncing
}
```

Spots are regenerated during `buildLayout()` whenever the office size changes. Types include: `couch`, `window`, `plant`, `floor`, `kitchen`, `group`, `gym`, `gaming`, `darts`, `aquarium`, `shelf`, `printer`.

### GROUP_PAIRS for Paired Activities

Some activities require two agents to be present:

| Group ID | Activity | Location |
|----------|----------|----------|
| 0-2 | Chatting / Arguing / Gossiping | Social floor area |
| 10 | Ping Pong | Ping pong table |
| 20 | Water Cooler chat | Water cooler |

**Pairing logic:**
- An agent only joins a group spot if the partner slot is already occupied by another agent
- If few solo spots remain, an agent may initiate a group by claiming one slot and reserving the partner slot (marked with a `__reserved_` prefix) for the next idle agent
- The ping pong ball only animates when both players are present

### Character Appearance

Each agent gets a deterministic appearance based on a hash of their session ID/slug:

- **6 standard appearances** — blue, purple, green, orange, pink, cyan hair with light skin tones
- **5 diverse skin tones** — medium brown to deep brown with natural hair colors
- **1 fantasy gray** — silver hair, gray-blue skin
- **6 fantasy races** — elf (fair), elf (dark), alien (blue skin), catfolk (ears/tail), demon (red skin, horns), robot (metallic)

Total: 18 distinct character palettes, each with `hair`, `skin`, `shirt`, `pants`, and `accent` color properties. Fantasy types include special sprite features (pointed ears, antennae, horns, visors, etc.).

Human characters may also get hash-derived accessories: glasses, beard, hair bun, cap, scarf, or under-eye fatigue marks.

### Particle System

A lightweight `ParticleSystem` class handles visual effects:
- **Confetti** — burst on task completion (celebration)
- **Puff** — emitted when agents despawn
- **Burst** — emitted when agents spawn
- **Ambient** — coffee steam, music notes from headphones/air guitar, sleep ZZZ particles

### Sound

Minimal audio via Web Audio API. A `blip()` function generates short square-wave tones on agent state transitions.

---

## Development Tips

- **No restart needed** — the frontend auto-reconnects when the server restarts (WebSocket reconnect + polling fallback)
- **Add a new activity**: create a `drawMyActivity()` function, register it in the `CHAR_DRAW` map, push a new entry to `IDLE_SPOTS` in `buildLayout()`
- **Change office size**: adjust `COLS`, `KITCHEN_WALL_COL`, `PER_ROW`, `STEP_X`
- **Fantasy agents appear automatically** based on session ID hash — no configuration needed
- **Inject demo agents** via `POST /api/demo` to test without active Claude sessions

### Tool-to-Animation Mapping

The server maps Claude Code tool names to display labels:

| Tool | Label |
|------|-------|
| `Bash` | Runs command |
| `Read` | Reads file |
| `Write` | Writes file |
| `Edit` | Edits file |
| `Grep` | Searches code |
| `Glob` | Finds files |
| `WebFetch` | Loads page |
| `WebSearch` | Searches web |
| `Agent` | Launches sub-agent |
| `TodoWrite` | Updates tasks |

### Global State Reference

```javascript
agentStates   // agentId -> AgentState (position, animation, slot, flags)
agentsData    // agentId -> raw agent data from server
idleOccupied  // slotIdx -> agentId (exclusive slot ownership)
myTasks       // [{id, title, status, priority, assignee, createdAt, completedAt}]
cat           // CatState instance (tx, ty, state, messExists, eatTarget)
ppBall        // Ping pong ball state {t, dir, speed, active}
trashLevel    // 0-10 fill level
printerActive // Countdown timer when printing
```
