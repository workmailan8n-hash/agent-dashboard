// ════════════════════════════════════════════════════════════════
//  LAYOUT GENERATOR
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from './constants.js';
import { getAdminPos } from './adminPos.js';

// Layout owns these mutable values (re-exported for other modules)
// They start as constants values but get mutated by generateLayout and admin editor
export let COLS = 35;
export let ROWS = 14;
export let CW   = 1400;
export let CH   = OY + ROWS * T + OY;
export function setCOLS(v) { COLS = v; }
export function setROWS(v) { ROWS = v; }
export function setCW(v)   { CW = v; }
export function setCH(v)   { CH = v; }

// ════════════════════════════════════════════════════════════════
//  LAYOUT GENERATOR
// ════════════════════════════════════════════════════════════════
const FL_A='#e4e0d8', FL_B='#dcd8d0';
const WL_TOP='#2e2c48', WL_BASE='#3a3860';
const DESK_TOP='#c4b488', DESK_FRONT='#a09060', DESK_EDGE='#8a7840';
const CHAIR_C='#363878', CHAIR_SEAT='#484a98';
const COUCH_C='#3a2868', COUCH_SEAT='#4e3888', COUCH_HI='#604ca0';
// MON_DARK и SCREEN_C объявлены в начале файла

let DESK_DEFS=[], DESK_SLOTS=[], COUCH_DEFS=[], COUCH_SLOTS=[], layoutN=0;
let IDLE_SPOTS=[];   // all activity spots for idle agents
let GROUP_PAIRS={};  // groupId -> [slotIndexA, slotIndexB]
let KITCHEN_WALL_COL=0, KITCHEN_START_ROW=0, KITCHEN_DOOR_ROW=0; // enclosed kitchen
let PER_ROW=3, STEP_X=7, STEP_Y=4, START_ROW=1; // desk layout constants (global for obstacle grid / kanban)
let ACT_ZONE_Y = 0;  // Y row where gym/gaming/ping-pong zone starts
// Ping pong ball — shared between both players
let PP_L = {tx:0,ty:0}, PP_R = {tx:0,ty:0}; // player tile positions
let ppBall = { t: 0.5, dir: 1, speed: 0.38, active: false }; // t: 0=left, 1=right

// New feature globals
let printerActive = 0;   // countdown timer for printer animation
let trashLevel    = 0;   // 0-10: how full the trash can is
let trashAgentId  = null; // agent currently assigned to stomp trash

let _maxLayoutN = 12; // minimum 12 agents worth of space — office never shrinks
function generateLayout(n) {
  const count = Math.max(1, n);
  _maxLayoutN = Math.max(_maxLayoutN, count);
  const stableCount = Math.max(count, _maxLayoutN); // never shrink below peak
  if (stableCount === layoutN) return false;
  layoutN = stableCount;
  DESK_DEFS=[]; DESK_SLOTS=[]; COUCH_DEFS=[]; COUCH_SLOTS=[];

  // 3 стола в ряд — у каждого агента своё место
  PER_ROW=3; STEP_X=7; STEP_Y=4; START_ROW=1;
  for (let i=0; i<stableCount; i++) {
    const col=i%PER_ROW, row=Math.floor(i/PER_ROW);
    const dtx=1+col*STEP_X, dty=START_ROW+row*STEP_Y;
    DESK_DEFS.push({tx:dtx, ty:dty});
    DESK_SLOTS.push({tx:dtx+0.8, ty:dty+1.9});
  }

  // 5 диванов в ряд, у каждого агента свой диван
  const deskRows=Math.ceil(stableCount/PER_ROW), LOUNGE_Y=START_ROW+deskRows*STEP_Y+1;
  const COUCH_PER_ROW=5;
  for (let i=0; i<stableCount; i++) {
    const col=i%COUCH_PER_ROW, row=Math.floor(i/COUCH_PER_ROW);
    const cx=1.5+col*5.2;
    const cy=LOUNGE_Y+row*3;
    COUCH_DEFS.push({tx:cx, ty:cy, w:3});
    COUCH_SLOTS.push({tx:cx+1.3, ty:cy+0.4});
  }

  const couchRows=Math.ceil(stableCount/COUCH_PER_ROW);
  const baseRows=LOUNGE_Y+couchRows*3+2;
  ACT_ZONE_Y = baseRows;
  ROWS = Math.max(baseRows + 24, 70);  // min 70 rows to fit all BUILTIN objects
  CH = OY + ROWS * T + OY;

  // ── Build IDLE_SPOTS (activity spots for idle agents) ────────────
  IDLE_SPOTS = [];
  GROUP_PAIRS = {};

  // Couch slots become idle spots with varied animations
  const COUCH_ANIMS = ['sleeping','smoking_beer','phone','stretching','reading','drinking_beer'];
  COUCH_SLOTS.forEach((s,i) => {
    IDLE_SPOTS.push({ tx:s.tx, ty:s.ty, anim: COUCH_ANIMS[i%COUCH_ANIMS.length], type:'couch', w:8,
      _objId:'couch_'+i, _defObjTx:COUCH_DEFS[i].tx, _defObjTy:COUCH_DEFS[i].ty,
      _offsetX: s.tx - COUCH_DEFS[i].tx, _offsetY: s.ty - COUCH_DEFS[i].ty });
  });

  // Window spots — along top wall between windows
  const winSpots = [4,10,16,22].filter(x=>x<COLS-2);
  winSpots.forEach(wx => {
    IDLE_SPOTS.push({ tx:wx, ty:1.4, anim:'window_gaze', type:'window', w:6 });
  });

  // Plants — away from kitchen (wall at COLS-11), no plant inside kitchen
  [
    [4.5,  0.5],                   // top wall, between desk col 0 and 1
    [COLS - 13, LOUNGE_Y - 1.5],  // right of center, outside kitchen
  ].forEach(([px, py]) => {
    if (px > 0 && py > 0 && px < COLS-1 && py < ROWS-1)
      IDLE_SPOTS.push({ tx:px, ty:py, anim:'plant_care', type:'plant', w:4 });
  });

  // Open floor spots (for dancing, yoga, guitar)
  const floorAnims = ['headphones','air_guitar','yoga','doodling'];
  const floorY = Math.floor(ROWS*0.45);
  for(let i=0;i<4;i++){
    IDLE_SPOTS.push({ tx:3+i*5, ty:floorY, anim:floorAnims[i%floorAnims.length], type:'floor', w:5 });
  }

  // Enclosed kitchen room (right side, 6 columns wide)
  KITCHEN_WALL_COL = COLS - 11;  // partition wall at col 17 — wider kitchen
  KITCHEN_START_ROW = Math.floor(ROWS * 0.38);
  KITCHEN_DOOR_ROW  = KITCHEN_START_ROW + 1;  // door opening (5 rows wide for traffic)
  const kitX = KITCHEN_WALL_COL + 1; // first interior column
  const kitY = KITCHEN_START_ROW;
  // 9 unique spots spread across the wider kitchen
  IDLE_SPOTS.push({ tx:kitX+0.5, ty:kitY+0.5, anim:'at_coffee',   type:'kitchen', w:12 });
  IDLE_SPOTS.push({ tx:kitX+7,   ty:kitY+0.5, anim:'at_fridge',   type:'kitchen', w:8  });
  IDLE_SPOTS.push({ tx:kitX+1,   ty:kitY+2.5, anim:'eating',      type:'kitchen', w:7  });
  IDLE_SPOTS.push({ tx:kitX+3,   ty:kitY+2.5, anim:'eating',      type:'kitchen', w:6  });
  IDLE_SPOTS.push({ tx:kitX+5,   ty:kitY+2.5, anim:'eating',      type:'kitchen', w:5  });
  IDLE_SPOTS.push({ tx:kitX+7,   ty:kitY+2.5, anim:'eating',      type:'kitchen', w:5  });
  IDLE_SPOTS.push({ tx:kitX+1.5, ty:kitY+1.2, anim:'reading',     type:'kitchen', w:5  });
  IDLE_SPOTS.push({ tx:kitX+4,   ty:kitY+1.2, anim:'phone',       type:'kitchen', w:6  });
  IDLE_SPOTS.push({ tx:kitX+7,   ty:kitY+1.2, anim:'stretching',  type:'kitchen', w:4  });

  // Group activity spots (pairs that face each other)
  const groupActivities = [
    ['chatting_l','chatting_r'],
    ['arguing_l','arguing_r'],
    ['gossiping_l','gossiping_r'],
  ];
  const groupY = Math.floor(ROWS*0.55);
  for(let g=0;g<3;g++){
    const gx = 5+g*7, gy = groupY;
    const iA = IDLE_SPOTS.length;
    IDLE_SPOTS.push({ tx:gx-1.2, ty:gy, anim:groupActivities[g][0], type:'group', groupId:g, role:'L', w:10 });
    const iB = IDLE_SPOTS.length;
    IDLE_SPOTS.push({ tx:gx+1.2, ty:gy, anim:groupActivities[g][1], type:'group', groupId:g, role:'R', w:10 });
    GROUP_PAIRS[g] = [iA, iB];
  }

  // ── Gym zone (left side of activity area) ────────────────────────
  const gymX = 1, gymY = ACT_ZONE_Y + 1;
  const _gymDefTx = 1, _gymDefTy = ACT_ZONE_Y + 0.5;
  IDLE_SPOTS.push({ tx:gymX+0.5, ty:gymY,     anim:'treadmill',  type:'gym', w:8, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+0.5-_gymDefTx, _offsetY:gymY-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+3.5, ty:gymY,     anim:'treadmill',  type:'gym', w:8, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+3.5-_gymDefTx, _offsetY:gymY-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+0.8, ty:gymY+3,   anim:'yoga',       type:'gym', w:6, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+0.8-_gymDefTx, _offsetY:gymY+3-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+3,   ty:gymY+3,   anim:'stretching', type:'gym', w:5, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+3-_gymDefTx, _offsetY:gymY+3-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+5.5, ty:gymY+1.5, anim:'headphones', type:'gym', w:4, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+5.5-_gymDefTx, _offsetY:gymY+1.5-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+3.5, ty:gymY+2.5, anim:'bench_press',     type:'gym', w:6, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+3.5-_gymDefTx, _offsetY:gymY+2.5-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+6,   ty:gymY+0.5, anim:'boxing',          type:'gym', w:4, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+6-_gymDefTx, _offsetY:gymY+0.5-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+6,   ty:gymY+2.5, anim:'cycling',         type:'gym', w:4, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+6-_gymDefTx, _offsetY:gymY+2.5-_gymDefTy });
  IDLE_SPOTS.push({ tx:gymX+0.5, ty:gymY+2.5, anim:'lifting_weights', type:'gym', w:6, _objId:'gym', _defObjTx:_gymDefTx, _defObjTy:_gymDefTy, _offsetX:gymX+0.5-_gymDefTx, _offsetY:gymY+2.5-_gymDefTy });

  // ── Gaming/TV zone (center of activity area) ─────────────────────
  const tvX = 10, tvY = ACT_ZONE_Y + 1;
  const _tvDefTx = 10, _tvDefTy = ACT_ZONE_Y + 0.3;
  IDLE_SPOTS.push({ tx:tvX+1,   ty:tvY+1,   anim:'gaming',   type:'gaming', w:10, _objId:'tv', _defObjTx:_tvDefTx, _defObjTy:_tvDefTy, _offsetX:tvX+1-_tvDefTx, _offsetY:tvY+1-_tvDefTy });
  IDLE_SPOTS.push({ tx:tvX+3,   ty:tvY+1,   anim:'gaming',   type:'gaming', w:9,  _objId:'tv', _defObjTx:_tvDefTx, _defObjTy:_tvDefTy, _offsetX:tvX+3-_tvDefTx, _offsetY:tvY+1-_tvDefTy });
  IDLE_SPOTS.push({ tx:tvX+5,   ty:tvY+1,   anim:'gaming',   type:'gaming', w:8,  _objId:'tv', _defObjTx:_tvDefTx, _defObjTy:_tvDefTy, _offsetX:tvX+5-_tvDefTx, _offsetY:tvY+1-_tvDefTy });
  IDLE_SPOTS.push({ tx:tvX+2.5, ty:tvY+3.5, anim:'reading',  type:'gaming', w:4,  _objId:'tv', _defObjTx:_tvDefTx, _defObjTy:_tvDefTy, _offsetX:tvX+2.5-_tvDefTx, _offsetY:tvY+3.5-_tvDefTy });

  // ── Ping pong zone (right-center of activity area) ────────────────
  const ppX = Math.min(19, COLS-8), ppY = ACT_ZONE_Y + 2;
  const _ppDefTx = ppX-2, _ppDefTy = ACT_ZONE_Y+1;
  PP_L = {tx: ppX-1.5, ty: ppY};
  PP_R = {tx: ppX+4,   ty: ppY};
  const ppIA = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:PP_L.tx, ty:PP_L.ty, anim:'ping_pong_l', type:'group', groupId:10, role:'L', w:9, _objId:'pingpong', _defObjTx:_ppDefTx, _defObjTy:_ppDefTy, _offsetX:0.5, _offsetY:1 });
  const ppIB = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:PP_R.tx, ty:PP_R.ty, anim:'ping_pong_r', type:'group', groupId:10, role:'R', w:9, _objId:'pingpong', _defObjTx:_ppDefTx, _defObjTy:_ppDefTy, _offsetX:6, _offsetY:1 });
  GROUP_PAIRS[10] = [ppIA, ppIB];

  // ── Printer spot ─────────────────────────────────────────────────
  IDLE_SPOTS.push({ tx: KITCHEN_WALL_COL - 3, ty: KITCHEN_START_ROW - 2, anim:'reading', type:'printer', w:5 });

  // ══════════════════════════════════════════════════════════════════
  //  RIGHT ENTERTAINMENT ZONE (cols PER_ROW*STEP_X+2 to COLS-2)
  // ══════════════════════════════════════════════════════════════════
  const rX = PER_ROW * STEP_X + 2; // right zone start col (~23)

  // ── 1. Water Cooler (pair chat) ────────────────────────────────
  const wcY = 2;
  const _coolerDefTx = rX+2.5, _coolerDefTy = 2;
  const wc1 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:rX+1.5, ty:wcY+1, anim:'chatting_l', type:'group', groupId:20, role:'L', w:8, _objId:'cooler', _defObjTx:_coolerDefTx, _defObjTy:_coolerDefTy, _offsetX:-1, _offsetY:1 });
  const wc2 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:rX+3.5, ty:wcY+1, anim:'chatting_r', type:'group', groupId:20, role:'R', w:8, _objId:'cooler', _defObjTx:_coolerDefTx, _defObjTy:_coolerDefTy, _offsetX:1, _offsetY:1 });
  GROUP_PAIRS[20] = [wc1, wc2];

  // ── 2. Dartboard (solo — agent throws darts) ───────────────────
  IDLE_SPOTS.push({ tx:rX+1.5, ty:6, anim:'stretching', type:'darts', w:7, _objId:'darts', _defObjTx:rX+1.5, _defObjTy:0, _offsetX:0, _offsetY:6 });

  // ── 3. Aquarium (solo — agent watches fish) ────────────────────
  IDLE_SPOTS.push({ tx:rX+1.5, ty:9, anim:'window_gaze', type:'aquarium', w:8, _objId:'aquarium', _defObjTx:rX+0.3, _defObjTy:8, _offsetX:1.2, _offsetY:1 });

  // ══ Zone 1: RECREATION (ACT_ZONE+9, spread across full width) ══

  // ── 7. Foosball Table (recreation, cols 8-10) ─────────────────
  const fb1 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:8, ty:ACT_ZONE_Y+10, anim:'playing_foosball', type:'group', groupId:21, role:'L', w:7,
    _objId:'foosball', _defObjTx:8, _defObjTy:ACT_ZONE_Y+9, _offsetX:0, _offsetY:1 });
  const fb2 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:11, ty:ACT_ZONE_Y+10, anim:'playing_foosball', type:'group', groupId:21, role:'R', w:7,
    _objId:'foosball', _defObjTx:8, _defObjTy:ACT_ZONE_Y+9, _offsetX:3, _offsetY:1 });
  GROUP_PAIRS[21] = [fb1, fb2];

  // ── 8. Basketball Hoop (recreation, cols 12-13) ───────────────
  IDLE_SPOTS.push({ tx:13, ty:ACT_ZONE_Y+10, anim:'shooting_basket', type:'basketball', w:5,
    _objId:'basketball', _defObjTx:12, _defObjTy:ACT_ZONE_Y+9, _offsetX:1, _offsetY:1 });

  // ── 9. Arcade Machine (recreation, cols 16-17) ────────────────
  IDLE_SPOTS.push({ tx:17, ty:ACT_ZONE_Y+10, anim:'playing_arcade', type:'arcade', w:7,
    _objId:'arcade', _defObjTx:16, _defObjTy:ACT_ZONE_Y+9, _offsetX:1, _offsetY:1 });

  // ── 10. DJ Console (recreation, cols 20-22) ───────────────────
  IDLE_SPOTS.push({ tx:21, ty:ACT_ZONE_Y+10, anim:'djing', type:'dj', w:5,
    _objId:'dj_console', _defObjTx:20, _defObjTy:ACT_ZONE_Y+9, _offsetX:1, _offsetY:1 });

  // ══ Zone 2: MAKERS LAB (ACT_ZONE+14, left side) ═══════════════

  // ── 11. Server Rack (makers lab, cols 2-3) ────────────────────
  IDLE_SPOTS.push({ tx:3, ty:ACT_ZONE_Y+15, anim:'fixing_server', type:'server', w:4,
    _objId:'server_rack', _defObjTx:2, _defObjTy:ACT_ZONE_Y+14, _offsetX:1, _offsetY:1 });

  // ── 12. 3D Printer (makers lab, cols 7-8) ─────────────────────
  IDLE_SPOTS.push({ tx:8, ty:ACT_ZONE_Y+15, anim:'watching_3dprint', type:'printer3d', w:4,
    _objId:'printer_3d', _defObjTx:7, _defObjTy:ACT_ZONE_Y+14, _offsetX:1, _offsetY:1 });

  // ── 13. Telescope (makers lab, cols 23-24, right side) ────────
  IDLE_SPOTS.push({ tx:19, ty:ACT_ZONE_Y+15, anim:'using_telescope', type:'telescope', w:5,
    _objId:'telescope', _defObjTx:18, _defObjTy:ACT_ZONE_Y+14, _offsetX:1, _offsetY:1 });

  // ══ Zone 3: CAFE (ACT_ZONE+14, center-right) ═════════════════

  // ── 14. Espresso Bar (cafe, cols 13-15) ───────────────────────
  IDLE_SPOTS.push({ tx:14, ty:ACT_ZONE_Y+15, anim:'drinking_espresso', type:'espresso', w:6,
    _objId:'espresso_bar', _defObjTx:13, _defObjTy:ACT_ZONE_Y+14, _offsetX:1, _offsetY:1 });

  // ── Bookshelf spot (right wall, social zone — well below conference table) ──
  IDLE_SPOTS.push({ tx:COLS - 4, ty:ACT_ZONE_Y + 14, anim:'reading', type:'shelf', w:5 });

  // ── Vending machine spot (inside kitchen) ────────────────────────
  IDLE_SPOTS.push({ tx: KITCHEN_WALL_COL+1.5, ty: ACT_ZONE_Y-1.5, anim:'eating', type:'kitchen', w:3 });

  // ── Conference table — 2 GROUP_PAIRS, in social zone below gym ───
  const confY = ACT_ZONE_Y + 10; // below gym/gaming/pp zone
  const confX = 4;
  const _confDefTx = 4, _confDefTy = ACT_ZONE_Y + 10;
  // Pair 11: north side facing each other
  const ci11A = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:confX+0.5, ty:confY+0.5, anim:'chatting_l', type:'group', groupId:11, role:'L', w:7, _objId:'conf_table', _defObjTx:_confDefTx, _defObjTy:_confDefTy, _offsetX:0.5, _offsetY:0.5 });
  const ci11B = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:confX+4.5, ty:confY+0.5, anim:'chatting_r', type:'group', groupId:11, role:'R', w:7, _objId:'conf_table', _defObjTx:_confDefTx, _defObjTy:_confDefTy, _offsetX:4.5, _offsetY:0.5 });
  GROUP_PAIRS[11] = [ci11A, ci11B];
  // Pair 12: south side
  const ci12A = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:confX+1.5, ty:confY+2,   anim:'arguing_l',  type:'group', groupId:12, role:'L', w:6, _objId:'conf_table', _defObjTx:_confDefTx, _defObjTy:_confDefTy, _offsetX:1.5, _offsetY:2 });
  const ci12B = IDLE_SPOTS.length;
  IDLE_SPOTS.push({ tx:confX+3.5, ty:confY+2,   anim:'arguing_r',  type:'group', groupId:12, role:'R', w:6, _objId:'conf_table', _defObjTx:_confDefTx, _defObjTy:_confDefTy, _offsetX:3.5, _offsetY:2 });
  GROUP_PAIRS[12] = [ci12A, ci12B];

  // ── Staircase (bottom-left corner — leads to 2nd floor) ──────────
  IDLE_SPOTS.push({ tx:2, ty:ROWS-6, anim:'climbing_stairs', type:'stairs', w:6,
    _objId:'staircase', _defObjTx:1, _defObjTy:ROWS-7, _offsetX:1, _offsetY:1 });

  // ── Whiteboard (left wall, in activity area) ──────────────────────
  IDLE_SPOTS.push({ tx:2.5, ty:ACT_ZONE_Y+8, anim:'writing_whiteboard', type:'whiteboard', w:5,
    _objId:'whiteboard', _defObjTx:1, _defObjTy:ACT_ZONE_Y+7, _offsetX:1.5, _offsetY:1 });

  // Cat bowl positions (preserve state across layout changes)
  const prevBowls = CAT_BOWLS;
  CAT_BOWLS = [
    { tx: 25, ty: 18, type: 'food',  hasFod: prevBowls[0]?.hasFod ?? true },
    { tx: 27, ty: 18, type: 'water', hasFod: prevBowls[1]?.hasFod ?? true }
  ];

  return true;
}

// ── Obstacle grid + A* pathfinding ──────────────────────────────
let CAT_BOWLS = [];
let obstacleGrid = null;

function buildObstacleGrid() {
  obstacleGrid = [];
  for (let r = 0; r < ROWS; r++) obstacleGrid.push(new Uint8Array(COLS));

  function mark(tx, ty) {
    const c = Math.round(tx), r = Math.round(ty);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) obstacleGrid[r][c] = 1;
  }
  function markRect(tx, ty, w, h) {
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++) mark(Math.floor(tx) + dc, Math.floor(ty) + dr);
  }

  // Outer walls (with entrance door gap on right wall)
  for (let c = 0; c < COLS; c++) { obstacleGrid[0][c] = 1; obstacleGrid[ROWS-1][c] = 1; }
  // Entrance door on right wall at row 5-7 (work zone)
  for (let r = 0; r < ROWS; r++) {
    obstacleGrid[r][0] = 1;
    const isEntrance = r >= 5 && r <= 7;
    if (!isEntrance) obstacleGrid[r][COLS-1] = 1;
  }

  // Kitchen partition wall (col 23, rows 10-19, door at 12-15)
  for (let r = 10; r <= 19; r++) {
    if (r >= 12 && r <= 15) continue; // door
    mark(23, r);
  }

  // Room walls as obstacles
  // Lounge wall (row 21)
  const loungeDoorL = Math.floor(COLS*0.3), loungeDoorR = Math.floor(COLS*0.5);
  for (let c = 1; c < COLS-1; c++) {
    if (c >= loungeDoorL && c <= loungeDoorR) continue;
    mark(c, 21);
  }
  // Activity wall (row 35)
  const actDoorL = Math.floor(COLS*0.35), actDoorR = Math.floor(COLS*0.65);
  for (let c = 1; c < COLS-1; c++) {
    if (c >= actDoorL && c <= actDoorR) continue;
    mark(c, 35);
  }
  // Sports wall (row 45)
  for (let c = 1; c < COLS-1; c++) {
    if (c >= actDoorL && c <= actDoorR) continue;
    mark(c, 45);
  }
  // Gym/Gaming divider (col 17, rows 36-44)
  for (let r = 36; r <= 44; r++) {
    if (r >= 39 && r <= 41) continue;
    mark(17, r);
  }
  // Sports/Social divider (col 17, rows 46-54)
  for (let r = 46; r <= 54; r++) {
    if (r >= 49 && r <= 51) continue;
    mark(17, r);
  }

  const rXobs = PER_ROW * STEP_X + 2;

  // All objects use getAdminPos so obstacles follow admin positions
  // ── Desks ─────
  for (let i = 0; i < DESK_DEFS.length; i++) {
    const [dx,dy] = getAdminPos('desk_'+i, DESK_DEFS[i].tx, DESK_DEFS[i].ty);
    markRect(dx, dy, 3, 2);
  }

  // ── Couches ─────
  for (let i = 0; i < COUCH_DEFS.length; i++) {
    const [cx,cy] = getAdminPos('couch_'+i, COUCH_DEFS[i].tx, COUCH_DEFS[i].ty);
    markRect(cx, cy, COUCH_DEFS[i].w || 3, 2);
  }

  // ── Ping pong table ─────
  if (ACT_ZONE_Y > 0) {
    const ppX2 = Math.min(19, COLS - 8);
    const [ppTx,ppTy] = getAdminPos('pingpong', ppX2-2, ACT_ZONE_Y+1);
    markRect(ppTx, ppTy, 6, 2);
  }

  // ── TV + gaming sofa ─────
  if (ACT_ZONE_Y > 0) {
    const [tvTx,tvTy] = getAdminPos('tv', 10, ACT_ZONE_Y+0.3);
    markRect(tvTx, tvTy, 4, 3);
    markRect(tvTx+1, tvTy+3.5, 4, 1); // sofa
  }

  // ── Gym ─────
  if (ACT_ZONE_Y > 0) {
    const [gmTx,gmTy] = getAdminPos('gym', 1, ACT_ZONE_Y+0.5);
    markRect(gmTx, gmTy, 5, 3);
  }

  // ── Kanban board (right entertainment zone) ─────
  {
    const rXkb = PER_ROW * STEP_X + 2;
    const [kbTx,kbTy] = getAdminPos('kanban', rXkb+0.2, 2.5);
    const kanbanCol = Math.floor(kbTx);
    const kanbanW = Math.min(5, COLS - 1 - kanbanCol);
    if (kanbanW >= 2) markRect(kanbanCol, Math.floor(kbTy), kanbanW, 4);
  }

  // ── Bookshelf ─────
  if (ACT_ZONE_Y > 0) {
    const [bsTx,bsTy] = getAdminPos('bookshelf', COLS-5.5, ACT_ZONE_Y+13.2);
    markRect(bsTx, bsTy, 5, 4);
  }

  // ── Conference table ─────
  if (ACT_ZONE_Y > 0) {
    const [cfTx,cfTy] = getAdminPos('conf_table', 4, ACT_ZONE_Y+10);
    markRect(cfTx, cfTy, 6, 3);
  }

  // ── Water cooler ─────
  const [wcTx,wcTy] = getAdminPos('cooler', rXobs+2.5, 2);
  mark(Math.floor(wcTx), Math.floor(wcTy));
  mark(Math.floor(wcTx)+1, Math.floor(wcTy));

  // ── Aquarium ─────
  const [aqTx,aqTy] = getAdminPos('aquarium', rXobs+0.3, 8);
  markRect(aqTx, aqTy, 3, 2);

  // ── Zone 1: RECREATION obstacles (ACT_ZONE+9) ─────
  if (ACT_ZONE_Y > 0) {
    const [fbObsTx,fbObsTy] = getAdminPos('foosball', 8, ACT_ZONE_Y+9);
    markRect(fbObsTx, fbObsTy, 3, 2);

    const [bbObsTx,bbObsTy] = getAdminPos('basketball', 12, ACT_ZONE_Y+9);
    markRect(bbObsTx, bbObsTy, 2, 2);

    const [arcObsTx,arcObsTy] = getAdminPos('arcade', 16, ACT_ZONE_Y+9);
    markRect(arcObsTx, arcObsTy, 2, 3);

    const [djObsTx,djObsTy] = getAdminPos('dj_console', 20, ACT_ZONE_Y+9);
    markRect(djObsTx, djObsTy, 3, 1);
  }

  // ── Zone 2: MAKERS LAB obstacles (ACT_ZONE+14) ─────
  if (ACT_ZONE_Y > 0) {
    const [srvObsTx,srvObsTy] = getAdminPos('server_rack', 2, ACT_ZONE_Y+14);
    markRect(srvObsTx, srvObsTy, 2, 2);

    const [p3ObsTx,p3ObsTy] = getAdminPos('printer_3d', 7, ACT_ZONE_Y+14);
    markRect(p3ObsTx, p3ObsTy, 2, 2);

    const [telObsTx,telObsTy] = getAdminPos('telescope', 18, ACT_ZONE_Y+14);
    markRect(telObsTx, telObsTy, 1, 2);
  }

  // ── Zone 3: CAFE obstacles (ACT_ZONE+14) ─────
  if (ACT_ZONE_Y > 0) {
    const [espObsTx,espObsTy] = getAdminPos('espresso_bar', 13, ACT_ZONE_Y+14);
    markRect(espObsTx, espObsTy, 3, 2);
  }

  // ── Printer ─────
  if (KITCHEN_WALL_COL > 0) {
    const [prTx,prTy] = getAdminPos('printer', KITCHEN_WALL_COL-3, KITCHEN_START_ROW-2);
    markRect(prTx, prTy, 2, 1);
  }

  // ── Trash can ─────
  const [trTx,trTy] = getAdminPos('trashcan', KITCHEN_WALL_COL-2, 3);
  mark(Math.floor(trTx), Math.floor(trTy));

  // ── Vending machine ─────
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    const [vmTx,vmTy] = getAdminPos('vending', KITCHEN_WALL_COL+1, ACT_ZONE_Y-2);
    markRect(vmTx, vmTy, 2, 3);
  }

  // Zone divider wall removed from obstacle grid — purely visual, agents walk freely

  // ── Gaming sofa ─────
  if (ACT_ZONE_Y > 0) {
    const [gsTx,gsTy] = getAdminPos('gaming_sofa', 11, ACT_ZONE_Y+3.7);
    markRect(gsTx, gsTy, 4, 1);
  }

  // ── Kitchen counter ─────
  if (KITCHEN_WALL_COL > 0) {
    const kitIntXobs = KITCHEN_WALL_COL + 1;
    const [kcTx,kcTy] = getAdminPos('kitchen_counter', kitIntXobs, KITCHEN_START_ROW);
    markRect(kcTx, kcTy, 9, 1);
    // Fridge
    const [frTx,frTy] = getAdminPos('fridge', kitIntXobs+8, KITCHEN_START_ROW);
    markRect(frTx, frTy, 1, 2);
  }

  // ── Kitchen dining table ─────
  if (KITCHEN_WALL_COL > 0) {
    const kitIntXobs = KITCHEN_WALL_COL + 1;
    const [ktTx,ktTy] = getAdminPos('kitchen_table', kitIntXobs+2, KITCHEN_START_ROW+1);
    markRect(ktTx, ktTy, 4, 3);
  }

}

// Returns array of waypoints [{tx,ty}] or null if direct path is clear
// Nearest unblocked tile via BFS (used when start/end lands inside obstacle)
function nearestFree(cx, cy) {
  if (!obstacleGrid[cy]?.[cx]) return [cx, cy];
  const visited = new Set();
  const q = [[cx, cy]];
  visited.add(cy * COLS + cx);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = x+dx, ny = y+dy;
      if (nx<1||nx>COLS-2||ny<1||ny>ROWS-2) continue;
      const k = ny*COLS+nx;
      if (visited.has(k)) continue;
      visited.add(k);
      if (!obstacleGrid[ny][nx]) return [nx, ny];
      q.push([nx, ny]);
    }
  }
  return [cx, cy];
}

function astar(fromTx, fromTy, toTx, toTy) {
  if (!obstacleGrid) return null;
  let [sx, sy] = nearestFree(Math.max(1,Math.min(COLS-2,Math.round(fromTx))), Math.max(1,Math.min(ROWS-2,Math.round(fromTy))));
  let [ex, ey] = nearestFree(Math.max(1,Math.min(COLS-2,Math.round(toTx))),   Math.max(1,Math.min(ROWS-2,Math.round(toTy))));
  if (sx===ex && sy===ey) return null;

  // Bresenham line check — is direct path clear?
  let blocked = false;
  {
    let cx=sx, cy=sy;
    const dx=Math.abs(ex-sx), dy=Math.abs(ey-sy);
    const stepX=sx<ex?1:-1, stepY=sy<ey?1:-1;
    let err=dx-dy;
    for (let i=0; i<dx+dy+2; i++) {
      if (obstacleGrid[cy]?.[cx]) { blocked=true; break; }
      if (cx===ex && cy===ey) break;
      const e2=2*err;
      if (e2>-dy){ err-=dy; cx+=stepX; }
      if (e2< dx){ err+=dx; cy+=stepY; }
    }
  }
  if (!blocked) return null;

  // A* on tile grid
  const key = (x,y) => y*COLS+x;
  const h   = (x,y) => Math.abs(x-ex)+Math.abs(y-ey);
  const nodes = {};
  const open  = new Set();
  const closed= new Set();
  const sk = key(sx,sy);
  nodes[sk] = {x:sx, y:sy, g:0, f:h(sx,sy), pk:null};
  open.add(sk);
  const DIRS  = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  const COSTS = [1,1,1,1,1.414,1.414,1.414,1.414];
  let limit=3000, found=null;
  while (open.size && limit-->0) {
    let bk=null, bf=Infinity;
    for (const k of open) { const f=nodes[k].f; if(f<bf){bf=f;bk=k;} }
    open.delete(bk); closed.add(bk);
    const cur=nodes[bk];
    if (cur.x===ex && cur.y===ey) { found=bk; break; }
    for (let d=0; d<8; d++) {
      const nx=cur.x+DIRS[d][0], ny=cur.y+DIRS[d][1];
      if (nx<1||nx>COLS-2||ny<1||ny>ROWS-2) continue;
      if (obstacleGrid[ny]?.[nx]) continue;
      if (d>=4 && (obstacleGrid[cur.y]?.[nx] || obstacleGrid[ny]?.[cur.x])) continue;
      const nk=key(nx,ny);
      if (closed.has(nk)) continue;
      const ng=cur.g+COSTS[d];
      if (!nodes[nk]||ng<nodes[nk].g) {
        nodes[nk]={x:nx,y:ny,g:ng,f:ng+h(nx,ny),pk:bk};
        open.add(nk);
      }
    }
  }
  if (!found) return null;
  // Reconstruct — skip start node, use float tile centers, exact dest at end
  const path=[];
  let k=found;
  while (k!==null && nodes[k].pk!==null) { path.unshift(nodes[k]); k=nodes[k].pk; }
  const wps=path.map(n=>({tx:n.x+0.5, ty:n.y+0.5}));
  wps.push({tx:toTx, ty:toTy});
  return wps.length ? wps : null;
}


export {
  FL_A, FL_B, WL_TOP, WL_BASE, DESK_TOP, DESK_FRONT, DESK_EDGE,
  CHAIR_C, CHAIR_SEAT, COUCH_C, COUCH_SEAT, COUCH_HI,
  DESK_DEFS, DESK_SLOTS, COUCH_DEFS, COUCH_SLOTS, layoutN,
  IDLE_SPOTS, GROUP_PAIRS, CAT_BOWLS,
  KITCHEN_WALL_COL, KITCHEN_START_ROW, KITCHEN_DOOR_ROW,
  PER_ROW, STEP_X, STEP_Y, START_ROW, ACT_ZONE_Y,
  PP_L, PP_R, ppBall,
  generateLayout, buildObstacleGrid, obstacleGrid, astar, nearestFree,
};
