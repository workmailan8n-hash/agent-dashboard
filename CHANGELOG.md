# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

- Mail Delivery NPC — postal carrier enters at 10:00 AM, visits desks, drops envelope letters (visible 30s), exits through door (2026-04-08)
- Water Cooler interactive object — animated bottle with wave, hot/cold taps, drip animation, click splash particles (2026-04-08)
- Animated agent arrivals, 15-min idle behaviour, unique agents, richer sprites (`feat(sim)`)
- 4 walled rooms below activity zone: Gaming / Gym / Lounge / Cafe (`feat(layout)`)
- Auto-load `REMOTE_URL` and `SYNC_KEY` from `.env` (`feat(sync)`)
- Modern office desks / couches redesign alongside foosball score/speed fixes (`feat(redesign)`)
- Sprint GIF export (5-sec loop) + foosball minigame (`feat(sprint)`)
- Sprint PNG export button + crystal-ball fortune-teller minigame (`feat(sprint)`)
- Header redesign — 4 zones, canvas toolbar, LED tunnel, panel dividers, spark bar (`feat(ui)`)
- Bigger agents, brighter mood emoji, upgraded desk/couch/kitchen art (`feat(canvas)`)
- Settings enforcement wiring + jukebox rhythm minigame (`feat(settings+minigame)`)
- Pixel-art loading screen + plant watering minigame (`feat(loading+minigame)`)
- Holiday decorations auto by real date + whiteboard memory-match minigame (`feat(events)`)
- Power outage event + coffee machine minigame (`feat(events)`)
- Fire drill event + slot machine minigame (`feat(events)`)

### Changed

- Professionalized setup — docs, tests, CI (`chore`)
- Replaced Vercel boilerplate CLAUDE.md with project-specific content (`docs`)
- Added vitest to pre-commit hook for JS source changes (`chore`)
- Side panel font tweaks; mood emoji now shown on change only (`ux`)
- Polish pass: fonts, agent scale, overlaps, window clipping, panel alignment
- Sprint approve/revert moved to GitHub API; feedback read from Railway URL (`refactor(sprint)`)
- Sky FX aligned with window range `[1,33]`; foosball / GIF export restored (`fix(windows)+feat`)

### Fixed

- Antigravity audit findings — 7 bugs (`fix`)
- Foosball `scoreLock` prevents +50 per goal when ball stayed in goal area for 900ms
- Missing `OX_RIGHT` constant left canvas blank
- Consolidated batch: windows, NPC sidestep, vending duplication, 3D printer, sprint pipeline
- Windows: sky now fills entire pane, mullion cross redrawn on top
- Windows: sky/animations aligned with window frame (inner rect)
- Right panel: force CW recompute on boot so it sits flush with wall
- Right panel was drawing over the office wall
- Mood emoji shown 10 seconds after change (was 1.7s)
- Whiteboard minigame: card face never visible after flip
- Side panels, couch gap, gym overlaps, jukebox clipping, minigame fixes
- Entertainment-zone layout cleanup: walls, disco, slots, jukebox
- Relocated 6 visual conflicts in entertainment zone
- Weather clipping, windows, text and overlap batch audit
- Sprint: wrap `npx`/`node` in `call` so `.bat` doesn't die after claude exits
- URL query-string stripping for `railway-webhook` route + CJS require in sprint-track
- Telegram: await async `approveSprint` / `revertSprint` in callback handler
- Added missing `demo.js` handler to git (was accidentally in `.gitignore`)

### Reverted

- Sprint: GIF export (5-sec loop) + foosball minigame — later restored

[Unreleased]: https://github.com/workmailan8n-hash/agent-dashboard/commits/master
