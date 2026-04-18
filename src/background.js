// ════════════════════════════════════════════════════════════════
//  BACKGROUND RENDERER
// ════════════════════════════════════════════════════════════════
import { OX, OY, T, SCREEN_C, MON_DARK } from './constants.js';
import { COLS, ROWS, CW, CH } from './layout.js';
import { ease, clamp } from './math.js';
import { getAdminPos } from './adminPos.js';
import {
  FL_A,
  FL_B,
  WL_TOP,
  WL_BASE,
  DESK_TOP,
  DESK_FRONT,
  DESK_EDGE,
  CHAIR_C,
  CHAIR_SEAT,
  COUCH_C,
  COUCH_SEAT,
  COUCH_HI,
  DESK_DEFS,
  DESK_SLOTS,
  COUCH_DEFS,
  COUCH_SLOTS,
  IDLE_SPOTS,
  CAT_BOWLS,
  KITCHEN_WALL_COL,
  KITCHEN_START_ROW,
  KITCHEN_DOOR_ROW,
  PER_ROW,
  STEP_X,
  ACT_ZONE_Y,
} from './layout.js';
import { doorAnim } from './state.js';

// ════════════════════════════════════════════════════════════════
//  BACKGROUND RENDERER  (with drop shadows)
// ════════════════════════════════════════════════════════════════
const bgBuf = document.createElement('canvas');
bgBuf.width = CW;
bgBuf.height = 900;
const bgx = bgBuf.getContext('2d');
bgx.imageSmoothingEnabled = false;

function ts(tx, ty) {
  return [OX + tx * T, OY + ty * T];
}
function fillR(ctx, x, y, w, h, c) {
  if (!c) return;
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// ── Animated entrance door (drawn over static background each frame) ──────────
function drawEntranceDoor(ctx) {
  const edx = OX + (COLS - 1) * T;
  // Door centred on the lounge rug (rug top = COUCH_DEFS[0].ty - 0.5, height 2 tiles,
  // so rug centre = couchTy + 0.5). Door height = 3 tiles, centre at edyRow + 1.5.
  // Therefore edyRow = couchTy - 1 places the door centre on the rug centre.
  const couchTy =
    COUCH_DEFS.length > 0
      ? COUCH_DEFS[0].ty
      : KITCHEN_DOOR_ROW > 0
        ? KITCHEN_DOOR_ROW
        : Math.floor(ROWS * 0.38);
  const edy = OY + (couchTy - 1) * T;
  const doorH = T * 3;
  const o = ease.inOut(clamp(doorAnim.open, 0, 1)); // 0=closed, 1=fully open

  // Repaint the door area (covers static bg door)
  fillR(ctx, edx, edy, T, doorH, '#3a3050'); // dark void behind door
  // Door frame (same as static bg)
  fillR(ctx, edx, edy, 4, doorH, '#6a5090');
  fillR(ctx, edx + T - 4, edy, 4, doorH, '#6a5090');
  fillR(ctx, edx, edy - 3, T, 4, '#6a5090'); // top
  fillR(ctx, edx, edy + doorH, T, 4, '#6a5090'); // bottom

  // Door leaf — foreshorten as it swings inward (hinge on left side)
  const maxW = T - 12;
  const doorW = Math.round(maxW * (1 - o));
  if (doorW > 1) {
    fillR(ctx, edx + 4, edy + 2, doorW, doorH - 4, '#5a4030');
    fillR(ctx, edx + 6, edy + 4, doorW - 2, doorH - 8, '#6a4c38');
    // Panel grooves
    fillR(ctx, edx + 5, edy + T, doorW - 2, 2, '#4a3028');
    fillR(ctx, edx + 5, edy + T * 2, doorW - 2, 2, '#4a3028');
    // Handle (disappears as door swings away)
    if (o < 0.55) {
      const hx = edx + 4 + Math.max(2, Math.round(doorW * 0.45));
      ctx.fillStyle = '#c0b060';
      ctx.beginPath();
      ctx.arc(hx, edy + T * 1.5, 3 * (1 - o * 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Edge of door (visible when swinging)
  if (o > 0.05 && o < 0.98) {
    fillR(ctx, edx + 4 + doorW, edy + 2, 3, doorH - 4, '#3a2818');
  }

  // Light spill from outside when door is open
  if (o > 0.08) {
    ctx.save();
    ctx.globalAlpha = o * 0.12;
    const lg = ctx.createRadialGradient(
      edx + T * 0.5,
      edy + doorH * 0.5,
      0,
      edx + T * 0.5,
      edy + doorH * 0.5,
      T * 3
    );
    lg.addColorStop(0, '#ffffd0');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(edx - T * 2, edy - T, T * 5, doorH + T * 2);
    ctx.restore();
  }
}

function buildBackground() {
  const ctx = bgx;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CW, bgBuf.height);

  // Floor + walls
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = OX + col * T,
        y = OY + row * T;
      const wall = col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
      // Kitchen area: cols 23-34, rows 10-19 (fixed position)
      const KIT_ROW_START = 10,
        KIT_ROW_END = 19,
        KIT_COL = 23;
      const inKitchen =
        col > KIT_COL && col < COLS - 1 && row >= KIT_ROW_START && row <= KIT_ROW_END;
      const isKitPartWall =
        col === KIT_COL &&
        row >= KIT_ROW_START &&
        row <= KIT_ROW_END &&
        !(row >= KIT_ROW_START + 2 && row <= KIT_ROW_START + 5);
      if (wall) {
        if (row === 0) {
          fillR(ctx, x, y, T, T, '#16152e');
          fillR(ctx, x, y + T - 4, T, 4, '#22204a');
          fillR(ctx, x, y + T - 1, T, 1, '#2e2c60');
        } else {
          fillR(ctx, x, y, T, T, WL_TOP);
        }
      } else if (isKitPartWall) {
        // Kitchen partition wall segment
        fillR(ctx, x, y, T, T, '#252344');
        fillR(ctx, x, y, 4, T, '#1e1c38'); // shadow side
        fillR(ctx, x + T - 4, y, 4, T, '#3a3860'); // lit side
        fillR(ctx, x + 4, y, T - 8, 2, '#3a3860'); // top highlight
      } else if (inKitchen) {
        // Kitchen tile floor — cool grey checker
        const checker = (row + col) % 2;
        fillR(ctx, x, y, T, T, checker ? '#cec8bc' : '#c4beb2');
        fillR(ctx, x, y + T - 1, T, 1, 'rgba(0,0,0,0.13)'); // grout H
        fillR(ctx, x + T - 1, y, 1, T, 'rgba(0,0,0,0.13)'); // grout V
      } else {
        // Wood floor planks — rows of alternating shades with grain
        const pi = (row + ((col / 5) | 0)) % 3;
        const plankC = ['#e2ddd2', '#ddd8cd', '#d8d3c8'][pi];
        fillR(ctx, x, y, T, T, plankC);
        fillR(ctx, x, y + T - 1, T, 1, 'rgba(0,0,0,0.09)'); // groove
        if ((col * 7 + row * 13) % 17 === 0)
          fillR(ctx, x + ((col * 5) % 24), y, 1, T, 'rgba(0,0,0,0.04)'); // grain
      }
    }
  }
  // Kitchen partition door frame (fixed position col 23, rows 12-14)
  {
    const dx = OX + 23 * T,
      dy = OY + 12 * T;
    fillR(ctx, dx, dy, T, T * 4, '#2e2c50');
    fillR(ctx, dx, dy, 4, T * 4, '#4a4880');
    fillR(ctx, dx + T - 4, dy, 4, T * 4, '#4a4880');
  }

  // ── Main entrance door (right wall) — agents spawn here ──────
  // Centred on the lounge rug (see drawEntranceDoor for the math).
  {
    const edx = OX + (COLS - 1) * T;
    const couchTy =
      COUCH_DEFS.length > 0
        ? COUCH_DEFS[0].ty
        : KITCHEN_DOOR_ROW > 0
          ? KITCHEN_DOOR_ROW
          : Math.floor(ROWS * 0.38);
    const edy = OY + (couchTy - 1) * T;
    // Door opening (3 tiles tall)
    fillR(ctx, edx, edy, T, T * 3, '#3a3050');
    // Door frame
    fillR(ctx, edx, edy, 4, T * 3, '#6a5090');
    fillR(ctx, edx + T - 4, edy, 4, T * 3, '#6a5090');
    fillR(ctx, edx, edy - 3, T, 4, '#6a5090'); // top frame
    fillR(ctx, edx, edy + T * 3, T, 4, '#6a5090'); // bottom frame
    // Door surface (brown wood, slightly open)
    fillR(ctx, edx + 4, edy + 2, T - 12, T * 3 - 4, '#5a4030');
    fillR(ctx, edx + 6, edy + 4, T - 16, T * 3 - 8, '#6a4c38');
    // Door handle
    ctx.fillStyle = '#c0b060';
    ctx.beginPath();
    ctx.arc(edx + 10, edy + T * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Windows — static frames only (sky color drawn dynamically)
  // Keep in sync with WINDOW_TX in app.js (drawDynamicWindows + static frames)
  const _WINDOW_TX = [1, 33];
  for (let i = 0; i < _WINDOW_TX.length; i++) {
    const wx = OX + _WINDOW_TX[i] * T + 4,
      wy = OY + 5;
    fillR(ctx, wx, wy, T - 8, T - 10, '#0a0a14'); // dark placeholder
    ctx.strokeStyle = '#3a3860';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx + 0.5, wy + 0.5, T - 9, T - 11);
    ctx.beginPath();
    ctx.moveTo(wx + (T - 8) / 2, wy);
    ctx.lineTo(wx + (T - 8) / 2, wy + T - 10);
    ctx.moveTo(wx, wy + (T - 10) / 2);
    ctx.lineTo(wx + T - 8, wy + (T - 10) / 2);
    ctx.strokeStyle = '#3a386080';
    ctx.stroke();
  }

  // Ceiling strip lights
  for (let li = 1; li < COLS - 1; li += 6) {
    const lx = OX + li * T + T / 2,
      ly = OY + T;
    fillR(ctx, lx - 10, ly - 3, 20, 4, '#c0b8d8');
    fillR(ctx, lx - 8, ly + 1, 16, 3, '#fffff060');
    ctx.save();
    ctx.globalAlpha = 0.045;
    const lg = ctx.createRadialGradient(lx, ly + T, 0, lx, ly + T, T * 4);
    lg.addColorStop(0, '#fffff0');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(OX, ly, CW - OX * 2, T * 8);
    ctx.restore();
  }

  // Lounge rug
  if (COUCH_DEFS.length > 0) {
    const [rx, ry] = ts(1.5, COUCH_DEFS[0].ty - 0.5);
    const rugW = Math.min(COUCH_DEFS.length * 3.5 + 2, COLS - 3) * T;
    ctx.save();
    ctx.shadowColor = '#00000050';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    fillR(ctx, rx, ry, rugW, T * 2, '#3a2060');
    ctx.restore();
    fillR(ctx, rx + 4, ry + 4, rugW - 8, T * 2 - 8, '#4a2878');
    ctx.strokeStyle = '#5a3898';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 7, ry + 7, rugW - 14, T * 2 - 14);
  }

  // Desks
  for (let _di = 0; _di < DESK_DEFS.length; _di++) {
    const { tx: _dtx, ty: _dty } = DESK_DEFS[_di];
    const [_dATx, _dATy] = getAdminPos('desk_' + _di, _dtx, _dty);
    const [x, y] = ts(_dATx, _dATy);
    const W = T * 2,
      H = T;
    // Desk top with drop shadow
    ctx.save();
    ctx.shadowColor = '#00000080';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;
    fillR(ctx, x, y, W, H, DESK_TOP);
    ctx.restore();
    // Wood grain highlights
    fillR(ctx, x, y, W, 3, '#e0d0a8');
    fillR(ctx, x + 2, y + 6, W - 4, 1, '#b89868');
    fillR(ctx, x + 2, y + 12, W - 4, 1, '#b89868');
    fillR(ctx, x + 2, y + 18, W - 4, 1, '#b89868');
    // Desk front / edge
    fillR(ctx, x, y + H, W, 8, DESK_FRONT);
    fillR(ctx, x, y + H, W, 1, '#8a6a38');
    fillR(ctx, x + W, y, 3, H + 8, '#6a5020');
    ctx.strokeStyle = DESK_EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    // Monitor — bigger, sleeker
    const mW = 32,
      mH = 22;
    const mx = x + W / 2 - mW / 2,
      my = y + 2;
    fillR(ctx, mx - 1, my - 1, mW + 2, mH + 2, '#000'); // bezel outline
    fillR(ctx, mx, my, mW, mH, '#1a1a24'); // bezel
    fillR(ctx, mx + 2, my + 2, mW - 4, mH - 5, '#080818'); // inner frame
    fillR(ctx, mx + 3, my + 3, mW - 6, mH - 7, SCREEN_C); // screen
    // Screen content — code window
    fillR(ctx, mx + 3, my + 3, mW - 6, 3, '#2a3550'); // title bar
    fillR(ctx, mx + 5, my + 4, 2, 1, '#f7768e');
    fillR(ctx, mx + 8, my + 4, 2, 1, '#e0af68');
    fillR(ctx, mx + 11, my + 4, 2, 1, '#9ece6a');
    const gl = ['#7aa2f7', '#9ece6a', '#bb9af7', '#f7768e', '#7dcfff'];
    for (let li = 0; li < 5; li++) {
      const lw = 4 + ((li * 3) % 9);
      fillR(ctx, mx + 5, my + 8 + li * 2, lw, 1, gl[li]);
    }
    // Monitor stand
    fillR(ctx, x + W / 2 - 3, my + mH, 6, 4, '#2a2a3c');
    fillR(ctx, x + W / 2 - 8, my + mH + 4, 16, 2, '#1e1e2e');
    // Keyboard
    fillR(ctx, x + W / 2 - 14, y + H - 9, 28, 6, '#d0d4dc');
    fillR(ctx, x + W / 2 - 14, y + H - 9, 28, 1, '#f0f4fc');
    for (let ki = 0; ki < 6; ki++) fillR(ctx, x + W / 2 - 13 + ki * 4, y + H - 7, 3, 3, '#8a8e96');
    fillR(ctx, x + W / 2 - 10, y + H - 4, 20, 1, '#a0a4ac'); // spacebar
    // Mouse
    fillR(ctx, x + W / 2 + 16, y + H - 7, 5, 6, '#d0d4dc');
    fillR(ctx, x + W / 2 + 17, y + H - 7, 1, 2, '#8a8e96');
    // Coffee mug
    fillR(ctx, x + 6, y + H - 14, 8, 10, '#c04030');
    fillR(ctx, x + 6, y + H - 14, 8, 1, '#e05040');
    fillR(ctx, x + 7, y + H - 13, 6, 1, '#2a1a14'); // coffee
    fillR(ctx, x + 14, y + H - 12, 2, 4, '#c04030'); // handle
    // Chair — more detailed ergonomic
    const cx2 = x + W / 2 - 10,
      cy2 = y + H + 10;
    fillR(ctx, cx2 - 1, cy2 - 1, 22, 18, '#000'); // outline
    fillR(ctx, cx2, cy2, 20, 16, CHAIR_C); // seat
    fillR(ctx, cx2 + 2, cy2 + 2, 16, 12, CHAIR_SEAT);
    fillR(ctx, cx2 + 3, cy2 + 3, 14, 2, '#6060b0'); // seat highlight
    fillR(ctx, cx2, cy2 - 12, 20, 12, CHAIR_C); // backrest
    fillR(ctx, cx2 + 2, cy2 - 11, 16, 10, CHAIR_SEAT);
    fillR(ctx, cx2 + 3, cy2 - 10, 14, 2, '#6060b0');
    fillR(ctx, cx2 + 9, cy2 + 16, 2, 3, '#181828'); // center post
    fillR(ctx, cx2 - 2, cy2 + 18, 24, 2, '#181828'); // base
    fillR(ctx, cx2 - 2, cy2 + 19, 4, 2, '#282838'); // wheels
    fillR(ctx, cx2 + 18, cy2 + 19, 4, 2, '#282838');
    fillR(ctx, cx2 + 8, cy2 + 19, 4, 2, '#282838');
  }

  // Couches
  for (let _ci = 0; _ci < COUCH_DEFS.length; _ci++) {
    const { tx: _ctx2, ty: _cty2, w } = COUCH_DEFS[_ci];
    const [_cATx, _cATy] = getAdminPos('couch_' + _ci, _ctx2, _cty2);
    const [x, y] = ts(_cATx, _cATy);
    const W = w * T,
      H = T * 0.85;
    ctx.save();
    ctx.shadowColor = '#00000090';
    ctx.shadowBlur = 11;
    ctx.shadowOffsetY = 6;
    fillR(ctx, x, y, W, H + 12, COUCH_C);
    ctx.restore();
    // Backrest with tufted detail
    fillR(ctx, x, y, W, 12, COUCH_C);
    fillR(ctx, x + 2, y + 1, W - 4, 9, '#4a3880');
    fillR(ctx, x + 2, y + 2, W - 4, 1, '#5a4890');
    // Tuft buttons on backrest
    const tuftCount = Math.max(2, Math.floor(w * 1.5));
    for (let tb = 0; tb < tuftCount; tb++) {
      const btx = x + 12 + (tb * (W - 24)) / Math.max(1, tuftCount - 1);
      fillR(ctx, btx, y + 5, 2, 2, '#2a1c50');
      fillR(ctx, btx, y + 5, 1, 1, '#6050a0');
    }
    // Seat cushions
    fillR(ctx, x, y + 12, W, H, COUCH_SEAT);
    fillR(ctx, x + 3, y + 14, W - 6, 2, COUCH_HI);
    fillR(ctx, x + 3, y + 14, W - 6, H - 8, COUCH_HI);
    fillR(ctx, x + 3, y + H + 8, W - 6, 2, '#32245a');
    // Bottom trim / legs shadow
    fillR(ctx, x, y + 12 + H, W, 6, '#281e50');
    fillR(ctx, x + W, y, 3, H + 18, '#1e1640');
    // Wooden legs
    fillR(ctx, x + 2, y + 12 + H + 4, 4, 4, '#3a2818');
    fillR(ctx, x + W - 6, y + 12 + H + 4, 4, 4, '#3a2818');
    // Armrests with cushion top
    fillR(ctx, x, y, 10, H + 12, COUCH_C);
    fillR(ctx, x + W - 10, y, 10, H + 12, COUCH_C);
    fillR(ctx, x + 1, y + 12, 8, 3, COUCH_HI);
    fillR(ctx, x + W - 9, y + 12, 8, 3, COUCH_HI);
    // Seat cushion seams
    const sec = Math.max(1, Math.floor(w));
    for (let s = 1; s < sec; s++) {
      fillR(ctx, x + s * (W / sec) - 1, y + 14, 2, H - 4, '#382860');
      fillR(ctx, x + s * (W / sec) - 1, y + 14, 1, H - 4, '#4a3880');
    }
    // Throw pillow
    fillR(ctx, x + 12, y + 13, 14, 10, '#d04060');
    fillR(ctx, x + 13, y + 14, 12, 2, '#e05878');
    fillR(ctx, x + 13, y + 20, 12, 1, '#a03050');
    // Coffee table in front
    const tx2 = x + 10,
      ty2 = y + 12 + H + 10;
    fillR(ctx, tx2 - 1, ty2 - 1, W - 18, 18, '#2a1808');
    fillR(ctx, tx2, ty2, W - 20, 16, '#5a4830');
    fillR(ctx, tx2 + 2, ty2 + 2, W - 24, 2, '#7a6850');
    fillR(ctx, tx2 + 2, ty2 + 2, W - 24, 12, '#6a5840');
    fillR(ctx, tx2, ty2 + 16, W - 20, 4, '#3a2818');
    // Book on table
    fillR(ctx, tx2 + 4, ty2 + 4, 8, 6, '#2060b0');
    fillR(ctx, tx2 + 4, ty2 + 4, 8, 1, '#40a0e0');
    fillR(ctx, tx2 + 5, ty2 + 6, 6, 1, '#80c0f0');
    // Cup on table
    fillR(ctx, tx2 + W - 32, ty2 + 4, 5, 6, '#e8e0d0');
    fillR(ctx, tx2 + W - 32, ty2 + 4, 5, 1, '#ffffff');
    fillR(ctx, tx2 + W - 31, ty2 + 5, 3, 1, '#3a2010');
  }

  // Plants — draw at positions defined in IDLE_SPOTS (type:'plant')
  let _plantIdx = 0;
  IDLE_SPOTS.filter((s) => s.type === 'plant').forEach(({ tx: ptx, ty: pty }) => {
    const [_plTx, _plTy] = getAdminPos('plant_' + _plantIdx, ptx, pty);
    _plantIdx++;
    if (_plTx >= COLS - 1 || _plTy >= ROWS - 1) return;
    const [px, py] = ts(_plTx, _plTy);
    const pcx = px + T / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(pcx, py + T - 3, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Terracotta pot
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#a04820';
    ctx.beginPath();
    ctx.moveTo(pcx - 9, py + T - 8);
    ctx.lineTo(pcx - 7, py + T - 2);
    ctx.lineTo(pcx + 7, py + T - 2);
    ctx.lineTo(pcx + 9, py + T - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#c06030'; // pot rim
    ctx.fillRect(pcx - 10, py + T - 11, 20, 4);
    ctx.fillStyle = '#904018'; // pot base strip
    ctx.fillRect(pcx - 6, py + T - 2, 12, 2);
    ctx.fillStyle = '#7a3010'; // soil
    ctx.fillRect(pcx - 8, py + T - 10, 16, 4);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(pcx - 6, py + T - 10, 12, 3);
    // Leaves — tropical / monstera style
    const leafBase = py + T - 10;
    // Main stem
    ctx.strokeStyle = '#2a5018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pcx, leafBase);
    ctx.lineTo(pcx, leafBase - 22);
    ctx.stroke();
    // Left leaf
    ctx.fillStyle = '#1e5818';
    ctx.beginPath();
    ctx.moveTo(pcx - 1, leafBase - 10);
    ctx.quadraticCurveTo(pcx - 16, leafBase - 20, pcx - 14, leafBase - 28);
    ctx.quadraticCurveTo(pcx - 6, leafBase - 22, pcx - 1, leafBase - 10);
    ctx.fill();
    ctx.fillStyle = '#3a7828';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pcx - 1, leafBase - 10);
    ctx.quadraticCurveTo(pcx - 10, leafBase - 18, pcx - 10, leafBase - 26);
    ctx.stroke();
    // Right leaf
    ctx.fillStyle = '#2a6820';
    ctx.beginPath();
    ctx.moveTo(pcx + 1, leafBase - 14);
    ctx.quadraticCurveTo(pcx + 16, leafBase - 24, pcx + 13, leafBase - 30);
    ctx.quadraticCurveTo(pcx + 4, leafBase - 24, pcx + 1, leafBase - 14);
    ctx.fill();
    // Center leaf (top)
    ctx.fillStyle = '#3a7828';
    ctx.beginPath();
    ctx.moveTo(pcx - 1, leafBase - 20);
    ctx.quadraticCurveTo(pcx - 6, leafBase - 36, pcx, leafBase - 38);
    ctx.quadraticCurveTo(pcx + 6, leafBase - 36, pcx + 1, leafBase - 20);
    ctx.fill();
    // Leaf highlights
    ctx.strokeStyle = '#60a840';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(pcx - 1, leafBase - 20);
    ctx.lineTo(pcx, leafBase - 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pcx - 1, leafBase - 10);
    ctx.lineTo(pcx - 10, leafBase - 26);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Enclosed kitchen room — appliances (right side)
  if (ROWS > 6 && KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1; // first interior column
    const [_kcTx, _kcTy] = getAdminPos('kitchen_counter', kitIntX, KITCHEN_START_ROW);
    const [kx, ky] = ts(_kcTx, _kcTy);

    // Long counter along back wall — marble top, cabinet base
    const _ctW = T * 9;
    ctx.save();
    ctx.shadowColor = '#00000080';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 5;
    // Cabinet base
    fillR(ctx, kx, ky + 4, _ctW, T * 0.6 - 4, '#6a4028');
    ctx.restore();
    // Marble top (light grey-cream)
    fillR(ctx, kx, ky, _ctW, 5, '#e8e4d8');
    fillR(ctx, kx, ky, _ctW, 1, '#f8f4e8');
    fillR(ctx, kx, ky + 4, _ctW, 1, '#a8a498');
    // Marble veins
    for (let vi = 0; vi < 8; vi++) {
      const vx = kx + (vi * _ctW) / 8 + (vi % 2) * 6;
      fillR(ctx, vx, ky + 1, 6, 1, '#c8c4b8');
      fillR(ctx, vx + 2, ky + 2, 3, 1, '#b8b4a8');
    }
    // Cabinet front — doors with handles
    const doorCount = 5;
    const doorW = _ctW / doorCount;
    for (let dc = 0; dc < doorCount; dc++) {
      const dxp = kx + dc * doorW;
      // Door panel
      fillR(ctx, dxp + 1, ky + 6, doorW - 2, T * 0.6 - 7, '#7a5030');
      fillR(ctx, dxp + 2, ky + 7, doorW - 4, 1, '#9a6840');
      fillR(ctx, dxp + 2, ky + 8, 1, T * 0.6 - 10, '#9a6840');
      fillR(ctx, dxp + doorW - 3, ky + 8, 1, T * 0.6 - 10, '#4a2818');
      // Inset panel detail
      fillR(ctx, dxp + 4, ky + 10, doorW - 8, T * 0.6 - 14, '#6a4028');
      fillR(ctx, dxp + 5, ky + 11, doorW - 10, 1, '#8a5838');
      // Handle
      fillR(ctx, dxp + doorW / 2 - 2, ky + 12, 4, 1, '#d4c080');
      fillR(ctx, dxp + doorW / 2 - 2, ky + 13, 4, 1, '#a89050');
    }
    // Counter front edge shadow
    fillR(ctx, kx, ky + T * 0.6, _ctW, 2, '#3a2010');
    // Little decoration on counter — cutting board
    fillR(ctx, kx + T * 2, ky - 2, 18, 3, '#b88848');
    fillR(ctx, kx + T * 2, ky - 2, 18, 1, '#d8a868');
    // Knife block
    fillR(ctx, kx + T * 2 + 22, ky - 6, 8, 7, '#4a2818');
    fillR(ctx, kx + T * 2 + 22, ky - 6, 8, 1, '#6a3828');
    fillR(ctx, kx + T * 2 + 24, ky - 5, 1, 2, '#c0c0d0');
    fillR(ctx, kx + T * 2 + 27, ky - 5, 1, 2, '#c0c0d0');

    // ── Coffee Machine (espresso style) ──
    const cmx = kx + 6,
      cmy = ky - 26;
    // Body
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 4;
    fillR(ctx, cmx, cmy + 4, 22, 26, '#282838');
    ctx.restore();
    fillR(ctx, cmx + 1, cmy + 4, 20, 2, '#383848'); // top highlight
    // Rounded top
    ctx.fillStyle = '#282838';
    ctx.beginPath();
    ctx.arc(cmx + 11, cmy + 5, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#383848';
    ctx.beginPath();
    ctx.arc(cmx + 11, cmy + 5, 9, Math.PI, Math.PI + 0.5);
    ctx.fill();
    // Chrome band
    fillR(ctx, cmx + 1, cmy + 10, 20, 2, '#a0a8b8');
    fillR(ctx, cmx + 1, cmy + 11, 20, 1, '#808890');
    // Portafilter holder (chrome)
    fillR(ctx, cmx + 6, cmy + 20, 10, 3, '#b0b8c8');
    fillR(ctx, cmx + 4, cmy + 22, 14, 2, '#9098a8');
    fillR(ctx, cmx + 8, cmy + 24, 6, 3, '#a0a8b8'); // spout
    // Drip tray
    fillR(ctx, cmx + 2, cmy + 27, 18, 3, '#505060');
    fillR(ctx, cmx + 3, cmy + 28, 16, 1, '#404050');
    // Display panel
    fillR(ctx, cmx + 3, cmy + 13, 16, 6, '#0a0e18');
    fillR(ctx, cmx + 4, cmy + 14, 14, 4, '#101828');
    // Indicator lights
    fillR(ctx, cmx + 5, cmy + 15, 2, 2, '#40e040'); // green = ready
    fillR(ctx, cmx + 9, cmy + 15, 2, 2, '#e04040'); // red = power
    // "COFFEE" label
    ctx.fillStyle = '#606878';
    ctx.font = '3px monospace';
    ctx.fillText('COFFEE', cmx + 3, cmy + 9);
    // Steam nozzle (side)
    fillR(ctx, cmx + 20, cmy + 16, 3, 2, '#9098a8');
    fillR(ctx, cmx + 21, cmy + 18, 2, 5, '#808890');

    // ── Microwave ──
    const mcx = kx + T + 8,
      mcy = ky - 22;
    ctx.save();
    ctx.shadowColor = '#00000050';
    ctx.shadowBlur = 3;
    fillR(ctx, mcx, mcy, 30, 22, '#303040');
    ctx.restore();
    fillR(ctx, mcx + 1, mcy, 28, 1, '#404050'); // top highlight
    // Glass door window
    fillR(ctx, mcx + 2, mcy + 3, 18, 14, '#1a1a2a'); // door frame
    fillR(ctx, mcx + 3, mcy + 4, 16, 12, '#1a2a3a'); // glass
    fillR(ctx, mcx + 4, mcy + 5, 14, 10, '#12202e'); // interior dark
    // Rotating plate inside (subtle circle)
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mcx + 11, mcy + 10, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Handle (right side)
    fillR(ctx, mcx + 21, mcy + 5, 2, 10, '#505868');
    fillR(ctx, mcx + 22, mcy + 6, 1, 8, '#606878');
    // Digital clock display
    fillR(ctx, mcx + 24, mcy + 4, 5, 4, '#0a0e10');
    ctx.fillStyle = '#40e850';
    ctx.font = '3px monospace';
    ctx.fillText('12:00', mcx + 24, mcy + 7);
    // Control buttons
    fillR(ctx, mcx + 24, mcy + 10, 3, 2, '#e05050'); // stop
    fillR(ctx, mcx + 24, mcy + 13, 3, 2, '#50e050'); // start
    fillR(ctx, mcx + 24, mcy + 16, 3, 2, '#5080e0'); // timer
    // Bottom vent
    for (let vi = 0; vi < 5; vi++) fillR(ctx, mcx + 3 + vi * 4, mcy + 19, 2, 1, '#404050');

    // ── Toaster (chrome) ──
    const tsx = kx + T * 2 + 14,
      tsy = ky - 14;
    ctx.save();
    ctx.shadowColor = '#00000040';
    ctx.shadowBlur = 2;
    fillR(ctx, tsx, tsy, 16, 14, '#c0c8d0');
    ctx.restore();
    fillR(ctx, tsx + 1, tsy, 14, 1, '#d8e0e8'); // top highlight
    fillR(ctx, tsx, tsy + 1, 16, 1, '#b0b8c0'); // subtle edge
    // Two slots on top
    fillR(ctx, tsx + 2, tsy - 1, 4, 2, '#404048');
    fillR(ctx, tsx + 9, tsy - 1, 4, 2, '#404048');
    // Bread peeking out (tiny)
    fillR(ctx, tsx + 3, tsy - 2, 2, 2, '#d4a850');
    fillR(ctx, tsx + 10, tsy - 2, 2, 2, '#d4a850');
    // Chrome body detail
    fillR(ctx, tsx + 1, tsy + 4, 14, 1, '#d0d8e0');
    fillR(ctx, tsx + 1, tsy + 8, 14, 1, '#a8b0b8');
    // Push lever (side)
    fillR(ctx, tsx + 15, tsy + 3, 2, 6, '#808890');
    fillR(ctx, tsx + 16, tsy + 4, 1, 3, '#606870');
    // Crumb tray
    fillR(ctx, tsx + 1, tsy + 13, 14, 2, '#a0a8b0');
    fillR(ctx, tsx + 2, tsy + 14, 12, 1, '#909098');

    // ── Knife Block ──
    const kbx = kx + T * 3 + 8,
      kby = ky - 18;
    // Wooden block body
    fillR(ctx, kbx, kby + 4, 10, 14, '#6a4020');
    fillR(ctx, kbx + 1, kby + 5, 8, 12, '#7a4c28');
    fillR(ctx, kbx + 1, kby + 4, 8, 1, '#805530'); // top highlight
    // Knife handles sticking out
    fillR(ctx, kbx + 2, kby, 2, 6, '#303030'); // black handle
    fillR(ctx, kbx + 4, kby + 1, 2, 5, '#8b2020'); // red handle
    fillR(ctx, kbx + 6, kby + 2, 2, 4, '#204080'); // blue handle
    fillR(ctx, kbx + 8, kby + 1, 1, 5, '#c0c8d0'); // blade glint
    // Blade tips visible
    fillR(ctx, kbx + 2, kby - 1, 1, 2, '#c0c8d0');
    fillR(ctx, kbx + 4, kby, 1, 2, '#c0c8d0');
    fillR(ctx, kbx + 6, kby + 1, 1, 2, '#c0c8d0');

    // ── Cutting Board with food ──
    const cbx = kx + T * 4,
      cby = ky - 8;
    // Wooden board
    fillR(ctx, cbx, cby, 20, 10, '#c8a060');
    fillR(ctx, cbx + 1, cby + 1, 18, 8, '#d0a868');
    fillR(ctx, cbx, cby, 20, 1, '#d8b870'); // highlight
    // Board grain lines
    fillR(ctx, cbx + 5, cby + 2, 1, 6, '#b89850');
    fillR(ctx, cbx + 12, cby + 2, 1, 6, '#b89850');
    // Food pieces (chopped veggies)
    fillR(ctx, cbx + 3, cby + 3, 3, 2, '#e05030'); // tomato
    fillR(ctx, cbx + 7, cby + 4, 2, 2, '#40b040'); // lettuce
    fillR(ctx, cbx + 10, cby + 3, 3, 2, '#f0c020'); // cheese
    fillR(ctx, cbx + 14, cby + 4, 2, 2, '#e08030'); // carrot
    fillR(ctx, cbx + 14, cby + 2, 2, 2, '#40b040'); // more green

    // ── Sink (far end of counter) ──
    const snx = kx + T * 7,
      sny = ky - 4;
    // Basin (inset into counter)
    fillR(ctx, snx, sny, T * 1.5, 10, '#a09870'); // counter around
    fillR(ctx, snx + 3, sny + 2, T * 1.5 - 6, 7, '#606858'); // basin dark
    fillR(ctx, snx + 4, sny + 3, T * 1.5 - 8, 5, '#505848'); // basin inner
    fillR(ctx, snx + 5, sny + 4, T * 1.5 - 10, 3, '#485040'); // water dark
    // Chrome faucet - base
    fillR(ctx, snx + T - 2, sny - 2, 4, 4, '#b0b8c8');
    // Faucet curved pipe (going up then arching over)
    fillR(ctx, snx + T - 1, sny - 14, 3, 12, '#c0c8d8'); // vertical pipe
    fillR(ctx, snx + T - 1, sny - 15, 3, 2, '#d0d8e8'); // top highlight
    fillR(ctx, snx + T - 6, sny - 13, 6, 2, '#b0b8c8'); // horizontal arm
    fillR(ctx, snx + T - 7, sny - 13, 2, 3, '#a0a8b8'); // spout tip
    // Faucet handles
    fillR(ctx, snx + T - 5, sny - 3, 3, 2, '#d04040'); // hot
    fillR(ctx, snx + T + 3, sny - 3, 3, 2, '#4040d0'); // cold

    // Fridge (tall, silver)
    const [_frATx, _frATy] = getAdminPos('fridge', kitIntX + 8, KITCHEN_START_ROW);
    const [frx, fry] = ts(_frATx, _frATy);
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 6;
    fillR(ctx, frx + 2, fry, 24, T * 1.5, '#d0d8e8');
    ctx.restore();
    fillR(ctx, frx + 3, fry + 1, 22, T * 0.55, '#e0e8f4'); // freezer
    fillR(ctx, frx + 3, fry + T * 0.55 + 1, 22, T * 0.9, '#e8f0f8'); // main
    fillR(ctx, frx + 6, fry + T * 0.55, 12, 2, '#b0b8c8'); // divider
    fillR(ctx, frx + 24, fry + 5, 2, 9, '#a0a8b8'); // freezer handle
    fillR(ctx, frx + 24, fry + T * 0.6, 2, 10, '#a0a8b8'); // main handle
    fillR(ctx, frx + 4, fry + 8, 7, 2, '#80b8e0');

    // Dining table in middle of kitchen (vertical orientation)
    const [tbx, tby] = ts(...getAdminPos('kitchen_table', kitIntX + 2, KITCHEN_START_ROW + 1));
    const tbW = T * 4,
      tbH = T * 3;
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    fillR(ctx, tbx, tby, tbW, tbH, '#a09060');
    ctx.restore();
    fillR(ctx, tbx, tby, tbW, 3, '#c4b488'); // table top highlight
    fillR(ctx, tbx + 2, tby + 2, tbW - 4, tbH - 4, '#b8a470'); // table surface
    // 4 legs
    fillR(ctx, tbx + 3, tby + tbH, 5, T * 0.3, '#7a6030');
    fillR(ctx, tbx + tbW - 8, tby + tbH, 5, T * 0.3, '#7a6030');
    // Plates around table
    const plates = [
      [tbx + T * 0.6, tby + T * 0.5],
      [tbx + tbW - T * 0.6, tby + T * 0.5],
      [tbx + T * 0.6, tby + tbH - T * 0.5],
      [tbx + tbW - T * 0.6, tby + tbH - T * 0.5],
    ];
    for (const [ppx, ppy] of plates) {
      ctx.fillStyle = '#e8e0d0';
      ctx.beginPath();
      ctx.ellipse(ppx, ppy, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d0c8b0';
      ctx.beginPath();
      ctx.ellipse(ppx, ppy, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fruit vase in center
    const vx = tbx + tbW / 2,
      vy = tby + tbH / 2;
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(vx - 8, vy + 4);
    ctx.lineTo(vx - 10, vy - 4);
    ctx.quadraticCurveTo(vx, vy - 10, vx + 10, vy - 4);
    ctx.lineTo(vx + 8, vy + 4);
    ctx.quadraticCurveTo(vx, vy + 6, vx - 8, vy + 4);
    ctx.fill();
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.ellipse(vx, vy - 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fruits
    ctx.fillStyle = '#cc2233';
    ctx.beginPath();
    ctx.arc(vx - 4, vy - 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx + 3, vy - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8922e';
    ctx.beginPath();
    ctx.arc(vx + 5, vy - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx - 6, vy - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a2d8e';
    for (const gp of [
      [vx, vy - 11],
      [vx - 1.5, vy - 10],
      [vx + 1.5, vy - 10],
      [vx, vy - 9],
    ]) {
      ctx.beginPath();
      ctx.arc(gp[0], gp[1], 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Green leaf on top
    ctx.fillStyle = '#3a9040';
    ctx.beginPath();
    ctx.ellipse(vx + 1, vy - 14, 3, 1.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ═══ ROOM WALLS WITH DOORS ═══════════════════════════════════
  // Helper: draw a horizontal wall segment with optional door
  function drawHWall(y, x1, x2, doorStart, doorEnd) {
    for (let c = x1; c <= x2; c++) {
      const wx = OX + c * T,
        wy = OY + y * T;
      const inDoor = doorStart !== undefined && c >= doorStart && c <= doorEnd;
      if (inDoor) {
        // Door opening — lighter floor
        fillR(ctx, wx, wy, T, T, '#d0caba');
        // Door frame edges
        if (c === doorStart) fillR(ctx, wx - 2, wy, 4, T, '#6a5090');
        if (c === doorEnd) fillR(ctx, wx + T - 2, wy, 4, T, '#6a5090');
      } else {
        fillR(ctx, wx, wy, T, T, '#252344');
        fillR(ctx, wx, wy, T, 4, '#3a3860'); // top highlight
        fillR(ctx, wx, wy + T - 2, T, 2, '#1e1c38'); // bottom shadow
      }
    }
  }

  // Helper: draw a vertical wall segment with optional door
  function drawVWall(x, y1, y2, doorStart, doorEnd) {
    for (let r = y1; r <= y2; r++) {
      const wx = OX + x * T,
        wy = OY + r * T;
      const inDoor = doorStart !== undefined && r >= doorStart && r <= doorEnd;
      if (inDoor) {
        fillR(ctx, wx, wy, T, T, '#d0caba');
        if (r === doorStart) fillR(ctx, wx, wy - 2, T, 4, '#6a5090');
        if (r === doorEnd) fillR(ctx, wx, wy + T - 2, T, 4, '#6a5090');
      } else {
        fillR(ctx, wx, wy, T, T, '#252344');
        fillR(ctx, wx, wy, 4, T, '#1e1c38'); // left shadow
        fillR(ctx, wx + T - 4, wy, 4, T, '#3a3860'); // right highlight
      }
    }
  }

  // ── Lounge wall (horizontal, row 21, door in center) ──
  drawHWall(21, 1, COLS - 2, Math.floor(COLS * 0.3), Math.floor(COLS * 0.5));

  // ── Activity zone wall (horizontal, row 35, wide door) ──
  drawHWall(35, 1, COLS - 2, Math.floor(COLS * 0.35), Math.floor(COLS * 0.65));

  // ── Gym/Gaming divider (vertical, col 17, rows 35-44, door at 39-41) ──
  drawVWall(17, 36, 44, 39, 41);

  // ── Sports/Social divider (vertical, col 17, rows 46-54, door at 49-51) ──
  drawVWall(17, 46, 54, 49, 51);

  // ── Sports wall (horizontal, row 45, door in center) ──
  drawHWall(45, 1, COLS - 2, Math.floor(COLS * 0.35), Math.floor(COLS * 0.65));

  // ── Room labels (small, subtle) ──
  ctx.fillStyle = '#4a4870';
  ctx.font = "5px 'Press Start 2P',monospace";
  const roomLabels = [
    [2, 21.5, 'LOUNGE'],
    [2, 35.5, 'GYM'],
    [19, 35.5, 'GAMING'],
    [2, 45.5, 'SPORTS'],
    [19, 45.5, 'SOCIAL'],
  ];
  for (const [lx, ly, label] of roomLabels) {
    const [rlx, rly] = ts(lx, ly);
    ctx.fillText(label, rlx, rly + T / 2);
  }

  // Nameplate
  const npX = OX + Math.floor((COLS - 10) / 2) * T,
    npY = OY + 6;
  fillR(ctx, npX, npY, 10 * T, 20, '#2a2848');
  fillR(ctx, npX + 2, npY, 10 * T - 4, 18, '#1e1c38');
  ctx.fillStyle = '#7aa2f7';
  ctx.font = "bold 9px 'Press Start 2P',monospace";
  ctx.textAlign = 'center';
  ctx.fillText('AGENT OFFICE', OX + (COLS / 2) * T, npY + 14);
  ctx.textAlign = 'left';

  // ── Printer (right side, before kitchen wall) ─────────────────────
  if (KITCHEN_WALL_COL > 0 && KITCHEN_START_ROW > 0) {
    const [_prTx, _prTy] = getAdminPos('printer', KITCHEN_WALL_COL - 3, KITCHEN_START_ROW - 2);
    const [prx, pry] = ts(_prTx, _prTy);
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 6;
    fillR(ctx, prx + 2, pry + 4, T * 1.6, T * 0.9, '#c0c0cc');
    ctx.restore();
    fillR(ctx, prx + 4, pry + 6, T * 1.6 - 4, T * 0.9 - 4, '#d0d0dc');
    // Paper slot (dark groove)
    fillR(ctx, prx + 8, pry + 8, T * 1.6 - 12, 3, '#808090');
    // Status light
    ctx.fillStyle = '#9ece6a';
    ctx.beginPath();
    ctx.arc(prx + T * 1.6 - 4, pry + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    // Brand strip
    fillR(ctx, prx + 4, pry + 6, T * 1.6 - 4, 5, '#a0a0b0');
    // Output tray
    fillR(ctx, prx + 4, pry + T * 0.9 + 2, T * 1.6 - 4, 4, '#b0b0bc');
  }

  // ── Vending Machine (inside kitchen area) ────────────────────────
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    const [_vmTx, _vmTy] = getAdminPos('vending', KITCHEN_WALL_COL + 1, ACT_ZONE_Y - 2);
    const [vmx, vmy] = ts(_vmTx, _vmTy);
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 8;
    fillR(ctx, vmx, vmy, T * 1.5, T * 2.2, '#282840');
    ctx.restore();
    fillR(ctx, vmx + 2, vmy + 2, T * 1.5 - 4, T * 2.2 - 4, '#30304a');
    fillR(ctx, vmx + 4, vmy + 6, T * 1.5 - 8, T * 1.4, '#101828');
    const vmColors = ['#e0a030', '#c04040', '#40a060', '#8040c0', '#2ac3de', '#f7768e'];
    for (let r = 0; r < 3; r++)
      for (let c2 = 0; c2 < 3; c2++) {
        fillR(ctx, vmx + 6 + c2 * 12, vmy + 8 + r * 14, 10, 11, vmColors[(r * 3 + c2) % 6]);
        fillR(ctx, vmx + 7 + c2 * 12, vmy + 9 + r * 14, 4, 3, '#ffffff30');
      }
    fillR(ctx, vmx + 4, vmy + T * 1.4 + 8, 8, 3, '#404058');
    fillR(ctx, vmx + 14, vmy + T * 1.4 + 6, T * 1.5 - 18, 8, '#0a1828');
    fillR(ctx, vmx + 15, vmy + T * 1.4 + 7, T * 1.5 - 20, 6, SCREEN_C);
    fillR(ctx, vmx + 4, vmy + T * 2.2 - 8, T * 1.5 - 8, 6, '#1a1830');
  }

  // ── Conference Table (social zone below gym) ─────────────────────
  if (ACT_ZONE_Y > 0) {
    const [_cfTx, _cfTy] = getAdminPos('conf_table', 5, 35);
    const [cfx, cfy] = ts(_cfTx, _cfTy);
    const ctW = T * 6,
      ctH = T * 2;
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    // Oval table
    ctx.fillStyle = '#5a3c18';
    ctx.beginPath();
    ctx.ellipse(cfx + ctW / 2, cfy + ctH / 2, ctW / 2, ctH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#6a4820';
    ctx.beginPath();
    ctx.ellipse(cfx + ctW / 2, cfy + ctH / 2, ctW / 2 - 3, ctH / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wood grain
    ctx.strokeStyle = '#5a3c1840';
    ctx.lineWidth = 1;
    for (let g = 0; g < 4; g++) {
      ctx.beginPath();
      ctx.ellipse(
        cfx + ctW / 2,
        cfy + ctH / 2,
        ctW / 2 - 6 - g * 6,
        ctH / 2 - 4 - g * 4,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    // Chairs around table (north and south)
    const chairCol = CHAIR_C;
    for (let i = 0; i < 4; i++) {
      const chx = cfx + T * 0.7 + i * T * 1.3;
      // North chairs
      fillR(ctx, chx, cfy - T * 0.5, T * 0.8, T * 0.5, chairCol);
      fillR(ctx, chx + 2, cfy - T * 0.5 + 2, T * 0.8 - 4, T * 0.5 - 4, CHAIR_SEAT);
      // South chairs
      fillR(ctx, chx, cfy + ctH + 4, T * 0.8, T * 0.5, chairCol);
      fillR(ctx, chx + 2, cfy + ctH + 6, T * 0.8 - 4, T * 0.5 - 4, CHAIR_SEAT);
    }
  }

  // ── Trash Can (static body drawn on background) ───────────────────
  {
    const [_trTx, _trTy] = getAdminPos('trashcan', KITCHEN_WALL_COL - 2, 3);
    const [tcx, tcy] = ts(_trTx, _trTy);
    const cx2 = tcx + T / 2,
      cy2 = tcy + T * 0.5;
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.moveTo(cx2 - 8, cy2 + 14);
    ctx.lineTo(cx2 + 8, cy2 + 14);
    ctx.lineTo(cx2 + 6, cy2 - 8);
    ctx.lineTo(cx2 - 6, cy2 - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#505060';
    ctx.fillRect((cx2 - 8) | 0, (cy2 - 10) | 0, 16, 3);
    ctx.fillStyle = '#606070';
    ctx.fillRect((cx2 - 6) | 0, (cy2 - 10) | 0, 3, 22);
    ctx.fillRect((cx2 + 3) | 0, (cy2 - 10) | 0, 3, 22);
  }

  // ════ RIGHT ENTERTAINMENT ZONE ══════════════════════════════════
  {
    const rX = PER_ROW * STEP_X + 2;

    // ── 1. Water Cooler ─────────────────────────────────────────
    const [_coolerTx, _coolerTy] = getAdminPos('cooler', rX + 2.5, 2);
    const [wcx, wcy] = ts(_coolerTx, _coolerTy);
    // Cooler body
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 8;
    fillR(ctx, wcx, wcy, T * 1.5, T * 2, '#d0d8e0');
    ctx.restore();
    fillR(ctx, wcx + 3, wcy + 3, T * 1.5 - 6, T * 0.7, '#80c0e8'); // water tank
    fillR(ctx, wcx + 3, wcy + T * 0.7 + 3, T * 1.5 - 6, T * 1.3 - 6, '#e8ecf0'); // body
    fillR(ctx, wcx + T * 0.75 - 4, wcy + T * 0.8, 8, 5, '#707880'); // tap
    ctx.fillStyle = '#4488dd';
    ctx.fillRect(wcx + 6, wcy + T * 0.9 + 4, 7, 4);
    ctx.fillStyle = '#dd4444';
    ctx.fillRect(wcx + T * 1.5 - 13, wcy + T * 0.9 + 4, 7, 4);
    // Water jug
    ctx.fillStyle = '#70b8e880';
    ctx.beginPath();
    ctx.ellipse(wcx + T * 0.75, wcy - 2, 12, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#5090b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(wcx + T * 0.75, wcy - 2, 12, 14, 0, Math.PI, 0);
    ctx.stroke();
    // Drip tray
    fillR(ctx, wcx + 4, wcy + T * 2 - 5, T * 1.5 - 8, 4, '#a0a8b0');

    // ── 3. Aquarium (right zone, row 8) ─────────────────────────
    const [_aqTx, _aqTy] = getAdminPos('aquarium', rX + 0.3, 8);
    const [aqx, aqy] = ts(_aqTx, _aqTy);
    const aqW = T * 2.5,
      aqH = T * 1.8;
    // Stand/legs
    fillR(ctx, aqx + 4, aqy + aqH, 6, 8, '#404050');
    fillR(ctx, aqx + aqW - 10, aqy + aqH, 6, 8, '#404050');
    fillR(ctx, aqx, aqy + aqH, aqW, 3, '#505060'); // base
    // Tank frame
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 6;
    fillR(ctx, aqx, aqy, aqW, aqH, '#1a3a50');
    ctx.restore();
    // Glass
    fillR(ctx, aqx + 3, aqy + 3, aqW - 6, aqH - 6, '#1a4a6880');
    // Water
    fillR(ctx, aqx + 3, aqy + 8, aqW - 6, aqH - 11, '#1860a040');
    // Sand at bottom
    fillR(ctx, aqx + 3, aqy + aqH - 10, aqW - 6, 7, '#c8b07030');
    // Pebbles
    ctx.fillStyle = '#908060';
    [6, 14, 22, 30, 38, 48, 56].forEach((px) => {
      ctx.beginPath();
      ctx.ellipse(aqx + (px % aqW) + 4, aqy + aqH - 6, 2 + (px % 3), 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // Seaweed
    ctx.strokeStyle = '#2a8040';
    ctx.lineWidth = 2;
    [8, 20, 50].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(aqx + sx, aqy + aqH - 8);
      ctx.quadraticCurveTo(aqx + sx - 4, aqy + aqH - 22, aqx + sx + 2, aqy + aqH - 30);
      ctx.stroke();
    });
    // Glass reflection
    ctx.fillStyle = '#ffffff18';
    fillR(ctx, aqx + 5, aqy + 5, 4, aqH - 14);
    // Frame top rim
    fillR(ctx, aqx - 1, aqy - 2, aqW + 2, 4, '#606070');

    // ── 2. Dartboard (ON the top wall — row 0) ──────────────────
    // Visual centered on middle of click hitbox (tx+1, ty+0.5) for pixel-perfect clicks
    const [_dartTx, _dartTy] = getAdminPos('darts', rX + 1.5, 0);
    const dartWallX = OX + (_dartTx + 1) * T;
    const dartWallY = OY + (_dartTy + 0.5) * T;
    const DR = 13;
    // Wooden backing
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 4;
    fillR(ctx, dartWallX - DR - 3, dartWallY - DR - 3, DR * 2 + 6, DR * 2 + 6, '#4a3018');
    ctx.restore();
    // Board circle
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(dartWallX, dartWallY, DR, 0, Math.PI * 2);
    ctx.fill();
    // Rings
    const rings = [
      [DR - 1, '#1a6030'],
      [DR - 3, '#cc2020'],
      [DR - 5, '#e8d870'],
      [DR - 7, '#1a6030'],
      [DR - 9, '#cc2020'],
      [4, '#e8d870'],
      [2, '#cc2020'],
    ];
    for (const [r, c] of rings) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(dartWallX, dartWallY, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wires
    ctx.strokeStyle = '#c0c0c040';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(dartWallX - DR, dartWallY);
    ctx.lineTo(dartWallX + DR, dartWallY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dartWallX, dartWallY - DR);
    ctx.lineTo(dartWallX, dartWallY + DR);
    ctx.stroke();
    // Bullseye
    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath();
    ctx.arc(dartWallX, dartWallY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Social zone entertainment objects ─────────────────────────
  if (ACT_ZONE_Y > 0) {
    // ── Arcade Machine (recreation, col 16) ────────────────────
    const [_arcTx, _arcTy] = getAdminPos('arcade', 16, ACT_ZONE_Y + 9);
    const [arcx, arcy] = ts(_arcTx, _arcTy);
    const arcW = T * 2,
      arcH = T * 2.5;
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 8;
    fillR(ctx, arcx, arcy, arcW, arcH, '#1a1a30');
    ctx.restore();
    fillR(ctx, arcx + 2, arcy + 2, arcW - 4, 12, '#c02040');
    ctx.fillStyle = '#ffcc00';
    ctx.font = "5px 'Press Start 2P',monospace";
    ctx.textAlign = 'center';
    ctx.fillText('ARCADE', arcx + arcW / 2, arcy + 10);
    ctx.textAlign = 'left';
    const marqueeCols = ['#ff0', '#0ff', '#f0f', '#0f0', '#ff0', '#0ff'];
    for (let li = 0; li < 6; li++) {
      ctx.fillStyle = marqueeCols[li];
      ctx.beginPath();
      ctx.arc(arcx + 6 + li * 9, arcy + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    fillR(ctx, arcx + 4, arcy + 16, arcW - 8, arcH * 0.4, '#0a1828');
    fillR(ctx, arcx + 6, arcy + 18, arcW - 12, arcH * 0.4 - 4, '#102838');
    fillR(ctx, arcx + 10, arcy + 22, 6, 6, '#f7768e');
    fillR(ctx, arcx + arcW - 18, arcy + 24, 6, 6, '#9ece6a');
    fillR(ctx, arcx + 4, arcy + arcH * 0.65, arcW - 8, 14, '#282840');
    fillR(ctx, arcx + 10, arcy + arcH * 0.65 + 2, 4, 8, '#808090');
    ctx.fillStyle = '#c04040';
    ctx.beginPath();
    ctx.arc(arcx + 12, arcy + arcH * 0.65 + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e04040';
    ctx.beginPath();
    ctx.arc(arcx + arcW - 16, arcy + arcH * 0.65 + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#40a0e0';
    ctx.beginPath();
    ctx.arc(arcx + arcW - 8, arcy + arcH * 0.65 + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    fillR(ctx, arcx + arcW / 2 - 3, arcy + arcH - 10, 6, 3, '#404058');

    // ── Server Rack (makers lab, col 2) ─────────────────────────
    const [_srvTx, _srvTy] = getAdminPos('server_rack', 2, ACT_ZONE_Y + 14);
    const [srvx, srvy] = ts(_srvTx, _srvTy);
    const srvW = T * 2,
      srvH = T * 2.2;
    ctx.save();
    ctx.shadowColor = '#00000080';
    ctx.shadowBlur = 8;
    fillR(ctx, srvx, srvy, srvW, srvH, '#101018');
    ctx.restore();
    fillR(ctx, srvx + 2, srvy + 2, srvW - 4, srvH - 4, '#181820');
    for (let ru = 0; ru < 5; ru++) {
      const ruy = srvy + 6 + (ru * (srvH - 12)) / 5;
      fillR(ctx, srvx + 4, ruy, srvW - 8, (srvH - 20) / 5, '#202030');
      fillR(ctx, srvx + 5, ruy + 1, srvW - 10, 2, '#282838');
      const ledCols = ['#40e040', '#4080ff', '#e0a020', '#40e040', '#4080ff'];
      for (let li = 0; li < 4; li++) {
        ctx.fillStyle = ledCols[(ru + li) % 5];
        ctx.beginPath();
        ctx.arc(srvx + 8 + li * 8, ruy + 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    fillR(ctx, srvx + 4, srvy + srvH - 8, srvW - 8, 6, '#0a0a12');
    ctx.strokeStyle = '#303040';
    ctx.lineWidth = 1;
    for (let ci = 0; ci < 3; ci++) {
      ctx.beginPath();
      ctx.moveTo(srvx + 8 + ci * 10, srvy + srvH - 6);
      ctx.quadraticCurveTo(
        srvx + 8 + ci * 10 + 5,
        srvy + srvH + 4,
        srvx + 12 + ci * 10,
        srvy + srvH - 2
      );
      ctx.stroke();
    }

    // ── 3D Printer (makers lab, col 7) ──────────────────────────
    const [_p3Tx, _p3Ty] = getAdminPos('printer_3d', 7, ACT_ZONE_Y + 14);
    const [p3x, p3y] = ts(_p3Tx, _p3Ty);
    const p3W = T * 2,
      p3H = T * 1.8;
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    fillR(ctx, p3x, p3y, p3W, p3H, '#303040');
    ctx.restore();
    fillR(ctx, p3x + 3, p3y + 3, p3W - 6, p3H - 6, '#40405060');
    fillR(ctx, p3x, p3y, 4, p3H, '#303040');
    fillR(ctx, p3x + p3W - 4, p3y, 4, p3H, '#303040');
    fillR(ctx, p3x, p3y, p3W, 4, '#303040');
    fillR(ctx, p3x, p3y + p3H - 4, p3W, 4, '#303040');
    fillR(ctx, p3x + 6, p3y + p3H - 12, p3W - 12, 6, '#505060');
    fillR(ctx, p3x + 8, p3y + p3H - 14, p3W - 16, 2, '#606070');
    fillR(ctx, p3x + 6, p3y + 6, p3W - 12, 3, '#404050');
    fillR(ctx, p3x + p3W / 2 - 3, p3y + 6, 6, 10, '#606070');
    fillR(ctx, p3x + p3W / 2 - 1, p3y + 16, 2, 4, '#808090');
    fillR(ctx, p3x + p3W / 2 - 4, p3y + p3H - 18, 8, 6, '#9ece6a');
    fillR(ctx, p3x + p3W / 2 - 2, p3y + p3H - 22, 4, 4, '#7aa2f7');

    // ── Basketball Hoop (recreation, col 12) ───────────────────
    const [_bbTx, _bbTy] = getAdminPos('basketball', 12, ACT_ZONE_Y + 9);
    const [bbx, bby] = ts(_bbTx, _bbTy);
    fillR(ctx, bbx + T - 2, bby + T * 0.4, 4, T * 1.8, '#606070');
    fillR(ctx, bbx + 4, bby, T * 1.8, T * 1.0, '#e8e0d0');
    fillR(ctx, bbx + 6, bby + 2, T * 1.8 - 4, T * 1.0 - 4, '#d8d0c0');
    ctx.strokeStyle = '#c04020';
    ctx.lineWidth = 2;
    ctx.strokeRect(bbx + T * 0.6, bby + T * 0.2, T * 0.6, T * 0.5);
    ctx.strokeStyle = '#e06020';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(bbx + T * 0.9, bby + T * 1.0 + 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff80';
    ctx.lineWidth = 0.8;
    for (let ni = 0; ni < 5; ni++) {
      const nx = bbx + T * 0.9 - 6 + ni * 3;
      ctx.beginPath();
      ctx.moveTo(nx, bby + T * 1.0 + 4);
      ctx.quadraticCurveTo(nx + (ni - 2) * 0.5, bby + T * 1.3, bbx + T * 0.9, bby + T * 1.5);
      ctx.stroke();
    }

    // ── Foosball Table (recreation, col 8) ──────────────────────
    const [_fbTx, _fbTy] = getAdminPos('foosball', 8, ACT_ZONE_Y + 9);
    const [fbx, fby] = ts(_fbTx, _fbTy);
    const fbW = T * 3,
      fbH = T * 1.5;
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 6;
    fillR(ctx, fbx, fby, fbW, fbH, '#1a5030');
    ctx.restore();
    fillR(ctx, fbx + 2, fby + 2, fbW - 4, fbH - 4, '#206038');
    fillR(ctx, fbx, fby, fbW, 3, '#2a6840');
    fillR(ctx, fbx, fby + fbH - 3, fbW, 3, '#103020');
    fillR(ctx, fbx, fby, 3, fbH, '#2a6840');
    fillR(ctx, fbx + fbW - 3, fby, 3, fbH, '#103020');
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    for (let ri = 0; ri < 4; ri++) {
      const ry = fby + 8 + (ri * (fbH - 16)) / 3;
      ctx.beginPath();
      ctx.moveTo(fbx - 4, ry);
      ctx.lineTo(fbx + fbW + 4, ry);
      ctx.stroke();
      const playerCount = ri % 2 === 0 ? 3 : 2;
      const teamCol = ri < 2 ? '#e04040' : '#4040e0';
      for (let pi = 0; pi < playerCount; pi++) {
        const px = fbx + 10 + (pi * (fbW - 20)) / playerCount;
        fillR(ctx, px, ry - 4, 6, 8, teamCol);
        fillR(ctx, px + 1, ry - 6, 4, 3, '#f5c2a0');
      }
    }
    fillR(ctx, fbx - 2, fby + fbH * 0.3, 4, fbH * 0.4, '#404050');
    fillR(ctx, fbx + fbW - 2, fby + fbH * 0.3, 4, fbH * 0.4, '#404050');
    fillR(ctx, fbx + 4, fby + fbH, 4, 8, '#1a3020');
    fillR(ctx, fbx + fbW - 8, fby + fbH, 4, 8, '#1a3020');

    // ── DJ Console (recreation, col 20) ─────────────────────────
    const [_djTx, _djTy] = getAdminPos('dj_console', 20, ACT_ZONE_Y + 9);
    const [djx, djy] = ts(_djTx, _djTy);
    const djW = T * 2.5,
      djH = T * 1.2;
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    fillR(ctx, djx, djy, djW, djH, '#1a1a2a');
    ctx.restore();
    fillR(ctx, djx + 2, djy + 2, djW - 4, djH - 4, '#222234');
    ctx.fillStyle = '#303040';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a28';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#303040';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a28';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    fillR(ctx, djx + djW * 0.38, djy + 4, djW * 0.24, djH - 8, '#2a2a3c');
    fillR(ctx, djx + djW * 0.42, djy + 8, 3, djH - 16, '#505060');
    fillR(ctx, djx + djW * 0.52, djy + 10, 3, djH - 20, '#505060');
    ctx.fillStyle = '#7080a0';
    ctx.beginPath();
    ctx.arc(djx + djW * 0.43, djy + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(djx + djW * 0.53, djy + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#606070';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(djx - 4, djy + djH * 0.3, 6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.ellipse(djx - 4, djy + djH * 0.3 - 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(djx - 4, djy + djH * 0.3 + 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Telescope (makers lab, col 23) ──────────────────────────
    const [_telTx, _telTy] = getAdminPos('telescope', 18, ACT_ZONE_Y + 14);
    const [telx, tely] = ts(_telTx, _telTy);
    ctx.strokeStyle = '#606070';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(telx + T * 0.5, tely + T * 0.6);
    ctx.lineTo(telx + 2, tely + T * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(telx + T * 0.5, tely + T * 0.6);
    ctx.lineTo(telx + T - 2, tely + T * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(telx + T * 0.5, tely + T * 0.6);
    ctx.lineTo(telx + T * 0.5 + 8, tely + T * 1.5);
    ctx.stroke();
    ctx.save();
    ctx.translate(telx + T * 0.5, tely + T * 0.5);
    ctx.rotate(-Math.PI * 0.25);
    fillR(ctx, -16, -4, 32, 8, '#404050');
    fillR(ctx, 14, -5, 6, 10, '#505060');
    fillR(ctx, -18, -3, 4, 6, '#505060');
    ctx.restore();
    ctx.fillStyle = '#303040';
    ctx.beginPath();
    ctx.arc(telx + T * 0.5 - 12, tely + T * 0.5 + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ════ Activity zone ═══════════════════════════════════════════
  if (ACT_ZONE_Y > 0) {
    // Zone divider wall (lounge → activity) with door opening in center
    const [zx, zy] = ts(1, ACT_ZONE_Y);
    const zoneW = (COLS - 2) * T;
    const doorStart = Math.floor(zoneW * 0.35),
      doorEnd = Math.floor(zoneW * 0.65);
    // Left wall segment (thin floor divider)
    fillR(ctx, zx, zy + Math.floor(T / 2) - 2, doorStart, 5, '#252344');
    fillR(ctx, zx, zy + Math.floor(T / 2) - 2, doorStart, 2, '#3a3860');
    // Right wall segment (thin floor divider)
    fillR(ctx, zx + doorEnd, zy + Math.floor(T / 2) - 2, zoneW - doorEnd, 5, '#252344');
    fillR(ctx, zx + doorEnd, zy + Math.floor(T / 2) - 2, zoneW - doorEnd, 2, '#3a3860');

    // ── GYM (left side) ──────────────────────────────────────────
    const [_gymTx, _gymTy] = getAdminPos('gym', 1, ACT_ZONE_Y + 0.5);
    const [gx, gy] = ts(_gymTx, _gymTy);

    // Treadmill 1
    const [t1x, t1y] = ts(_gymTx, _gymTy + 0.3);
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 5;
    fillR(ctx, t1x + 2, t1y + 8, T * 1.2, T * 0.7, '#282840');
    ctx.restore();
    fillR(ctx, t1x + 4, t1y + 10, T * 1.2 - 4, T * 0.35, '#1a1a2e');
    fillR(ctx, t1x + 4, t1y + 10, T * 1.2 - 4, T * 0.35, '#3a3060'); // belt tint
    fillR(ctx, t1x + 2, t1y + 6, 8, 4, '#404058'); // control panel
    fillR(ctx, t1x + 3, t1y + 7, 6, 2, SCREEN_C);
    fillR(ctx, t1x + 4, t1y + 7, 2, 1, '#9ece6a');
    // legs/frame
    fillR(ctx, t1x + 4, t1y + T * 0.7 + 10, 4, 8, '#1e1e30');
    fillR(ctx, t1x + T * 1.2, t1y + T * 0.7 + 10, 4, 8, '#1e1e30');

    // Treadmill 2
    const [t2x, t2y] = ts(_gymTx + 3, _gymTy + 0.3);
    fillR(ctx, t2x + 2, t2y + 8, T * 1.2, T * 0.7, '#282840');
    fillR(ctx, t2x + 4, t2y + 10, T * 1.2 - 4, T * 0.35, '#3a3060');
    fillR(ctx, t2x + 2, t2y + 6, 8, 4, '#404058');
    fillR(ctx, t2x + 3, t2y + 7, 6, 2, SCREEN_C);
    fillR(ctx, t2x + 4, t2y + 7, 2, 1, '#7aa2f7');
    fillR(ctx, t2x + 4, t2y + T * 0.7 + 10, 4, 8, '#1e1e30');
    fillR(ctx, t2x + T * 1.2, t2y + T * 0.7 + 10, 4, 8, '#1e1e30');

    // ── Dumbbell Rack (below treadmill 1) ──
    const [drx, dry] = ts(_gymTx, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    // Rack frame
    fillR(ctx, drx, dry, T * 2, T * 0.8, '#3a3020');
    ctx.restore();
    fillR(ctx, drx + 2, dry + 2, T * 2 - 4, T * 0.8 - 4, '#4a4030');
    // Shelf divider
    fillR(ctx, drx + 2, dry + Math.floor(T * 0.4), T * 2 - 4, 2, '#5a5040');
    // Top shelf dumbbells (3)
    // Dumbbell 1 (small, iron)
    fillR(ctx, drx + 6, dry + 6, 4, 4, '#404050');
    fillR(ctx, drx + 4, dry + 7, 2, 2, '#404050');
    fillR(ctx, drx + 12, dry + 7, 2, 2, '#404050');
    // Dumbbell 2 (medium, chrome)
    fillR(ctx, drx + 20, dry + 5, 6, 4, '#606070');
    fillR(ctx, drx + 17, dry + 6, 3, 3, '#606070');
    fillR(ctx, drx + 26, dry + 6, 3, 3, '#606070');
    // Dumbbell 3 (small, dark)
    fillR(ctx, drx + 36, dry + 6, 4, 4, '#353545');
    fillR(ctx, drx + 34, dry + 7, 2, 2, '#353545');
    fillR(ctx, drx + 42, dry + 7, 2, 2, '#353545');
    // Bottom shelf dumbbells (3)
    const bsy = dry + Math.floor(T * 0.4) + 4;
    // Dumbbell 4 (big, iron)
    fillR(ctx, drx + 5, bsy + 2, 8, 4, '#404050');
    fillR(ctx, drx + 3, bsy + 1, 3, 5, '#505060');
    fillR(ctx, drx + 13, bsy + 1, 3, 5, '#505060');
    // Dumbbell 5 (big, chrome)
    fillR(ctx, drx + 22, bsy + 2, 8, 4, '#606070');
    fillR(ctx, drx + 20, bsy + 1, 3, 5, '#707080');
    fillR(ctx, drx + 30, bsy + 1, 3, 5, '#707080');
    // Dumbbell 6 (medium, dark)
    fillR(ctx, drx + 38, bsy + 2, 6, 4, '#353545');
    fillR(ctx, drx + 36, bsy + 1, 2, 5, '#454555');
    fillR(ctx, drx + 44, bsy + 1, 2, 5, '#454555');

    // ── Bench Press (below treadmill 2) ──
    const [bpx, bpy] = ts(_gymTx + 3, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    // Bench pad
    fillR(ctx, bpx + 8, bpy + 6, T * 1.4, T * 0.35, '#3a3040');
    ctx.restore();
    fillR(ctx, bpx + 10, bpy + 8, T * 1.4 - 4, T * 0.35 - 4, '#4a3858');
    // Bench legs
    fillR(ctx, bpx + 10, bpy + T * 0.35 + 6, 4, 6, '#2a2a3a');
    fillR(ctx, bpx + T * 1.4 + 2, bpy + T * 0.35 + 6, 4, 6, '#2a2a3a');
    // Uprights
    fillR(ctx, bpx + 4, bpy - 6, 3, 18, '#606070');
    fillR(ctx, bpx + T * 1.4 + 12, bpy - 6, 3, 18, '#606070');
    // Upright hooks
    fillR(ctx, bpx + 3, bpy - 2, 5, 2, '#707080');
    fillR(ctx, bpx + T * 1.4 + 11, bpy - 2, 5, 2, '#707080');
    // Barbell bar
    fillR(ctx, bpx, bpy, T * 1.8, 2, '#808090');
    // Weight plates (left)
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.ellipse(bpx + 3, bpy + 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#353545';
    ctx.beginPath();
    ctx.ellipse(bpx + 7, bpy + 1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Weight plates (right)
    ctx.fillStyle = '#404050';
    ctx.beginPath();
    ctx.ellipse(bpx + T * 1.8 - 3, bpy + 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#353545';
    ctx.beginPath();
    ctx.ellipse(bpx + T * 1.8 - 7, bpy + 1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Punching Bag (right of treadmills) ──
    const [pbx, pby] = ts(_gymTx + 6, _gymTy + 0.5);
    // Chain from ceiling
    ctx.strokeStyle = '#808090';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pbx + 10, pby - 16);
    ctx.lineTo(pbx + 10, pby);
    ctx.stroke();
    // Mounting bracket
    fillR(ctx, pbx + 6, pby - 16, 8, 3, '#505060');
    // Bag body
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#a03020';
    ctx.beginPath();
    ctx.ellipse(pbx + 10, pby + 16, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Bag highlight
    ctx.fillStyle = '#b8402e';
    ctx.beginPath();
    ctx.ellipse(pbx + 8, pby + 12, 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bag bottom cap
    fillR(ctx, pbx + 6, pby + 32, 8, 3, '#802818');
    // Shadow below
    ctx.fillStyle = '#00000030';
    ctx.beginPath();
    ctx.ellipse(pbx + 10, pby + 40, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Exercise Bike (right of bench press) ──
    const [ebx, eby] = ts(_gymTx + 6, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 5;
    // Bike frame base
    fillR(ctx, ebx + 2, eby + T * 0.8, T * 1.2, 4, '#303040');
    ctx.restore();
    // Front leg
    fillR(ctx, ebx + 2, eby + T * 0.8 + 4, 4, 8, '#303040');
    // Rear leg
    fillR(ctx, ebx + T * 1.2 - 2, eby + T * 0.8 + 4, 4, 8, '#303040');
    // Seat post
    fillR(ctx, ebx + T * 0.8, eby + T * 0.2, 3, T * 0.6, '#505060');
    // Seat
    fillR(ctx, ebx + T * 0.8 - 4, eby + T * 0.2 - 2, 12, 4, '#2a2a3a');
    fillR(ctx, ebx + T * 0.8 - 3, eby + T * 0.2 - 3, 10, 3, '#3a3a4a');
    // Handlebar post
    fillR(ctx, ebx + 6, eby + T * 0.1, 3, T * 0.7, '#505060');
    // Handlebars
    fillR(ctx, ebx + 2, eby + T * 0.1 - 2, 14, 3, '#606070');
    fillR(ctx, ebx + 2, eby + T * 0.1 - 2, 3, 6, '#606070');
    fillR(ctx, ebx + 13, eby + T * 0.1 - 2, 3, 6, '#606070');
    // Display panel
    fillR(ctx, ebx + 5, eby + T * 0.1 - 8, 8, 6, '#101828');
    fillR(ctx, ebx + 6, eby + T * 0.1 - 7, 6, 4, SCREEN_C);
    fillR(ctx, ebx + 7, eby + T * 0.1 - 6, 2, 1, '#7aa2f7');
    // Wheel
    ctx.strokeStyle = '#404050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ebx + 8, eby + T * 0.8 - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Pedals
    fillR(ctx, ebx + 4, eby + T * 0.8 - 4, 3, 3, '#505060');
    fillR(ctx, ebx + 11, eby + T * 0.8 - 4, 3, 3, '#505060');

    // ── Yoga Mat with Props (below dumbbells) ──
    const [ymx, ymy] = ts(_gymTx + 0.5, _gymTy + 4);
    ctx.save();
    ctx.shadowColor = '#00000040';
    ctx.shadowBlur = 4;
    // Mat
    fillR(ctx, ymx, ymy, T * 2.5, T * 0.5, '#2a6838');
    ctx.restore();
    // Mat border/edge highlight
    fillR(ctx, ymx, ymy, T * 2.5, 2, '#358045');
    fillR(ctx, ymx, ymy + T * 0.5 - 2, T * 2.5, 2, '#1e5528');
    // Texture lines on mat
    fillR(ctx, ymx + 8, ymy + 4, T * 2.5 - 16, 1, '#2e7040');
    fillR(ctx, ymx + 8, ymy + T * 0.25, T * 2.5 - 16, 1, '#2e7040');
    fillR(ctx, ymx + 8, ymy + T * 0.5 - 6, T * 2.5 - 16, 1, '#2e7040');
    // Yoga block (purple, on right end of mat)
    fillR(ctx, ymx + T * 2.5 - 14, ymy + 2, 10, T * 0.5 - 4, '#6a3088');
    fillR(ctx, ymx + T * 2.5 - 13, ymy + 3, 8, T * 0.5 - 6, '#7a40a0');
    // Water bottle (next to mat)
    fillR(ctx, ymx + T * 2.5 + 4, ymy + T * 0.25 - 8, 6, 16, '#4090c0');
    fillR(ctx, ymx + T * 2.5 + 5, ymy + T * 0.25 - 8, 4, 4, '#50a0d0');
    // Bottle cap
    fillR(ctx, ymx + T * 2.5 + 5, ymy + T * 0.25 - 10, 4, 3, '#305870');

    // ── GAMING/TV ZONE (center) ──────────────────────────────────
    const [_tvATx, _tvATy] = getAdminPos('tv', 10, ACT_ZONE_Y + 0.3);
    const [tvx, tvy] = ts(_tvATx, _tvATy);

    // Big TV (wall-mounted look)
    ctx.save();
    ctx.shadowColor = '#0050ff30';
    ctx.shadowBlur = 20;
    fillR(ctx, tvx, tvy, T * 4, T * 2.5, '#0a0a18');
    ctx.restore();
    fillR(ctx, tvx + 4, tvy + 4, T * 4 - 8, T * 2.5 - 8, SCREEN_C);
    // TV screen content (colorful game)
    fillR(ctx, tvx + 6, tvy + 6, T * 4 - 14, 8, '#0d1a3a'); // sky
    fillR(ctx, tvx + 6, tvy + T * 2.5 - 14, T * 4 - 14, 8, '#1a3a10'); // ground
    // pixel character on screen
    fillR(ctx, tvx + 12, tvy + 10, 6, 8, '#f7768e'); // game char
    fillR(ctx, tvx + 13, tvy + 8, 4, 4, '#f5c2a0'); // head
    // score
    ctx.fillStyle = '#9ece6a';
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.fillText('SCORE:9999', tvx + T * 2 + 4, tvy + 10);
    // TV stand
    fillR(ctx, tvx + T * 2 - 4, tvy + T * 2.5, 8, 6, '#181828');
    fillR(ctx, tvx + T * 2 - 10, tvy + T * 2.5 + 6, 20, 4, '#1e1e30');

    // Console unit (relative to TV position)
    const [cx2, cy2] = ts(_tvATx + 1, _tvATy + 2.7);
    fillR(ctx, cx2, cy2, T * 1.2, T * 0.4, '#1a1a2e');
    fillR(ctx, cx2 + 2, cy2 + 2, T * 1.2 - 4, T * 0.4 - 4, '#22223a');
    fillR(ctx, cx2 + 4, cy2 + 4, 8, 4, '#0d0d1a'); // disk slot
    fillR(ctx, cx2 + T * 1.2 - 12, cy2 + 4, 6, 6, '#3a3a60'); // power button area
    fillR(ctx, cx2 + T * 1.2 - 10, cy2 + 5, 4, 4, '#404060');
    ctx.fillStyle = '#9ece6a80';
    ctx.beginPath();
    ctx.arc(cx2 + T * 1.2 - 8, cy2 + 7, 2, 0, Math.PI * 2);
    ctx.fill();

    // Gaming sofa (3-seat, independent from TV) — flipped: back at bottom
    const [_gsATx, _gsATy] = getAdminPos('gaming_sofa', 11, ACT_ZONE_Y + 3.7);
    const [sfx, sfy] = ts(_gsATx, _gsATy);
    const sfH = T * 0.7 + 10;
    ctx.save();
    ctx.shadowColor = '#00000070';
    ctx.shadowBlur = 8;
    fillR(ctx, sfx, sfy, T * 4, sfH, COUCH_C);
    ctx.restore();
    // Seat cushions (top part)
    fillR(ctx, sfx, sfy, T * 4, T * 0.7, COUCH_SEAT);
    fillR(ctx, sfx + 3, sfy + 3, T * 4 - 6, T * 0.7 - 6, COUCH_HI);
    // Back rest (bottom part)
    fillR(ctx, sfx, sfy + T * 0.7, T * 4, 10, COUCH_C);
    fillR(ctx, sfx + 2, sfy + T * 0.7 + 1, T * 4 - 4, 8, '#4a3880');
    // Armrests
    fillR(ctx, sfx, sfy, 9, sfH, COUCH_C);
    fillR(ctx, sfx + T * 4 - 9, sfy, 9, sfH, COUCH_C);
    // Section dividers
    fillR(ctx, sfx + T - 1, sfy, 2, T * 0.7, '#382860');
    fillR(ctx, sfx + T * 2 - 1, sfy, 2, T * 0.7, '#382860');
    fillR(ctx, sfx + T * 3 - 1, sfy, 2, T * 0.7, '#382860');

    // ── PING PONG TABLE (right-center) ──────────────────────────
    const ppX2 = Math.min(19, COLS - 8);
    const [_ppATx, _ppATy] = getAdminPos('pingpong', ppX2 - 2, ACT_ZONE_Y + 1.5);
    const [ppx, ppy] = ts(_ppATx, _ppATy);

    // Table surface (no floating text)
    const ppW = T * 6,
      ppH = T * 1.5;
    ctx.save();
    ctx.shadowColor = '#00000080';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    fillR(ctx, ppx, ppy, ppW, ppH, '#164028');
    ctx.restore();
    // Surface with border
    fillR(ctx, ppx + 2, ppy + 2, ppW - 4, ppH - 4, '#1d7040');
    // Table border stripe (white)
    ctx.strokeStyle = '#ffffffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(ppx + 4, ppy + 4, ppW - 8, ppH - 8);
    // Center line (vertical)
    fillR(ctx, ppx + ppW / 2 - 1, ppy + 4, 2, ppH - 8, '#ffffffb0');
    // Side edge highlights
    fillR(ctx, ppx, ppy, ppW, 3, '#30a060'); // top edge highlight
    fillR(ctx, ppx, ppy + ppH - 3, ppW, 3, '#0d3020'); // bottom shadow
    fillR(ctx, ppx, ppy, 3, ppH, '#30a060'); // left edge
    fillR(ctx, ppx + ppW - 3, ppy, 3, ppH, '#0d3020'); // right edge
    // Net posts
    ctx.fillStyle = '#808890';
    ctx.fillRect(ppx + ppW / 2 - 2, ppy - 8, 4, 10); // left post above table
    ctx.fillRect(ppx + ppW / 2 - 2, ppy + ppH - 2, 4, 10); // right post below table
    ctx.fillStyle = '#a0a8b8';
    ctx.fillRect(ppx + ppW / 2 - 1, ppy - 7, 2, 8);
    // Net mesh (white stripes between posts)
    ctx.fillStyle = '#ffffffd0';
    ctx.fillRect(ppx + ppW / 2 - 2, ppy, 4, 3); // top of net
    ctx.fillStyle = '#ffffff80';
    for (let ni = 1; ni < 6; ni++) {
      ctx.fillRect(ppx + ppW / 2 - 1, ppy + ni * (ppH / 6), 2, 1);
    }
    ctx.fillStyle = '#ffffffd0';
    ctx.fillRect(ppx + ppW / 2 - 2, ppy + ppH - 3, 4, 3);
    // Table legs (4 legs with cross bar)
    const legH = T * 0.55;
    ctx.fillStyle = '#0e2818';
    ctx.fillRect(ppx + 6, ppy + ppH, 5, legH);
    ctx.fillRect(ppx + ppW - 11, ppy + ppH, 5, legH);
    ctx.fillRect(ppx + 6, ppy + ppH + legH, ppW - 12, 4);
    // Paddles resting on table edges
    const drawPaddle = (ex, ey, color) => {
      ctx.fillStyle = '#2a1808';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 5, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color + '88';
      ctx.beginPath();
      ctx.ellipse(ex - 1, ey - 1, 2, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawPaddle(ppx + 14, ppy + ppH / 2, '#e03030');
    drawPaddle(ppx + ppW - 14, ppy + ppH / 2, '#3030e0');
  }

  // ── Whiteboard (activity area, left wall) ──────────────────────────
  if (ACT_ZONE_Y > 0) {
    const [_wbTx, _wbTy] = getAdminPos('whiteboard', 1, ACT_ZONE_Y + 7);
    const [wbx, wby] = ts(_wbTx, _wbTy);
    const wbW = T * 3.5,
      wbH = T * 2;
    // Wall mount brackets
    fillR(ctx, wbx - 2, wby + 6, 4, wbH - 12, '#404050');
    fillR(ctx, wbx + wbW - 2, wby + 6, 4, wbH - 12, '#404050');
    // Whiteboard frame (dark border)
    ctx.save();
    ctx.shadowColor = '#00000060';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    fillR(ctx, wbx, wby, wbW, wbH, '#2a2840');
    ctx.restore();
    // Whiteboard surface (white)
    fillR(ctx, wbx + 4, wby + 4, wbW - 8, wbH - 8, '#f0ece8');
    fillR(ctx, wbx + 4, wby + 4, wbW - 8, 2, '#ffffff'); // top highlight
    // Diagram drawn on board — architecture diagram
    const bx2 = wbx + 6,
      by2 = wby + 8;
    // Boxes (system components)
    ctx.strokeStyle = '#4060a0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx2 + 2, by2 + 2, 18, 10);
    ctx.strokeRect(bx2 + 24, by2 + 2, 18, 10);
    ctx.strokeRect(bx2 + 12, by2 + 20, 18, 10);
    // Arrows between boxes
    ctx.strokeStyle = '#a04060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx2 + 20, by2 + 7);
    ctx.lineTo(bx2 + 24, by2 + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx2 + 11, by2 + 12);
    ctx.lineTo(bx2 + 21, by2 + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx2 + 33, by2 + 12);
    ctx.lineTo(bx2 + 30, by2 + 20);
    ctx.stroke();
    // Labels in boxes
    ctx.fillStyle = '#303060';
    ctx.font = '3px monospace';
    ctx.fillText('API', bx2 + 6, by2 + 9);
    ctx.fillText('DB', bx2 + 30, by2 + 9);
    ctx.fillText('UI', bx2 + 17, by2 + 27);
    // Scribbled notes (colourful)
    ctx.fillStyle = '#9ece6a';
    ctx.font = '3px monospace';
    ctx.fillText('v2.0', bx2 + 50, by2 + 6);
    ctx.fillStyle = '#f7768e';
    ctx.fillText('TODO', bx2 + 50, by2 + 14);
    ctx.fillStyle = '#e0af68';
    ctx.fillText('bug!', bx2 + 50, by2 + 22);
    // Marker tray at bottom of board
    fillR(ctx, wbx + 4, wby + wbH - 5, wbW - 8, 4, '#383848');
    // Markers in tray
    const mColors = ['#f7768e', '#7aa2f7', '#9ece6a', '#e0af68'];
    mColors.forEach((mc, mi) => {
      fillR(ctx, wbx + 8 + mi * 8, wby + wbH - 5, 5, 3, mc);
    });
    // Label above board
    ctx.fillStyle = '#606070';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WHITEBOARD', wbx + wbW / 2, wby - 4);
    ctx.textAlign = 'left';
  }

  // ── Staircase (bottom-left — leads to 2nd floor) ──────────────────
  if (ROWS > 20) {
    const [_stTx, _stTy] = getAdminPos('staircase', 1, ROWS - 7);
    const [stx, sty] = ts(_stTx, _stTy);
    const stepW = T * 0.9,
      stepH = 8;
    const steps = 5;
    // Wall backplate
    fillR(ctx, stx, sty - T * 0.5, T * 5, T * 2 + 8, '#252344');
    fillR(ctx, stx, sty - T * 0.5, T * 5, 3, '#3a3860'); // top edge
    // Stair handrails (left and right)
    ctx.strokeStyle = '#808098';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(stx + 2, sty + T * 1.5);
    ctx.lineTo(stx + T * 5 - 2, sty - T * 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#606078';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stx + 2, sty + T * 1.5 + 3);
    ctx.lineTo(stx + T * 5 - 2, sty - T * 0.3 + 3);
    ctx.stroke();
    // Stair posts (balusters)
    for (let pi = 0; pi < 5; pi++) {
      const px2 = stx + 4 + (pi * (T * 5 - 8)) / 4;
      const pyTop = sty + T * 1.5 - pi * ((T * 1.8) / 4);
      fillR(ctx, px2, pyTop, 3, T * 1.5 - pi * (T * 0.4) + 6, '#505068');
    }
    // Stairs (5 steps, left-to-right going UP)
    for (let si = 0; si < steps; si++) {
      const stepX = stx + si * stepW;
      const stepY = sty + T + (steps - 1 - si) * stepH;
      // Step tread (top surface)
      fillR(ctx, stepX, stepY, stepW + 2, stepH, '#3a3060');
      fillR(ctx, stepX, stepY, stepW + 2, 2, '#504878'); // tread highlight
      // Step riser (front face)
      fillR(ctx, stepX, stepY + stepH, stepW + 2, stepH * 0.7, '#252344');
      // Edge trim
      fillR(ctx, stepX, stepY, 2, stepH, '#604888');
    }
    // "2F →" sign above stairs
    ctx.fillStyle = '#e0af68';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('2F ↑', stx + T * 2.5, sty - T * 0.7);
    ctx.textAlign = 'left';
    // Arrow pointing up on wall
    ctx.strokeStyle = '#e0af6880';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(stx + T * 2.3, sty - T * 0.4);
    ctx.lineTo(stx + T * 2.3, sty - T * 0.1);
    ctx.stroke();
    // Floor shadow at base
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(stx + T * 2.5, sty + T * 1.5 + 6, T * 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Cat bowls (structure only — contents drawn dynamically) ──────
  for (const bowl of CAT_BOWLS) {
    const [bx, by] = ts(bowl.tx, bowl.ty);
    const isWater = bowl.type === 'water';
    const rimOuter = isWater ? '#2860c0' : '#c04878';
    const rimInner = isWater ? '#4090e8' : '#e060a0';
    const rimFloor = isWater ? '#3070d0' : '#d05090';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(bx + T / 2, by + T * 0.75 + 3, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bowl body
    ctx.fillStyle = rimOuter;
    ctx.beginPath();
    ctx.arc(bx + T / 2, by + T * 0.65, 9, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rimInner;
    ctx.beginPath();
    ctx.ellipse(bx + T / 2, by + T * 0.55, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rimFloor;
    ctx.beginPath();
    ctx.ellipse(bx + T / 2, by + T * 0.55, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Label icon
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isWater ? '💧' : '🐾', bx + T / 2, by + T * 0.28);
    ctx.textAlign = 'left';
  }
}

// Draw cat bowls dynamically (food/water appears/disappears)
function drawCatBowls(ctx, tick) {
  for (const bowl of CAT_BOWLS) {
    const cx = OX + bowl.tx * T + T / 2;
    const cy = OY + bowl.ty * T + T * 0.58; // bowl center Y
    if (bowl.type === 'food') {
      if (bowl.hasFod) {
        // Kibble pieces — visible orange/brown chunks
        const kibble = [
          [-5, -1],
          [0, -2],
          [5, -1],
          [-2.5, 2],
          [2.5, 2],
        ];
        for (const [kx, ky] of kibble) {
          ctx.fillStyle = '#c06010';
          ctx.beginPath();
          ctx.ellipse(cx + kx, cy + ky, 3, 2.2, kx * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e8902a';
          ctx.beginPath();
          ctx.ellipse(cx + kx - 0.5, cy + ky - 0.5, 2, 1.5, kx * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Empty — faint reflection inside bowl
        ctx.fillStyle = 'rgba(180,80,120,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // "empty" text hint
        ctx.fillStyle = '#ffffff50';
        ctx.font = '5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('…', cx, cy + 1);
        ctx.textAlign = 'left';
      }
    } else {
      // Water bowl
      if (bowl.hasFod) {
        // Animated water — blue fill with ripple
        ctx.fillStyle = '#2a80e880';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Water surface ripples
        const phase = (tick * 0.05) % (Math.PI * 2);
        ctx.strokeStyle = '#60c0ff90';
        ctx.lineWidth = 1;
        for (let r = 0; r < 2; r++) {
          const rp = phase + r * Math.PI;
          const rw = 3 + Math.sin(rp) * 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rw, rw * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Highlight glint
        ctx.fillStyle = '#ffffff70';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 1, 2, 1, -0.3, 0, Math.PI);
        ctx.fill();
      } else {
        // Empty water — dry bowl
        ctx.fillStyle = 'rgba(40,100,180,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff40';
        ctx.font = '5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('…', cx, cy + 1);
        ctx.textAlign = 'left';
      }
    }
  }
}

export { bgBuf, bgx, ts, fillR, buildBackground, drawEntranceDoor, drawCatBowls };
