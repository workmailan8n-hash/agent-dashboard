// ════════════════════════════════════════════════════════════════
//  ADMIN EDITOR
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from './constants.js';
import { COLS, ROWS, CW, CH, setCOLS, setROWS, setCW, setCH } from './layout.js';
import {
  DESK_DEFS, DESK_SLOTS, COUCH_DEFS, COUCH_SLOTS,
  IDLE_SPOTS, GROUP_PAIRS,
  KITCHEN_WALL_COL, KITCHEN_START_ROW, KITCHEN_DOOR_ROW,
  PER_ROW, STEP_X, ACT_ZONE_Y,
  PP_L, PP_R,
  generateLayout, buildObstacleGrid,
} from './layout.js';
import { agentsData, agentStates, idleOccupied } from './state.js';
import { buildBackground } from './background.js';
import { BUILTIN_POSITIONS, getAdminPos, applyCustomPositions } from './adminPos.js';

// Lazy canvas reference (set during init)
let canvas = null;
let bgBufRef = null;
export function initAdmin(canvasEl, bgBuf) {
  canvas = canvasEl;
  bgBufRef = bgBuf;
  setupAdminUI();
  setupAdminEvents();
}

// ════════════════════════════════════════════════════════════════
//  ADMIN EDITOR — drag objects to reposition them
//  Press 'E' to toggle, or click the ✏️ button
// ════════════════════════════════════════════════════════════════

let adminMode = false;
let simsMode = false;
let simsSelectedAgent = null;
let simsMenuVisible = false;
let simsMenuX = 0, simsMenuY = 0;
let simsMenuItems = [];
let adminObjects = []; // {id, label, tx, ty, w, h} — tile coords
let adminSelected = null;
let adminDragging = false;
let adminDragOff = {x:0, y:0};
let adminHover = null;
let adminWalls = []; // {id, label, type:'vertical'|'horizontal', pos, min, max}
let adminHoverWall = null;
let adminSelectedWall = null;
let adminDraggingWall = false;

// Build the list of draggable objects from current state
function buildAdminObjects() {
  adminObjects = [];
  const rX = PER_ROW * STEP_X + 2;

  // Static furniture
  adminObjects.push({id:'clock', label:'🕐 Clock', tx: COLS-1.5, ty: Math.max(4,Math.floor(ROWS*0.2)), w:1.5, h:1.5});
  adminObjects.push({id:'cooler', label:'💧 Cooler', tx: rX+2.5, ty:2, w:1.5, h:1.5});
  adminObjects.push({id:'darts', label:'🎯 Darts', tx: rX+1.5, ty:0, w:2, h:1});
  adminObjects.push({id:'aquarium', label:'🐠 Aquarium', tx: rX+0.3, ty:8, w:2.5, h:2});
  adminObjects.push({id:'printer', label:'🖨 Printer', tx: KITCHEN_WALL_COL-3, ty:KITCHEN_START_ROW-2, w:2, h:1});
  adminObjects.push({id:'trashcan', label:'🗑 Trash', tx: KITCHEN_WALL_COL-2, ty:3, w:1, h:1});

  // Plants
  IDLE_SPOTS.filter(s=>s.type==='plant').forEach((s,i) => {
    adminObjects.push({id:'plant_'+i, label:'🌿 Plant', tx:s.tx-0.5, ty:s.ty-0.5, w:1, h:1.5});
  });

  // Conference table
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({id:'conf_table', label:'🤝 Conference', tx:4, ty:ACT_ZONE_Y+10, w:6, h:3});
  }
  // Bookshelf
  adminObjects.push({id:'bookshelf', label:'📚 Bookshelf', tx:COLS-5.5, ty:ACT_ZONE_Y+13, w:4.5, h:3.5});

  // Desks
  DESK_DEFS.forEach((d,i) => {
    adminObjects.push({id:'desk_'+i, label:'🖥 Desk '+(i+1), tx:d.tx, ty:d.ty, w:3.5, h:3});
  });

  // Couches
  COUCH_DEFS.forEach((d,i) => {
    adminObjects.push({id:'couch_'+i, label:'🛋 Couch '+(i+1), tx:d.tx, ty:d.ty, w:d.w||3, h:2});
  });

  // Ping pong table
  if (ACT_ZONE_Y > 0) {
    const ppX = Math.min(19, COLS-8);
    adminObjects.push({id:'pingpong', label:'🏓 Ping Pong', tx:ppX-2, ty:ACT_ZONE_Y+1, w:6, h:3});
  }

  // TV / Gaming area
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({id:'tv', label:'📺 TV', tx:10, ty:ACT_ZONE_Y+0.3, w:4, h:3});
  }

  // Gym / Treadmills
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({id:'gym', label:'🏃 Gym', tx:1, ty:ACT_ZONE_Y+0.5, w:5, h:4});
  }

  // Vending machine
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    adminObjects.push({id:'vending', label:'🥤 Vending', tx:KITCHEN_WALL_COL+1, ty:ACT_ZONE_Y-2, w:1.5, h:2.5});
  }

  // Kitchen objects
  if (KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1;
    adminObjects.push({id:'kitchen_table', label:'🍽 Kitchen Table', tx:kitIntX+2, ty:KITCHEN_START_ROW+1, w:4, h:3});
    adminObjects.push({id:'kitchen_counter', label:'🔪 Counter', tx:kitIntX, ty:KITCHEN_START_ROW, w:9, h:1});
    adminObjects.push({id:'fridge', label:'🧊 Fridge', tx:kitIntX+8, ty:KITCHEN_START_ROW, w:1, h:1.5});
  }

  // Gaming sofa (separate from TV)
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({id:'gaming_sofa', label:'🛋 Gaming Sofa', tx:11, ty:ACT_ZONE_Y+3.7, w:4, h:1.5});
  }

  // Entertainment objects (recreation / makers lab / cafe zones)
  if (ACT_ZONE_Y > 0) {
    // Zone 1: RECREATION (ACT_ZONE+9)
    adminObjects.push({id:'foosball', label:'⚽ Foosball', tx:8, ty:ACT_ZONE_Y+9, w:3, h:1.5});
    adminObjects.push({id:'basketball', label:'🏀 Basketball', tx:12, ty:ACT_ZONE_Y+9, w:2, h:2});
    adminObjects.push({id:'arcade', label:'🕹 Arcade', tx:16, ty:ACT_ZONE_Y+9, w:2, h:2.5});
    adminObjects.push({id:'dj_console', label:'🎧 DJ Console', tx:20, ty:ACT_ZONE_Y+9, w:2.5, h:1.2});
    // Zone 2: MAKERS LAB (ACT_ZONE+14)
    adminObjects.push({id:'server_rack', label:'🖥 Server Rack', tx:2, ty:ACT_ZONE_Y+14, w:2, h:2.2});
    adminObjects.push({id:'printer_3d', label:'🖨 3D Printer', tx:7, ty:ACT_ZONE_Y+14, w:2, h:1.8});
    adminObjects.push({id:'telescope', label:'🔭 Telescope', tx:18, ty:ACT_ZONE_Y+14, w:1, h:2});
    // Zone 3: CAFE (ACT_ZONE+14)
    adminObjects.push({id:'espresso_bar', label:'☕ Espresso Bar', tx:13, ty:ACT_ZONE_Y+14, w:3, h:1.5});
  }

  // Kanban board
  const rXkb = PER_ROW * STEP_X + 2;
  adminObjects.push({id:'kanban', label:'📋 Kanban', tx:rXkb+0.2, ty:2.5, w:4.5, h:4});

  // Snapshot default positions (before applying saved overrides)
  if (!window._defaultPositions) {
    window._defaultPositions = {};
    for (const obj of adminObjects) {
      window._defaultPositions[obj.id] = {tx: obj.tx, ty: obj.ty};
    }
  }

  // Apply saved positions
  const saved = JSON.parse(localStorage.getItem('admin_positions') || '{}');
  for (const obj of adminObjects) {
    if (saved[obj.id]) { obj.tx = saved[obj.id].tx; obj.ty = saved[obj.id].ty; }
  }

  // Wall handles for room resizing
  adminWalls = [
    {id:'wall_kitchen_x', label:'Kitchen Wall \u2194', type:'vertical', pos:KITCHEN_WALL_COL, min:12, max:COLS-4, row1:KITCHEN_START_ROW, row2:ROWS-1},
    {id:'wall_kitchen_y', label:'Kitchen Top \u2195', type:'horizontal', pos:KITCHEN_START_ROW, min:8, max:ROWS-6, col1:KITCHEN_WALL_COL, col2:COLS-1},
    {id:'wall_zone', label:'Activity Zone \u2195', type:'horizontal', pos:ACT_ZONE_Y, min:10, max:ROWS-10, col1:0, col2:COLS-1},
    {id:'wall_right', label:'Right Wall \u2194', type:'vertical', pos:COLS, min:20, max:50, row1:0, row2:ROWS, isOuter:true},
    {id:'wall_bottom', label:'Bottom Wall \u2195', type:'horizontal', pos:ROWS, min:30, max:100, col1:0, col2:COLS, isOuter:true},
  ];
  const savedWalls = JSON.parse(localStorage.getItem('admin_walls') || '{}');
  for (const w of adminWalls) {
    if (savedWalls[w.id] !== undefined) w.pos = savedWalls[w.id];
  }
}

// Apply saved wall positions to game variables
function applyWallPositions() {
  const saved = JSON.parse(localStorage.getItem('admin_walls') || '{}');
  if (saved.wall_kitchen_x !== undefined) KITCHEN_WALL_COL = Math.round(saved.wall_kitchen_x);
  if (saved.wall_kitchen_y !== undefined) KITCHEN_START_ROW = Math.round(saved.wall_kitchen_y);
  if (saved.wall_zone !== undefined) ACT_ZONE_Y = Math.round(saved.wall_zone);
  if (saved.wall_right !== undefined) {
    COLS = Math.round(saved.wall_right);
    CW = OX + COLS*T + OX;
    const cv = document.getElementById('office');
    if (cv) cv.width = CW;
    bgBuf.width = CW;
  }
  if (saved.wall_bottom !== undefined) {
    ROWS = Math.round(saved.wall_bottom);
    CH = OY + ROWS*T + OY;
    const cv = document.getElementById('office');
    if (cv) cv.height = CH;
    bgBuf.height = CH;
  }
  KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1;
}

// Default layout positions (exported from localhost admin editor)
const BUILTIN_POSITIONS = {
  // ═══ WORK ZONE (rows 1-20, cols 1-22) ═══
  "desk_0": {"tx": 1, "ty": 1},
  "desk_1": {"tx": 6, "ty": 1},
  "desk_2": {"tx": 11, "ty": 1},
  "desk_3": {"tx": 16, "ty": 1},
  "desk_4": {"tx": 1, "ty": 5},
  "desk_5": {"tx": 6, "ty": 5},
  "desk_6": {"tx": 11, "ty": 5},
  "desk_7": {"tx": 16, "ty": 5},
  "desk_8": {"tx": 1, "ty": 9},
  "desk_9": {"tx": 6, "ty": 9},
  "desk_10": {"tx": 11, "ty": 9},
  "desk_11": {"tx": 16, "ty": 9},
  "desk_12": {"tx": 1, "ty": 13},
  "desk_13": {"tx": 6, "ty": 13},
  "desk_14": {"tx": 11, "ty": 13},
  "desk_15": {"tx": 16, "ty": 13},
  "desk_16": {"tx": 1, "ty": 17},

  // ═══ RIGHT PANEL (cols 24-34) ═══
  "clock": {"tx": 24, "ty": 0},
  "darts": {"tx": 30, "ty": 0},
  "kanban": {"tx": 24, "ty": 2},
  "aquarium": {"tx": 24, "ty": 7},
  "printer": {"tx": 30, "ty": 9},
  "plant_0": {"tx": 5, "ty": 0.5},
  "plant_1": {"tx": 28, "ty": 8},

  // ═══ KITCHEN (rows 10-19, cols 24-34) ═══
  "kitchen_counter": {"tx": 24, "ty": 12},
  "kitchen_table": {"tx": 26, "ty": 14},
  "fridge": {"tx": 33, "ty": 12},
  "trashcan": {"tx": 33, "ty": 16},
  "cooler": {"tx": 30, "ty": 16},
  "vending": {"tx": 27, "ty": 17},

  // ═══ LOUNGE (rows 22-34) — spacious, 4 per row with gaps ═══
  "couch_0": {"tx": 2, "ty": 23},
  "couch_1": {"tx": 9, "ty": 23},
  "couch_2": {"tx": 16, "ty": 23},
  "couch_3": {"tx": 23, "ty": 23},
  "couch_4": {"tx": 30, "ty": 23},
  "couch_5": {"tx": 2, "ty": 27},
  "couch_6": {"tx": 9, "ty": 27},
  "couch_7": {"tx": 16, "ty": 27},
  "couch_8": {"tx": 23, "ty": 27},
  "couch_9": {"tx": 30, "ty": 27},
  "couch_10": {"tx": 2, "ty": 31},
  "couch_11": {"tx": 9, "ty": 31},
  "couch_12": {"tx": 16, "ty": 31},
  "couch_13": {"tx": 23, "ty": 31},
  "couch_14": {"tx": 30, "ty": 31},
  "couch_15": {"tx": 5.5, "ty": 25},
  "couch_16": {"tx": 12.5, "ty": 25},

  // ═══ GYM ROOM (rows 36-44, cols 1-16) — spread equipment ═══
  "gym": {"tx": 2, "ty": 37},
  "basketball": {"tx": 10, "ty": 37},

  // ═══ GAMING ROOM (rows 36-44, cols 18-34) — entertainment spread ═══
  "tv": {"tx": 19, "ty": 37},
  "gaming_sofa": {"tx": 19, "ty": 41},
  "arcade": {"tx": 27, "ty": 37},
  "dj_console": {"tx": 32, "ty": 37},

  // ═══ SPORTS ROOM (rows 46-54, cols 1-16) — games spread ═══
  "pingpong": {"tx": 2, "ty": 47},
  "foosball": {"tx": 10, "ty": 47},

  // ═══ SOCIAL ROOM (rows 46-54, cols 18-34) — relax spread ═══
  "conf_table": {"tx": 19, "ty": 47},
  "espresso_bar": {"tx": 19, "ty": 52},
  "bookshelf": {"tx": 27, "ty": 47},
  "server_rack": {"tx": 27, "ty": 52},
  "printer_3d": {"tx": 32, "ty": 52},
  "telescope": {"tx": 32, "ty": 47}
};

// Apply custom positions to actual game objects
function applyCustomPositions() {
  const saved = JSON.parse(localStorage.getItem('admin_positions') || '{}');
  // Merge: builtin is default for everyone, saved overrides per-browser
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS, saved);
}

// Get position for an object — returns saved admin position or default
function getAdminPos(id, defTx, defTy) {
  const p = window._adminPos?.[id];
  return p ? [p.tx, p.ty] : [defTx, defTy];
}

// Sync IDLE_SPOTS / DESK_SLOTS / PP positions to admin-edited object positions
function syncIdleSpotsToAdmin() {
  for (const spot of IDLE_SPOTS) {
    if (!spot._objId) continue;
    const [newTx, newTy] = getAdminPos(spot._objId, spot._defObjTx, spot._defObjTy);
    spot.tx = newTx + spot._offsetX;
    spot.ty = newTy + spot._offsetY;
  }
  for (let i = 0; i < DESK_SLOTS.length; i++) {
    const [newTx, newTy] = getAdminPos('desk_'+i, DESK_DEFS[i].tx, DESK_DEFS[i].ty);
    DESK_SLOTS[i].tx = newTx + 0.8;
    DESK_SLOTS[i].ty = newTy + 1.9;
  }
  for (let i = 0; i < COUCH_SLOTS.length; i++) {
    const [newTx, newTy] = getAdminPos('couch_'+i, COUCH_DEFS[i].tx, COUCH_DEFS[i].ty);
    COUCH_SLOTS[i].tx = newTx + 1.3;
    COUCH_SLOTS[i].ty = newTy + 0.4;
  }
  const ppX = Math.min(19, COLS-8);
  const [ppNewTx, ppNewTy] = getAdminPos('pingpong', ppX-2, ACT_ZONE_Y+1);
  PP_L.tx = ppNewTx + 0.5; PP_L.ty = ppNewTy + 1;
  PP_R.tx = ppNewTx + 6;   PP_R.ty = ppNewTy + 1;
}

// Save positions to localStorage
function saveAdminPositions() {
  const pos = {};
  for (const obj of adminObjects) { pos[obj.id] = {tx: obj.tx, ty: obj.ty}; }
  localStorage.setItem('admin_positions', JSON.stringify(pos));
  window._adminPos = pos;
  syncIdleSpotsToAdmin();
  for (const [id, sp] of Object.entries(agentStates)) {
    if (sp.isWorking && sp.slotIdx >= 0 && sp.slotIdx < DESK_SLOTS.length) {
      const ds = DESK_SLOTS[sp.slotIdx];
      sp.arrived = false;
      sp.setTarget(ds.tx, ds.ty);
    } else if (!sp.isWorking && sp.slotIdx >= 0 && sp.slotIdx < IDLE_SPOTS.length) {
      const spot = IDLE_SPOTS[sp.slotIdx];
      if (spot._objId) {
        sp.arrived = false;
        sp.setTarget(spot.tx, spot.ty);
      }
    }
  }
  // Push layout to server — all connected clients will see the change
  const walls = JSON.parse(localStorage.getItem('admin_walls') || 'null');
  fetch('/api/layout', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ positions: pos, walls })
  }).catch(() => {});
}

let adminAuthed = false;

function showAdminPasswordDialog() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,5,15,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#12121e;border:2px solid #3a3860;border-radius:10px;padding:24px 32px;display:flex;flex-direction:column;gap:14px;align-items:center;box-shadow:0 0 40px #0008;min-width:280px;';
  box.innerHTML = `
    <div style="color:#7aa2f7;font-family:'Press Start 2P',monospace;font-size:10px;">🔒 ADMIN ACCESS</div>
    <div style="color:#5a5888;font-family:'Press Start 2P',monospace;font-size:6px;">Enter password to edit layout</div>
    <input id="admin-pw" type="password" placeholder="Password..." style="background:#0a0a18;border:1px solid #3a3860;color:#c8d3f5;font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border-radius:6px;width:100%;outline:none;text-align:center;" autocomplete="off" />
    <div id="admin-pw-err" style="color:#f7768e;font-family:'Press Start 2P',monospace;font-size:6px;display:none;">Wrong password</div>
    <div style="display:flex;gap:10px;">
      <button id="admin-pw-ok" style="background:#7aa2f7;color:#0a0a18;border:none;padding:6px 16px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;border-radius:4px;">ENTER</button>
      <button id="admin-pw-cancel" style="background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:6px 16px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;border-radius:4px;">CANCEL</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const inp = box.querySelector('#admin-pw');
  const err = box.querySelector('#admin-pw-err');
  inp.focus();

  function tryLogin() {
    if (inp.value === 'noadmin') {
      adminAuthed = true;
      overlay.remove();
      enterAdminMode();
    } else {
      err.style.display = 'block';
      inp.value = '';
      inp.style.borderColor = '#f7768e';
      setTimeout(() => { inp.style.borderColor = '#3a3860'; err.style.display = 'none'; }, 1500);
    }
  }

  box.querySelector('#admin-pw-ok').onclick = tryLogin;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  box.querySelector('#admin-pw-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function enterAdminMode() {
  adminMode = true;
  buildAdminObjects();
  canvas.style.cursor = 'crosshair';
  adminBtn.textContent = '✏️ EDITING';
  adminBtn.style.background = '#f7768e';
  adminPanel.style.display = 'flex';
}

function toggleSimsMode() {
  simsMode = !simsMode;
  simsMenuVisible = false;
  simsSelectedAgent = null;
  if (simsMode) {
    simsBtn.textContent = '🎮 PLAYING';
    simsBtn.style.background = '#9ece6a';
    simsBtn.style.color = '#0a0a18';
    for (const sp of Object.values(agentStates)) {
      if (!sp.isWorking) {
        sp.arrived = false;
        sp.activityDur = 0;
        sp.slotIdx = -1;
        sp._simsWaiting = true;
      }
    }
  } else {
    simsBtn.textContent = '🎮 SIMS';
    simsBtn.style.background = '#2a2848';
    simsBtn.style.color = '#c8d3f5';
    for (const sp of Object.values(agentStates)) {
      sp._simsWaiting = false;
      sp._simsTarget = null;
    }
  }
}

function toggleAdmin() {
  if (adminMode) {
    // Exit admin
    adminMode = false;
    canvas.style.cursor = 'default';
    adminBtn.textContent = '✏️ EDIT';
    adminBtn.style.background = '#2a2848';
    adminPanel.style.display = 'none';
    adminSelected = null;
    adminSelectedWall = null;
    adminDraggingWall = false;
    adminHoverWall = null;
  } else {
    // Enter admin — check auth
    if (adminAuthed) {
      enterAdminMode();
    } else {
      showAdminPasswordDialog();
    }
  }
}

// Mouse → tile coords
function mouseToTile(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;
  return { px, py, tx: (px - OX) / T, ty: (py - OY) / T };
}

function findObjectAt(tx, ty) {
  for (let i = adminObjects.length-1; i >= 0; i--) {
    const o = adminObjects[i];
    if (tx >= o.tx && tx <= o.tx+o.w && ty >= o.ty && ty <= o.ty+o.h) return o;
  }
  return null;
}

function setupAdminEvents() {
// Canvas mouse events for admin mode
canvas.addEventListener('mousedown', e => {
  if (!adminMode) return;
  const {tx, ty} = mouseToTile(e);
  // Check walls first (higher priority than objects)
  for (const w of adminWalls) {
    if (w.type === 'vertical') {
      if (Math.abs(tx - w.pos) < 0.8 && ty >= (w.row1||0) && ty <= (w.row2||ROWS)) {
        adminSelectedWall = w;
        adminDraggingWall = true;
        canvas.style.cursor = 'ew-resize';
        return;
      }
    } else {
      if (Math.abs(ty - w.pos) < 0.8 && tx >= (w.col1||0) && tx <= (w.col2||COLS)) {
        adminSelectedWall = w;
        adminDraggingWall = true;
        canvas.style.cursor = 'ns-resize';
        return;
      }
    }
  }
  const obj = findObjectAt(tx, ty);
  if (obj) {
    adminSelected = obj;
    adminDragging = true;
    adminDragOff = { x: tx - obj.tx, y: ty - obj.ty };
    canvas.style.cursor = 'grabbing';
  } else {
    adminSelected = null;
  }
});

canvas.addEventListener('mousemove', e => {
  if (!adminMode) return;
  const {tx, ty} = mouseToTile(e);
  // Wall dragging
  if (adminDraggingWall && adminSelectedWall) {
    const w = adminSelectedWall;
    if (w.type === 'vertical') {
      w.pos = Math.max(w.min, Math.min(w.max, Math.round(tx)));
    } else {
      w.pos = Math.max(w.min, Math.min(w.max, Math.round(ty)));
    }
    // Live-resize canvas when dragging outer walls (no rebuild during drag)
    if (w.id === 'wall_right') {
      COLS = Math.round(w.pos);
      CW = OX + COLS*T + OX;
      canvas.width = CW; bgBuf.width = CW;
    }
    if (w.id === 'wall_bottom') {
      ROWS = Math.round(w.pos);
      CH = OY + ROWS*T + OY;
      canvas.height = CH; bgBuf.height = CH;
    }
    return;
  }
  if (adminDragging && adminSelected) {
    adminSelected.tx = Math.round((tx - adminDragOff.x) * 2) / 2; // snap to half-tiles
    adminSelected.ty = Math.round((ty - adminDragOff.y) * 2) / 2;
    // Clamp inside office
    adminSelected.tx = Math.max(0, Math.min(COLS - adminSelected.w, adminSelected.tx));
    adminSelected.ty = Math.max(0, Math.min(ROWS - adminSelected.h, adminSelected.ty));
  } else {
    // Wall hover detection
    adminHoverWall = null;
    for (const w of adminWalls) {
      if (w.type === 'vertical' && Math.abs(tx - w.pos) < 0.8 && ty >= (w.row1||0) && ty <= (w.row2||ROWS)) { adminHoverWall = w; break; }
      if (w.type === 'horizontal' && Math.abs(ty - w.pos) < 0.8 && tx >= (w.col1||0) && tx <= (w.col2||COLS)) { adminHoverWall = w; break; }
    }
    if (adminHoverWall && !adminDragging) {
      canvas.style.cursor = adminHoverWall.type === 'vertical' ? 'ew-resize' : 'ns-resize';
    } else {
      const obj = findObjectAt(tx, ty);
      adminHover = obj;
      canvas.style.cursor = obj ? 'grab' : 'crosshair';
    }
  }
});

// Use document-level mouseup/mousemove for wall drags (mouse can leave canvas)
document.addEventListener('mousemove', e => {
  if (!adminDraggingWall || !adminSelectedWall) return;
  const {tx, ty} = mouseToTile(e);
  const w = adminSelectedWall;
  if (w.type === 'vertical') {
    w.pos = Math.max(w.min, Math.min(w.max, Math.round(tx)));
  } else {
    w.pos = Math.max(w.min, Math.min(w.max, Math.round(ty)));
  }
  if (w.id === 'wall_right') { COLS = Math.round(w.pos); CW = OX+COLS*T+OX; canvas.width=CW; bgBuf.width=CW; }
  if (w.id === 'wall_bottom') { ROWS = Math.round(w.pos); CH = OY+ROWS*T+OY; canvas.height=CH; bgBuf.height=CH; }
});

document.addEventListener('mouseup', e => {
  if (!adminDraggingWall) return;
  adminDraggingWall = false;
  canvas.style.cursor = 'crosshair';
  const wallPos = {};
  for (const w2 of adminWalls) wallPos[w2.id] = w2.pos;
  localStorage.setItem('admin_walls', JSON.stringify(wallPos));
  for (const w2 of adminWalls) {
    if (w2.id === 'wall_kitchen_x') KITCHEN_WALL_COL = Math.round(w2.pos);
    if (w2.id === 'wall_kitchen_y') { KITCHEN_START_ROW = Math.round(w2.pos); KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1; }
    if (w2.id === 'wall_zone') ACT_ZONE_Y = Math.round(w2.pos);
    if (w2.id === 'wall_right') { COLS=Math.round(w2.pos); CW=OX+COLS*T+OX; canvas.width=CW; bgBuf.width=CW; }
    if (w2.id === 'wall_bottom') { ROWS=Math.round(w2.pos); CH=OY+ROWS*T+OY; canvas.height=CH; bgBuf.height=CH; }
  }
  buildBackground(); buildObstacleGrid();
  if (typeof syncIdleSpotsToAdmin === 'function') syncIdleSpotsToAdmin();
});

canvas.addEventListener('mouseup', e => {
  if (!adminMode) return;
  if (adminDraggingWall) {
    adminDraggingWall = false;
    canvas.style.cursor = 'crosshair';
    // Save wall positions
    const wallPos = {};
    for (const w of adminWalls) wallPos[w.id] = w.pos;
    localStorage.setItem('admin_walls', JSON.stringify(wallPos));
    // Apply to game variables
    for (const w of adminWalls) {
      if (w.id === 'wall_kitchen_x') KITCHEN_WALL_COL = Math.round(w.pos);
      if (w.id === 'wall_kitchen_y') { KITCHEN_START_ROW = Math.round(w.pos); KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1; }
      if (w.id === 'wall_zone') ACT_ZONE_Y = Math.round(w.pos);
      if (w.id === 'wall_right') {
        COLS = Math.round(w.pos);
        CW = OX + COLS*T + OX;
        canvas.width = CW; bgBuf.width = CW;
      }
      if (w.id === 'wall_bottom') {
        ROWS = Math.round(w.pos);
        CH = OY + ROWS*T + OY;
        canvas.height = CH; bgBuf.height = CH;
      }
    }
    // Rebuild everything
    buildBackground();
    buildObstacleGrid();
    if (typeof syncIdleSpotsToAdmin === 'function') syncIdleSpotsToAdmin();
    return;
  }
  if (adminDragging) {
    adminDragging = false;
    canvas.style.cursor = 'grab';
    saveAdminPositions();
    // Rebuild background with new positions
    buildBackground();
    buildObstacleGrid();
  }
});

} // end setupAdminEvents

// Draw admin overlay (called from main loop when adminMode=true)
function drawAdminOverlay(ctx) {
  if (!adminMode) return;

  // Grid
  ctx.strokeStyle = '#ffffff10';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(OX+c*T, OY); ctx.lineTo(OX+c*T, OY+ROWS*T); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(OX, OY+r*T); ctx.lineTo(OX+COLS*T, OY+r*T); ctx.stroke();
  }

  // Objects
  for (const obj of adminObjects) {
    const x = OX + obj.tx * T, y = OY + obj.ty * T;
    const w = obj.w * T, h = obj.h * T;
    const isSelected = obj === adminSelected;
    const isHover = obj === adminHover;

    // Bounding box
    ctx.strokeStyle = isSelected ? '#f7768e' : isHover ? '#7aa2f7' : '#ffffff40';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.setLineDash(isSelected ? [] : [4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Label background
    ctx.fillStyle = isSelected ? '#f7768e' : '#1a1a3080';
    const labelW = ctx.measureText(obj.label).width + 8;
    ctx.fillRect(x, y - 14, labelW, 13);
    // Label text
    ctx.fillStyle = '#fff';
    ctx.font = "7px 'Press Start 2P',monospace";
    ctx.fillText(obj.label, x + 4, y - 4);

    // Coordinates
    if (isSelected || isHover) {
      ctx.fillStyle = '#ffffff80';
      ctx.font = "6px monospace";
      ctx.fillText(`(${obj.tx.toFixed(1)}, ${obj.ty.toFixed(1)})`, x, y + h + 10);
    }

    // Drag handles (corners)
    if (isSelected) {
      ctx.fillStyle = '#f7768e';
      [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([cx,cy]) => {
        ctx.fillRect(cx-3, cy-3, 6, 6);
      });
    }
  }

  // Wall handles
  for (const w of adminWalls) {
    const isHover = w === adminHoverWall;
    const isSelected = w === adminSelectedWall;
    ctx.strokeStyle = isSelected ? '#ff4060' : isHover ? '#40ff60' : '#ffffff50';
    ctx.lineWidth = isSelected ? 4 : isHover ? 3 : 2;
    ctx.setLineDash([6, 4]);

    if (w.type === 'vertical') {
      const x = OX + w.pos * T;
      const y1 = OY + (w.row1 || 0) * T;
      const y2 = OY + (w.row2 || ROWS) * T;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      ctx.fillStyle = isSelected ? '#ff4060' : '#40ff60';
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = 'center';
      ctx.fillText(w.label, x, y1 - 6);
      ctx.fillText('\u2194', x, (y1+y2)/2);
    } else {
      const y = OY + w.pos * T;
      const x1 = OX + (w.col1 || 0) * T;
      const x2 = OX + (w.col2 || COLS) * T;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.fillStyle = isSelected ? '#ff4060' : '#40ff60';
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = 'center';
      ctx.fillText(w.label, (x1+x2)/2, y - 6);
      ctx.fillText('\u2195', (x1+x2)/2, y + 4);
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
  }

  // Coord display at cursor
  if (adminHover || adminDragging || adminDraggingWall) {
    // info bar at bottom of canvas
    ctx.fillStyle='#000000a0'; ctx.fillRect(OX, OY+ROWS*T-20, COLS*T, 20);
    ctx.fillStyle='#fff'; ctx.font="7px 'Press Start 2P',monospace";
    const info = adminDraggingWall && adminSelectedWall
      ? `Moving: ${adminSelectedWall.label} → pos ${adminSelectedWall.pos}`
      : adminSelected && adminDragging
      ? `Moving: ${adminSelected.label} → (${adminSelected.tx.toFixed(1)}, ${adminSelected.ty.toFixed(1)})`
      : adminHoverWall ? `${adminHoverWall.label} — drag to resize`
      : adminHover ? `${adminHover.label} at (${adminHover.tx.toFixed(1)}, ${adminHover.ty.toFixed(1)}) — click & drag to move` : '';
    ctx.fillText(info, OX+8, OY+ROWS*T-6);
  }
}


export {
  adminMode, simsMode, simsSelectedAgent,
  adminObjects, adminWalls, adminSelected, adminDragging,
  toggleAdmin, enterAdminMode, toggleSimsMode,
  buildAdminObjects, applyWallPositions,
  syncIdleSpotsToAdmin, saveAdminPositions,
  drawAdminOverlay, mouseToTile, findObjectAt,
  showAdminPasswordDialog, initAdmin,
};
