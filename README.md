# Agent Dashboard — Pixel Office Simulation

A real-time pixel art office where your Claude AI agents live and work. Each agent running in Claude Code appears as a character in the office, walking between desks, relaxing on couches, playing ping pong, and more — all synchronized with actual agent activity via WebSocket.

## What it looks like

- **1200px canvas** with side stat panels
- Pixel art characters with diverse appearances (human, elf, alien, cat-person, demon, robot)
- Live wall clock, animated ping pong ball, cat that roams and makes messes
- Kanban board on the right side showing your actual tasks
- Kitchen, gym zone, lounge, conference table, bookshelf, vending machine, printer

## Quick start

```bash
cd agent-dashboard
npm install
node server.js
```

Then open `http://localhost:3737` in your browser.

The server also exposes your local IP so you can watch from a phone or second screen.

## How it works

### Server (`server.js`)

Node.js HTTP + WebSocket server on port **3737**.

- Watches `~/.claude/projects/` for Claude Code hook output files using **chokidar**
- Parses tool names (Read, Write, Edit, Bash, Agent…) and maps them to agent states
- Pushes updates to all connected browsers over WebSocket
- Persists your task list to `tasks.json` between restarts

### Frontend (`public/index.html`)

Single-file Canvas 2D game — no build step, no framework. ~4000 lines of vanilla JS.

**Rendering pipeline:**
1. `bgBuf` — offscreen canvas for static background (redrawn only on layout change)
2. `ctx` — main canvas, cleared each frame, draws agents + dynamic effects on top

**Key constants:**
| Name | Value | Meaning |
|---|---|---|
| `CW` | 1200 | Canvas width px |
| `T` | 32 | Tile size px |
| `OX` | 140 | Left/right stat panel width |
| `COLS` | 28 | Office grid columns |
| `KITCHEN_WALL_COL` | 17 | Column of kitchen partition wall |

**Agent state machine** — each agent has a slot (desk or idle spot). Every ~5s an idle agent picks a new activity slot if available. The `isCleaning` flag bypasses slot assignment so cleanup tasks finish properly.

**A\* pathfinding** with `buildObstacleGrid()` — agents navigate around kitchen walls and ping pong table. If A\* can't find a path, `nearestFree()` BFS finds the closest walkable tile.

**Separation force** — O(n²) per-frame push between agents prevents stacking. 7-second `walkTimer` lets agents abandon unreachable slots.

## Agent characters

Each agent's appearance is derived from their Claude session ID hash — so the same agent always looks the same.

**Palette groups:**
- Light, medium, and dark human skin tones
- Elf (pointed ears, fair or dark)
- Alien (antennae, large almond eyes, blue skin)
- Neko / Cat-person (cat ears, cat nose)
- Demon (horns, glowing red eyes)
- Robot / Android (visor, LED eyes)

**Accessories** (hash-derived for human types): glasses, beard, bun, cap, scarf, under-eye fatigue marks.

## Activity zones

| Zone | Location | Activities |
|---|---|---|
| Desks | Rows 1–N | Typing, furious coding, doodling, desk nap |
| Lounge | Below desks | Sleeping, drinking beer, on phone, stretching |
| Gym | Activity zone | Treadmill |
| Gaming | Activity zone | Console gaming, watching |
| Ping pong | Activity zone | 2-player — ball only animates when both present |
| Kitchen | Right side (cols 18–26) | Coffee, vending machine, eating |
| Social zone | Below gym | Conference table (2+ people), bookshelf |
| Plants | Corners | Plant care animation |

## Task API

Your tasks appear on the in-game kanban board (upper-right area of the office).

```bash
# Add a task
curl -X POST http://localhost:3737/api/mytasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix bug","priority":"high","assignee":"Dev"}'

# List tasks
curl http://localhost:3737/api/mytasks

# Update task status
curl -X PATCH http://localhost:3737/api/mytasks/:id \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Delete task
curl -X DELETE http://localhost:3737/api/mytasks/:id
```

## Claude Code hooks

The server reads hook output files that Claude Code writes to `~/.claude/projects/`. Each tool call updates the agent's state:

| Tool | Office animation |
|---|---|
| Bash | Furious typing + glow |
| Write / Edit | Typing + printer activates |
| Read / Grep | Normal typing |
| Agent | Sub-agent spawned in office |
| WebFetch / WebSearch | Screen glow effect |

## Global state (main globals)

```js
agentStates   // agentId → AgentState (position, animation, flags)
idleOccupied  // slotIdx → agentId (exclusive slot ownership)
myTasks       // [{id, title, status, priority, assignee}]
ppBall        // {t, dir, speed, active} — ping pong ball (0=left, 1=right)
cat           // {tx, ty, state, messExists, …}
trashLevel    // 0–10, triggers stomp cleanup at 8
printerActive // countdown timer when printing
startTime     // Date.now() at load, used for uptime display
```

## File structure

```
agent-dashboard/
├── server.js          # WebSocket + HTTP server, file watcher
├── public/
│   └── index.html     # Entire game (Canvas 2D, ~4000 lines)
├── tasks.json         # Persisted task list (gitignored)
├── package.json
└── README.md
```

## Development tips

- **Restart not needed** — the frontend auto-reconnects when the server restarts
- **Add a new activity**: push to `IDLE_SPOTS` in `buildLayout()`, add a draw function and register it in `CHAR_DRAW`
- **Change office size**: adjust `COLS`, `KITCHEN_WALL_COL`, `PER_ROW`, `STEP_X`
- **Background redraws** on layout change only — call `drawBackground()` after structural changes
- **Fantasy agents** appear automatically based on session ID hash — no config needed
