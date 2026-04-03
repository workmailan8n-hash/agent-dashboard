# Agent Dashboard — ROADMAP

## Vision
Premium pixel-art AI office simulator that continuously evolves.
Autonomous development — Claude works on it daily, deploying improvements.

---

## Schedule
- **Every 4 hours** — autonomous sprint (06:00, 10:00, 14:00, 18:00, 22:00)
- Each sprint: pick next unchecked task → implement → test → commit → deploy
- Mark task [x] when done, add to CHANGELOG.md
- Every 5th sprint: refactoring + bug fixes only

---

## Day 1 — Foundation Polish
- [x] Weather particles outside windows (rain drops, snow flakes, sun rays)
- [x] Office lighting tint changes with time (warm sunset, cool night, bright day)
- [x] Agent mood emoji above head (😊😐😤🔥) based on work/idle ratio
- [x] Speech bubbles ("need coffee...", "shipping!", "bug found", "nice code!")

## Day 2 — Agent Personality
- [x] Persistent traits per agent (introvert prefers desk, extrovert prefers social spots)
- [x] Agents wave/nod when passing each other
- [x] High-five animation near desks when both working
- [x] Tired agent yawns, stretches, rubs eyes

## Day 3 — Visual Effects
- [x] Confetti burst when agent finishes a task (tool = done)
- [x] Dust particles floating in window light shafts
- [x] Fireflies outside windows at night
- [x] Screen glow on agent faces when at desk (colored light)

## Day 4 — Smooth Transitions
- [x] Sit down / stand up animation (not teleport to chair)
- [x] Door opens when agent enters, closes behind
- [ ] Elevator or stairs to 2nd floor (expand office vertically)
- [ ] Objects have idle animations (printer blinks, coffee steams, clock ticks)

## Day 5 — Stats Dashboard
- [ ] Activity heatmap overlay (toggle with H key)
- [ ] Agent productivity chart (work% vs idle%)
- [ ] "Office mood" meter in right panel
- [ ] Daily timeline (who worked when)

## Day 6 — Sims Mode (Agent Control)
- [ ] Click agent → radial menu appears with activity icons
- [ ] "Sims mode" toggle button (🎮) — all agents sit on couches waiting
- [ ] Send agent to any activity: desk, gym, kitchen, arcade, TV, etc.
- [ ] Agent walks to chosen activity with pathfinding
- [ ] Selected agent highlighted with glow ring
- [ ] Cancel/recall agent back to couch
- [ ] Multiple agents can be directed simultaneously
- [ ] Activity queue — assign next task before current finishes

## Day 7 — Mini-Games
- [ ] Playable ping pong (click paddle to hit)
- [ ] Snake on arcade machine (arrow keys)
- [ ] Darts with scoring (click to aim + throw)
- [ ] Leaderboard panel for scores

## Day 7 — Refactor Sprint
- [ ] Split index.html into modules (agents.js, objects.js, admin.js)
- [ ] Performance: cache static sprites to offscreen canvas
- [ ] Memory leak audit
- [ ] Mobile responsive CSS

## Day 8 — NPCs & Events
- [ ] Pizza delivery person at 12:00 (walks in, leaves box)
- [ ] Cleaning crew at 23:00 (mops floors, empties trash)
- [ ] Random visitor (walks around, leaves)
- [ ] Mail delivery (drops letters on desks)

## Day 9 — Office Events
- [ ] Party mode trigger (balloons, confetti, music notes, dancing)
- [ ] Fire drill (alarm sound, everyone runs to exit)
- [ ] Power outage (lights off, emergency lights, monitors dark)
- [ ] Holiday decorations auto (Christmas/Halloween by real date)

## Day 10 — Premium Polish
- [ ] Loading screen with pixel art progress bar
- [ ] Settings panel (toggle sounds, particles, animations)
- [ ] Export office as PNG screenshot
- [ ] Export as GIF animation (5 second loop)

## Day 11 — Social Features
- [ ] Shareable office URL with frozen state
- [ ] Embed widget (<iframe> snippet generator)
- [ ] QR code to office on the wall
- [ ] Visitor counter on the door

## Day 12 — Second Floor
- [ ] Add floor selector (1F / 2F tabs)
- [ ] Second floor: meeting rooms, rooftop garden, server room
- [ ] Elevator animation between floors
- [ ] Agents move between floors

## Day 13 — Sound Design
- [ ] Ambient office sounds (typing, murmur, AC hum)
- [ ] Contextual sounds (coffee pour, printer whir, ping pong)
- [ ] Music player object (lo-fi beats toggle)
- [ ] Volume slider in settings

## Day 14 — Final Polish
- [ ] Onboarding tutorial for new visitors
- [ ] About/credits page with all features listed
- [ ] Performance: WebGL renderer option
- [ ] Full test suite (E2E with Playwright)

---

## Ongoing (any sprint)
- Fix visual bugs spotted
- Improve pixel art quality of objects
- Add new agent skins/accessories
- Optimize pathfinding for large offices
- Keep README and CHANGELOG updated

---

## Red Lines (don't change without user approval)
- Don't remove existing objects
- Don't change admin password (noadmin)
- Don't break Railway deployment
- Don't modify API endpoints
- Always: commit → push → deploy after changes
- Keep BUILTIN_POSITIONS as default layout
- Don't change office layout without user's JSON

---

## Process
1. Read ROADMAP.md → find next unchecked [ ] task
2. Implement with subagents (Developer, Artist, Tester)
3. Test syntax + visual check
4. git commit → push → railway deploy
5. Update sync-to-cloud
6. Mark task [x] in ROADMAP
7. Write entry in CHANGELOG.md
