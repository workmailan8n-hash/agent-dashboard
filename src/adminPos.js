// ════════════════════════════════════════════════════════════════
//  ADMIN POSITION RESOLVER — breaks circular dependency
// ════════════════════════════════════════════════════════════════

// Default layout positions (exported from localhost admin editor)
export const BUILTIN_POSITIONS = {
  desk_0: { tx: 1, ty: 1 },
  desk_1: { tx: 6, ty: 1 },
  desk_2: { tx: 11, ty: 1 },
  desk_3: { tx: 16, ty: 1 },
  desk_4: { tx: 1, ty: 5 },
  desk_5: { tx: 6, ty: 5 },
  desk_6: { tx: 11, ty: 5 },
  desk_7: { tx: 16, ty: 5 },
  desk_8: { tx: 1, ty: 9 },
  desk_9: { tx: 6, ty: 9 },
  desk_10: { tx: 11, ty: 9 },
  desk_11: { tx: 16, ty: 9 },
  desk_12: { tx: 1, ty: 13 },
  desk_13: { tx: 6, ty: 13 },
  desk_14: { tx: 11, ty: 13 },
  desk_15: { tx: 16, ty: 13 },
  desk_16: { tx: 1, ty: 17 },
  clock: { tx: 24, ty: 0 },
  darts: { tx: 30, ty: 0 },
  kanban: { tx: 24, ty: 2 },
  aquarium: { tx: 24, ty: 7 },
  printer: { tx: 30, ty: 9 },
  plant_0: { tx: 5, ty: 0.5 },
  plant_1: { tx: 28, ty: 8 },
  kitchen_counter: { tx: 24, ty: 12 },
  kitchen_table: { tx: 26, ty: 14 },
  fridge: { tx: 33, ty: 12 },
  trashcan: { tx: 33, ty: 16 },
  cooler: { tx: 30, ty: 16 },
  vending: { tx: 27, ty: 17 },
  couch_0: { tx: 2, ty: 23 },
  couch_1: { tx: 9, ty: 23 },
  couch_2: { tx: 16, ty: 23 },
  couch_3: { tx: 23, ty: 23 },
  couch_4: { tx: 30, ty: 23 },
  couch_5: { tx: 2, ty: 27 },
  couch_6: { tx: 9, ty: 27 },
  couch_7: { tx: 16, ty: 27 },
  couch_8: { tx: 23, ty: 27 },
  couch_9: { tx: 30, ty: 27 },
  couch_10: { tx: 2, ty: 31 },
  couch_11: { tx: 9, ty: 31 },
  couch_12: { tx: 16, ty: 31 },
  couch_13: { tx: 23, ty: 31 },
  couch_14: { tx: 30, ty: 31 },
  couch_15: { tx: 5.5, ty: 25 },
  couch_16: { tx: 12.5, ty: 25 },
  gym: { tx: 2, ty: 37 },
  basketball: { tx: 10, ty: 37 },
  tv: { tx: 19, ty: 37 },
  gaming_sofa: { tx: 19, ty: 41 },
  arcade: { tx: 27, ty: 37 },
  dj_console: { tx: 31, ty: 37 },
  pingpong: { tx: 2, ty: 47 },
  foosball: { tx: 10, ty: 47 },
  conf_table: { tx: 19, ty: 47 },
  espresso_bar: { tx: 19, ty: 52 },
  bookshelf: { tx: 27, ty: 47 },
  server_rack: { tx: 27, ty: 52 },
  printer_3d: { tx: 31, ty: 52 },
  telescope: { tx: 32, ty: 47 },
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
