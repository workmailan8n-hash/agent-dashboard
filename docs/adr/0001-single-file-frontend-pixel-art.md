# ADR-0001: Single-file pixel-art frontend

**Status:** accepted
**Date:** 2026-03-01

## Context

The frontend is a live pixel-art office simulator with Canvas 2D rendering, A* pathfinding, and ~70 draw functions. Originally split across multiple modules, we hit pain:

- Vite HMR cycles through inter-module imports slowed dev loop
- Draw-order bugs between modules (character rendered behind furniture of wrong tile)
- Dead-code duplicates (`agentState.js`, `drawChars.js`) quietly diverged from the real runtime

## Decision

Consolidate runtime into one file: `src/app.js` (~9500 lines). Keep `src/main.js` as a thin bootstrap. Treat other `src/*.js` files as reference/dead unless explicitly imported at runtime.

## Consequences

**Positive:**
- One source of truth for rendering order
- No hidden shadowing of exports
- Vite HMR is instant on `app.js` edits

**Negative:**
- 9500-line file is intimidating — `src/CLAUDE.md` is required reading before edits
- Requires `grep` discipline: always confirm symbol location in `app.js` before touching "same-name" file elsewhere
- Dead duplicate files remain until a cleanup ADR supersedes this one

## Mitigations

- `src/CLAUDE.md` loaded when Claude touches this dir — flags the dead-duplicate trap
- Playwright smoke tests catch regressions in core flows
