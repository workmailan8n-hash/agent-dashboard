// ════════════════════════════════════════════════════════════════
//  ADMIN POSITION RESOLVER — breaks circular dependency
//  CANONICAL SOURCE OF TRUTH — all three former copies merged here.
//  Values from app.js (runtime) preferred where conflicts existed.
// ════════════════════════════════════════════════════════════════

// Default layout positions (canonical layout v3 — merged from app.js runtime copy)
export const BUILTIN_POSITIONS = {
  // ═══ DESKS ═══
  desk_0: { tx: 11.5, ty: 3.5 },
  desk_1: { tx: 8, ty: 1 },
  desk_2: { tx: 15, ty: 1 },
  desk_3: { tx: 1, ty: 5 },
  desk_4: { tx: 8, ty: 5 },
  desk_5: { tx: 15, ty: 5 },
  desk_6: { tx: 1, ty: 9 },
  desk_7: { tx: 8, ty: 9 },
  desk_8: { tx: 15, ty: 9 },
  desk_9: { tx: 1, ty: 13 },
  desk_10: { tx: 8, ty: 13 },
  desk_11: { tx: 15, ty: 13 },
  desk_12: { tx: 1, ty: 17 },
  desk_13: { tx: 8, ty: 17 },
  desk_14: { tx: 15, ty: 17 },
  desk_15: { tx: 19.5, ty: 13 },
  desk_16: { tx: 19.5, ty: 17 },
  desk_17: { tx: 1, ty: 1 },
  desk_18: { tx: 19.5, ty: 9 },
  desk_19: { tx: 19.5, ty: 5 },

  // ═══ WALL DECORATIONS ═══
  neon_sign: { tx: 28, ty: 44.5 },
  corkboard: { tx: 12, ty: 0 },
  whiteboard: { tx: 27.5, ty: 0 },
  kanban: { tx: 22.5, ty: 0 },
  darts: { tx: 6, ty: 0 },
  telescope: { tx: 20, ty: 1.5 },
  clock: { tx: 31.5, ty: 0 },

  // ═══ RIGHT PANEL ═══
  aquarium: { tx: 30.5, ty: 5.5 },
  cooler: { tx: 32, ty: 17.5 },
  printer: { tx: 29.5, ty: 22.5 },
  trashcan: { tx: 29, ty: 11.5 },
  lava_lamp: { tx: 30, ty: 18 },
  plant_0: { tx: 5, ty: 19.5 },
  plant_1: { tx: 26.5, ty: 22.5 },
  vending: { tx: 31, ty: 12 },

  // ═══ KITCHEN ═══
  kitchen_counter: { tx: 25, ty: 10 },
  kitchen_table: { tx: 26.5, ty: 14 },
  fridge: { tx: 24, ty: 9 },

  // ═══ COUCHES (5 columns, 4 rows, staggered) ═══
  couch_0: { tx: 1.5, ty: 32 },
  couch_1: { tx: 6, ty: 22.5 },
  couch_2: { tx: 22, ty: 22.5 },
  couch_3: { tx: 10, ty: 22.5 },
  couch_4: { tx: 18, ty: 27.5 },
  couch_5: { tx: 1.5, ty: 27.5 },
  couch_6: { tx: 6, ty: 25 },
  couch_7: { tx: 10, ty: 32 },
  couch_8: { tx: 22, ty: 25 },
  couch_9: { tx: 18, ty: 22.5 },
  couch_10: { tx: 1.5, ty: 25 },
  couch_11: { tx: 6, ty: 27.5 },
  couch_12: { tx: 10, ty: 25 },
  couch_13: { tx: 18, ty: 32 },
  couch_14: { tx: 22, ty: 27.5 },
  couch_15: { tx: 1.5, ty: 22.5 },
  couch_16: { tx: 6, ty: 32 },
  couch_17: { tx: 22, ty: 32 },
  couch_18: { tx: 10, ty: 27.5 },
  couch_19: { tx: 18, ty: 25 },

  // ═══ ACTIVITY ZONE ═══
  server_rack: { tx: 1, ty: 46 },
  printer_3d: { tx: 3, ty: 46 },
  arcade: { tx: 5, ty: 46 },
  rowing_machine: { tx: 7, ty: 46.5 },
  tv: { tx: 11.5, ty: 47 },
  gaming_sofa: { tx: 11.5, ty: 51 },
  foosball: { tx: 8, ty: 53 },
  pingpong: { tx: 23.5, ty: 51.5 },
  jukebox: { tx: 30, ty: 53 },
  pinball: { tx: 21.5, ty: 52 },
  trophy_cabinet: { tx: 24.5, ty: 46 },
  bookshelf: { tx: 26.5, ty: 46 },
  slot_machine: { tx: 1, ty: 50 },
  water_cooler: { tx: 23, ty: 8 },
  disco_ball: { tx: 13, ty: 46 },

  // ═══ GYM & SPORTS ═══
  gym: { tx: 2, ty: 56 },
  basketball: { tx: 28.5, ty: 56 },
  crystal_ball: { tx: 19.5, ty: 57 },

  // ═══ BOTTOM ZONE ═══
  dj_console: { tx: 27, ty: 59.5 },
  rubber_duck: { tx: 1, ty: 60 },
  nap_pod: { tx: 27, ty: 62 },
  conf_table: { tx: 12, ty: 62 },
  espresso_bar: { tx: 20, ty: 63 },
  photo_booth: { tx: 16, ty: 53 },
  zen_garden: { tx: 24, ty: 63 },
  terrarium: { tx: 30, ty: 61 },
  newtons_cradle: { tx: 32, ty: 61 },
  popcorn_machine: { tx: 17, ty: 57 },
  gumball_machine: { tx: 14, ty: 57 },
};

// Get position for an object — returns saved admin position or default
export function getAdminPos(id, defTx, defTy) {
  const p = window._adminPos?.[id];
  return p ? [p.tx, p.ty] : [defTx, defTy];
}

// Apply custom positions to actual game objects
export function applyCustomPositions() {
  const saved = JSON.parse(localStorage.getItem("admin_positions") || "{}");
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS, saved);
}
