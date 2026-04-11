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
  // Top wall layout: 2 windows at the corners, everything else in between.
  // WINDOW_TX = [1, 33]. Order L→R on row 0:
  //   win(1), darts(6-8), corkboard(12-14.5), [nameplate 12-22],
  //   kanban(22.5-25.5), whiteboard(27-30), clock(30.5-32), win(33).
  neon_sign: { tx: 28, ty: 44.5 },
  darts: { tx: 6, ty: 0 },
  corkboard: { tx: 12, ty: 0 },
  kanban: { tx: 22.5, ty: 0 },
  whiteboard: { tx: 27, ty: 0 },
  clock: { tx: 30.5, ty: 0 },
  telescope: { tx: 20, ty: 1.5 },

  // ═══ RIGHT PANEL ═══
  aquarium: { tx: 30.5, ty: 5.5 },
  cooler: { tx: 32, ty: 17.5 },
  printer: { tx: 29.5, ty: 22.5 },
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

  // ═══ GAMING ROOM (top-left: cols 1-17, rows 44-53) ═══
  arcade: { tx: 2, ty: 44 },
  pinball: { tx: 5, ty: 44 },
  slot_machine: { tx: 8, ty: 44 },
  jukebox: { tx: 10, ty: 44 },
  dj_console: { tx: 13, ty: 44 },
  record_player: { tx: 13, ty: 46 },
  foosball: { tx: 2, ty: 47 },
  pingpong: { tx: 6, ty: 47 },
  tv: { tx: 12, ty: 48 },
  gaming_sofa: { tx: 12, ty: 51 },
  neon_sign: { tx: 2, ty: 52 },
  disco_ball: { tx: 8, ty: 51 },

  // ═══ GYM ROOM (top-right: cols 19-33, rows 44-53) ═══
  gym: { tx: 20, ty: 45 },
  rowing_machine: { tx: 26, ty: 45 },
  basketball: { tx: 29, ty: 48 },

  // ═══ LOUNGE ROOM (bot-left: cols 1-17, rows 55-64) ═══
  photo_booth: { tx: 2, ty: 55 },
  crystal_ball: { tx: 5, ty: 55 },
  trophy_cabinet: { tx: 8, ty: 55 },
  nap_pod: { tx: 10, ty: 55 },
  zen_garden: { tx: 14, ty: 55 },
  conf_table: { tx: 3, ty: 59 },
  server_rack: { tx: 11, ty: 59 },
  printer_3d: { tx: 14, ty: 59 },
  rubber_duck: { tx: 10, ty: 62 },

  // ═══ CAFE ROOM (bot-right: cols 19-33, rows 55-64) ═══
  espresso_bar: { tx: 20, ty: 55 },
  popcorn_machine: { tx: 24, ty: 55 },
  gumball_machine: { tx: 27, ty: 55 },
  bookshelf: { tx: 29, ty: 55 },
  water_cooler: { tx: 20, ty: 59 },
  terrarium: { tx: 23, ty: 59 },
  newtons_cradle: { tx: 26, ty: 59 },
};

// Get position for an object — returns saved admin position or default
export function getAdminPos(id, defTx, defTy) {
  const p = window._adminPos?.[id];
  return p ? [p.tx, p.ty] : [defTx, defTy];
}

// Schema version — bump when BUILTIN_POSITIONS layout changes so that stale
// saved admin overrides in localStorage are wiped automatically.
export const POS_SCHEMA = "7";

// Apply custom positions to actual game objects
export function applyCustomPositions() {
  // Wipe stale overrides from prior layouts.
  if (localStorage.getItem("admin_positions_v") !== POS_SCHEMA) {
    localStorage.removeItem("admin_positions");
    localStorage.removeItem("admin_walls");
    localStorage.setItem("admin_positions_v", POS_SCHEMA);
  }
  const saved = JSON.parse(localStorage.getItem("admin_positions") || "{}");
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS, saved);
}
