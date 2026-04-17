# Agent Dashboard — Pixel Art Office Simulator

> Real-time visualization of Claude Code AI agents working in a pixel art office. Each agent gets a desk, walks around, takes breaks, plays games, and interacts with 40+ objects across multiple office zones.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933) ![License](https://img.shields.io/badge/license-ISC-blue) ![WebSocket](https://img.shields.io/badge/transport-WebSocket-brightgreen)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup & Running](#setup--running)
- [Environment Variables](#environment-variables)
- [Cloud Deployment](#cloud-deployment)
- [Admin Editor](#admin-editor)
- [API Endpoints](#api-endpoints)
- [Technical Details](#technical-details)
- [Development Tips](#development-tips)

---

## Overview

Agent Dashboard monitors Claude Code sessions by watching `.jsonl` log files in `~/.claude/projects/`. Each active session appears as a pixel art character in an animated office — sitting at desks when working, wandering around the office during idle time, and interacting with 40+ objects in the environment.

The frontend is built as **23 ES modules** bundled by Vite, with **12 CSS files** using design tokens. The backend is a lightweight Node.js server (`server.js` as a thin router) with handler modules split across `src/server/handlers/`.

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
- **Kitchen** — enclosed room with coffee machine, microwave, toaster, knife block, cutting board, sink, fridge, and dining table with eating spots
- **Gym** — treadmills, yoga mats, stretching, headphones
- **TV / Gaming area** — couch with gaming controllers, reading spot
- **Ping Pong table** — paired activity (two agents play together, animated ball)
- **Dartboard** — solo dart-throwing with animated flying darts
- **Aquarium** — fish swimming with ambient animation
- **Water Cooler** — paired chatting activity
- **Vending Machine** — with product display
- **Bookshelf** — reading spot in the social zone
- **Wall Clock** — shows real time
- **Trash Can** — with fill level indicator
- **Windows** — window-gazing idle activity
- **Plants** — plant care idle activity
- **Cat Bowls** — food and water bowls for the office cat
- **Printer** — activates on Write/Edit tool calls
- **Entrance Door** — agents spawn from the right wall and walk in through a visible door

### Entertainment Zone (10 New Objects)

- **Massage Chair** — agents relax in a vibrating chair with animated cushions
- **Arcade Machine** — retro cabinet with screen glow, agents play with gaming animation
- **Espresso Bar** — barista-style station with steam effects, agents use coffee animation
- **DJ Console** — turntable with spinning disc, agents bob with headphone animation
- **Server Rack** — blinking LEDs and status lights, agents use typing animation
- **3D Printer** — layered printing animation with progress display
- **Hammock** — suspended between posts, agents use sleeping animation
- **Basketball Hoop** — backboard with net, agents use stretching animation
- **Foosball Table** — paired activity with two player positions
- **Telescope** — mounted scope near window, agents use window-gaze animation

All entertainment objects support **click animations** -- clicking on any object triggers a visual feedback effect.

### Zone Walls

- **Kitchen walls** — partition separating the kitchen from the main office, with door opening
- **Zone divider wall** — separates the lounge area from the activity/entertainment zone, with door gap for pathfinding

### Settings Panel

- Adjustable sound volume, animation speed, and display preferences
- Persisted to `localStorage`

### Loading Screen

- Animated loading screen with progress indicator while assets initialize

### Mobile Adaptation

- Responsive layout that adjusts canvas size, card grid, and UI panels for smaller screens
- Touch-friendly controls

### Office Cat

- Autonomous cat with its own state machine: `sitting`, `walking`, `sleeping`, `eating`, `pooping`, plus 10 new behaviors:
  - **Playing** — bats at a toy with spinning animation
  - **Grooming** — licks paw with detailed paw-to-face animation
  - **Stretching** — full body stretch with arched back
  - **Hunting** — crouches, wiggles, then pounces at imaginary prey
  - **Knocking** — walks to desk edges and pushes items off (spawns falling particles)
  - **Zoomies** — runs in random directions at high speed with motion trails
  - **Purring** — sits next to nearest agent with heart particles
  - **Window watching** — sits at window with alert ears and twitching tail
  - **Hiding** — tucks under a desk with only eyes visible
  - **Scared** — puffed tail, arched back, triggered by loud events (e.g., nearby celebrations)
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

- Agent `TodoWrite` tool calls are captured and displayed

### Cloud Sync

- `sync-to-cloud.js` pushes local state to a remote server every 2 seconds
- Serveo SSH tunnel for instant public URL (auto-configured on startup)

---

## Architecture

```
┌────────────────────────┐     ┌──────────────────────────────────┐
│  ~/.claude/projects/   │     │  src/ (23 ES modules)            │
│  *.jsonl log files     │     │  Vite dev server (HMR) or dist/  │
└──────────┬─────────────┘     └──────────▲───────────────────────┘
           │ chokidar watch                │ WebSocket / HTTP
           ▼                               │
┌──────────────────────────────────────────┴──────────────────────┐
│  server.js  (thin HTTP router + WebSocket on port 3737)         │
│  ├─ src/server/logger.js     — structured logging               │
│  ├─ src/server/auth.js       — X-Admin-Token middleware         │
│  └─ src/server/handlers/     — 6 route handler modules          │
│     ├─ agents.js   — agent state queries                        │
│     ├─ tasks.js    — agent task queries                         │
│     ├─ layout.js   — shared admin layout sync                   │
│     ├─ sync.js     — cloud sync push/pull                       │
│     ├─ demo.js     — demo agent injection                       │
│     └─ telegram.js — TG webhook + feedback                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
agent-dashboard/
├── server.js              # Thin HTTP router + WS + chokidar
├── src/
│   ├── index.html         # Vite entry HTML
│   ├── main.js            # Entry point + CSS imports
│   ├── app.js             # Main application module
│   ├── constants.js       # Shared constants
│   ├── state.js           # Global state management
│   ├── renderer.js        # Canvas rendering pipeline
│   ├── background.js      # Floor, walls, grid drawing
│   ├── layout.js          # Office layout builder
│   ├── agentState.js      # Agent state machine
│   ├── drawChars.js       # Character sprite drawing
│   ├── palettes.js        # 18 character appearance palettes
│   ├── animConfig.js      # Animation configuration
│   ├── creatures.js       # Office cat state machine
│   ├── particles.js       # Particle system (confetti, steam, etc.)
│   ├── bubbles.js         # Speech/thought bubbles
│   ├── effects.js         # Visual effects
│   ├── clickAnims.js      # Click feedback animations
│   ├── math.js            # Math utilities
│   ├── audio.js           # Sound effects (Web Audio API)
│   ├── ui.js              # UI panels and overlays
│   ├── websocket.js       # WebSocket client + polling fallback
│   ├── admin.js           # Admin editor logic
│   ├── adminPos.js        # Admin position syncing
│   ├── styles/
│   │   ├── tokens.css     # Design tokens (colors, spacing, fonts)
│   │   ├── base.css       # Reset + body
│   │   ├── header.css     # Header bar
│   │   ├── canvas.css     # Canvas container
│   │   ├── cards.css      # Agent info cards
│   │   ├── connection.css # Connection indicator
│   │   ├── admin.css      # Admin editor overlay
│   │   ├── settings.css   # Settings panel
│   │   ├── loading.css    # Loading screen
│   │   └── mobile.css     # Mobile responsive styles
│   └── server/
│       ├── logger.js      # Structured logging
│       ├── auth.js        # Auth middleware (X-Admin-Token)
│       └── handlers/      # Route handlers (6 files)
│           ├── agents.js
│           ├── tasks.js
│           ├── layout.js
│           ├── sync.js
│           ├── demo.js
│           └── telegram.js
├── public/
│   └── index.html         # Legacy fallback
├── dist/                  # Vite build output (gitignored)
├── sync-to-cloud.js       # Cloud sync script
├── vite.config.js         # Vite configuration
├── .env.example           # Environment variable template
└── package.json           # Dependencies: ws, chokidar, dotenv + Vite
```

---

## Setup & Running

### Prerequisites

- Node.js 18+
- Claude Code installed (creates `~/.claude/projects/` with `.jsonl` session logs)

### Install & Start

```bash
cd agent-dashboard
npm install

# Development (Vite HMR + backend in parallel):
npm run dev

# Production build:
npm run build
npm start
```

In development mode, Vite serves the frontend with hot module replacement while `server.js` handles the API and WebSocket connections. In production, `npm run build` creates an optimized bundle in `dist/`, and `npm start` serves it via `server.js`.

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
  -H "X-Admin-Token: YOUR_TOKEN" \
  -d '{"id":"test-1","slug":"my-agent","status":"working","currentTool":"Read"}'
```

Remove it:

```bash
curl -X DELETE http://localhost:3737/api/demo/test-1 \
  -H "X-Admin-Token: YOUR_TOKEN"
```

(If `ADMIN_TOKEN` is not set in `.env`, auth is disabled and the header can be omitted.)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
TG_TOKEN=              # Telegram bot token
TG_CHAT=               # Telegram chat ID
SYNC_KEY=              # Sync authentication key (for POST /api/sync)
ADMIN_TOKEN=           # Admin token for write API endpoints (X-Admin-Token header)
PORT=3737              # Server port
LOG_LEVEL=info         # Logging level (debug|info|warn|error)
```

All variables are optional. If `ADMIN_TOKEN` is not set, write endpoints are unprotected. If `TG_TOKEN` is not set, Telegram functions are disabled.

---

## Cloud Deployment

### Railway

1. Push the repo to GitHub
2. Create a new Railway project linked to the repo
3. Set environment variables:
   - `PORT` — Railway assigns this automatically
   - `SYNC_KEY` — optional shared secret for sync authentication
   - `ADMIN_TOKEN` — protects write endpoints
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
- **Start Position** button — resets all objects to their default positions (with confirmation modal)
- **Export JSON** button — copies the current layout to clipboard

### Movable Objects

Desks, couches, gym, TV area, ping pong table, kitchen table, kitchen counter, fridge, vending machine, bookshelf, aquarium, dartboard, water cooler, gaming sofa, massage chair, arcade, espresso bar, DJ console, server rack, 3D printer, hammock, basketball hoop, foosball table, telescope.

### syncIdleSpotsToAdmin

When objects are repositioned via the admin editor, the `syncIdleSpotsToAdmin()` function automatically updates all `IDLE_SPOTS` coordinates so agents walk to the correct positions for their activities. This runs on every layout change, Start Position reset, and page load.

### Persistence

Positions are saved to `localStorage` in the browser. Layout can also be synced to the server via `POST /api/layout` so all clients share the same layout.

---

## API Endpoints

All endpoints accept and return JSON. CORS is enabled (`Access-Control-Allow-Origin: *`).

Write endpoints (`POST`, `PATCH`, `DELETE`) require the `X-Admin-Token` header when `ADMIN_TOKEN` is set in the environment. Read endpoints (`GET`) are public.

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
    "toolHistory": [{ "tool": "Edit", "time": "..." }],
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
    "todos": [{ "id": "1", "content": "Fix bug", "status": "in_progress", "priority": "high" }],
    "updatedAt": "2026-03-26T12:00:00.000Z"
  }
}
```

### `GET /api/state`

Full state snapshot used by HTTP polling and the sync script.

```json
{
  "agents": [...],
  "tasks": {...}
}
```

### `POST /api/sync`

Receives a full state push from `sync-to-cloud.js`. Replaces all agent and task state. Broadcasts updates to all WebSocket clients.

**Headers:**

- `X-Sync-Key` — must match the `SYNC_KEY` environment variable (if set on the server)

**Body:** Same shape as the `GET /api/state` response.

### `POST /api/demo` (auth required)

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

### `DELETE /api/demo/:id` (auth required)

Removes a demo agent by ID.

### `GET /api/layout`

Returns the current shared admin layout.

### `POST /api/layout` (auth required)

Updates the shared layout. Broadcasts to all connected clients.

### `POST /api/tg-webhook`

Telegram bot webhook endpoint.

### `GET /api/tg-feedback`

Returns the last Telegram feedback action.

### `GET /api/health`

Health check endpoint. Returns `{ status: "ok", version: "2.0.0", uptime: ... }`.

---

## Technical Details

### Canvas Rendering Pipeline

The main `loop()` function runs via `requestAnimationFrame` and renders each frame in this order:

1. **Clear canvas** and draw floor, walls, grid lines
2. **Draw static objects** — desks, kitchen appliances (coffee machine, microwave, toaster, knife block, cutting board, sink), couches, gym equipment, aquarium, windows, plants, entertainment zone objects
3. **Draw dynamic features** — wall clock, trash can, cat bowls, vending machine, dart animations, click animations, zone walls
4. **Depth-sort all sprites** — agents and cat sorted by Y-position (`ty + tx * 0.001`) for correct overlap
5. **Draw agents** — each `AgentState` renders its current animation frame using the appropriate draw function
6. **Draw cat** — the `CatState` renders independently with its own sprite
7. **Draw particles** — confetti, steam, music notes, ZZZ bubbles
8. **Draw UI overlays** — left panel (agent list with status), right panel (stats summary), admin overlay if editing

**Key constants:**

| Name   | Value | Meaning               |
| ------ | ----- | --------------------- |
| `CW`   | 1200  | Canvas width (px)     |
| `T`    | 32    | Tile size (px)        |
| `OX`   | 140   | Side panel width (px) |
| `COLS` | 28    | Office grid columns   |

### A\* Pathfinding

Agents navigate around obstacles using A\* search on the tile grid:

- **Obstacle grid** — a 2D `Uint8Array` marks walls, furniture, kitchen partition walls, and desk areas as blocked
- **Bresenham pre-check** — before running A*, a line-of-sight check determines if direct movement is possible. If the path is unobstructed, A* is skipped entirely
- **8-directional movement** — cardinal moves cost 1.0, diagonal moves cost 1.414
- **Diagonal corner-cutting prevention** — diagonal moves are blocked if either adjacent cardinal cell is an obstacle
- **Search limit** — 3000 node expansions maximum to prevent frame drops
- **Fallback** — `nearestFree()` uses BFS to find the closest walkable tile when A\* cannot reach the target
- **Walk timeout** — agents abandon unreachable idle slots after 10 seconds and pick a new destination

### Agent State Machine

Each agent is an instance of the `AgentState` class (defined in `src/agentState.js`):

| Field         | Purpose                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`       | Current animation: `walking`, `typing_normal`, `typing_furious`, `thinking`, `sleeping`, `gaming`, `yoga`, `celebrating`, `smoking_beer`, etc. (40+ animation states) |
| `isWorking`   | `true` when backend status is `working` or `thinking`                                                                                                                 |
| `slotIdx`     | Index into `DESK_SLOTS` (when working) or `IDLE_SPOTS` (when idle)                                                                                                    |
| `arrived`     | `true` once the agent reaches its target tile                                                                                                                         |
| `waypoints`   | A\* path for current movement                                                                                                                                         |
| `facing`      | One of 9 directions; determines which walk sprite to draw                                                                                                             |
| `burnout`     | 0-4 counter; increments each time agent stops working; slows walk speed at level 3+                                                                                   |
| `celebrating` | Plays confetti animation after finishing a task                                                                                                                       |
| `isCleaning`  | Assigned to clean up a cat mess; overrides normal slot logic                                                                                                          |

**Lifecycle:**

1. Agent appears in the log files — spawns at the entrance door (right wall), spawn flash animation, particle burst
2. Backend says `working` or `thinking` — agent walks to an available desk, sits down, types
3. Backend goes `idle` — agent picks a weighted-random idle spot, walks there, performs activity for 10-30 seconds, then picks another
4. Task completion detected (transition from working to idle) — celebration animation with confetti
5. Backend silent for 20 seconds — agent marked idle server-side
6. Stale cleanup: subagents removed after 1 hour; sessions after 7 days

### Character Appearance

Each agent gets a deterministic appearance based on a hash of their session ID/slug (see `src/palettes.js`):

- **6 standard appearances** — blue, purple, green, orange, pink, cyan hair with light skin tones
- **5 diverse skin tones** — medium brown to deep brown with natural hair colors
- **1 fantasy gray** — silver hair, gray-blue skin
- **6 fantasy races** — elf (fair), elf (dark), alien (blue skin), catfolk (ears/tail), demon (red skin, horns), robot (metallic)

Total: 18 distinct character palettes, each with `hair`, `skin`, `shirt`, `pants`, and `accent` color properties. Fantasy types include special sprite features (pointed ears, antennae, horns, visors, etc.).

Human characters may also get hash-derived accessories: glasses, beard, hair bun, cap, scarf, or under-eye fatigue marks.

### Particle System

A lightweight `ParticleSystem` class (in `src/particles.js`) handles visual effects:

- **Confetti** — burst on task completion (celebration)
- **Puff** — emitted when agents despawn
- **Burst** — emitted when agents spawn
- **Ambient** — coffee steam, music notes from headphones/air guitar, sleep ZZZ particles

### Sound

Minimal audio via Web Audio API (see `src/audio.js`). A `blip()` function generates short square-wave tones on agent state transitions.

---

## Development Tips

- **Hot reload** — `npm run dev` runs Vite with HMR; changes to any module in `src/` are reflected instantly
- **No restart needed** — the frontend auto-reconnects when the server restarts (WebSocket reconnect + polling fallback)
- **Add a new activity**: create a `drawMyActivity()` function, register it in the `CHAR_DRAW` map, push a new entry to `IDLE_SPOTS` in `buildLayout()`, and call `syncIdleSpotsToAdmin()` if the object should be movable
- **Change office size**: adjust `COLS`, `KITCHEN_WALL_COL`, `PER_ROW`, `STEP_X`
- **Fantasy agents appear automatically** based on session ID hash — no configuration needed
- **Inject demo agents** via `POST /api/demo` to test without active Claude sessions

### Tool-to-Animation Mapping

The server maps Claude Code tool names to display labels:

| Tool        | Label              |
| ----------- | ------------------ |
| `Bash`      | Runs command       |
| `Read`      | Reads file         |
| `Write`     | Writes file        |
| `Edit`      | Edits file         |
| `Grep`      | Searches code      |
| `Glob`      | Finds files        |
| `WebFetch`  | Loads page         |
| `WebSearch` | Searches web       |
| `Agent`     | Launches sub-agent |
| `TodoWrite` | Updates tasks      |

### Frontend Module Map

| Module          | Purpose                                 |
| --------------- | --------------------------------------- |
| `main.js`       | Entry point, imports all CSS            |
| `app.js`        | Application init, main loop             |
| `constants.js`  | Shared constants (tile size, grid dims) |
| `state.js`      | Global state (agents, tasks, cat)       |
| `renderer.js`   | Canvas rendering pipeline               |
| `background.js` | Floor, walls, grid                      |
| `layout.js`     | Office layout builder, IDLE_SPOTS       |
| `agentState.js` | Agent state machine class               |
| `drawChars.js`  | Character sprite drawing functions      |
| `palettes.js`   | 18 character appearance palettes        |
| `animConfig.js` | Animation frame configs                 |
| `creatures.js`  | Cat state machine                       |
| `particles.js`  | Particle system                         |
| `bubbles.js`    | Speech/thought bubbles                  |
| `effects.js`    | Visual effects                          |
| `clickAnims.js` | Object click animations                 |
| `math.js`       | A\* pathfinding, geometry               |
| `audio.js`      | Web Audio API sound                     |
| `ui.js`         | Panels, overlays                        |
| `websocket.js`  | WS client + polling                     |
| `admin.js`      | Admin editor                            |
| `adminPos.js`   | Admin position syncing                  |
