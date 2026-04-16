# agent-dashboard/src — Canvas + Server

Hot zone. Two critical gotchas BEFORE editing:

## 1. Dead duplicate files

Live runtime code is in `src/app.js`. These files exist but are DEAD:
- `src/agentState.js` — dead class, imported by `renderer.js` but not reached at runtime
- `src/drawChars.js` — dead duplicate draw functions

**Always grep `src/app.js` first.** Edits to the dead files compile cleanly but never appear in the browser.

## 2. Vite entry chain

`src/index.html` → `src/main.js` → `src/app.js` (~9500 lines, single-file frontend).

The dead files are imported in the bundle but their exports are shadowed by `app.js` copies.

## 3. Generate layout

`generateLayout(n)` at ~`src/app.js:5169`:
- 1 desk + 1 couch per agent
- `_maxLayoutN = 12` floor
- `ACT_ZONE_Y` separates work area from entertainment zone below

## 4. Pathfinding

A* in same file. Walk timeout = 6 seconds. Separation force 1.2 walking / 0.6 standing. Agent "stuck without seat" = runtime bug (pathfinding), NOT a layout bug.

## 5. Admin walls

`adminWalls` at ~`src/app.js:15454`. `KITCHEN_WALL_COL` = hardcoded col 23. Collision grid built in `buildObstacleGrid()` — new walls must be added there for A* to respect them.
