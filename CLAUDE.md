# Agent Dashboard

Pixel-art office simulator visualizing Claude Code agents. Canvas 2D, vanilla JS frontend, Node HTTP + WebSocket backend.

## Stack

- Node.js (vanilla HTTP + `ws`), file-watcher of `~/.claude/projects/*.jsonl`
- Vite 5 (build + HMR)
- Canvas 2D, no frontend framework
- Playwright E2E, Vitest unit
- Fly.io deploy via GitHub Actions (`.github/workflows/fly-deploy.yml` on push to master). Railway sunset.

## Run locally

```bash
npm run dev          # server :3737 + Vite HMR
npm run build        # build to dist/
npm start            # production server on :3737
node demo.js         # inject 6 demo agents
npm test             # vitest
npm run test:e2e     # playwright
```

## Deploy

- **Fly.io**: `git push origin master` → GitHub Actions runs `flyctl deploy --remote-only` (see [.github/workflows/fly-deploy.yml](.github/workflows/fly-deploy.yml)).
- Live: https://agent-dashboard-ancient-mountain-4835.fly.dev
- Railway deprecated — do NOT push there.
- See [docs/runbook.md](docs/runbook.md).

## Conventions

- Branch: `feat/...`, `fix/...`, `refactor/...`
- Commits: Conventional Commits
- Canvas 2D only; no frontend npm deps
- Positions in `src/adminPos.js` (BUILTIN_POSITIONS); bump `POS_SCHEMA` on change

## Key files

- [src/app.js](src/app.js) — **LIVE runtime** (~9500 LOC, draw + loop)
- [src/main.js](src/main.js) — entry, CSS imports
- [src/adminPos.js](src/adminPos.js) — single source of truth for positions
- [src/layout.js](src/layout.js) — A\* pathfinding + obstacle grid
- [src/background.js](src/background.js) — walls/floors/windows
- [src/minigames/](src/minigames/) — per-object minigames
- [server.js](server.js) + [src/server/](src/server/) — HTTP router, WS, auth, sprint-git, logger

## Gotchas

- **Dead duplicate files:** `src/agentState.js` and `src/drawChars.js` exist but are NOT the runtime. Live code is in `src/app.js`. Always grep `app.js` before editing a symbol — see [src/CLAUDE.md](src/CLAUDE.md) and [docs/adr/0001-single-file-frontend-pixel-art.md](docs/adr/0001-single-file-frontend-pixel-art.md).
- `POS_SCHEMA` bump is the ONLY way to clear stale localStorage for admin positions.
- Sprint flow: `sprint-staging` branch → PR → TG approve buttons. See [docs/runbook.md](docs/runbook.md).

## Links

- Notion: 335002d3-0d68-814c-aa8f-ddfdee3586f3
- Repo: github.com/workmailan8n-hash/agent-dashboard
- Live: https://agent-dashboard-ancient-mountain-4835.fly.dev
