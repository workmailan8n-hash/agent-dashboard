// ════════════════════════════════════════════════════════════════
//  CLICK ANIMATIONS + SIMS MODE + ADMIN UI SETUP
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from './constants.js';
import { COLS, ROWS, CW } from './layout.js';
import { ease, clamp } from './math.js';
import { blip } from './audio.js';
import { PS } from './particles.js';
import {
  DESK_DEFS, COUCH_DEFS,
  IDLE_SPOTS,
  PER_ROW, STEP_X,
} from './layout.js';
import {
  agentsData, agentStates, idleOccupied,
  globalTick,
  clickAnims, setClickAnims,
} from './state.js';
import { getAdminPos } from './adminPos.js';
import { cat, goose } from './creatures.js';
import { toggleAdmin, toggleSimsMode, mouseToTile, adminMode, simsMode, simsSelectedAgent } from './admin.js';

// ════════════════════════════════════════════════════════════════
//  CLICK ANIMATIONS — interactive object feedback
// ════════════════════════════════════════════════════════════════
let clickAnims = [];

const CLICK_OBJ_MAP = {
  'kitchen_counter': 'coffee',
  'fridge':          'fridge',
  'aquarium':        'aquarium',
  'vending':         'vending',
  'printer':         'printer',
  'trashcan':        'trash',
  'darts':           'darts',
  'tv':              'tv',
  'pingpong':        'pingpong',
  'clock':           'clock',
  'espresso_bar':    'espresso',
  'arcade':          'arcade',
  'dj_console':      'dj',
  'server_rack':     'server',
  'printer_3d':      'printer3d',
  'foosball':        'foosball',
  'basketball':      'basketball',
  'telescope':       'telescope',
  'kitchen_table':   'kitchen_table',
  'bookshelf':       'bookshelf',
  'conf_table':      'conf_table',
  'gaming_sofa':     'gaming_sofa',
  'gym':             'gym',
};

// Dynamic: desks and couches
for (let i = 0; i < 30; i++) CLICK_OBJ_MAP['desk_'+i] = 'desk';
for (let i = 0; i < 30; i++) CLICK_OBJ_MAP['couch_'+i] = 'couch';

function findClickableAt(tx, ty) {
  const saved = window._adminPos || {};
  const defs = window._defaultPositions || {};
  const checks = [
    {id:'kitchen_counter', w:9, h:1},
    {id:'fridge', w:1, h:1.5},
    {id:'aquarium', w:2.5, h:2},
    {id:'vending', w:1.5, h:2.5},
    {id:'printer', w:2, h:1},
    {id:'trashcan', w:1, h:1},
    {id:'darts', w:2, h:1},
    {id:'tv', w:4, h:3},
    {id:'pingpong', w:6, h:3},
    {id:'clock', w:1.5, h:1.5},
    {id:'espresso_bar', w:3, h:1.5},
    {id:'arcade', w:2, h:2.5},
    {id:'dj_console', w:2.5, h:1.2},
    {id:'server_rack', w:2, h:2.2},
    {id:'printer_3d', w:2, h:1.8},
    {id:'foosball', w:3, h:1.5},
    {id:'basketball', w:2, h:2},
    {id:'telescope', w:1, h:2},
    {id:'kitchen_table', w:4, h:3},
    {id:'bookshelf', w:4.5, h:3.5},
    {id:'conf_table', w:6, h:3},
    {id:'gaming_sofa', w:4, h:1.5},
    {id:'gym', w:5, h:4},
  ];
  // Add desks and couches dynamically
  for (let i = 0; i < DESK_DEFS.length; i++) checks.push({id:'desk_'+i, w:3.5, h:3});
  for (let i = 0; i < COUCH_DEFS.length; i++) checks.push({id:'couch_'+i, w:COUCH_DEFS[i].w||3, h:2});
  for (const c of checks) {
    const s = saved[c.id]; const d = defs[c.id];
    if (!s && !d) continue;
    const ox = s ? s.tx : d.tx;
    const oy = s ? s.ty : d.ty;
    if (tx >= ox && tx <= ox + c.w && ty >= oy && ty <= oy + c.h) {
      return {id: c.id, type: CLICK_OBJ_MAP[c.id], cx: OX + (ox + c.w/2) * T, cy: OY + (oy + c.h/2) * T};
    }
  }
  return null;
}

let canvas = null;
function initClickAnims(canvasEl) {
  canvas = canvasEl;

canvas.addEventListener('click', e => {
  // Sims mode: click agent → show radial menu
  if (simsMode) {
    const {tx, ty} = mouseToTile(e);

    // Step 1: If no agent selected — click on agent to select
    if (!simsSelectedAgent) {
      for (const [id, sp] of Object.entries(agentStates)) {
        const dx = tx - sp.tx, dy = ty - sp.ty;
        if (dx*dx + dy*dy < 2.5) {
          simsSelectedAgent = id;
          return;
        }
      }
      return;
    }

    // Step 2: Agent selected — click on OBJECT to send agent there
    // Check if clicked on another agent (switch selection)
    for (const [id, sp] of Object.entries(agentStates)) {
      if (id === simsSelectedAgent) continue;
      const dx = tx - sp.tx, dy = ty - sp.ty;
      if (dx*dx + dy*dy < 2.5) {
        simsSelectedAgent = id; // switch to this agent
        return;
      }
    }

    // Find nearest IDLE_SPOT to click position
    let bestSpot = -1, bestDist = Infinity;
    for (let i = 0; i < IDLE_SPOTS.length; i++) {
      if (idleOccupied[i] && idleOccupied[i] !== simsSelectedAgent) continue;
      const dx = tx - IDLE_SPOTS[i].tx, dy = ty - IDLE_SPOTS[i].ty;
      const d = dx*dx + dy*dy;
      if (d < bestDist && d < 16) { bestDist = d; bestSpot = i; }
    }

    const sp = agentStates[simsSelectedAgent];
    if (sp && bestSpot >= 0) {
      // Send agent to this spot
      sp._simsWaiting = false;
      sp.arrived = false;
      sp.activityDur = 30 + Math.random() * 30;
      if (sp.slotIdx >= 0) delete idleOccupied[sp.slotIdx];
      sp.slotIdx = bestSpot;
      idleOccupied[bestSpot] = sp.id;
      sp.activityAnim = IDLE_SPOTS[bestSpot].anim;
      sp.setTarget(IDLE_SPOTS[bestSpot].tx, IDLE_SPOTS[bestSpot].ty);
      simsSelectedAgent = null; // deselect after sending
    } else if (sp) {
      // No spot nearby — just walk to click position
      sp._simsWaiting = false;
      sp.arrived = false;
      sp.setTarget(tx, ty);
      simsSelectedAgent = null;
    }
    return;
  }

  if (adminMode) return;
  const {tx, ty} = mouseToTile(e);

  // Check if clicked on cat
  if (cat) {
    const catDist = Math.sqrt((tx - cat.tx)*(tx - cat.tx) + (ty - cat.ty)*(ty - cat.ty));
    if (catDist < 1.5) {
      // Cat reacts to click!
      if (cat.state === 'sleeping' || cat.state === 'napping') {
        // Wake up startled
        cat.state = 'scared'; cat.stateTimer = 2;
        cat.scaredTimer = 2;
      } else if (cat.state === 'sitting' || cat.state === 'grooming') {
        // Start purring (happy)
        cat.state = 'purring'; cat.stateTimer = 8;
        cat.purrHearts = [];
      } else if (cat.state === 'walking' || cat.state === 'waddling') {
        // Start playing
        cat.state = 'playing'; cat.stateTimer = 6;
        cat.playAngle = 0;
      } else {
        // Default: honk-like meow — zoomies!
        cat.state = 'zoomies'; cat.stateTimer = 4;
        cat.zoomieTimer = 0; cat.zoomieTrails = [];
      }
      // Click animation: hearts/sparkles at cat position
      clickAnims.push({
        id: '_cat_' + Date.now(),
        type: 'cat_pet',
        cx: OX + cat.tx * T + T/2,
        cy: OY + cat.ty * T + T/2,
        startTick: globalTick
      });
      return;
    }
  }

  // Check if clicked on goose
  if (typeof goose !== 'undefined' && goose) {
    const gooseDist = Math.sqrt((tx - goose.tx)*(tx - goose.tx) + (ty - goose.ty)*(ty - goose.ty));
    if (gooseDist < 1.5) {
      goose.state = 'honking'; goose.stateTimer = 3;
      clickAnims.push({
        id: '_goose_' + Date.now(),
        type: 'goose_honk',
        cx: OX + goose.tx * T + T/2,
        cy: OY + goose.ty * T + T/2,
        startTick: globalTick
      });
      return;
    }
  }

  const hit = findClickableAt(tx, ty);
  if (!hit) return;
  if (clickAnims.some(a => a.id === hit.id)) return;
  clickAnims.push({id: hit.id, x: hit.cx, y: hit.cy, startTick: globalTick, type: hit.type,
    particles: initClickParticles(hit.type, hit.cx, hit.cy)});
  blip(520, 0.04, 'square', 0.02);
});

function initClickParticles(type, cx, cy) {
  const p = [];
  switch(type) {
    case 'coffee':
      for (let i = 0; i < 6; i++) p.push({x: cx + (Math.random()-0.5)*12, y: cy - 4, vx: (Math.random()-0.5)*0.8, vy: -0.5 - Math.random()*0.8, size: 2+Math.random()*2, col: i%2 ? '#ffffff' : '#aabbcc'});
      break;
    case 'fridge':
      for (let i = 0; i < 5; i++) p.push({x: cx + 8 + Math.random()*6, y: cy - 6 + Math.random()*14, vx: 0.3+Math.random()*0.4, vy: (Math.random()-0.5)*0.6, size: 2+Math.random()*2, col: i%2 ? '#c0e8ff' : '#ffffff'});
      break;
    case 'aquarium':
      for (let i = 0; i < 4; i++) p.push({x: cx + (Math.random()-0.5)*20, y: cy - 8, vx: (Math.random()-0.5)*2, vy: -0.3-Math.random()*0.5, size: 2, col: '#ffffff'});
      break;
    case 'vending':
      p.push({x: cx, y: cy - 10, vx: 0, vy: 0.6, size: 6, col: ['#f7768e','#9ece6a','#7aa2f7','#e0af68'][Math.floor(Math.random()*4)]});
      break;
    case 'printer':
      p.push({x: cx, y: cy, vx: 0, vy: -0.5, size: 0, col: '#ffffff'});
      break;
    case 'trash':
      p.push({x: cx, y: cy - 10, vx: 0, vy: -1.2, size: 0, col: '#888'});
      p.push({x: cx+3, y: cy-6, vx: 1.5, vy: -0.8, size: 2, col: '#556622'});
      break;
    case 'darts':
      p.push({x: cx, y: cy + 30, vx: 0, vy: -2, size: 0, col: '#f7768e'});
      break;
    case 'tv':
      break;
    case 'pingpong':
      p.push({x: cx, y: cy + 10, vx: 1.5, vy: -2, size: 3, col: '#ffffff'});
      break;
    case 'clock':
      break;
    case 'espresso':
      for (let i = 0; i < 5; i++) p.push({x: cx + (Math.random()-0.5)*10, y: cy - 6, vx: (Math.random()-0.5)*0.6, vy: -0.6 - Math.random()*0.6, size: 2+Math.random()*2, col: i%2 ? '#ffffff' : '#d4a574'});
      break;
    case 'arcade':
      break;
    case 'dj':
      break;
    case 'server':
      break;
    case 'printer3d':
      break;
    case 'foosball':
      p.push({x: cx, y: cy, vx: 2+Math.random()*2, vy: -1.5-Math.random(), size: 3, col: '#ffffff'});
      break;
    case 'basketball':
      p.push({x: cx, y: cy + 10, vx: 0, vy: -2.5, size: 4, col: '#e88030'});
      break;
    case 'telescope':
      for (let i = 0; i < 6; i++) p.push({x: cx + (Math.random()-0.5)*20, y: cy - 10 - Math.random()*10, vx: (Math.random()-0.5)*1.5, vy: -0.3-Math.random()*0.5, size: 1+Math.random()*2, col: ['#ffee80','#ffffff','#80c0ff','#ff8080'][i%4]});
      break;
    case 'kitchen_table':
      break;
    case 'bookshelf':
      p.push({x: cx + (Math.random()-0.5)*10, y: cy - 10, vx: 0.3, vy: 0.5, size: 0, col: ['#c04040','#4040c0','#40a040','#c0a040'][Math.floor(Math.random()*4)]});
      break;
    case 'conf_table':
      for (let i = 0; i < 5; i++) p.push({x: cx + (Math.random()-0.5)*20, y: cy - 4, vx: (Math.random()-0.5)*3, vy: -1-Math.random()*1.5, size: 0, col: '#ffffff'});
      break;
    case 'gaming_sofa':
      break;
    case 'desk':
      // Monitor flickers + keyboard sparks
      p.push({x:cx-5, y:cy-12, vx:0, vy:0, size:0, col:'#7aa2f7'});
      for (let i=0;i<3;i++) p.push({x:cx-8+i*6, y:cy+4, vx:(Math.random()-0.5)*2, vy:-1-Math.random(), size:1, col:'#9ece6a'});
      break;
    case 'couch':
      // Cushion poof + dust
      for (let i=0;i<4;i++) p.push({x:cx+(Math.random()-0.5)*20, y:cy, vx:(Math.random()-0.5)*1.5, vy:-1.5-Math.random(), size:2+Math.random()*2, col:['#4a3880','#604ca0','#3a2868','#5a4890'][i]});
      break;
    case 'gym':
      // Sweat drops + energy burst
      for (let i=0;i<5;i++) p.push({x:cx+(Math.random()-0.5)*30, y:cy-10-Math.random()*10, vx:(Math.random()-0.5)*2, vy:-1-Math.random()*2, size:1.5, col:['#88ccff','#ffcc40','#ff6040','#88ccff','#ffcc40'][i]});
      break;
  }
  return p;
}

function drawClickAnims(ctx, tick) {
  clickAnims = clickAnims.filter(a => {
    const age = tick - a.startTick;
    if (age > 80) return false;
    const t = age / 80;
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;

    switch(a.type) {
      case 'coffee': {
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy;
          p.vy -= 0.01;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        if (t < 0.6) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#6a4a2a';
          ctx.fillRect(a.x - 4, a.y + 6, 8, 6);
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(a.x - 3, a.y + 4, 6, 3);
        }
        break;
      }
      case 'fridge': {
        const doorW = 10 * Math.min(1, t * 3);
        ctx.fillStyle = '#d0d8e0';
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillRect(a.x + 4, a.y - 12, doorW, 18);
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        break;
      }
      case 'aquarium': {
        ctx.globalAlpha = alpha * (1 - t);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const sx = a.x - 10 + i * 10;
          const spread = t * 8;
          ctx.beginPath();
          ctx.arc(sx, a.y - 10, spread, Math.PI, 0);
          ctx.stroke();
        }
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      }
      case 'vending': {
        const vp = a.particles[0];
        if (t < 0.5) { vp.y += vp.vy * 2; }
        ctx.fillStyle = vp.col;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(vp.x) - 3, Math.round(vp.y), 6, 8);
        ctx.fillStyle = '#ffffff40';
        ctx.fillRect(Math.round(vp.x) - 1, Math.round(vp.y) + 1, 2, 6);
        if (t > 0.35 && t < 0.8) {
          ctx.globalAlpha = alpha * (t < 0.55 ? 1 : 1 - (t-0.55)/0.25);
          ctx.fillStyle = '#e0af68';
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.fillText('CLUNK', a.x - 16, a.y - 18);
        }
        break;
      }
      case 'printer': {
        const paperY = a.y + 4 - t * 20;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.fillRect(a.x - 5, paperY, 10, 12);
        ctx.fillStyle = '#888';
        for (let i = 0; i < 3; i++) ctx.fillRect(a.x - 3, paperY + 2 + i * 3, 6, 1);
        ctx.fillStyle = (tick % 8 < 4) ? '#9ece6a' : '#2a4020';
        ctx.fillRect(a.x + 8, a.y - 2, 3, 3);
        break;
      }
      case 'trash': {
        const lidP = a.particles[0];
        if (t < 0.3) { lidP.y += lidP.vy; lidP.vy += 0.08; }
        else if (t < 0.5) { lidP.vy = 0.6; lidP.y += lidP.vy; }
        ctx.fillStyle = '#667';
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(a.x) - 6, Math.round(lidP.y), 12, 3);
        const flyP = a.particles[1];
        if (flyP) {
          flyP.x += flyP.vx + Math.sin(tick * 0.5) * 0.8;
          flyP.y += flyP.vy + Math.cos(tick * 0.7) * 0.5;
          ctx.fillStyle = '#334';
          ctx.fillRect(Math.round(flyP.x), Math.round(flyP.y), 2, 2);
          ctx.fillStyle = '#aab8';
          ctx.fillRect(Math.round(flyP.x)-1, Math.round(flyP.y)-1, 1, 1);
          ctx.fillRect(Math.round(flyP.x)+2, Math.round(flyP.y)-1, 1, 1);
        }
        break;
      }
      case 'darts': {
        const dp = a.particles[0];
        if (t < 0.4) { dp.y += dp.vy * 2; }
        ctx.fillStyle = dp.col;
        ctx.globalAlpha = alpha;
        const dy = Math.round(Math.max(a.y - 6, dp.y));
        ctx.fillRect(a.x - 1, dy, 2, 8);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(a.x - 1, dy - 2, 2, 2);
        if (t > 0.35 && t < 0.65) {
          const shake = Math.sin(tick * 2) * 2;
          ctx.fillStyle = '#e0af68';
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.fillText('thunk', a.x - 14 + shake, a.y - 16);
        }
        break;
      }
      case 'tv': {
        const w = 28, h = 18;
        if (t < 0.15) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 1 - t / 0.15;
          ctx.fillRect(a.x - w/2, a.y - h/2 - 4, w, h);
        } else if (t < 0.3) {
          ctx.globalAlpha = alpha * 0.8;
          for (let i = 0; i < 30; i++) {
            const v = Math.floor(Math.random() * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(a.x - w/2 + Math.random()*w, a.y - h/2 - 4 + Math.random()*h, 2, 2);
          }
        } else if (t < 0.7) {
          const colors = ['#f7768e','#7aa2f7','#9ece6a','#bb9af7','#e0af68'];
          ctx.fillStyle = colors[tick % colors.length];
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillRect(a.x - w/2, a.y - h/2 - 4, w, h);
        }
        break;
      }
      case 'pingpong': {
        const bp = a.particles[0];
        if (t < 0.5) {
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.vy += 0.15;
          if (bp.y > a.y + 10) { bp.vy = -Math.abs(bp.vy) * 0.6; }
        }
        ctx.fillStyle = bp.col;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(Math.round(bp.x), Math.round(bp.y), bp.size, 0, Math.PI*2);
        ctx.fill();
        if (t > 0.15 && t < 0.55) {
          ctx.fillStyle = '#e0af68';
          ctx.font = "8px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (t < 0.35 ? 1 : 1 - (t-0.35)/0.2);
          ctx.fillText('POP', a.x - 10, a.y - 18);
        }
        break;
      }
      case 'clock': {
        ctx.globalAlpha = alpha;
        const ccx = a.x, ccy = a.y;
        const r = 10;
        const angle1 = t * Math.PI * 12;
        ctx.strokeStyle = '#c8d3f5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(angle1)*r, ccy + Math.sin(angle1)*r);
        ctx.stroke();
        const angle2 = t * Math.PI * 4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(angle2)*r*0.6, ccy + Math.sin(angle2)*r*0.6);
        ctx.stroke();
        if (t > 0.3 && t < 0.7) {
          ctx.fillStyle = '#e0af68';
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (t < 0.5 ? 1 : 1 - (t-0.5)/0.2);
          ctx.fillText('BONG', ccx - 12, ccy - 16);
        }
        break;
      }
      case 'cat_pet': {
        // Hearts rising from cat
        ctx.globalAlpha = alpha;
        for (let h = 0; h < 4; h++) {
          const hx = a.cx + Math.sin(t*6 + h*1.5) * 12;
          const hy = a.cy - 10 - t * 40 - h * 8;
          const hs = 4 + Math.sin(t*4+h) * 1.5;
          ctx.fillStyle = ['#ff6080','#ff80a0','#ff4060','#ff90b0'][h];
          ctx.font = Math.round(hs+6) + "px serif";
          ctx.fillText('♥', hx, hy);
        }
        // "purr~" text
        if (t < 0.6) {
          ctx.fillStyle = '#ffb0c0';
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (1 - t/0.6);
          ctx.fillText('purr~', a.cx - 14, a.cy - 30 - t*20);
        }
        break;
      }
      case 'goose_honk': {
        // HONK! text big and bold
        ctx.globalAlpha = alpha;
        const scale = 1 + Math.sin(t*20) * 0.15; // vibrate
        ctx.save();
        ctx.translate(a.cx, a.cy - 25 - t*15);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ff4040';
        ctx.font = "bold 10px 'Press Start 2P',monospace";
        ctx.textAlign = 'center';
        ctx.fillText('HONK!', 0, 0);
        ctx.textAlign = 'left';
        ctx.restore();
        // Feathers flying
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = '#ffffff';
          const fx = a.cx + Math.sin(t*8+f*2) * 20;
          const fy = a.cy - t*30 - f*10;
          ctx.fillRect(fx, fy, 3, 2);
        }
        break;
      }
      case 'espresso': {
        // Steam burst
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy; p.vy -= 0.01;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        // Coffee cup sliding
        if (t < 0.6) {
          const slideX = a.x - 14 + t * 46;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#f0e8d0';
          ctx.fillRect(slideX, a.y + 2, 7, 6);
          ctx.fillStyle = '#6a4a2a';
          ctx.fillRect(slideX + 1, a.y + 1, 5, 3);
          ctx.fillStyle = '#d0c8b0';
          ctx.fillRect(slideX + 7, a.y + 4, 3, 3);
        }
        break;
      }
      case 'arcade': {
        // Screen flash
        const w = 16, h = 20;
        if (t < 0.2) {
          ctx.fillStyle = ['#ff4040','#40ff40','#4040ff','#ffff40'][tick % 4];
          ctx.globalAlpha = alpha * (1 - t / 0.2) * 0.8;
          ctx.fillRect(a.x - w/2, a.y - h/2 - 6, w, h);
        } else if (t < 0.5) {
          ctx.globalAlpha = alpha * 0.6;
          const colors = ['#f7768e','#7aa2f7','#9ece6a','#bb9af7'];
          ctx.fillStyle = colors[tick % colors.length];
          ctx.fillRect(a.x - w/2, a.y - h/2 - 6, w, h);
        }
        // Joystick wiggle
        const jw = Math.sin(tick * 0.8) * 4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#808090';
        ctx.fillRect(a.x - 1 + jw, a.y + 10, 2, 8);
        ctx.fillStyle = '#c04040';
        ctx.beginPath(); ctx.arc(a.x + jw, a.y + 10, 3, 0, Math.PI*2); ctx.fill();
        // INSERT COIN text
        if (t > 0.25 && t < 0.75) {
          ctx.fillStyle = '#e0af68';
          ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * ((tick % 20 < 10) ? 1 : 0.3);
          ctx.textAlign = 'center';
          ctx.fillText('INSERT COIN', a.x, a.y - h/2 - 10);
          ctx.textAlign = 'left';
        }
        break;
      }
      case 'dj': {
        // Vinyl scratch wave lines
        ctx.strokeStyle = '#bb9af7';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.7;
        for (let i = 0; i < 3; i++) {
          const wy = a.y - 14 - i * 8;
          const amp = 4 + i * 2;
          ctx.beginPath();
          for (let wx = -18; wx <= 18; wx += 2) {
            const wvy = wy + Math.sin((wx + tick * 3 + i * 2) * 0.3) * amp;
            wx === -18 ? ctx.moveTo(a.x + wx, wvy) : ctx.lineTo(a.x + wx, wvy);
          }
          ctx.stroke();
        }
        // Turntable spin
        ctx.globalAlpha = alpha;
        const spinAngle = tick * 0.2;
        ctx.strokeStyle = '#606080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x - 10, a.y + 4, 10, spinAngle, spinAngle + Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(a.x + 10, a.y + 4, 10, spinAngle + Math.PI, spinAngle + Math.PI * 2.5);
        ctx.stroke();
        break;
      }
      case 'server': {
        // LEDs blink rapidly
        ctx.globalAlpha = alpha;
        for (let li = 0; li < 6; li++) {
          const lx = a.x - 6 + (li % 2) * 12;
          const ly = a.y - 14 + Math.floor(li / 2) * 8;
          ctx.fillStyle = (tick + li) % 3 === 0 ? '#9ece6a' : ((tick + li) % 3 === 1 ? '#f7768e' : '#7aa2f7');
          ctx.fillRect(lx, ly, 3, 3);
        }
        // Spark flash
        if (t < 0.3) {
          ctx.fillStyle = '#ffff80';
          ctx.globalAlpha = alpha * (1 - t / 0.3);
          const sx = a.x + Math.sin(tick) * 8;
          const sy = a.y - 4 + Math.cos(tick * 1.3) * 6;
          ctx.fillRect(sx - 1, sy - 4, 2, 8);
          ctx.fillRect(sx - 4, sy - 1, 8, 2);
        }
        // REBOOT text
        if (t > 0.2 && t < 0.7) {
          ctx.globalAlpha = alpha * ((tick % 12 < 6) ? 1 : 0.2);
          ctx.fillStyle = '#f7768e';
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.textAlign = 'center';
          ctx.fillText('REBOOT', a.x, a.y - 22);
          ctx.textAlign = 'left';
        }
        break;
      }
      case 'printer3d': {
        // Nozzle moves
        ctx.globalAlpha = alpha;
        const nozzleX = a.x - 8 + Math.sin(tick * 0.5) * 16;
        ctx.fillStyle = '#808090';
        ctx.fillRect(nozzleX - 2, a.y - 10, 4, 6);
        // Layer builds up
        const layers = Math.min(Math.floor(t * 8), 6);
        for (let li = 0; li < layers; li++) {
          ctx.fillStyle = li % 2 === 0 ? '#9ece6a' : '#7aa2f7';
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillRect(a.x - 6, a.y + 4 - li * 3, 12, 2);
        }
        break;
      }
      case 'foosball': {
        // Rod spins
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 2;
        const rodY = a.y + Math.sin(tick * 0.6) * 6;
        ctx.beginPath(); ctx.moveTo(a.x - 20, rodY); ctx.lineTo(a.x + 20, rodY); ctx.stroke();
        // Players on rod
        for (let pi = -1; pi <= 1; pi++) {
          const rot = Math.sin(tick * 0.8 + pi) * Math.PI * 0.5;
          ctx.fillStyle = '#e04040';
          ctx.fillRect(a.x + pi * 12 - 3, rodY - 4 + Math.abs(rot) * 2, 6, 8 - Math.abs(rot) * 2);
        }
        // Ball bounces
        const bp = a.particles[0];
        if (t < 0.6) {
          bp.x += bp.vx; bp.y += bp.vy; bp.vy += 0.1;
          if (bp.y > a.y + 8) { bp.vy = -Math.abs(bp.vy) * 0.7; }
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(Math.round(bp.x), Math.round(bp.y), bp.size, 0, Math.PI*2); ctx.fill();
        break;
      }
      case 'basketball': {
        // Ball bounces
        const bbp = a.particles[0];
        if (t < 0.5) {
          bbp.y += bbp.vy; bbp.vy += 0.15;
          if (bbp.y > a.y + 10) { bbp.vy = -Math.abs(bbp.vy) * 0.65; }
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bbp.col;
        ctx.beginPath(); ctx.arc(Math.round(a.x), Math.round(bbp.y), bbp.size, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#c06020'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(Math.round(a.x), Math.round(bbp.y), bbp.size, 0, Math.PI*2); ctx.stroke();
        // Rim shakes
        if (t > 0.3 && t < 0.6) {
          const shake = Math.sin(tick * 3) * 3;
          ctx.strokeStyle = '#e06020'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(a.x + shake, a.y - 10, 8, 4, 0, 0, Math.PI*2); ctx.stroke();
        }
        break;
      }
      case 'telescope': {
        // Star burst
        ctx.globalAlpha = alpha;
        for (const p of a.particles) {
          p.x += p.vx * 0.5; p.y += p.vy * 0.5;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          const sz = p.size * (1 + t);
          ctx.fillRect(Math.round(p.x) - sz/2, Math.round(p.y), sz, sz);
          // Cross sparkle
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - sz, 2, sz * 3);
          ctx.fillRect(Math.round(p.x) - sz, Math.round(p.y), sz * 2, 2);
        }
        // WOW text
        if (t > 0.15 && t < 0.6) {
          ctx.globalAlpha = alpha * (t < 0.4 ? 1 : 1 - (t - 0.4) / 0.2);
          ctx.fillStyle = '#ffee80';
          ctx.font = "8px 'Press Start 2P',monospace";
          ctx.textAlign = 'center';
          ctx.fillText('WOW', a.x, a.y - 28);
          ctx.textAlign = 'left';
        }
        break;
      }
      case 'kitchen_table': {
        // Plates rattle
        ctx.globalAlpha = alpha;
        for (let pi = 0; pi < 3; pi++) {
          const px = a.x - 12 + pi * 12;
          const rattle = Math.sin(tick * 2 + pi * 2) * 2;
          ctx.fillStyle = '#e0e0e0';
          ctx.beginPath(); ctx.ellipse(px + rattle, a.y + rattle * 0.5, 5, 3, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#b0b0b0'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.ellipse(px + rattle, a.y + rattle * 0.5, 5, 3, 0, 0, Math.PI*2); ctx.stroke();
        }
        if (t > 0.2 && t < 0.6) {
          ctx.fillStyle = '#a0a0a0';
          ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillText('clatter', a.x - 16, a.y - 12);
        }
        break;
      }
      case 'bookshelf': {
        // Book falls out
        ctx.globalAlpha = alpha;
        const bp2 = a.particles[0];
        if (bp2) {
          if (t < 0.5) { bp2.y += bp2.vy * 2; bp2.vy += 0.05; bp2.x += bp2.vx; }
          ctx.fillStyle = bp2.col;
          ctx.save();
          ctx.translate(Math.round(bp2.x), Math.round(bp2.y));
          ctx.rotate(t * 3);
          ctx.fillRect(-4, -6, 8, 12);
          ctx.fillStyle = '#ffffff40';
          ctx.fillRect(-2, -4, 4, 8);
          ctx.restore();
        }
        break;
      }
      case 'conf_table': {
        // Papers scatter
        ctx.globalAlpha = alpha;
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.03;
          ctx.save();
          ctx.translate(Math.round(p.x), Math.round(p.y));
          ctx.rotate(t * 4 * (p.vx > 0 ? 1 : -1));
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * (1 - t * 0.5);
          ctx.fillRect(-4, -5, 8, 10);
          ctx.fillStyle = '#888';
          for (let li = 0; li < 3; li++) ctx.fillRect(-2, -3 + li * 3, 4, 1);
          ctx.restore();
        }
        break;
      }
      case 'gaming_sofa': {
        ctx.globalAlpha = alpha;
        const bounce = Math.abs(Math.sin(tick * 0.5)) * 6;
        const squish = Math.sin(tick * 0.5) * 2;
        ctx.fillStyle = '#4a3858';
        ctx.fillRect(a.x - 10, a.y - bounce, 20 + squish, 10 - squish * 0.5);
        if (t > 0.2 && t < 0.5) {
          ctx.fillStyle = '#a0a0c0'; ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.6; ctx.textAlign = 'center';
          ctx.fillText('boing', a.x, a.y - 16); ctx.textAlign = 'left';
        }
        break;
      }
      case 'desk': {
        ctx.globalAlpha = alpha;
        // Monitor screen flicker
        const flick = Math.sin(tick * 0.8) > 0;
        ctx.fillStyle = flick ? '#7aa2f780' : '#4060a080';
        ctx.fillRect(a.x - 12, a.y - 18, 24, 14);
        // Screen glitch lines
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#ffffff40';
          ctx.fillRect(a.x - 10, a.y - 16 + i * 5 + Math.sin(tick * 0.3 + i) * 2, 20, 1);
        }
        // Keyboard sparks
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.05;
          ctx.fillStyle = p.col; ctx.globalAlpha = alpha * (1 - t);
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (t > 0.1 && t < 0.4) {
          ctx.fillStyle = '#9ece6a'; ctx.font = "6px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.8; ctx.textAlign = 'center';
          ctx.fillText('TAP TAP', a.x, a.y + 16); ctx.textAlign = 'left';
        }
        break;
      }
      case 'couch': {
        ctx.globalAlpha = alpha;
        // Cushion poof particles
        for (const p of a.particles) {
          p.x += p.vx * 0.95; p.y += p.vy; p.vy += 0.04;
          ctx.fillStyle = p.col; ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + t * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        // Poof text
        if (t < 0.4) {
          ctx.globalAlpha = alpha * (1 - t / 0.4);
          ctx.fillStyle = '#c0b0d0'; ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = 'center';
          ctx.fillText('POOF', a.x, a.y - 20 - t * 15); ctx.textAlign = 'left';
        }
        break;
      }
      case 'gym': {
        ctx.globalAlpha = alpha;
        // Energy burst particles
        for (const p of a.particles) {
          p.x += p.vx; p.y += p.vy;
          ctx.fillStyle = p.col; ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        // PUMP IT text
        if (t > 0.1 && t < 0.5) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ff6040'; ctx.font = "bold 8px 'Press Start 2P',monospace";
          ctx.textAlign = 'center';
          const shake = Math.sin(tick * 0.6) * 2;
          ctx.fillText('PUMP IT!', a.x + shake, a.y - 25 - t * 10); ctx.textAlign = 'left';
        }
        break;
      }
    }
    ctx.restore();
    return true;
  });
}

// Add admin button to header
const adminBtn = document.createElement('button');
adminBtn.textContent = '✏️ EDIT';
adminBtn.style.cssText = 'background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:4px 10px;font-family:inherit;font-size:7px;cursor:pointer;margin-left:8px;border-radius:4px;';
adminBtn.onclick = toggleAdmin;
document.querySelector('header .view-tabs').appendChild(adminBtn);

const simsBtn = document.createElement('button');
simsBtn.textContent = '🎮 SIMS';
simsBtn.style.cssText = 'background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:4px 10px;font-family:inherit;font-size:7px;cursor:pointer;margin-left:4px;border-radius:4px;';
simsBtn.onclick = toggleSimsMode;
document.querySelector('header .view-tabs').appendChild(simsBtn);

// Admin info panel
const adminPanel = document.createElement('div');
adminPanel.id = 'admin-panel';
adminPanel.style.cssText = 'display:none;position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#1a1a30e0;border:1px solid #3a3860;border-radius:8px;padding:8px 16px;gap:8px;align-items:center;z-index:100;font-size:7px;color:#c8d3f5;';
adminPanel.innerHTML = `
  <span>🖱 Drag objects to move</span>
  <button id="admin-start-pos" style="background:#283040;color:#7aa2f7;border:1px solid #7aa2f740;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">🏠 Start Position</button>
  <button id="admin-reset" style="background:#3a2020;color:#f7768e;border:1px solid #f7768e40;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">Reset All</button>
  <button id="admin-export" style="background:#203a20;color:#9ece6a;border:1px solid #9ece6a40;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">Export JSON</button>
`;
document.body.appendChild(adminPanel);

document.getElementById('admin-start-pos').onclick = () => {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,5,15,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#12121e;border:2px solid #3a3860;border-radius:10px;padding:24px 32px;display:flex;flex-direction:column;gap:14px;align-items:center;box-shadow:0 0 40px #0008;min-width:280px;';
  box.innerHTML = `
    <div style="color:#7aa2f7;font-family:'Press Start 2P',monospace;font-size:10px;">🏠 START POSITION</div>
    <div style="color:#5a5888;font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;line-height:1.8;">Reset all objects to their<br>default starting positions?</div>
    <div style="display:flex;gap:10px;">
      <button id="sp-yes" style="background:#7aa2f7;color:#0a0a18;border:none;padding:6px 16px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;border-radius:4px;">YES</button>
      <button id="sp-no" style="background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:6px 16px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;border-radius:4px;">NO</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector('#sp-no').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  box.querySelector('#sp-yes').onclick = () => {
    overlay.remove();
    // Reset objects to BUILTIN_POSITIONS
    localStorage.setItem('admin_positions', JSON.stringify(BUILTIN_POSITIONS));
    localStorage.removeItem('admin_walls');
    window._adminPos = Object.assign({}, BUILTIN_POSITIONS);
    // Reset walls to default sizes
    COLS = 35; CW = OX + COLS*T + OX;
    canvas.width = CW; bgBuf.width = CW;
    generateLayout(Math.max(12, Object.keys(agentsData).length));
    applyCustomPositions();
    buildAdminObjects();
    syncIdleSpotsToAdmin();
    buildBackground();
    buildObstacleGrid();
  };
};

document.getElementById('admin-reset').onclick = () => {
  localStorage.removeItem('admin_positions');
  localStorage.removeItem('admin_walls');
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS);
  // Force canvas resize to fit all objects
  ROWS = Math.max(ROWS, 45);
  CH = OY + ROWS*T + OY;
  canvas.height = CH; bgBuf.height = CH;
  applyWallPositions();
  generateLayout(Math.max(12, Object.keys(agentsData).length));
  applyCustomPositions();
  buildAdminObjects();
  syncIdleSpotsToAdmin();
  buildBackground();
  buildObstacleGrid();
};

document.getElementById('admin-export').onclick = () => {
  const pos = {};
  for (const obj of adminObjects) pos[obj.id] = {tx:obj.tx, ty:obj.ty};
  const json = JSON.stringify(pos, null, 2);
  navigator.clipboard.writeText(json).then(() => alert('Copied to clipboard!')).catch(() => {
    prompt('Copy this JSON:', json);
  });
};

// Keyboard shortcut: E to toggle
document.addEventListener('keydown', e => {
  if (e.key === 'e' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') toggleAdmin();
});

} // end initClickAnims

export { drawClickAnims, findClickableAt, initClickParticles, CLICK_OBJ_MAP, initClickAnims };
