# Spec: Minigames Expansion + Leaderboard Rework

**Status:** approved, ready to implement
**Branch:** `refactor/remove-tasks-feature` (continues after TASKS removal commit `ceb405b`)
**Created:** 2026-04-17

---

## Context

User wants:

1. 10 working minigames on different office objects — **poker, roulette, blackjack (21) are mandatory**.
2. After minigames are in — rework the TOP (leaderboard) tab: add all games, readable fonts, wider panel, tabs layout that scales to 10+ entries.

Current state (post TASKS removal):

- `src/minigames/`: coffee, crystal_ball, foosball, jukebox, plant, slot_machine, whiteboard (7 self-contained overlays).
- In `src/app.js`: snake, darts, pingpong (live at arcade/darts/ping-pong spots).
- Total **10 existing games** already. Only 3 shown in leaderboard (snake/darts/pingpong).

---

## REQ — Requirements

- **REQ-1** Add 3 mandatory casino games: poker, roulette, blackjack. Each self-contained in `src/minigames/<name>.js` following slot_machine.js overlay pattern.
- **REQ-2** Add 7 more games to reach 10 NEW total (on top of existing 10). Candidate pool — see TASK-2.
- **REQ-3** Each new game lives on a distinct interactive object in the office. Agents idle-use the object in ambient mode; player click on object triggers overlay.
- **REQ-4** Leaderboard shows all games with scores (existing + new = up to 20).
- **REQ-5** Leaderboard UI is readable on FHD (min 8-9px for tabs, 10-12px for scores).
- **REQ-6** Tabs layout scales past 10 entries (dropdown OR horizontal scroll OR icon-grid).
- **REQ-7** Each game has: pixel-art overlay, score saving via `window.saveGameScore(gameId, score)`, best-score readout on entry.
- **REQ-8** No regressions in existing minigames, agent pathfinding, or office rendering.

---

## TASK — Implementation plan (staged)

### TASK-1 (Stage 1) — Mandatory 3 casino games

- **TASK-1.1** `src/minigames/poker.js` — 5-card draw vs. CPU dealer. Score = chips won at exit. Object: **poker table** (new 3×2 tile object in Gaming room, pixel-art green felt + 2 chairs).
- **TASK-1.2** `src/minigames/roulette.js` — European roulette (single 0). Bet red/black/number. Score = cumulative net chips. Object: **roulette wheel** (new 2×2, spinning reel pixel art).
- **TASK-1.3** `src/minigames/blackjack.js` — 21. Hit/stand vs. dealer. Score = hands won or chip total. Object: **blackjack table** (new 3×2 arc felt + dealer position).
- **TASK-1.4** Register 3 new objects in `src/adminPos.js` (BUILTIN_POSITIONS), `src/collision.js` (obstacle dims), `src/app.js` IDLE_SPOTS + drawing hooks.
- **TASK-1.5** Per-game anim state for idle agents (e.g., "sitting_poker" with card-fanning sprite) — simplest path: reuse `sitting_couch` sprite at first, add variations later.

### TASK-2 (Stage 2) — 8 approved games

- **TASK-2.1** `src/minigames/chess_puzzle.js` — daily puzzle on chess board (new object). Score = inverse of time to solve.
- **TASK-2.2** `src/minigames/_2048.js` — classic 2048 on a tablet object. Score = max tile.
- **TASK-2.3** `src/minigames/minesweeper.js` — 8×8 grid on bulletin board object. Score = inverse time on win.
- **TASK-2.4** `src/minigames/typing_test.js` — WPM race on a standalone terminal object. Score = WPM.
- **TASK-2.5** `src/minigames/reaction_test.js` — click when color flips (wall clock object). Score = inverse ms.
- **TASK-2.6** `src/minigames/minigolf.js` — single hole flick-aim on rug object. Score = strokes under par.
- **TASK-2.7** `src/minigames/connect4.js` — 7×6 on wall-hung board. Score = wins vs. CPU.
- **TASK-2.8** `src/minigames/tictactoe.js` — vs. CPU, chalkboard object. Score = win streak.

Total new: 3 casino + 8 = **11 new games** (user accepted +1 over original 10).

### TASK-3 (Stage 3) — Leaderboard rework

- **TASK-3.1** `src/index.html` leaderboard panel: widen 300→420px, max-height 70vh.
- **TASK-3.2** CSS `src/styles/leaderboard.css`: tabs 5px→9px, rows 6/9px→10/12px, meta 5px→8px, panel padding bump.
- **TASK-3.3** Tabs layout: replace flex-row with 2-column icon grid (10 games × 2 columns) OR horizontal scroll strip with snap. Default: **2-column icon grid** — scales to 20 entries, scannable.
- **TASK-3.4** `src/main.js` GAME_LABELS: add entries for all 10 games (icon + unit + label).
- **TASK-3.5** Auto-populate tabs from GAME_LABELS instead of hardcoded HTML.

### TASK-4 — Verification per game

- Open overlay, play one round, confirm `saveGameScore(id, n)` hits localStorage.
- Best-score read-back matches after overlay close/reopen.
- Exit via Esc + X button both work.
- Leaderboard TOP shows the new entry immediately.

---

## SVC — Services / touchpoints

- **SVC-1 (frontend only)** — no server changes. All scores in `localStorage.game_leaderboard`.
- **SVC-2 (positions)** — `src/adminPos.js` BUILTIN_POSITIONS extended, `POS_SCHEMA` bump to clear stale localStorage.
- **SVC-3 (obstacles)** — `src/collision.js` + `src/layout.js` aware of new object footprints for A\* pathfinding.

---

## Out of scope

- Multiplayer / real money / server-side persistence.
- Mobile touch optimizations for overlays (desktop-first).
- Sound design beyond existing `blip()` helper.
- Agent-specific animations per minigame (use fallback sprites in Stage 1).

---

## Risks

- **R-1 Collision grid breaks** if new objects placed without updating `buildObstacleGrid()`. Mitigation: audit after each object add.
- **R-2 Bundle size** — 10 new overlay modules ≈ 40-60 KB. Acceptable (current dist ~365 KB).
- **R-3 Object placement** — not enough floor space in current layout. Mitigation: use bottom-zone redesign (planned anyway per HANDOFF) for 4 themed rooms including Gaming room.
- **R-4 POS_SCHEMA bump** wipes user's admin-edited positions. Flag to user before release.

---

## Approved decisions

- Scope: **11 new games** (3 casino + 8 pool). Existing 10 stay. Total after = ~21 (10 existing + 11 new).
- Order: **Stage 1 → Stage 2 → Stage 3** (all games in, then TOP rework in one shot).
- Tabs layout: **2-column icon grid**, auto-populated from GAME_LABELS.
- Merge: **one PR per stage** on `refactor/remove-tasks-feature` branch (rename to `feat/minigames-expansion` before stage 1).
