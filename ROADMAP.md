# Agent Dashboard — ROADMAP

## Vision
Premium pixel-art AI office simulator. Each sprint adds polish, new content, and fixes.
Goal: something people want to share and watch for hours.

---

## Sprint Schedule
- 3x/day autonomous sprints (09:00, 14:00, 20:00)
- Each sprint: 1 feature + fixes + deploy
- Every 3rd sprint: refactoring + tests only

---

## Week 1: Polish & Atmosphere

### Sprint 1 — Office Ambiance
- [ ] Weather system (rain/snow/sun particles outside windows)
- [ ] Ambient sounds toggle button (keyboard clicks, coffee machine, murmur)
- [ ] Office lighting changes with time of day (warm at sunset, cool at night, bright at day)
- [ ] Floor reflections / shadows improve based on light

### Sprint 2 — Agent Personality
- [ ] Each agent gets persistent traits (introvert/extrovert affects activity choice weights)
- [ ] Agents have mood indicator (emoji above head: 😊😐😤🔥)
- [ ] Agents react to each other (wave when passing, high-five near desks)
- [ ] Speech bubbles with contextual text ("need coffee...", "shipping!", "bug found")

### Sprint 3 — Refactor + Tests
- [ ] Split index.html into modules (agents.js, objects.js, admin.js, render.js)
- [ ] Unit tests for A* pathfinding
- [ ] Unit tests for slot assignment
- [ ] Performance audit (reduce draw calls, cache static elements)

---

## Week 2: Interactive Features

### Sprint 4 — Live Dashboard Stats
- [ ] Activity heatmap (which zones are most popular)
- [ ] Agent productivity graph (work time vs idle time)
- [ ] Daily timeline (who did what when)
- [ ] "Office mood" indicator based on aggregate agent states

### Sprint 5 — Mini-games
- [ ] Playable ping pong (click to control paddle)
- [ ] Snake on the arcade machine (playable)
- [ ] Darts scoring system (click to throw)
- [ ] Leaderboard for mini-games

### Sprint 6 — Refactor + Tests
- [ ] E2E tests with Playwright
- [ ] Load testing (50+ agents)
- [ ] Memory leak check
- [ ] Mobile responsive layout

---

## Week 3: Premium Visuals

### Sprint 7 — Particle Effects
- [ ] Confetti when agent finishes task
- [ ] Smoke from kitchen when someone cooks
- [ ] Dust particles in light shafts
- [ ] Fireflies at night through windows

### Sprint 8 — Advanced Animations
- [ ] Agent sitting down / standing up transition (not instant)
- [ ] Door open/close animation when agent enters
- [ ] Elevator/stairs between floors (if we add 2nd floor)
- [ ] Objects break and get repaired (printer jams, monitor flickers)

### Sprint 9 — Refactor + Tests
- [ ] Sprite sheet system (replace procedural drawing with cached sprites)
- [ ] WebGL renderer option for better performance
- [ ] Optimize obstacle grid rebuilds
- [ ] Documentation update

---

## Week 4: Social & Multiplayer

### Sprint 10 — Visitor System
- [ ] "Visitor" agents (different color scheme, temporary)
- [ ] Delivery person brings packages
- [ ] Pizza delivery at lunch time
- [ ] Cleaning crew at night

### Sprint 11 — Events
- [ ] Office party mode (balloons, music, dancing)
- [ ] Fire drill (everyone runs to exit)
- [ ] Power outage (lights flicker off, emergency lights)
- [ ] Holiday decorations (Christmas tree, Halloween pumpkins)

### Sprint 12 — Final Polish
- [ ] Loading screen with progress bar
- [ ] Settings panel (toggle features, adjust speed)
- [ ] Export office as PNG/GIF
- [ ] About/credits page

---

## Red Lines (don't change without user approval)
- Don't remove existing objects without asking
- Don't change admin password
- Don't break Railway deployment
- Don't modify server.js API endpoints
- Always commit + push + deploy after changes
- Keep BUILTIN_POSITIONS as the default layout

---

## Done Log
See git log and CHANGELOG.md for completed work.
