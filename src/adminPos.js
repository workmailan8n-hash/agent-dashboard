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
  //   whiteboard(27-30), clock(30.5-32), win(33).
  // (neon_sign canonical position lives in Gaming room section below)
  // Casino tables: placed in Lounge room (cols 1..17, rows ROOMS_MID_ROW+1..+10)
  // For N=20 baseline: ACT_ZONE_Y=43, ROOMS_MID_ROW=54 → rows 62-63
  // Col shifts keep 1-tile walkable gaps between poker↔roulette and roulette↔blackjack.
  poker_table: { tx: 3, ty: 62 },
  roulette: { tx: 7, ty: 62 },
  blackjack_table: { tx: 13, ty: 62 },
  darts: { tx: 6, ty: 0 },
  corkboard: { tx: 12, ty: 0 },
  whiteboard: { tx: 27, ty: 0 },
  clock: { tx: 30.5, ty: 0 },
  telescope: { tx: 20, ty: 1.5 },

  // ═══ RIGHT PANEL ═══
  aquarium: { tx: 30.5, ty: 5.5 },
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
  // Top wall (row 44): arcade machines cluster left
  arcade: { tx: 2, ty: 44 },
  pinball: { tx: 5, ty: 44 },
  slot_machine: { tx: 8, ty: 44 },
  // Row 46: audio cluster right (was crammed into row 44 with arcades)
  jukebox: { tx: 10, ty: 46 },
  dj_console: { tx: 13, ty: 46 },
  record_player: { tx: 15.5, ty: 46 },
  // Row 47: sports
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
  // server_rack moved here from Lounge (IT equipment fits gym/tech zone, not casino)
  server_rack: { tx: 31, ty: 45 },
  // New gym additions (focal points filling empty bottom-left of Gym)
  punching_bag: { tx: 20, ty: 50 },
  yoga_mat: { tx: 26, ty: 50 },

  // ═══ CONFERENCE TABLE (work zone, below couches, above bottom rooms) ═══
  conf_table: { tx: 5, ty: 35 },

  // ═══ LOUNGE ROOM (bot-left: cols 1-17, rows 55-64) ═══
  // Casino lounge: ambient/decor at top wall, casino tables at bottom wall.
  // server_rack moved to Gym; zen_garden moved to Cafe (theme coherence).
  trophy_cabinet: { tx: 2, ty: 55 },
  crystal_ball: { tx: 5, ty: 55 },

  // ═══ CAFE ROOM (bot-right: cols 19-33, rows 55-64) ═══
  // Top wall (row 55): reaction_clock, gumball, tictactoe, terrarium.
  // Right wall: connect4 at (31.5, 57). Bottom: cafe_table + photo_booth (corner).
  water_cooler: { tx: 32, ty: 17 },
  cafe_table: { tx: 22, ty: 62 },
  photo_booth: { tx: 31, ty: 61.5 },

  // ═══ STAGE 2 MINIGAME OBJECTS ═══
  // Cafe room top wall (row 55): board games clustered together
  reaction_clock: { tx: 20, ty: 55 },
  gumball_machine: { tx: 22.5, ty: 55 },
  tictactoe: { tx: 25.5, ty: 55 },
  connect4: { tx: 28, ty: 55 }, // moved from (31.5, 57) — was isolated on right wall
  terrarium: { tx: 30.5, ty: 55 },
  // Cafe ambient (moved from Lounge — zen on oak floor reads better than on casino felt)
  zen_garden: { tx: 27.5, ty: 60 },
  typing_laptop: { tx: 22, ty: 62 },
  // Coffee counter — anchors Cafe as a "kitchen-adjacent" lounge
  coffee_counter: { tx: 19, ty: 56 },
};

// Get position for an object — returns saved admin position or default
export function getAdminPos(id, defTx, defTy) {
  const p = window._adminPos?.[id];
  return p ? [p.tx, p.ty] : [defTx, defTy];
}

// Schema version — bump when BUILTIN_POSITIONS layout changes so that stale
// saved admin overrides in localStorage are wiped automatically.
export const POS_SCHEMA = '18';

// Apply custom positions to actual game objects
export function applyCustomPositions() {
  // Wipe stale overrides from prior layouts.
  if (localStorage.getItem('admin_positions_v') !== POS_SCHEMA) {
    localStorage.removeItem('admin_positions');
    localStorage.removeItem('admin_walls');
    localStorage.setItem('admin_positions_v', POS_SCHEMA);
  }
  const saved = JSON.parse(localStorage.getItem('admin_positions') || '{}');
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS, saved);
}
