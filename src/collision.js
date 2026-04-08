// ════════════════════════════════════════════════════════════════
//  COLLISION SYSTEM — AABB checks for objects, walls, bounds
// ════════════════════════════════════════════════════════════════
//  Single source of truth for object footprints + validation.
//  Used by admin editor (live drag feedback) and boot validator.
// ════════════════════════════════════════════════════════════════

import { BUILTIN_POSITIONS } from "./adminPos.js";

// Tolerance: objects may touch edges without counting as overlap.
const EPS = 0.05;

// ── Canonical object footprints (tile units) ────────────────────
// Sizes match the admin editor hitboxes in src/admin.js buildAdminObjects.
// Every type that appears in BUILTIN_POSITIONS is covered.
export const OBJECT_SIZES = {
  // Work zone
  desk: { w: 3.5, h: 3 },
  // Lounge
  couch: { w: 3, h: 2 },
  // Right panel
  clock: { w: 1.5, h: 1.5 },
  cooler: { w: 1.5, h: 1.5 },
  darts: { w: 2, h: 1 },
  aquarium: { w: 2.5, h: 2 },
  printer: { w: 2, h: 1 },
  trashcan: { w: 1, h: 1 },
  kanban: { w: 4.5, h: 4 },
  plant: { w: 1, h: 1.5 },
  // Kitchen
  kitchen_counter: { w: 9, h: 1 },
  kitchen_table: { w: 4, h: 3 },
  fridge: { w: 1, h: 1.5 },
  vending: { w: 1.5, h: 2.5 },
  // Wall decorations
  neon_sign: { w: 3, h: 1 },
  corkboard: { w: 2.5, h: 1.6 },
  whiteboard: { w: 3, h: 1.6 },
  lava_lamp: { w: 1.5, h: 2.5 },
  // Activity / sports / social / makers / cafe
  gym: { w: 5, h: 4 },
  rowing_machine: { w: 2.5, h: 1.5 },
  basketball: { w: 2, h: 2 },
  tv: { w: 4, h: 3 },
  gaming_sofa: { w: 4, h: 1.5 },
  arcade: { w: 2, h: 2.5 },
  dj_console: { w: 2.5, h: 1.2 },
  jukebox: { w: 2, h: 2.5 },
  pinball: { w: 2, h: 2.5 },
  pingpong: { w: 6, h: 3 },
  foosball: { w: 3, h: 1.5 },
  photo_booth: { w: 2, h: 2.5 },
  trophy_cabinet: { w: 2, h: 2.5 },
  crystal_ball: { w: 2, h: 2.5 },
  conf_table: { w: 6, h: 3 },
  espresso_bar: { w: 3, h: 1.5 },
  bookshelf: { w: 4.5, h: 3.5 },
  server_rack: { w: 2, h: 2.2 },
  printer_3d: { w: 2, h: 1.8 },
  telescope: { w: 1, h: 2 },
  // Right panel extras
  rubber_duck: { w: 2, h: 2 },
  // Bottom zone
  nap_pod: { w: 2.5, h: 1.5 },
  zen_garden: { w: 2, h: 1.5 },
  terrarium: { w: 1.8, h: 1.4 },
  newtons_cradle: { w: 1.5, h: 1.5 },
  popcorn_machine: { w: 1.5, h: 2 },
  gumball_machine: { w: 1.5, h: 2 },
};

// Strip trailing _N index to get base type.
export function baseType(name) {
  const m = name.match(/^(.*?)(?:_\d+)?$/);
  return m ? m[1] : name;
}

// Resolve size for a placed object name.
function sizeOf(name) {
  const t = baseType(name);
  return OBJECT_SIZES[t] || OBJECT_SIZES[name] || { w: 1, h: 1 };
}

// ── AABB primitives ──────────────────────────────────────────────
export function getAABB(name, pos) {
  const s = sizeOf(name);
  return { x1: pos.tx, y1: pos.ty, x2: pos.tx + s.w, y2: pos.ty + s.h };
}

export function intersects(a, b) {
  return (
    a.x1 < b.x2 - EPS &&
    a.x2 > b.x1 + EPS &&
    a.y1 < b.y2 - EPS &&
    a.y2 > b.y1 + EPS
  );
}

export function isInsideBounds(aabb, COLS, ROWS) {
  return (
    aabb.x1 >= -EPS &&
    aabb.y1 >= -EPS &&
    aabb.x2 <= COLS + EPS &&
    aabb.y2 <= ROWS + EPS
  );
}

// Walls: array of thin AABBs (1-tile thick segments).
// {x1,y1,x2,y2,label}
export function intersectsAnyWall(aabb, walls) {
  for (const w of walls) {
    if (intersects(aabb, w)) return w;
  }
  return null;
}

// ── Canonical layout walls (matches BUILTIN_POSITIONS layout) ────
// COLS=35, ROWS=70 (runtime minimum per generateLayout), kitchen col 23, lounge row 21.
// Wall-mounted decorations (clock, kanban, darts, etc.) sit at ty:0 and are intentionally
// flush with the top boundary — top wall is placed at y:-1..0 so they do not false-fire.
export const CANONICAL_COLS = 35;
export const CANONICAL_ROWS = 70;

export function buildCanonicalWalls(
  COLS = CANONICAL_COLS,
  ROWS = CANONICAL_ROWS,
) {
  const walls = [];
  // Top wall — placed above y:0 so wall-mounted objects (ty:0) don't trigger false positives
  walls.push({ x1: 0, y1: -1, x2: COLS, y2: 0, label: "top wall" });
  // Bottom wall
  walls.push({ x1: 0, y1: ROWS - 1, x2: COLS, y2: ROWS, label: "bottom wall" });
  // Left wall
  walls.push({ x1: 0, y1: 0, x2: 1, y2: ROWS, label: "left wall" });
  // Right wall: entrance door gap rows 5..7
  walls.push({
    x1: COLS - 1,
    y1: 0,
    x2: COLS,
    y2: 5,
    label: "right wall (top)",
  });
  walls.push({
    x1: COLS - 1,
    y1: 8,
    x2: COLS,
    y2: ROWS,
    label: "right wall (bot)",
  });
  // Kitchen partition col 23, rows 10..19, door rows 12..15
  walls.push({ x1: 23, y1: 10, x2: 24, y2: 12, label: "kitchen wall (top)" });
  walls.push({ x1: 23, y1: 16, x2: 24, y2: 20, label: "kitchen wall (bot)" });
  // Lounge wall row 21, cols 1..COLS-1, door cols 10..17 (30%..50% of 35)
  walls.push({ x1: 1, y1: 21, x2: 10, y2: 22, label: "lounge wall (left)" });
  walls.push({
    x1: 18,
    y1: 21,
    x2: COLS - 1,
    y2: 22,
    label: "lounge wall (right)",
  });
  return walls;
}

// ── Conflict scanner ─────────────────────────────────────────────
export function findConflicts(positions, walls, COLS, ROWS) {
  const out = [];
  const entries = Object.entries(positions);
  const aabbs = entries.map(([name, pos]) => ({
    name,
    aabb: getAABB(name, pos),
  }));

  for (const { name, aabb } of aabbs) {
    if (!isInsideBounds(aabb, COLS, ROWS)) {
      out.push({ name, kind: "oob", aabb });
    }
    const wallHit = intersectsAnyWall(aabb, walls);
    if (wallHit) {
      out.push({ name, kind: "wall", other: wallHit.label, aabb });
    }
  }
  // Pairwise overlap
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      if (intersects(aabbs[i].aabb, aabbs[j].aabb)) {
        out.push({
          name: aabbs[i].name,
          kind: "overlap",
          other: aabbs[j].name,
          aabb: aabbs[i].aabb,
        });
      }
    }
  }
  return out;
}

// ── Validate the canonical layout & expose to window for tests ──
export function validateCanonicalLayout() {
  const walls = buildCanonicalWalls();
  const conflicts = findConflicts(
    BUILTIN_POSITIONS,
    walls,
    CANONICAL_COLS,
    CANONICAL_ROWS,
  );
  if (conflicts.length) {
    console.warn(
      `[collision] ${conflicts.length} conflict(s) in BUILTIN_POSITIONS:`,
    );
    for (const c of conflicts) {
      const a = c.aabb;
      console.warn(
        `  • ${c.name} [${c.kind}] (${a.x1},${a.y1})..(${a.x2},${a.y2})` +
          (c.other ? ` ↔ ${c.other}` : ""),
      );
    }
  } else {
    console.log("[collision] BUILTIN_POSITIONS: 0 conflicts ✔");
  }
  return conflicts;
}

// Expose for Playwright + admin live-feedback
if (typeof window !== "undefined") {
  window.findConflicts = findConflicts;
  window.OBJECT_SIZES = OBJECT_SIZES;
  window.getAABB = getAABB;
  window.buildCanonicalWalls = buildCanonicalWalls;
  window.BUILTIN_POSITIONS_CANONICAL = BUILTIN_POSITIONS;
  window.CANONICAL_COLS = CANONICAL_COLS;
  window.CANONICAL_ROWS = CANONICAL_ROWS;
  window.validateCanonicalLayout = validateCanonicalLayout;
}
