# Rooms Overhaul — 4-Room Visual & UX Pass

Status: in-progress · Owner: this session · Date: 2026-05-12

Background: после фикса orbit-баг'а + объёмных стен (heavy shadow) brand-designer + ux-designer провели ревью 4 нижних комнат (Gaming/Gym/Lounge/Cafe). Список улучшений ниже. Каждый TASK — атомарный, отдельный коммит на master.

## REQ — требования

- **REQ-1** 4 комнаты читаются за 3 секунды по теме (Gaming / Gym / Lounge / Cafe). Без угадывания.
- **REQ-2** Нет тематических конфликтов (никаких server rack в казино, zen garden на зелёном фетре, и т.д.).
- **REQ-3** Ни одна комната не выглядит пустой. Минимум плотность объектов = 4-5 на комнату.
- **REQ-4** Стены имеют консистентную модель освещения (light source: top-left). Cap/face/shadow согласованы между H и V стенами.
- **REQ-5** Цвет пола Gym не сливается с цветом стен (контраст ≥30% lightness).
- **REQ-6** Объекты внутри комнаты сгруппированы в кластеры, а не разбросаны хаотично по периметру.

## TASK — порядок исполнения

### P0 (визуальные регрессии)

- **TASK-1** Gym floor lighten: `#32353e → #42464f`, `#2a2d36 → #383c45`, dot `#50545f`. Файл: drawing function for gym floor в app.js.
- **TASK-2** V-wall: убрать top-cap, добавить left-edge stripe 4px `WALL_CAP` — корректирует светотень для вертикальных стен. Файл: app.js drawVWall.
- **TASK-3** Move `server_rack` из Lounge в Gym (`tx: 11, ty: 55` → `tx: 19-20, ty: ACT_ZONE_Y+1`). Файл: adminPos.js + buildObstacleGrid в app.js + IDLE_SPOTS.
- **TASK-4** Move `zen_garden` из Lounge в Cafe (top-wall корнер `tx: 19, ty: ROOMS_MID_ROW+2`). Файл: adminPos.js + buildObstacleGrid.
- **TASK-5** Move `connect4` ближе к `tictactoe` (с `col 31.5, row 57` → `col 27, row 55`). Файл: adminPos.js.

### P1 (композиция)

- **TASK-6** Проверить `VIBE neon_sign` (row 0) — если row 0 это top wall офиса, перенести в Gaming top-wall (`tx: 3, ty: ACT_ZONE_Y+2`). Файл: adminPos.js.
- **TASK-7** Проверить `corkboard` (row 0 в Lounge spec) — фактическая позиция, скорректировать если в work-zone.
- **TASK-8** Gaming top-wall: разбить 5-объектную линию на 2 ряда. Arcade machines (arcade + pinball + slot_machine) — у левой стены. Audio (jukebox + dj_console + record_player) — справа. Foosball + ping-pong сдвинуть на ACT_ZONE_Y+13.

### P2 (заполнение / атмосфера)

- **TASK-9** Добавить в Gym 3 объекта: `punching_bag` (1×2), `yoga_mat` (2×2), `mirror_wall` (декор на стене). Полная цепочка: drawFn в app.js + OBJECT_SIZES в collision.js + BUILTIN_POSITIONS в adminPos.js + buildObstacleGrid + IDLE_SPOTS + (опц.) idle anim.
- **TASK-10** Добавить в Cafe `coffee_counter` (барная стойка 3×1, у левой стены `tx: 19, ty: ROOMS_MID_ROW+2`). Полная цепочка.
- **TASK-11** Cafe floor: затемнить planks на 8%, добавить ambient shadow `rgba(0,0,0,0.12)` у первой строки тайлов внутри комнаты.

### P3 (Tooling)

- **TASK-12** Bump `POS_SCHEMA` в adminPos.js — все позиции изменились, надо очистить кэш localStorage.
- **TASK-13** Запустить acceptance-auto + orbit-check после каждого крупного блока.

## Risks

- Перенос объектов меняет obstacleGrid → возможны новые pathfinding issues. Тест orbit-check после каждого Move-task.
- Новые объекты в Gym требуют новых draw-функций; сложность ≥30 LOC каждая.
- POS_SCHEMA bump сбросит admin-кастомизации пользователей (если они есть). Это OK — мы переопределяем дефолт.

## Verification

После каждого блока (P0 → P1 → P2):

1. `npm test` — vitest проходит
2. `npx playwright test acceptance-auto.spec.ts` — 13+/14 ✓
3. `npx playwright test orbit-check.spec.ts` — passes
4. Visual screenshot — `wall-shot.spec.ts` → пользователь смотрит и подтверждает
