// ════════════════════════════════════════════════════════════════
//  ALL APPLICATION CODE — extracted from public/index.html
//  Phase 1: single module, will be split in subsequent phases
// ════════════════════════════════════════════════════════════════

import {
  drawZenGarden,
  drawRubberDuck,
  drawNewtonsCradle,
  drawGumballMachine,
  drawTerrarium,
  drawLavaLamp,
  drawPinballMachine,
  drawHammock,
  drawJukebox,
  drawCrystalBall,
} from "./objects.js";
import { PALETTES, AGENT_TYPE_ROLES, getPalette, getRole } from "./agents.js";

// ════════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════════
let CW = 1400;
const T = 32; // tile size px
const OX = 150; // canvas left margin
const OY = 12; // canvas top margin
let COLS = 35; // room width in tiles (mutable for wall editor)
let ROWS = 14;
let CH = OY + ROWS * T + OY;
// цвета объявляем сразу — используются в draw-функциях ниже
const SCREEN_C = "#091828";
const MON_DARK = "#12121e";

// ════════════════════════════════════════════════════════════════
//  MATH & EASING
// ════════════════════════════════════════════════════════════════
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const ease = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  spring: (t) => 1 - Math.exp(-8 * t) * Math.cos(14 * t),
};

// ════════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API — gentle 8-bit blips)
// ════════════════════════════════════════════════════════════════
let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}
function blip(freq, dur, type = "square", vol = 0.04) {
  try {
    const ac = getAC();
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {}
}
const sndSpawn = () => {
  blip(880, 0.05, "square", 0.04);
  setTimeout(() => blip(1320, 0.08, "square", 0.03), 60);
};
const sndRemove = () => {
  blip(440, 0.05, "sawtooth", 0.03);
  setTimeout(() => blip(220, 0.12, "sawtooth", 0.02), 60);
};
const sndState = () => blip(660, 0.04, "square", 0.02);

// ════════════════════════════════════════════════════════════════
//  ANIMATION CONFIG  ← PRIMARY CUSTOMIZATION POINT
//
//  When you have real sprite sheets, set:
//    SPRITE_SHEETS.characters.src = './assets/characters.png';
//  Each state's spriteRow maps to the row in the sheet;
//  frames/fps control playback. spriteW/spriteH are tile dims.
//
//  Until then, the CHAR_DRAW table (below) drives placeholder
//  procedural drawing — swap drawXxx for ctx.drawImage calls.
// ════════════════════════════════════════════════════════════════

// const SPRITE_SHEETS = { characters: Object.assign(new Image(), { src: './assets/characters.png' }) };
// const SPRITE_W = 24, SPRITE_H = 32; // px per frame in sheet

const ANIM = {
  // ── Locomotion ────────────────────────────────────────────────
  walking: { frames: 8, fps: 12, loop: true, spriteRow: 0 },

  // ── Desk transitions ─────────────────────────────────────────
  sitting_down: { frames: 6, fps: 10, loop: false, spriteRow: 1 }, // walk→desk
  standing_up: { frames: 6, fps: 10, loop: false, spriteRow: 11 }, // desk→walk

  // ── Desk work states ─────────────────────────────────────────
  typing_normal: { frames: 4, fps: 6, loop: true, spriteRow: 2 }, // steady focus
  typing_furious: { frames: 4, fps: 16, loop: true, spriteRow: 3 }, // intense tool (Bash/Write)
  thinking: { frames: 6, fps: 5, loop: true, spriteRow: 4 }, // text output, hand on chin
  drinking_desk: { frames: 8, fps: 6, loop: false, spriteRow: 5 }, // idle coffee break
  spinning_chair: { frames: 12, fps: 10, loop: false, spriteRow: 6 }, // idle fun ~60s
  celebrating: { frames: 10, fps: 14, loop: false, spriteRow: 7 }, // task complete! jump + confetti

  // ── Couch transitions ─────────────────────────────────────────
  sitting_couch: { frames: 4, fps: 8, loop: false, spriteRow: 8 }, // walk→couch

  // ── Couch rest states (4 варианта — выбирается по хэшу ID) ─────
  sleeping: { frames: 6, fps: 4, loop: true, spriteRow: 9 }, // Zzz частицы
  drinking_beer: { frames: 8, fps: 6, loop: true, spriteRow: 10 }, // пьёт пиво
  phone: { frames: 10, fps: 8, loop: true, spriteRow: 12 }, // скроллит телефон
  stretching: { frames: 8, fps: 5, loop: true, spriteRow: 13 }, // зевает/тянется
  // ── Kitchen ──────────────────────────────────────────────────────
  at_coffee: { frames: 8, fps: 6, loop: true, spriteRow: 14 },
  at_fridge: { frames: 6, fps: 5, loop: true, spriteRow: 15 },
  eating: { frames: 8, fps: 5, loop: true, spriteRow: 16 },
  // ── Floor solo ───────────────────────────────────────────────────
  window_gaze: { frames: 4, fps: 3, loop: true, spriteRow: 17 },
  headphones: { frames: 8, fps: 8, loop: true, spriteRow: 18 },
  air_guitar: { frames: 8, fps: 10, loop: true, spriteRow: 19 },
  in_hammock: { frames: 6, fps: 4, loop: true, spriteRow: 24 },
  yoga: { frames: 6, fps: 4, loop: true, spriteRow: 20 },
  reading: { frames: 4, fps: 3, loop: true, spriteRow: 21 },
  desk_nap: { frames: 4, fps: 3, loop: true, spriteRow: 22 },
  desk_yawn: { frames: 12, fps: 4, loop: false, spriteRow: 35 },
  doodling: { frames: 6, fps: 5, loop: true, spriteRow: 23 },
  plant_care: { frames: 6, fps: 4, loop: true, spriteRow: 24 },
  // ── Group ────────────────────────────────────────────────────────
  chatting_l: { frames: 8, fps: 6, loop: true, spriteRow: 25 },
  chatting_r: { frames: 8, fps: 6, loop: true, spriteRow: 25 },
  arguing_l: { frames: 8, fps: 8, loop: true, spriteRow: 26 },
  arguing_r: { frames: 8, fps: 8, loop: true, spriteRow: 26 },
  gossiping_l: { frames: 6, fps: 6, loop: true, spriteRow: 27 },
  gossiping_r: { frames: 6, fps: 6, loop: true, spriteRow: 27 },
  // ── Activity zone ─────────────────────────────────────────────────
  gaming: { frames: 8, fps: 8, loop: true, spriteRow: 29 },
  treadmill: { frames: 8, fps: 14, loop: true, spriteRow: 30 },
  bench_press: { frames: 8, fps: 8, loop: true, spriteRow: 30 },
  boxing: { frames: 8, fps: 10, loop: true, spriteRow: 30 },
  cycling: { frames: 8, fps: 10, loop: true, spriteRow: 30 },
  lifting_weights: { frames: 8, fps: 8, loop: true, spriteRow: 30 },
  rowing: { frames: 8, fps: 8, loop: true, spriteRow: 30 },
  ping_pong_l: { frames: 6, fps: 10, loop: true, spriteRow: 31 },
  ping_pong_r: { frames: 6, fps: 10, loop: true, spriteRow: 31 },
  smoking_beer: { frames: 12, fps: 6, loop: true, spriteRow: 32 },
  petting_cat: { frames: 8, fps: 5, loop: true, spriteRow: 33 },
  cleaning: { frames: 6, fps: 5, loop: true, spriteRow: 34 },
};

// ════════════════════════════════════════════════════════════════
//  PARTICLE SYSTEM
// ════════════════════════════════════════════════════════════════
class Particle {
  constructor(x, y, o = {}) {
    this.x = x;
    this.y = y;
    this.vx = (o.vx ?? 0) + (Math.random() - 0.5) * (o.spread ?? 60);
    this.vy = (o.vy ?? -80) + (Math.random() - 0.5) * (o.spread ?? 40);
    this.life = o.life ?? 0.8;
    this.maxLife = this.life;
    this.size = (o.size ?? 3) + Math.random() * 2;
    this.color = o.color ?? "#ffffff";
    this.gravity = o.gravity ?? 120;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpd = (Math.random() - 0.5) * 5;
    this.square = o.square ?? false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    this.rot += this.rotSpd * dt;
  }
  get alive() {
    return this.life > 0;
  }
  get alpha() {
    return clamp(this.life / this.maxLife, 0, 1);
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    if (this.square)
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.ps = [];
  }
  update(dt) {
    this.ps = this.ps.filter((p) => {
      p.update(dt);
      return p.alive;
    });
  }
  draw(ctx) {
    for (const p of this.ps) p.draw(ctx);
  }
  emit(x, y, n, o) {
    for (let i = 0; i < n; i++) this.ps.push(new Particle(x, y, o));
  }

  // Spawn burst — accent color ring
  burst(x, y, color) {
    const cols = [color, "#ffffff", color];
    for (let i = 0; i < 14; i++) {
      this.ps.push(
        new Particle(x, y, {
          vx: Math.cos((i / 14) * Math.PI * 2) * (60 + Math.random() * 60),
          vy: Math.sin((i / 14) * Math.PI * 2) * (60 + Math.random() * 60),
          spread: 0,
          gravity: 80,
          life: 0.7 + Math.random() * 0.3,
          size: 2 + Math.random() * 3,
          color: cols[i % 3],
          square: i % 2 === 0,
        }),
      );
    }
  }

  // Confetti on celebrate
  confetti(x, y) {
    const cols = [
      "#7aa2f7",
      "#9ece6a",
      "#f7768e",
      "#e0af68",
      "#bb9af7",
      "#2ac3de",
      "#ff9e64",
    ];
    for (let i = 0; i < 22; i++) {
      this.ps.push(
        new Particle(x, y, {
          vx: (Math.random() - 0.5) * 220,
          vy: -160 - Math.random() * 100,
          spread: 0,
          gravity: 320,
          life: 1 + Math.random() * 0.6,
          size: 3 + Math.random() * 4,
          color: cols[i % cols.length],
          square: Math.random() > 0.4,
        }),
      );
    }
  }

  // Smoke drift (cigarette)
  smoke(x, y) {
    if (Math.random() < 0.1) {
      this.ps.push(
        new Particle(x, y, {
          vx: (Math.random() - 0.5) * 14,
          vy: -28,
          spread: 6,
          gravity: -8,
          life: 1.6,
          size: 5 + Math.random() * 9,
          color: "#c0b8d8",
        }),
      );
    }
  }

  // Beer foam bubbles
  foam(x, y) {
    if (Math.random() < 0.14) {
      this.ps.push(
        new Particle(x, y, {
          vx: (Math.random() - 0.5) * 10,
          vy: -35,
          spread: 4,
          gravity: -4,
          life: 0.8,
          size: 2 + Math.random() * 3,
          color: "#f0e840",
        }),
      );
    }
  }

  // Zzz float
  zzz(x, y) {
    if (Math.random() < 0.04) {
      this.ps.push(
        new Particle(x, y, {
          vx: 10 + Math.random() * 10,
          vy: -22 - Math.random() * 14,
          spread: 2,
          gravity: -1,
          life: 1.4,
          size: 4 + Math.random() * 5,
          color: "#a9b1d6",
          square: true,
        }),
      );
    }
  }

  // Sweat drops (furious typing)
  sweat(x, y) {
    if (Math.random() < 0.18) {
      this.ps.push(
        new Particle(x, y, {
          vx: (Math.random() - 0.5) * 18,
          vy: 12 + Math.random() * 20,
          spread: 4,
          gravity: 60,
          life: 0.4,
          size: 2,
          color: "#4080c0",
        }),
      );
    }
  }

  // Despawn puff
  puff(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.ps.push(
        new Particle(x, y, {
          vx: (Math.random() - 0.5) * 80,
          vy: -40 - Math.random() * 60,
          spread: 0,
          gravity: 50,
          life: 0.5,
          size: 3 + Math.random() * 4,
          color,
        }),
      );
    }
  }
}
const PS = new ParticleSystem();

// ════════════════════════════════════════════════════════════════
//  CHARACTER DRAW FUNCTIONS  (placeholder — sprite-sheet ready)
//
//  Each fn: (ctx, cx, cy, pal, t)
//    cx/cy = float pixel center
//    pal   = { hair, skin, shirt, pants, accent }
//    t     = normalized anim time [0..1] (loops)
//
//  To use sprite sheets, replace body with:
//    ctx.drawImage(SPRITE_SHEETS.characters,
//      frameIdx * SPRITE_W, cfg.spriteRow * SPRITE_H,
//      SPRITE_W, SPRITE_H, cx - SPRITE_W/2, cy - SPRITE_H/2+4,
//      SPRITE_W*2, SPRITE_H*2);
// ════════════════════════════════════════════════════════════════
function px(ctx, x, y, w, h, c) {
  if (!c) return;
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function shd(ctx, cx, cy, rx = 8, ry = 3) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── helpers: голова с аксессуарами ───────────────────────────────
function drawHeadFront(ctx, cx, cy, pal, blink) {
  // шея
  px(ctx, cx - 2, cy + 2, 4, 4, pal.skin);
  // ── Special pre-head features ───────────────────────────────────
  if (pal.demon) {
    // Demon horns
    ctx.fillStyle = "#601010";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 16);
    ctx.lineTo(cx - 9, cy - 24);
    ctx.lineTo(cx - 3, cy - 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 16);
    ctx.lineTo(cx + 9, cy - 24);
    ctx.lineTo(cx + 3, cy - 16);
    ctx.fill();
  }
  if (pal.cat) {
    // Cat ears
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 14);
    ctx.lineTo(cx - 10, cy - 22);
    ctx.lineTo(cx - 2, cy - 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 14);
    ctx.lineTo(cx + 10, cy - 22);
    ctx.lineTo(cx + 2, cy - 14);
    ctx.fill();
    ctx.fillStyle = pal.skin + "cc";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 15);
    ctx.lineTo(cx - 9, cy - 21);
    ctx.lineTo(cx - 3, cy - 15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 15);
    ctx.lineTo(cx + 9, cy - 21);
    ctx.lineTo(cx + 3, cy - 15);
    ctx.fill();
  }
  if (pal.alien) {
    // Alien antennae
    ctx.strokeStyle = pal.hair;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 16);
    ctx.quadraticCurveTo(cx - 8, cy - 26, cx - 6, cy - 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 16);
    ctx.quadraticCurveTo(cx + 8, cy - 26, cx + 6, cy - 28);
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 28, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 28, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // голова
  const headW = pal.alien ? 8 : 7;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Robot face plate
  if (pal.robot) {
    ctx.fillStyle = pal.skin + "cc";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#304050cc";
    ctx.fillRect(cx - 6, cy - 14, 12, 8); // faceplate
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // уши — elf has pointed ears
  if (pal.elf) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 9);
    ctx.lineTo(cx - 12, cy - 14);
    ctx.lineTo(cx - 6, cy - 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 9);
    ctx.lineTo(cx + 12, cy - 14);
    ctx.lineTo(cx + 6, cy - 7);
    ctx.fill();
    px(ctx, cx - 11, cy - 13, 2, 2, pal.skin + "aa");
    px(ctx, cx + 10, cy - 13, 2, 2, pal.skin + "aa");
  } else {
    px(ctx, cx - 8, cy - 9, 3, 5, pal.skin);
    px(ctx, cx + 5, cy - 9, 3, 5, pal.skin);
    px(ctx, cx - 7, cy - 8, 2, 3, "#d4a07880");
  }
  // волосы
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 17, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 7, cy - 15, 14, 5, pal.hair);
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 9, cy - 18, 18, 4, pal.accent + "cc");
    px(ctx, cx - 7, cy - 22, 14, 6, pal.accent);
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13, headW, 6, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 7, cy - 14, 4, 5, pal.hair);
    px(ctx, cx + 3, cy - 14, 4, 5, pal.hair);
  }
  // глаза
  if (blink) {
    ctx.fillStyle = pal.skin + "dd";
    ctx.fillRect(cx - 4, cy - 10, 4, 2);
    ctx.fillRect(cx + 1, cy - 10, 4, 2);
  } else if (pal.alien) {
    // Big alien eyes (almond-shaped)
    ctx.fillStyle = "#0a1020";
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 10, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 10, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent + "bb";
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 10, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 10, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.robot) {
    // Visor / LED eyes
    ctx.fillStyle = "#001828";
    ctx.fillRect(cx - 6, cy - 12, 12, 5);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(cx - 5, cy - 11, 10, 3);
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(cx - 5, cy - 11, 4, 2);
    ctx.fillStyle = "#ffffff40";
    ctx.fillRect(cx + 2, cy - 11, 3, 2);
  } else if (pal.demon) {
    // Glowing eyes
    ctx.fillStyle = "#ff2000";
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 10, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 10, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8000aa";
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 10, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(cx - 4, cy - 11, 4, 3);
    ctx.fillRect(cx + 1, cy - 11, 4, 3);
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(cx - 4, cy - 11, 2, 2);
    ctx.fillRect(cx + 1, cy - 11, 2, 2);
    if (pal.fatigue) {
      ctx.fillStyle = "#80405050";
      ctx.fillRect(cx - 4, cy - 8, 4, 1);
      ctx.fillRect(cx + 1, cy - 8, 4, 1);
    }
    if (pal.glasses) {
      ctx.strokeStyle = "#808090";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 5, cy - 12, 5, 4);
      ctx.strokeRect(cx, cy - 12, 5, 4);
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 10);
      ctx.lineTo(cx - 8, cy - 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy - 10);
      ctx.lineTo(cx + 8, cy - 9);
      ctx.stroke();
    }
  }
  // рот
  if (!pal.robot) {
    if (pal.cat) {
      ctx.fillStyle = "#e070a0";
      ctx.fillRect(cx - 1, cy - 5, 2, 2); // cat nose
      ctx.strokeStyle = "#c06080";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx - 3, cy - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#c8906090";
      ctx.fillRect(cx - 3, cy - 5, 6, 2);
    }
  }
  if (pal.beard && !pal.robot && !pal.alien && !pal.demon && !pal.cat) {
    px(ctx, cx - 4, cy - 4, 8, 3, pal.hair + "bb");
    px(ctx, cx - 3, cy - 2, 6, 2, pal.hair + "99");
  }
  if (pal.scarf) {
    px(ctx, cx - 5, cy + 1, 10, 3, pal.accent + "cc");
    px(ctx, cx - 4, cy + 3, 3, 4, pal.accent);
  }
}

function drawHeadBack(ctx, cx, cy, pal) {
  px(ctx, cx - 2, cy, 4, 4, pal.skin); // шея
  const headW = pal.alien ? 8 : 7;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // elf pointed ears (back view)
  if (pal.elf) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 9);
    ctx.lineTo(cx - 12, cy - 14);
    ctx.lineTo(cx - 6, cy - 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 9);
    ctx.lineTo(cx + 12, cy - 14);
    ctx.lineTo(cx + 6, cy - 7);
    ctx.fill();
  } else if (!pal.alien) {
    px(ctx, cx - 8, cy - 9, 3, 5, pal.skin);
    px(ctx, cx + 5, cy - 9, 3, 5, pal.skin);
  }
  // cat ears back
  if (pal.cat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 14);
    ctx.lineTo(cx - 10, cy - 22);
    ctx.lineTo(cx - 2, cy - 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 14);
    ctx.lineTo(cx + 10, cy - 22);
    ctx.lineTo(cx + 2, cy - 14);
    ctx.fill();
  }
  // demon horns back
  if (pal.demon) {
    ctx.fillStyle = "#601010";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 16);
    ctx.lineTo(cx - 9, cy - 24);
    ctx.lineTo(cx - 3, cy - 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 16);
    ctx.lineTo(cx + 9, cy - 24);
    ctx.lineTo(cx + 3, cy - 16);
    ctx.fill();
  }
  // волосы сзади
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW + 1, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 17, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, cx - 7, cy - 21, 14, 6, pal.accent);
    px(ctx, cx - 9, cy - 17, 18, 4, pal.accent + "cc");
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, cx - 6, cy - 2, 12, 5, pal.hair);
  } else if (pal.robot) {
    ctx.fillStyle = "#304050";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── head side-view helper ─────────────────────────────────────────
function drawHeadSide(ctx, cx, cy, pal, flipLeft) {
  const d = flipLeft ? -1 : 1;
  px(ctx, cx - 2, cy + 2, 4, 4, pal.skin);
  const headW = pal.alien ? 8 : 7;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pal.elf) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(cx - d * 8, cy - 9);
    ctx.lineTo(cx - d * 12, cy - 14);
    ctx.lineTo(cx - d * 6, cy - 7);
    ctx.fill();
  } else if (!pal.alien) {
    px(ctx, cx - d * 7, cy - 9, 3, 5, pal.skin);
  }
  if (pal.cat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 3 * d, cy - 14);
    ctx.lineTo(cx - 6 * d, cy - 22);
    ctx.lineTo(cx, cy - 14);
    ctx.fill();
    ctx.fillStyle = pal.skin + "cc";
    ctx.beginPath();
    ctx.moveTo(cx - 3 * d, cy - 15);
    ctx.lineTo(cx - 5 * d, cy - 21);
    ctx.lineTo(cx - 1 * d, cy - 15);
    ctx.fill();
  }
  if (pal.demon) {
    ctx.fillStyle = "#601010";
    ctx.beginPath();
    ctx.moveTo(cx + d * 2, cy - 16);
    ctx.lineTo(cx + d * 5, cy - 24);
    ctx.lineTo(cx - d * 1, cy - 16);
    ctx.fill();
  }
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx - d * 3, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx - d * 2, cy - 17, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 8, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13, 6, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 9, cy - 18, 18, 4, pal.accent + "cc");
    px(ctx, cx - 7, cy - 22, 14, 6, pal.accent);
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx - d * 2, cy - 10, headW - 1, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 7, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.robot) {
    ctx.fillStyle = "#304050";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 8, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (pal.alien) {
    ctx.fillStyle = "#0a1020";
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 10, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent + "bb";
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 10, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.robot) {
    ctx.fillStyle = "#001828";
    ctx.fillRect(cx, cy - 12, d * 6, 5);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(cx, cy - 11, d * 5, 3);
  } else if (pal.demon) {
    ctx.fillStyle = "#ff2000";
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 10, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(cx + d * 1, cy - 11, 3, 3);
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(cx + d * 1, cy - 11, 2, 2);
    if (pal.glasses) {
      ctx.strokeStyle = "#808090";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + d * 0.5, cy - 12, 4, 4);
    }
  }
  if (!pal.robot && !pal.cat) {
    px(ctx, cx + d * 6, cy - 7, 2, 3, pal.skin);
  }
  if (!pal.robot) {
    if (pal.cat) {
      ctx.fillStyle = "#e070a0";
      ctx.fillRect(cx + d * 3, cy - 5, 2, 2);
    } else {
      ctx.fillStyle = "#c8906090";
      ctx.fillRect(cx + d * 2, cy - 5, 4, 2);
    }
  }
  if (pal.beard && !pal.robot && !pal.alien && !pal.demon && !pal.cat) {
    px(ctx, cx + d * 1, cy - 4, 5, 3, pal.hair + "bb");
  }
  if (pal.scarf) {
    px(ctx, cx - 4, cy + 1, 8, 3, pal.accent + "cc");
  }
}

// ── 3/4 front head (diagonal toward camera) ─────────────────────
function drawHeadFront34(ctx, cx, cy, pal, flipLeft) {
  const d = flipLeft ? -1 : 1;
  px(ctx, cx - 2, cy + 2, 4, 4, pal.skin);
  const headW = pal.alien ? 8 : 7;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx + d * 1, cy - 8, headW, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pal.elf) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(cx - d * 7, cy - 9);
    ctx.lineTo(cx - d * 11, cy - 14);
    ctx.lineTo(cx - d * 5, cy - 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + d * 8, cy - 9);
    ctx.lineTo(cx + d * 11, cy - 14);
    ctx.lineTo(cx + d * 6, cy - 7);
    ctx.fill();
  } else if (!pal.alien) {
    px(ctx, cx - d * 7, cy - 9, 2, 4, pal.skin);
    px(ctx, cx + d * 6, cy - 9, 3, 5, pal.skin);
  }
  if (pal.cat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 14);
    ctx.lineTo(cx - 9, cy - 22);
    ctx.lineTo(cx - 1, cy - 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 14);
    ctx.lineTo(cx + 9, cy - 22);
    ctx.lineTo(cx + 1, cy - 14);
    ctx.fill();
  }
  if (pal.demon) {
    ctx.fillStyle = "#601010";
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 16);
    ctx.lineTo(cx - 8, cy - 24);
    ctx.lineTo(cx - 2, cy - 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 16);
    ctx.lineTo(cx + 8, cy - 24);
    ctx.lineTo(cx + 2, cy - 16);
    ctx.fill();
  }
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 17, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 7, cy - 15, 14, 5, pal.hair);
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 9, cy - 18, 18, 4, pal.accent + "cc");
    px(ctx, cx - 7, cy - 22, 14, 6, pal.accent);
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13, headW, 6, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, cx - 7, cy - 14, 4, 5, pal.hair);
    px(ctx, cx + 3, cy - 14, 4, 5, pal.hair);
  } else if (pal.robot) {
    ctx.fillStyle = "#304050";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 1, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (pal.alien) {
    ctx.fillStyle = "#0a1020";
    ctx.beginPath();
    ctx.ellipse(cx + d * 3, cy - 10, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - d * 3, cy - 10, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent + "bb";
    ctx.beginPath();
    ctx.ellipse(cx + d * 3, cy - 10, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - d * 3, cy - 10, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.robot) {
    ctx.fillStyle = "#001828";
    ctx.fillRect(cx - 5, cy - 12, 10, 5);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(cx - 4, cy - 11, 8, 3);
  } else if (pal.demon) {
    ctx.fillStyle = "#ff2000";
    ctx.beginPath();
    ctx.ellipse(cx + d * 2, cy - 10, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - d * 3, cy - 10, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(cx + d * 1, cy - 11, 4, 3);
    ctx.fillRect(cx - d * 4, cy - 11, 3, 3);
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(cx + d * 1, cy - 11, 2, 2);
    ctx.fillRect(cx - d * 4, cy - 11, 1, 2);
    if (pal.glasses) {
      ctx.strokeStyle = "#808090";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + d * 0, cy - 12, 5, 4);
      ctx.strokeRect(cx - d * 5, cy - 12, 4, 4);
    }
  }
  if (!pal.robot) {
    if (pal.cat) {
      ctx.fillStyle = "#e070a0";
      ctx.fillRect(cx + d * 0, cy - 5, 2, 2);
    } else {
      ctx.fillStyle = "#c8906090";
      ctx.fillRect(cx - 2, cy - 5, 5, 2);
    }
  }
  if (pal.beard && !pal.robot && !pal.alien && !pal.demon && !pal.cat) {
    px(ctx, cx - 3, cy - 4, 7, 3, pal.hair + "bb");
  }
  if (pal.scarf) {
    px(ctx, cx - 5, cy + 1, 10, 3, pal.accent + "cc");
  }
}

// ── 3/4 back head (diagonal away from camera) ───────────────────
function drawHeadBack34(ctx, cx, cy, pal, flipLeft) {
  const d = flipLeft ? -1 : 1;
  px(ctx, cx - 2, cy + 2, 4, 4, pal.skin);
  const headW = pal.alien ? 8 : 7;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pal.elf) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(cx + d * 8, cy - 9);
    ctx.lineTo(cx + d * 12, cy - 14);
    ctx.lineTo(cx + d * 6, cy - 7);
    ctx.fill();
  } else if (!pal.alien) {
    px(ctx, cx + d * 6, cy - 9, 3, 5, pal.skin);
  }
  if (pal.cat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 14);
    ctx.lineTo(cx - 9, cy - 22);
    ctx.lineTo(cx - 1, cy - 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 14);
    ctx.lineTo(cx + 9, cy - 22);
    ctx.lineTo(cx + 1, cy - 14);
    ctx.fill();
  }
  if (pal.demon) {
    ctx.fillStyle = "#601010";
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 16);
    ctx.lineTo(cx - 8, cy - 24);
    ctx.lineTo(cx - 2, cy - 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 16);
    ctx.lineTo(cx + 8, cy - 24);
    ctx.lineTo(cx + 2, cy - 16);
    ctx.fill();
  }
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW + 1, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx - d * 1, cy - 17, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 4, cy - 6, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, cx - 7, cy - 21, 14, 6, pal.accent);
    px(ctx, cx - 9, cy - 17, 18, 4, pal.accent + "cc");
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx - d * 1, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 4, cy - 6, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, cx - 6, cy - 2, 12, 5, pal.hair);
  } else if (pal.robot) {
    ctx.fillStyle = "#304050";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, headW, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.ellipse(cx + d * 3, cy - 8, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (pal.scarf) {
    px(ctx, cx - 5, cy + 1, 10, 3, pal.accent + "cc");
  }
}

// ── walking (SOUTH — toward camera, original) ───────────────────
function drawWalkS(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx - 6, cy + 14 + lL, 3, 2, "#2a2a3a");
  px(ctx, cx + 1, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx + 1, cy + 14 + lR, 3, 2, "#2a2a3a");
  px(ctx, cx - 6, cy - 2 - bob, 12, 9, pal.shirt);
  px(ctx, cx - 1, cy - 1 - bob, 2, 3, pal.skin);
  px(ctx, cx + 2, cy + 1 - bob, 3, 4, "#ffffff1a");
  px(ctx, cx - 10, cy + aL - bob, 4, 7, pal.skin);
  px(ctx, cx - 10, cy + 6 + aL - bob, 4, 3, pal.skin);
  px(ctx, cx + 6, cy + aR - bob, 4, 7, pal.skin);
  px(ctx, cx + 6, cy + 6 + aR - bob, 4, 3, pal.skin);
  drawHeadFront(ctx, cx, cy - 12 - bob, pal, false);
}
function drawWalking(ctx, cx, cy, pal, t) {
  drawWalkS(ctx, cx, cy, pal, t);
}

// ── walking NORTH (away from camera) ─────────────────────────────
function drawWalkN(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx + 1, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx - 6, cy - 2 - bob, 12, 9, pal.shirt);
  px(ctx, cx - 10, cy + aL - bob, 4, 7, pal.shirt);
  px(ctx, cx - 10, cy + 6 + aL - bob, 4, 3, pal.skin);
  px(ctx, cx + 6, cy + aR - bob, 4, 7, pal.shirt);
  px(ctx, cx + 6, cy + 6 + aR - bob, 4, 3, pal.skin);
  drawHeadBack(ctx, cx, cy - 12 - bob, pal);
}

// ── walking EAST (right side profile) ────────────────────────────
function drawWalkE(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const legF = Math.sin(ph) * 5,
    legB = -legF;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const armF = Math.sin(ph) * 4,
    armB = -armF;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 2, cy + 4 + legB, 5, 9, pal.pants);
  px(ctx, cx - 2, cy + 12 + legB, 5, 4, "#1a1a2a");
  px(ctx, cx - 4, cy - 2 - bob, 9, 9, pal.shirt);
  px(ctx, cx - 3, cy + armB - bob, 4, 7, pal.shirt);
  px(ctx, cx - 3, cy + 6 + armB - bob, 3, 3, pal.skin);
  px(ctx, cx - 1, cy + 4 + legF, 5, 9, pal.pants);
  px(ctx, cx - 1, cy + 12 + legF, 6, 4, "#1a1a2a");
  px(ctx, cx - 1, cy + 14 + legF, 3, 2, "#2a2a3a");
  px(ctx, cx + 2, cy + armF - bob, 4, 7, pal.skin);
  px(ctx, cx + 2, cy + 6 + armF - bob, 3, 3, pal.skin);
  drawHeadSide(ctx, cx, cy - 12 - bob, pal, false);
}

// ── walking WEST (left side profile) ─────────────────────────────
function drawWalkW(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const legF = Math.sin(ph) * 5,
    legB = -legF;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const armF = Math.sin(ph) * 4,
    armB = -armF;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 3, cy + 4 + legB, 5, 9, pal.pants);
  px(ctx, cx - 3, cy + 12 + legB, 5, 4, "#1a1a2a");
  px(ctx, cx - 5, cy - 2 - bob, 9, 9, pal.shirt);
  px(ctx, cx - 1, cy + armB - bob, 4, 7, pal.shirt);
  px(ctx, cx - 1, cy + 6 + armB - bob, 3, 3, pal.skin);
  px(ctx, cx - 4, cy + 4 + legF, 5, 9, pal.pants);
  px(ctx, cx - 5, cy + 12 + legF, 6, 4, "#1a1a2a");
  px(ctx, cx - 5, cy + 14 + legF, 3, 2, "#2a2a3a");
  px(ctx, cx - 6, cy + armF - bob, 4, 7, pal.skin);
  px(ctx, cx - 6, cy + 6 + armF - bob, 3, 3, pal.skin);
  drawHeadSide(ctx, cx, cy - 12 - bob, pal, true);
}

// ── walking SOUTHEAST (3/4 front-right) ──────────────────────────
function drawWalkSE(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 2, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 5, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx + 2, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx - 5, cy - 2 - bob, 11, 9, pal.shirt);
  px(ctx, cx + 1, cy + 1 - bob, 3, 4, "#ffffff1a");
  px(ctx, cx - 9, cy + aL - bob, 4, 7, pal.skin);
  px(ctx, cx - 9, cy + 6 + aL - bob, 3, 3, pal.skin);
  px(ctx, cx + 5, cy + aR - bob, 4, 7, pal.skin);
  px(ctx, cx + 5, cy + 6 + aR - bob, 3, 3, pal.skin);
  drawHeadFront34(ctx, cx, cy - 12 - bob, pal, false);
}

// ── walking SOUTHWEST (3/4 front-left) ───────────────────────────
function drawWalkSW(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 3, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 4, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx + 1, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx - 6, cy - 2 - bob, 11, 9, pal.shirt);
  px(ctx, cx - 3, cy + 1 - bob, 3, 4, "#ffffff1a");
  px(ctx, cx - 9, cy + aL - bob, 4, 7, pal.skin);
  px(ctx, cx - 9, cy + 6 + aL - bob, 3, 3, pal.skin);
  px(ctx, cx + 5, cy + aR - bob, 4, 7, pal.skin);
  px(ctx, cx + 5, cy + 6 + aR - bob, 3, 3, pal.skin);
  drawHeadFront34(ctx, cx, cy - 12 - bob, pal, true);
}

// ── walking NORTHEAST (3/4 back-right) ───────────────────────────
function drawWalkNE(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 2, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 5, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx + 2, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx - 5, cy - 2 - bob, 11, 9, pal.shirt);
  px(ctx, cx - 9, cy + aL - bob, 4, 7, pal.shirt);
  px(ctx, cx - 9, cy + 6 + aL - bob, 3, 3, pal.skin);
  px(ctx, cx + 5, cy + aR - bob, 4, 7, pal.shirt);
  px(ctx, cx + 5, cy + 6 + aR - bob, 3, 3, pal.skin);
  drawHeadBack34(ctx, cx, cy - 12 - bob, pal, false);
}

// ── walking NORTHWEST (3/4 back-left) ────────────────────────────
function drawWalkNW(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lL = Math.sin(ph) * 5,
    lR = -lL;
  const bob = Math.abs(Math.sin(ph)) * 2.5;
  const aL = Math.sin(ph + Math.PI) * 4;
  const aR = Math.sin(ph) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 3, cy + 4 + lL, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 4 + lR, 5, 9, pal.pants);
  px(ctx, cx - 4, cy + 12 + lL, 6, 4, "#1a1a2a");
  px(ctx, cx + 1, cy + 12 + lR, 6, 4, "#1a1a2a");
  px(ctx, cx - 6, cy - 2 - bob, 11, 9, pal.shirt);
  px(ctx, cx - 9, cy + aL - bob, 4, 7, pal.shirt);
  px(ctx, cx - 9, cy + 6 + aL - bob, 3, 3, pal.skin);
  px(ctx, cx + 5, cy + aR - bob, 4, 7, pal.shirt);
  px(ctx, cx + 5, cy + 6 + aR - bob, 3, 3, pal.skin);
  drawHeadBack34(ctx, cx, cy - 12 - bob, pal, true);
}

// ── IDLE standing (no movement) ──────────────────────────────────
function drawWalkIdle(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const breathe = Math.sin(ph * 0.5) * 0.8;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 4, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 4, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 12, 6, 4, "#1a1a2a");
  px(ctx, cx - 6, cy + 14, 3, 2, "#2a2a3a");
  px(ctx, cx + 1, cy + 12, 6, 4, "#1a1a2a");
  px(ctx, cx + 1, cy + 14, 3, 2, "#2a2a3a");
  px(ctx, cx - 6, cy - 2 - breathe, 12, 9, pal.shirt);
  px(ctx, cx - 1, cy - 1 - breathe, 2, 3, pal.skin);
  px(ctx, cx + 2, cy + 1 - breathe, 3, 4, "#ffffff1a");
  px(ctx, cx - 10, cy - breathe, 4, 7, pal.skin);
  px(ctx, cx - 10, cy + 6 - breathe, 4, 3, pal.skin);
  px(ctx, cx + 6, cy - breathe, 4, 7, pal.skin);
  px(ctx, cx + 6, cy + 6 - breathe, 4, 3, pal.skin);
  drawHeadFront(ctx, cx, cy - 12 - breathe, pal, false);
}

// ── directional walk dispatch ────────────────────────────────────
const WALK_DIR_FN = {
  S: drawWalkS,
  N: drawWalkN,
  E: drawWalkE,
  W: drawWalkW,
  SE: drawWalkSE,
  SW: drawWalkSW,
  NE: drawWalkNE,
  NW: drawWalkNW,
  IDLE: drawWalkIdle,
};

// ── sitting_down (transition: stand → chair) ─────────────────────
function drawSittingDown(ctx, cx, cy, pal, t) {
  const e = ease.inOut(t);
  const sinkY = e * 9; // body sinks into chair
  const legFold = e * 5; // legs fold under
  shd(ctx, cx, cy + 14);
  // legs bending as agent lowers
  px(ctx, cx - 4, cy + 6 + sinkY, 4, Math.max(3, 8 - legFold) | 0, pal.pants);
  px(ctx, cx + 1, cy + 6 + sinkY, 4, Math.max(3, 8 - legFold) | 0, pal.pants);
  // shoes fade under desk
  if (e < 0.7) {
    ctx.globalAlpha = 1 - e * 1.2;
    px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
    px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
    ctx.globalAlpha = 1;
  }
  // torso sinking
  px(ctx, cx - 5, cy - 2 + sinkY, 11, 9, pal.shirt);
  px(ctx, cx, cy - 1 + sinkY, 1, 7, "#ffffff18");
  // arms settling onto desk
  const armDrop = e * 4;
  px(ctx, cx - 11, cy + 1 + armDrop, 7, 3, pal.skin);
  px(ctx, cx + 4, cy + 1 + armDrop, 7, 3, pal.skin);
  // head follows body
  drawHeadFront(ctx, cx, cy - 12 + sinkY * 0.75, pal, false);
}

// ── typing_normal (back to viewer, slow bob) ──────────────────────
function drawTypingNormal(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const arm = Math.sin(ph) * 2.5;
  const nod = Math.sin(ph * 0.3) * 1.5;
  shd(ctx, cx, cy + 16);
  // legs
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  // keyboard glow
  ctx.fillStyle = "#3a60d840";
  ctx.fillRect((cx - 12) | 0, (cy + 2) | 0, 24, 3);
  // body
  px(ctx, cx - 6, cy - 3, 13, 9, pal.shirt);
  px(ctx, cx - 1, cy - 2, 2, 7, "#ffffff18");
  px(ctx, cx - 8, cy - 1, 3, 4, pal.shirt);
  px(ctx, cx + 5, cy - 1, 3, 4, pal.shirt);
  // arms reaching to keyboard
  px(ctx, cx - 13, cy + arm, 8, 3, pal.skin);
  px(ctx, cx - 13, cy + 3 + arm, 5, 4, pal.skin);
  px(ctx, cx + 5, cy - arm, 8, 3, pal.skin);
  px(ctx, cx + 5, cy + 3 - arm, 5, 4, pal.skin);
  // head (back) with slow nod
  drawHeadBack(ctx, cx, cy - 12 + nod, pal);
  // Finger movement on keyboard
  const fp = t * Math.PI * 2;
  ctx.fillStyle = pal.skin;
  for (let fi = 0; fi < 4; fi++) {
    const fx = cx - 10 + fi * 5;
    const fy = cy + 5 + Math.sin(fp * (6 + fi) + fi * 1.3) * 1.5;
    ctx.fillRect(fx, fy, 3, 2);
  }
}

// ── typing_furious ────────────────────────────────────────────────
function drawTypingFurious(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const shk = Math.sin(ph * 5) * 3;
  const arm = Math.sin(ph * 6) * 5;
  const hshk = Math.sin(ph * 7) * 2;
  shd(ctx, cx, cy + 14);
  px(ctx, cx - 4, cy + 6, 4, 8, pal.pants);
  px(ctx, cx + 1, cy + 6, 4, 8, pal.pants);
  // keyboard glow bright
  ctx.fillStyle = "#6080ff60";
  ctx.fillRect((cx - 12) | 0, (cy + 2) | 0, 24, 3);
  // leaning body
  px(ctx, cx - 6 + shk, cy - 4, 13, 11, pal.shirt);
  px(ctx, cx - 1 + shk, cy - 3, 2, 8, "#ffffff18");
  // arms flying
  px(ctx, cx - 15 + shk, cy - 1 + arm, 10, 3, pal.skin);
  px(ctx, cx + 5 + shk, cy - 1 - arm, 10, 3, pal.skin);
  // head shaking with hair chaos
  ctx.save();
  ctx.translate(cx + hshk, cy - 12);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -3, 8, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, -3, -12, 3, 5, pal.hair);
  px(ctx, 2, -13, 4, 6, pal.hair); // hair standing up
  ctx.restore();
}

// ── thinking (side profile, hand on chin) ────────────────────────
function drawThinking(ctx, cx, cy, pal, t) {
  const bob = Math.sin(t * Math.PI * 2 * 0.3) * 1.5;
  const eyeLid = Math.abs(Math.sin(t * Math.PI * 2 * 0.4)); // slow blink
  shd(ctx, cx, cy + 14);
  px(ctx, cx - 4, cy + 7, 4, 7, pal.pants);
  px(ctx, cx + 1, cy + 7, 4, 7, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 2, 11, 9, pal.shirt);
  // one arm with hand on chin
  px(ctx, cx - 9, cy + 2, 3, 6, pal.skin); // arm down
  px(ctx, cx + 5, cy - 1, 3, 5, pal.skin); // arm horizontal
  px(ctx, cx + 8, cy - 4, 5, 3, pal.skin); // forearm to chin
  // head (side profile) — turned slightly
  ctx.save();
  ctx.translate(cx, cy - 9 + bob);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  if (pal.hat) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-8, -14, 16, 6);
    ctx.fillRect(-10, -10, 20, 4);
  }
  // eye (one visible)
  const ey = eyeLid < 0.15 ? 0 : 3;
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-5, -3, 3, ey);
  ctx.fillStyle = "#ffffff60";
  ctx.fillRect(-5, -3, 1, Math.min(ey, 1));
  // thoughtful mouth
  ctx.fillStyle = "#c8906060";
  ctx.fillRect(-4, 3, 5, 2);
  ctx.fillStyle = "#a07050";
  ctx.fillRect(-4, 5, 2, 1); // slight frown curve
  if (pal.beard) {
    px(ctx, -5, 3, 8, 3, pal.hair + "bb");
  }
  ctx.restore();
}

// ── drinking_desk ─────────────────────────────────────────────────
function drawDrinkingDesk(ctx, cx, cy, pal, t) {
  const lift = Math.sin(t * Math.PI * 2) * 8;
  shd(ctx, cx, cy + 14);
  px(ctx, cx - 4, cy + 7, 4, 7, pal.pants);
  px(ctx, cx + 1, cy + 7, 4, 7, pal.pants);
  px(ctx, cx - 6, cy - 2, 12, 9, pal.shirt);
  px(ctx, cx, cy - 1, 1, 7, "#ffffff18");
  px(ctx, cx - 11, cy + 1, 6, 3, pal.skin);
  px(ctx, cx + 5, cy - lift * 0.6, 6, 3, pal.skin);
  const my = cy - 2 - lift * 0.6;
  px(ctx, cx + 10, my, 7, 8, "#c8a060");
  px(ctx, cx + 10, my, 7, 2, "#f0f0c0");
  px(ctx, cx + 17, my + 2, 3, 4, "#a08040");
  ctx.save();
  ctx.globalAlpha = 0.4 + Math.sin(t * Math.PI * 4) * 0.2;
  ctx.fillStyle = "#ffffff60";
  ctx.beginPath();
  ctx.arc(cx + 13, my - 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 9, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, cx - 6, cy - 4, 12, 4, pal.hair);
}

// ── spinning_chair ────────────────────────────────────────────────
function drawSpinningChair(ctx, cx, cy, pal, t) {
  const sx = Math.cos(t * Math.PI * 2);
  shd(ctx, cx, cy + 14);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, 1);
  ctx.fillStyle = pal.shirt;
  ctx.fillRect(-6, -2, 12, 9);
  ctx.fillStyle = pal.skin;
  ctx.fillRect(-12, 0, 6, 3);
  ctx.fillRect(7, 0, 6, 3);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, -9, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -10, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -11, 3, 1);
  ctx.fillRect(-4, -9, 3, 1);
  ctx.fillRect(1, -11, 3, 1);
  ctx.fillRect(1, -9, 3, 1);
  ctx.fillStyle = "#c8906080";
  ctx.fillRect(-3, -6, 5, 1);
  ctx.restore();
}

// ── celebrating ───────────────────────────────────────────────────
function drawCelebrating(ctx, cx, cy, pal, t) {
  const jump = Math.sin(t * Math.PI) * 18;
  const jy = cy - jump;
  const kick = Math.sin(t * Math.PI * 2) * 8;
  const armOff = Math.min(t * 2, 1) * 14;
  shd(ctx, cx, cy + 14, 9, 3);
  px(ctx, cx - 4, jy + 8 + kick, 4, 7, pal.pants);
  px(ctx, cx + 1, jy + 8 - kick, 4, 7, pal.pants);
  px(ctx, cx - 5, jy + 14 + kick, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, jy + 14 - kick, 5, 3, "#1a1a2a");
  px(ctx, cx - 6, jy, 12, 9, pal.shirt);
  px(ctx, cx - 9, jy - armOff + 2, 3, 8, pal.skin);
  px(ctx, cx + 6, jy - armOff + 2, 3, 8, pal.skin);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  px(ctx, cx - 7, jy - 14, 4, 5, pal.hair);
  px(ctx, cx + 3, jy - 14, 4, 5, pal.hair);
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 4, jy - 12, 3, 3);
  ctx.fillRect(cx + 1, jy - 12, 3, 3);
  ctx.fillStyle = "#ffffff80";
  ctx.fillRect(cx - 4, jy - 12, 1, 1);
  ctx.fillRect(cx + 1, jy - 12, 1, 1);
  ctx.fillStyle = "#c89060";
  ctx.fillRect(cx - 4, jy - 7, 8, 2);
  ctx.fillRect(cx - 5, jy - 8, 2, 2);
  ctx.fillRect(cx + 3, jy - 8, 2, 2);
}

// ── phone (couch) — hunched forward, bright screen ───────────────
function drawPhone(ctx, cx, cy, pal, t) {
  const scroll = (t * 4) % 1;
  const glow = 0.7 + Math.sin(t * Math.PI * 2 * 0.2) * 0.2;
  shd(ctx, cx - 4, cy + 10, 14, 3);
  // legs
  px(ctx, cx - 20, cy + 4, 12, 6, pal.pants);
  px(ctx, cx - 10, cy + 8, 4, 5, pal.pants);
  px(ctx, cx - 22, cy + 9, 6, 3, "#1a1a2a");
  // body hunched forward
  px(ctx, cx - 8, cy - 2, 12, 9, pal.shirt);
  // arms holding phone
  px(ctx, cx - 8, cy - 8, 4, 9, pal.skin);
  px(ctx, cx + 2, cy - 8, 4, 9, pal.skin);
  // LARGE PHONE — clearly visible glowing screen
  const phx = cx - 8,
    phy = cy - 26;
  ctx.fillStyle = "#0d0d1e";
  ctx.fillRect(phx | 0, phy | 0, 14, 20);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect((phx + 1) | 0, (phy + 1) | 0, 12, 18);
  // BRIGHT screen glow
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = SCREEN_C;
  ctx.fillRect((phx + 1) | 0, (phy + 2) | 0, 12, 14);
  const lc = ["#7aa2f7", "#9ece6a", "#f7768e", "#bb9af7", "#e0af68"];
  for (let i = 0; i < 5; i++) {
    const ly = (phy + 3 + i * 2.5 - scroll * 12) | 0;
    if (ly > phy + 1 && ly < phy + 15) {
      ctx.fillStyle = lc[(i + ((t * 1.5) | 0)) % lc.length];
      const lw = 3 + (((i * 7 + t * 3) | 0) % 8);
      ctx.fillRect((phx + 2) | 0, ly, lw, 1);
    }
  }
  ctx.restore();
  // home button
  ctx.fillStyle = "#2a2a40";
  ctx.beginPath();
  ctx.arc(phx + 7, phy + 18, 2, 0, Math.PI * 2);
  ctx.fill();
  // thumb
  px(ctx, phx + 4, (phy + 7 + scroll * 6) | 0, 4, 5, pal.skin);
  // screen glow on face
  ctx.save();
  ctx.globalAlpha = 0.18 * glow;
  ctx.fillStyle = "#5090e0";
  ctx.fillRect((cx - 6) | 0, (cy - 24) | 0, 14, 14);
  ctx.restore();
  // HEAD tilted down looking at phone
  ctx.save();
  ctx.translate(cx + 1, cy - 12);
  ctx.rotate(0.35);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 6, -2, 3, 5, pal.skin); // ear
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 6, 0, -Math.PI, 0);
  ctx.fill();
  if (pal.glasses) {
    ctx.strokeStyle = "#808090";
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -3, 5, 4);
    ctx.strokeRect(0, -3, 5, 4);
  }
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -2, 4, 3);
  ctx.fillRect(1, -2, 4, 3);
  ctx.fillStyle = "#c8906050";
  ctx.fillRect(-2, 2, 5, 2);
  ctx.restore();
}

// ── stretching / yawning (couch) — arms wide, Y silhouette ───────
function drawStretching(ctx, cx, cy, pal, t) {
  const phase = t * Math.PI * 2;
  const armH = Math.sin(phase * 0.35) * 12 + 10; // arms go up and down slowly
  const mouthW = Math.abs(Math.sin(phase * 0.3)); // mouth opens wide
  shd(ctx, cx, cy + 14, 14, 3);
  // legs (sitting)
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  // body
  px(ctx, cx - 5, cy - 2, 11, 8, pal.shirt);
  // LEFT ARM stretched up-left (Y shape)
  px(ctx, cx - 8, cy - 3, 3, 7, pal.skin); // upper arm down
  px(ctx, cx - 14, cy - 8 - armH, 4, armH + 8, pal.skin); // forearm stretching up-left
  px(ctx, cx - 16, cy - 8 - armH, 6, 6, pal.skin); // hand open
  // RIGHT ARM stretched up-right
  px(ctx, cx + 6, cy - 3, 3, 7, pal.skin);
  px(ctx, cx + 10, cy - 8 - armH, 4, armH + 8, pal.skin);
  px(ctx, cx + 10, cy - 8 - armH, 6, 6, pal.skin);
  // HEAD — face front, yawning expression
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, cx - 8, cy - 14, 3, 5, pal.skin);
  px(ctx, cx + 5, cy - 14, 3, 5, pal.skin); // ears
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 15, 7, 5, 0, -Math.PI, 0);
  ctx.fill();
  if (pal.hat) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect((cx - 8) | 0, (cy - 26) | 0, 16, 6);
    ctx.fillRect((cx - 10) | 0, (cy - 22) | 0, 20, 4);
  }
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 22, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // EYES squinting from yawn
  const sq = Math.max(0, mouthW - 0.1);
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect((cx - 4) | 0, (cy - 15) | 0, 4, Math.max(1, sq * 4) | 0);
  ctx.fillRect((cx + 1) | 0, (cy - 15) | 0, 4, Math.max(1, sq * 4) | 0);
  // BIG YAWNING MOUTH
  if (mouthW > 0.15) {
    ctx.fillStyle = "#2a0808";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 9, 4, 5 * mouthW, 0, 0, Math.PI * 2);
    ctx.fill();
    if (mouthW > 0.4) {
      ctx.fillStyle = "#f0e0d0";
      ctx.fillRect((cx - 3) | 0, (cy - 11) | 0, 6, 2); // top teeth
      ctx.fillStyle = "#e8d0c0";
      ctx.fillRect((cx - 3) | 0, (cy - 8 + 4 * mouthW) | 0, 6, 2); // bottom teeth
    }
  } else {
    ctx.fillStyle = "#c8906060";
    ctx.fillRect((cx - 3) | 0, (cy - 9) | 0, 6, 2);
  }
  if (pal.beard) {
    px(ctx, cx - 4, cy - 8, 8, 3, pal.hair + "bb");
  }
}

// ── sleeping (couch) — horizontal with pillow & closed eyes ───────
function drawSleeping(ctx, cx, cy, pal, t) {
  const br = Math.sin(t * Math.PI * 2 * 0.2) * 1.2; // breathing
  shd(ctx, cx - 10, cy + 12, 20, 3);
  // pillow (clearly visible)
  ctx.fillStyle = "#7a6898";
  ctx.fillRect((cx - 22) | 0, (cy - 7 + br) | 0, 14, 12);
  ctx.fillStyle = "#9a82b8";
  ctx.fillRect((cx - 21) | 0, (cy - 6 + br) | 0, 12, 10);
  ctx.fillStyle = "#b090d0";
  ctx.fillRect((cx - 20) | 0, (cy - 5 + br) | 0, 6, 3); // highlight
  // legs stretched flat
  px(ctx, cx - 22, cy + 4 + br, 15, 6, pal.pants);
  px(ctx, cx - 25, cy + 4 + br, 4, 6, pal.pants); // bent leg
  px(ctx, cx - 26, cy + 9 + br, 7, 3, "#1a1a2a"); // boots
  // body lying
  px(ctx, cx - 10, cy + 1 + br, 14, 8 + br * 0.5, pal.shirt);
  // arm along body
  px(ctx, cx - 8, cy + 2 + br, 12, 3, pal.skin);
  // HEAD on pillow (side view, peaceful face)
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy - 1 + br, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // ear
  px(ctx, cx + 12, cy - 2 + br, 3, 5, pal.skin);
  // hair
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy - 4 + br, 9, 6, 0, Math.PI, 0);
  ctx.fill();
  if (pal.hat) {
    px(ctx, cx - 2, cy - 14 + br, 18, 6, pal.accent);
    px(ctx, cx - 4, cy - 10 + br, 22, 4, pal.accent + "cc");
  }
  // CLOSED EYES — clear horizontal lines
  ctx.fillStyle = "#2a1820";
  ctx.fillRect((cx + 2) | 0, (cy - 2 + br) | 0, 5, 1);
  ctx.fillRect((cx + 8) | 0, (cy - 2 + br) | 0, 3, 1);
  // tiny smile (content)
  ctx.fillStyle = "#c8906070";
  ctx.fillRect((cx + 3) | 0, (cy + 2 + br) | 0, 4, 1);
  ctx.fillRect((cx + 3) | 0, (cy + 3 + br) | 0, 1, 1);
  ctx.fillRect((cx + 6) | 0, (cy + 3 + br) | 0, 1, 1);
}

// ── drinking_beer (couch) — large mug, tilting head ──────────────
function drawDrinkingBeer(ctx, cx, cy, pal, t) {
  const sip = Math.sin(t * Math.PI * 2 * 0.25);
  const tilt = Math.max(0, sip) * 20; // head tilts back when sipping
  const armUp = Math.max(0, sip) * 10 + 6;
  shd(ctx, cx - 8, cy + 10, 18, 3);
  // legs
  px(ctx, cx - 22, cy + 4, 14, 6, pal.pants);
  px(ctx, cx - 12, cy + 9, 5, 5, pal.pants);
  px(ctx, cx - 26, cy + 9, 7, 3, "#1a1a2a");
  // body sitting upright
  px(ctx, cx - 8, cy - 2, 13, 10, pal.shirt);
  px(ctx, cx - 2, cy - 1, 2, 8, "#ffffff18");
  // arm holding mug UP — key silhouette
  px(ctx, cx - 11, cy - 3 - armUp, 4, 12, pal.skin);
  // BIG BEER MUG
  const my = cy - 14 - armUp;
  ctx.fillStyle = "#e8b820";
  ctx.fillRect((cx - 14) | 0, my | 0, 13, 15); // body
  ctx.fillStyle = "#f5d040";
  ctx.fillRect((cx - 13) | 0, my | 0, 11, 5); // foam top
  ctx.fillStyle = "#fffff080";
  ctx.fillRect((cx - 12) | 0, my | 0, 4, 4); // foam hi
  ctx.fillStyle = "#c09010";
  ctx.fillRect((cx - 1) | 0, (my + 2) | 0, 5, 9); // handle
  ctx.fillStyle = "#a07008";
  ctx.fillRect((cx - 1) | 0, (my + 2) | 0, 2, 9); // handle dark
  ctx.fillStyle = "#c89018";
  ctx.fillRect((cx - 12) | 0, (my + 5) | 0, 9, 9); // beer
  ctx.fillStyle = "#d4a020";
  ctx.fillRect((cx - 12) | 0, (my + 5) | 0, 2, 9); // shine
  // right arm relaxed
  px(ctx, cx + 5, cy + 1, 8, 3, pal.skin);
  // head — tilts back when drinking
  ctx.save();
  ctx.translate(cx + 2, cy - 8);
  ctx.rotate((-tilt * Math.PI) / 180);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 6, 0, Math.PI, 0);
  ctx.fill();
  if (!pal.hat) {
    px(ctx, -7, -5, 3, 4, pal.hair);
    px(ctx, 3, -5, 3, 4, pal.hair);
  }
  if (pal.hat) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-8, -14, 16, 6);
    ctx.fillRect(-10, -10, 20, 4);
  }
  ctx.fillStyle = "#1a1b26";
  if (tilt > 8) {
    // eyes closed, gulping
    ctx.fillRect(-4, -1, 4, 1);
    ctx.fillRect(1, -1, 4, 1);
    ctx.fillStyle = "#80302090";
    ctx.beginPath();
    ctx.ellipse(0, 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-4, -2, 4, 3);
    ctx.fillRect(1, -2, 4, 3);
    ctx.fillStyle = "#ffffff60";
    ctx.fillRect(-4, -2, 1, 1);
    ctx.fillRect(1, -2, 1, 1);
    ctx.fillStyle = "#c8906060";
    ctx.fillRect(-2, 2, 5, 2);
  }
  if (pal.beard) {
    ctx.fillStyle = pal.hair + "bb";
    ctx.fillRect(-4, 4, 8, 3);
  }
  ctx.restore();
}

// ── at_coffee (kitchen — pressing button, waiting, sipping) ──────
function drawAtCoffee(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const press = Math.sin(ph * 2) > 0.6 ? 1 : 0; // finger presses button
  const sip = Math.sin(ph * 0.5);
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arm reaching to machine
  px(ctx, cx + 4, cy - 1 - press, 8, 3, pal.skin);
  px(ctx, cx + 11, cy - 2 - press, 3, 4, pal.skin);
  // other arm holding cup
  const cupY = cy - 1 - Math.max(0, sip) * 6;
  px(ctx, cx - 11, cy + 1, 7, 3, pal.skin);
  // coffee cup
  ctx.fillStyle = "#d0c0a0";
  ctx.fillRect((cx - 14) | 0, cupY | 0, 6, 7);
  ctx.fillStyle = "#3a1808";
  ctx.fillRect((cx - 13) | 0, (cupY + 2) | 0, 4, 5);
  ctx.fillStyle = "#ffffff40";
  ctx.fillRect((cx - 13) | 0, cupY | 0, 2, 2);
  // steam from cup
  if (Math.random() < 0.08) PS.smoke(cx - 11, cupY - 2);
  drawHeadFront(ctx, cx, cy - 12, pal, Math.abs(Math.sin(ph * 0.7)) < 0.05);
}

// ── at_fridge (kitchen — opening, looking inside, taking item) ───
function drawAtFridge(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const bend = Math.sin(ph * 0.5) * 8; // bending to look in
  const reach = Math.max(0, Math.sin(ph * 0.5)) * 6;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5 + bend * 0.3, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5 + bend * 0.3, 4, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3 + bend * 0.2, 11, 9, pal.shirt);
  // arm reaching into fridge
  px(ctx, cx + 5, cy + reach, 8, 3, pal.skin);
  // other arm bracing on door
  px(ctx, cx - 11, cy + 1, 7, 3, pal.skin);
  // head looking in (slight bow)
  ctx.save();
  ctx.translate(cx, cy - 10 + bend * 0.4);
  ctx.rotate(bend * 0.03);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.restore();
}

// ── eating (kitchen table — sandwich/snack) ───────────────────────
function drawEating(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const bite = Math.sin(ph * 1.5) > 0.5; // takes a bite
  const chew = Math.sin(ph * 3) * 0.5;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // both arms at table level
  px(ctx, cx - 11, cy + 1, 6, 3, pal.skin);
  px(ctx, cx + 5, cy + 1, 6, 3, pal.skin);
  // sandwich/food
  ctx.fillStyle = "#d4b870";
  ctx.fillRect((cx - 5) | 0, (cy - 5) | 0, 10, 5);
  ctx.fillStyle = "#80c050";
  ctx.fillRect((cx - 4) | 0, (cy - 4) | 0, 8, 2);
  ctx.fillStyle = "#c05030";
  ctx.fillRect((cx - 4) | 0, (cy - 3) | 0, 8, 1);
  ctx.fillStyle = "#e0c880";
  ctx.fillRect((cx - 5) | 0, (cy - 6) | 0, 10, 2);
  // head
  drawHeadFront(ctx, cx, cy - 14, pal, !bite);
  // mouth open/chewing
  if (bite) {
    ctx.fillStyle = "#301010";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── window_gaze (standing at window) ─────────────────────────────
function drawWindowGaze(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const sway = Math.sin(ph * 0.2) * 1.5;
  const armCross = Math.sin(ph * 0.15) * 1;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arms crossed over chest
  px(ctx, cx - 9, cy + 1 + armCross, 14, 3, pal.skin);
  px(ctx, cx - 7, cy + 3 - armCross, 12, 3, pal.skin);
  // head (back, looking at window)
  drawHeadBack(ctx, cx + sway, cy - 12, pal);
  // window reflection glow
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#80b0ff";
  ctx.fillRect((cx - 8) | 0, (cy - 24) | 0, 16, 18);
  ctx.restore();
}

// ── headphones (subtle dance / head bob) ─────────────────────────
function drawHeadphones(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const bob = Math.sin(ph) * 3;
  const hip = Math.sin(ph) * 2;
  const arm1 = Math.sin(ph + 0.5) * 4;
  const arm2 = Math.sin(ph - 0.5) * 4;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4 + hip, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1 + hip, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5 + hip, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1 + hip, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5 + hip * 0.5, cy - 3, 11, 9, pal.shirt);
  // arms moving to beat
  px(ctx, cx - 11, cy + arm1, 6, 3, pal.skin);
  px(ctx, cx + 5, cy + arm2, 6, 3, pal.skin);
  // head bobbing
  drawHeadFront(ctx, cx, cy - 12 + bob, pal, false);
  // headphone band
  ctx.fillStyle = "#404060";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 20 + bob, 8, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#404060";
  ctx.fillRect((cx - 10) | 0, (cy - 22 + bob) | 0, 4, 5);
  ctx.fillRect((cx + 6) | 0, (cy - 22 + bob) | 0, 4, 5);
  ctx.fillStyle = "#606090";
  ctx.fillRect((cx - 9) | 0, (cy - 21 + bob) | 0, 3, 4);
  ctx.fillRect((cx + 7) | 0, (cy - 21 + bob) | 0, 3, 4);
  // music notes particle
  if (Math.random() < 0.03)
    PS.emit(cx + 8, cy - 22 + bob, 1, {
      vx: 8,
      vy: -20,
      spread: 6,
      gravity: -5,
      life: 1.2,
      size: 4,
      color: pal.accent,
    });
}

// ── air_guitar (enthusiastic!) ────────────────────────────────────
function drawAirGuitar(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const strum = Math.sin(ph * 3) * 8;
  const lean = Math.sin(ph * 1.5) * 6;
  const kick = Math.sin(ph * 2) * 6;
  shd(ctx, cx, cy + 16);
  // legs — one kicks out
  px(ctx, cx - 5 + lean * 0.3, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5 + kick, 5, 9, pal.pants);
  px(ctx, cx - 6 + lean * 0.3, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13 + kick, 6, 3, "#1a1a2a");
  // body leaning
  px(ctx, cx - 5 + lean * 0.4, cy - 3, 11, 9, pal.shirt);
  // strumming arm (right — dramatic)
  px(ctx, cx + 5 + lean * 0.3, cy - 4 - strum, 3, 12, pal.skin);
  px(ctx, cx + 5 + lean * 0.3, cy + 6 - strum, 5, 4, pal.skin);
  // fretting arm (left — extended)
  px(ctx, cx - 14, cy - 2, 10, 3, pal.skin);
  px(ctx, cx - 16, cy - 4, 4, 5, pal.skin);
  // head thrown back
  ctx.save();
  ctx.translate(cx + lean * 0.3, cy - 11);
  ctx.rotate(-lean * 0.04);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 7, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  // open mouth (rocking!)
  ctx.fillStyle = "#301010";
  ctx.fillRect(-3, 2, 6, 3);
  ctx.restore();
  // music note particles
  if (Math.random() < 0.06)
    PS.emit(cx + 12, cy - 16, 1, {
      vx: (Math.random() - 0.5) * 30,
      vy: -40,
      spread: 5,
      gravity: -10,
      life: 1,
      size: 5,
      color: pal.accent,
    });
}

// ── yoga (warrior pose) ──────────────────────────────────────────
function drawYoga(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const balance = Math.sin(ph * 0.4) * 2;
  shd(ctx, cx, cy + 16, 18, 3);
  // warrior stance — legs wide
  px(ctx, cx - 12 + balance, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 8, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 14 + balance, cy + 13, 7, 3, "#1a1a2a");
  px(ctx, cx + 8, cy + 13, 7, 3, "#1a1a2a");
  // body upright
  px(ctx, cx - 4 + balance * 0.3, cy - 3, 10, 9, pal.shirt);
  // arms stretched wide (warrior II)
  px(ctx, cx - 14 + balance, cy - 1, 10, 3, pal.skin);
  px(ctx, cx + 6, cy - 1, 10, 3, pal.skin);
  px(ctx, cx - 17 + balance, cy - 3, 4, 5, pal.skin); // left hand
  px(ctx, cx + 14, cy - 3, 4, 5, pal.skin); // right hand
  // head calm, facing forward
  drawHeadFront(
    ctx,
    cx + balance * 0.3,
    cy - 13,
    pal,
    Math.abs(Math.sin(ph * 0.1)) < 0.02,
  );
}

// ── reading (sitting with book) ───────────────────────────────────
function drawReading(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const flip = Math.floor((ph / (Math.PI * 2)) * 4) % 2; // page flip occasional
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arms holding book
  px(ctx, cx - 10, cy + 1, 8, 3, pal.skin);
  px(ctx, cx + 2, cy + 1, 8, 3, pal.skin);
  // book (open)
  ctx.fillStyle = "#8a5030";
  ctx.fillRect((cx - 8) | 0, (cy - 8) | 0, 16, 12); // cover
  ctx.fillStyle = "#f4f0e8";
  ctx.fillRect((cx - 7) | 0, (cy - 7) | 0, 7, 10); // left page
  ctx.fillStyle = "#f0ece4";
  ctx.fillRect(cx | 0, (cy - 7) | 0, 7, 10); // right page
  ctx.fillStyle = "#8a807040";
  ctx.fillRect((cx - 6) | 0, (cy - 6) | 0, 5, 1);
  ctx.fillRect((cx - 6) | 0, (cy - 4) | 0, 5, 1);
  ctx.fillRect((cx - 6) | 0, (cy - 2) | 0, 4, 1);
  ctx.fillRect((cx + 1) | 0, (cy - 6) | 0, 5, 1);
  ctx.fillRect((cx + 1) | 0, (cy - 4) | 0, 4, 1);
  ctx.fillRect((cx + 1) | 0, (cy - 2) | 0, 5, 1);
  // spine
  ctx.fillStyle = "#704020";
  ctx.fillRect((cx - 1) | 0, (cy - 7) | 0, 2, 10);
  // head looking down at book
  ctx.save();
  ctx.translate(cx, cy - 12);
  ctx.rotate(0.15);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  if (pal.glasses) {
    ctx.strokeStyle = "#808090";
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -3, 5, 4);
    ctx.strokeRect(0, -3, 5, 4);
  }
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.restore();
}

// ── desk_nap (head on arms at desk) ──────────────────────────────
function drawDeskNap(ctx, cx, cy, pal, t) {
  const br = Math.sin(t * Math.PI * 2 * 0.2) * 1;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arms on desk as pillow
  px(ctx, cx - 11, cy - 3, 10, 4, pal.skin); // left arm on desk
  px(ctx, cx + 1, cy - 3, 10, 4, pal.skin); // right arm on desk
  // head resting on arms (side)
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy - 8 + br, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy - 11 + br, 8, 5, 0.2, Math.PI, 0);
  ctx.fill();
  // closed eyes (horizontal lines)
  ctx.fillStyle = "#2a1820";
  ctx.fillRect((cx - 2) | 0, (cy - 9 + br) | 0, 4, 1);
  ctx.fillRect((cx + 4) | 0, (cy - 9 + br) | 0, 3, 1);
  // small smile
  ctx.fillStyle = "#c8906050";
  ctx.fillRect((cx - 1) | 0, (cy - 6 + br) | 0, 3, 1);
  // ZZZ particles
  if (Math.random() < 0.05) PS.zzz(cx + 10, cy - 12 + br);
}

// ── desk_yawn (seated, yawn + stretch + rub eyes) ─────────────────
function drawDeskYawn(ctx, cx, cy, pal, t) {
  // t=0..1 (one-shot): 0-0.35 rise, 0.35-0.6 peak yawn, 0.6-0.8 rub eyes, 0.8-1 settle
  const stretchT = Math.sin((Math.min(t, 0.8) * Math.PI) / 0.8); // 0->1->0 rise & fall
  const yawnMouth = Math.max(0, Math.sin(t * Math.PI * 1.1)); // mouth open bell
  const rubT =
    t > 0.58 && t < 0.88 ? Math.sin(((t - 0.58) / 0.3) * Math.PI) : 0;
  const armRaise = stretchT * 14;
  shd(ctx, cx, cy + 16);
  // legs seated
  px(ctx, cx - 5, cy + 5, 5, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 5, 9, pal.pants);
  px(ctx, cx - 6, cy + 13, 6, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 6, 3, "#1a1a2a");
  // body
  px(ctx, cx - 6, cy - 3, 13, 9, pal.shirt);
  px(ctx, cx - 1, cy - 2, 2, 7, "#ffffff18");
  px(ctx, cx - 8, cy - 1, 3, 4, pal.shirt);
  px(ctx, cx + 5, cy - 1, 3, 4, pal.shirt);
  // arms: raise for stretch, then hands near face for rub
  if (rubT > 0.25) {
    // rubbing eyes — forearms up, fists near face
    px(ctx, cx - 12, cy - 5, 8, 3, pal.skin);
    px(ctx, cx - 10, cy - 8, 5, 3, pal.skin);
    px(ctx, cx + 4, cy - 5, 8, 3, pal.skin);
    px(ctx, cx + 5, cy - 8, 5, 3, pal.skin);
  } else {
    // stretch — arms raised wide
    const aY = -armRaise | 0;
    px(ctx, cx - 13, cy - 1 + aY, 7, 3, pal.skin);
    px(ctx, cx - 11, cy - 4 + aY, 4, 9, pal.skin);
    px(ctx, cx + 6, cy - 1 + aY, 7, 3, pal.skin);
    px(ctx, cx + 7, cy - 4 + aY, 4, 9, pal.skin);
  }
  // head tilts back a little during yawn
  const headTilt = stretchT * 0.18;
  ctx.save();
  ctx.translate(cx, cy - 12);
  ctx.rotate(headTilt);
  // skull
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // ears
  px(ctx, -8, -3, 3, 5, pal.skin);
  px(ctx, 5, -3, 3, 5, pal.skin);
  // hair
  if (pal.bun) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(0, -12, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(0, -8, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, -7, -9, 14, 5, pal.hair);
  } else if (pal.hat) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(0, -8, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, -9, -12, 18, 4, pal.accent + "cc");
    px(ctx, -7, -16, 14, 6, pal.accent);
  } else if (!pal.robot && !pal.alien) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(0, -6, 7, 5, 0, -Math.PI, 0);
    ctx.fill();
    px(ctx, -7, -8, 4, 5, pal.hair);
    px(ctx, 3, -8, 4, 5, pal.hair);
  }
  // eyes: squint during yawn, rub motion when rubbing
  if (rubT > 0.25) {
    ctx.fillStyle = "#2a1820"; // tight squint lines
    ctx.fillRect(-4, -4, 4, 1);
    ctx.fillRect(1, -4, 4, 1);
    // fist overlay on eyes
    ctx.fillStyle = pal.skin + "cc";
    ctx.fillRect(-6, -6, 5, 5);
    ctx.fillRect(1, -6, 5, 5);
  } else {
    const lidH = Math.max(1, yawnMouth * 3.5) | 0;
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(-4, -4, 4, lidH);
    ctx.fillRect(1, -4, 4, lidH);
    if (yawnMouth < 0.5) {
      ctx.fillStyle = "#ffffff80";
      ctx.fillRect(-4, -4, 2, 2);
      ctx.fillRect(1, -4, 2, 2);
    }
    if (pal.fatigue) {
      ctx.fillStyle = "#80405060";
      ctx.fillRect(-4, -1, 4, 1);
      ctx.fillRect(1, -1, 4, 1);
    }
  }
  // mouth: open wide for yawn
  const mW = Math.max(2, yawnMouth * 9) | 0;
  const mH = Math.max(1, yawnMouth * 6) | 0;
  if (yawnMouth > 0.15) {
    ctx.fillStyle = "#601020";
    ctx.beginPath();
    ctx.ellipse(0, 1, mW / 2, mH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (mW > 4) {
      ctx.fillStyle = "#ffffff80";
      ctx.fillRect(-mW / 2 + 1, 0, mW - 2, 1);
    } // teeth
  } else {
    ctx.fillStyle = "#c8906090";
    ctx.fillRect(-3, 1, 6, 2);
  }
  ctx.restore();
  // yawn particle: tiny stars floating up
  if (yawnMouth > 0.4 && Math.random() < 0.06) {
    PS.emit(cx + (Math.random() - 0.5) * 8, cy - 24, 1, {
      vx: (Math.random() - 0.5) * 12,
      vy: -18 - Math.random() * 10,
      spread: 2,
      gravity: -3,
      life: 1.1,
      size: 3 + Math.random() * 2,
      color: "#c8d3f5aa",
    });
  }
}

// ── doodling (drawing at desk) ────────────────────────────────────
function drawDoodling(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const draw = Math.sin(ph * 2) * 3;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // one arm on desk writing
  px(ctx, cx + 2, cy + draw * 0.3, 9, 3, pal.skin);
  px(ctx, cx + 9, cy + draw * 0.3, 3, 4, pal.skin);
  // paper on desk
  ctx.fillStyle = "#f4f0e8";
  ctx.fillRect((cx - 8) | 0, (cy - 5) | 0, 14, 10);
  // scribbles
  ctx.fillStyle = "#404060";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 3);
  ctx.lineTo(cx - 2, cy - 1);
  ctx.lineTo(cx + 2, cy - 3);
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx, cy + 2);
  ctx.stroke();
  // other arm supporting head
  px(ctx, cx - 11, cy + 1, 7, 3, pal.skin);
  // head
  ctx.save();
  ctx.translate(cx - 2, cy - 12);
  ctx.rotate(0.15);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.restore();
}

// ── plant_care (crouching by plant) ──────────────────────────────
function drawPlantCare(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const pat = Math.sin(ph * 1.5) * 3; // patting/touching plant
  shd(ctx, cx, cy + 16, 12, 2);
  // crouching legs
  px(ctx, cx - 7, cy + 6, 6, 7, pal.pants);
  px(ctx, cx + 1, cy + 6, 6, 7, pal.pants);
  px(ctx, cx - 9, cy + 12, 5, 3, "#1a1a2a");
  px(ctx, cx + 3, cy + 12, 5, 3, "#1a1a2a");
  // body crouched
  px(ctx, cx - 5, cy + 1, 11, 7, pal.shirt);
  // arm reaching to plant
  px(ctx, cx + 5, cy + 1 + pat, 8, 3, pal.skin);
  px(ctx, cx + 12, cy + pat, 4, 5, pal.skin);
  // other arm for balance
  px(ctx, cx - 11, cy + 3, 6, 3, pal.skin);
  // head looking at plant
  ctx.save();
  ctx.translate(cx, cy - 6);
  ctx.rotate(0.2);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  // smile at plant
  ctx.fillStyle = "#c89060";
  ctx.fillRect(-3, 3, 7, 2);
  ctx.restore();
}

// ── chatting (group — left person in pair) ───────────────────────
function drawChattingL(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const gesture = Math.sin(ph * 0.8) * 6; // hand gestures
  const nod = Math.sin(ph * 0.6) * 2;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arm gesturing (right arm toward partner)
  px(ctx, cx + 4, cy - 2 - gesture, 7, 3, pal.skin);
  px(ctx, cx + 10, cy - 2 - gesture, 4, 5, pal.skin);
  // other arm
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin);
  // head facing right (toward partner)
  ctx.save();
  ctx.translate(cx + 2, cy - 12 + nod);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 5, -2, 3, 5, pal.skin); // ear facing right
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.fillStyle = "#c8906060";
  ctx.fillRect(-2, 3, 5, 2);
  ctx.restore();
  // speech bubble dots
  if (((ph * 2) | 0) % 8 < 4) {
    ctx.save();
    ctx.fillStyle = "rgba(200,210,255,0.9)";
    rrect(ctx, cx + 12, cy - 22, 20, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#1a1b26";
    ctx.font = "5px 'Press Start 2P',monospace";
    ctx.fillText("...", cx + 14, cy - 13);
    ctx.restore();
  }
}

// ── chatting (group — right person in pair) ──────────────────────
function drawChattingR(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2 + Math.PI; // offset phase
  const listen = Math.sin(ph * 0.6) * 1.5; // nodding while listening
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // arm reaching (left arm toward partner)
  px(ctx, cx - 10, cy, 7, 3, pal.skin);
  px(ctx, cx - 15, cy - 2, 4, 5, pal.skin);
  // other arm
  px(ctx, cx + 4, cy + 1, 7, 3, pal.skin);
  // head facing left (toward partner) — nodding
  ctx.save();
  ctx.translate(cx - 2, cy - 12 + listen);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, -8, -2, 3, 5, pal.skin); // ear facing left
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.fillStyle = "#c8906060";
  ctx.fillRect(-2, 3, 5, 2);
  ctx.restore();
}

// ── arguing (group — left) ────────────────────────────────────────
function drawArguingL(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const jab = Math.sin(ph * 3) * 8; // jabbing finger
  const shake = Math.sin(ph * 5) * 2;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4 + shake, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1 + shake, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3 + shake * 0.3, 11, 9, pal.shirt);
  // pointing finger at partner (right)
  px(ctx, cx + 4, cy - 4 - jab * 0.3, 9, 3, pal.skin);
  px(ctx, cx + 12, cy - 6 - jab * 0.3, 3, 3, pal.skin); // pointing finger
  px(ctx, cx + 14, cy - 8 - jab * 0.3, 2, 2, pal.skin);
  // other arm gesturing
  px(ctx, cx - 11, cy - jab * 0.2, 6, 3, pal.skin);
  // head shaking
  ctx.save();
  ctx.translate(cx + 2 + shake, cy - 12);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 5, -2, 3, 5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.fillStyle = "#c03020";
  ctx.fillRect(-3, 2, 7, 3); // open mouth arguing
  ctx.restore();
  // anger symbol
  if (((ph * 1.5) | 0) % 6 < 3) {
    ctx.save();
    ctx.fillStyle = "#ff6040";
    ctx.font = "8px sans-serif";
    ctx.fillText("!", cx + 18, cy - 20);
    ctx.restore();
  }
}

// ── arguing (group — right, defensive/counter-arguing) ───────────
function drawArguingR(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2 + 0.8;
  const jab = Math.sin(ph * 3) * 6;
  const shake = Math.sin(ph * 4) * 1.5;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4 + shake, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1 + shake, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  // both arms up defensive/counter-arguing
  px(ctx, cx - 12, cy - 2 - jab * 0.4, 8, 3, pal.skin);
  px(ctx, cx - 14, cy - 4 - jab * 0.4, 4, 4, pal.skin);
  px(ctx, cx + 4, cy - 1, 7, 3, pal.skin);
  ctx.save();
  ctx.translate(cx - 2 + shake, cy - 12);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, -8, -2, 3, 5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  ctx.fillStyle = "#c03020";
  ctx.fillRect(-3, 2, 6, 3);
  ctx.restore();
  if (((ph * 1.2) | 0) % 5 < 2) {
    ctx.save();
    ctx.fillStyle = "#ff8020";
    ctx.font = "8px sans-serif";
    ctx.fillText("?!", cx - 26, cy - 20);
    ctx.restore();
  }
}

// ── gossiping (group — left, leaning in whispering) ─────────────
function drawGossipingL(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const lean = Math.sin(ph * 0.2) * 2 + 4; // leaning toward partner
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5 + lean * 0.3, cy - 3, 11, 9, pal.shirt);
  px(ctx, cx + 4 + lean * 0.3, cy, 8, 3, pal.skin); // arm toward partner's ear
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin);
  // head leaning toward partner
  ctx.save();
  ctx.translate(cx + 2 + lean * 0.4, cy - 12);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 5, -2, 3, 5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-5, -3, 4, 3);
  ctx.fillRect(0, -3, 4, 3);
  // hand near mouth (shh gesture)
  px(ctx, 3, 4, 4, 4, pal.skin);
  ctx.fillStyle = "#c8906060";
  ctx.fillRect(-2, 3, 5, 2);
  ctx.restore();
}

// ── gossiping (group — right, receiving) ─────────────────────────
function drawGossipingR(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2 + Math.PI;
  const shock = Math.abs(Math.sin(ph * 0.15)) * 4; // surprised lean back
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin);
  px(ctx, cx + 4, cy + 1, 6, 3, pal.skin);
  ctx.save();
  ctx.translate(cx - 2, cy - 12 - shock * 0.2);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(1, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, -8, -2, 3, 5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(1, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -3, 4, 3);
  ctx.fillRect(1, -3, 4, 3);
  // shocked face / wide eyes
  if (shock > 2) {
    ctx.fillRect(-4, -4, 5, 4);
    ctx.fillRect(1, -4, 5, 4); // wide eyes
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(-3, -4, 2, 2);
    ctx.fillRect(2, -4, 2, 2);
  }
  // hand over mouth in shock
  px(ctx, -4, 4, 8, 4, pal.skin);
  ctx.restore();
}

// ── gaming (sitting with controller, watching TV) ─────────────────
function drawGaming(ctx, cx, cy, pal, t) {
  const btn = Math.floor(t * 4) % 2; // button mash
  shd(ctx, cx, cy + 14);
  // legs forward (sitting on floor/sofa)
  px(ctx, cx - 8, cy + 6, 7, 8, pal.pants);
  px(ctx, cx + 2, cy + 6, 7, 8, pal.pants);
  px(ctx, cx - 10, cy + 13, 7, 4, "#1a1a2a");
  px(ctx, cx + 3, cy + 13, 7, 4, "#1a1a2a");
  // body leaning slightly back
  px(ctx, cx - 6, cy - 2, 13, 9, pal.shirt);
  // arms holding controller
  px(ctx, cx - 10, cy + 2, 5, 4, pal.skin);
  px(ctx, cx + 6, cy + 2, 5, 4, pal.skin);
  // controller
  const gx = cx - 7,
    gy = cy + 3;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(gx, gy, 14, 6);
  ctx.fillStyle = "#f7768e";
  ctx.fillRect(gx + 1 + btn, gy + 1, 3, 3);
  ctx.fillStyle = "#9ece6a";
  ctx.fillRect(gx + 7, gy + 1, 3, 3);
  // head — eyes wide on TV
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 9, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 12, 4, 4);
  ctx.fillRect(cx + 1, cy - 12, 4, 4);
  // TV screen glow on face
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.sin(t * Math.PI * 2) * 0.05;
  ctx.fillStyle = "#5090ff";
  ctx.fillRect(cx - 8, cy - 18, 16, 12);
  ctx.restore();
}

// ── treadmill (running in place) ──────────────────────────────────
function drawTreadmill(ctx, cx, cy, pal, t) {
  const run = t * Math.PI * 2;
  // Forward running lean
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.1);
  ctx.translate(-cx, -cy);
  const legL = Math.sin(run) * 12;
  const legR = Math.sin(run + Math.PI) * 12;
  const armL = Math.sin(run + Math.PI) * 8;
  const armR = Math.sin(run) * 8;
  const bob = Math.abs(Math.sin(run)) * 3;
  const jy = cy - bob;
  shd(ctx, cx, cy + 16, 8, 3);
  // legs
  px(ctx, cx - 5, jy + 5 + legL * 0.3, 4, 9, pal.pants);
  px(ctx, cx + 2, jy + 5 + legR * 0.3, 4, 9, pal.pants);
  px(ctx, cx - 7, jy + 14 + legL * 0.5, 5, 4, "#1a1a2a");
  px(ctx, cx + 2, jy + 14 + legR * 0.5, 5, 4, "#1a1a2a");
  // body
  px(ctx, cx - 6, jy - 1, 12, 9, pal.shirt);
  // arms pumping
  px(ctx, cx - 10, jy + armL, 4, 8, pal.skin);
  px(ctx, cx + 6, jy + armR, 4, 8, pal.skin);
  // head bobbing
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  // determined eyes
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 13, 4, 3);
  ctx.fillRect(cx + 1, cy - 13, 4, 3);
  // sweat drops
  ctx.fillStyle = "#88ccff80";
  ctx.beginPath();
  ctx.ellipse(cx + 9, cy - 8, 1.5, 2.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 11, cy - 5, 1, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── bench_press — lying on bench, arms pushing barbell up/down ─────
function drawBenchPress(ctx, cx, cy, pal, t) {
  const push = Math.sin(t * Math.PI * 2) * 10;
  shd(ctx, cx, cy + 14, 14, 3);
  // Bench
  ctx.fillStyle = "#4a3858";
  ctx.fillRect(cx - 16, cy + 4, 32, 6);
  ctx.fillStyle = "#3a2a48";
  ctx.fillRect(cx - 14, cy + 10, 4, 6);
  ctx.fillRect(cx + 10, cy + 10, 4, 6);
  // Body lying on bench
  px(ctx, cx - 8, cy - 2, 16, 8, pal.shirt);
  // Legs hanging off bench
  px(ctx, cx + 8, cy + 2, 4, 8, pal.pants);
  px(ctx, cx + 12, cy + 4, 4, 8, pal.pants);
  px(ctx, cx + 12, cy + 12, 5, 3, "#1a1a2a");
  px(ctx, cx + 16, cy + 12, 5, 3, "#1a1a2a");
  // Head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 2, 6, 4, 0, -Math.PI, 0);
  ctx.fill();
  // Arms pushing barbell up
  const armY = cy - 8 - push;
  px(ctx, cx - 8, armY + 4, 4, Math.abs(cy - 2 - armY - 4), pal.skin);
  px(ctx, cx + 4, armY + 4, 4, Math.abs(cy - 2 - armY - 4), pal.skin);
  // Barbell
  ctx.fillStyle = "#808090";
  ctx.fillRect(cx - 18, armY, 36, 2);
  // Weight plates
  ctx.fillStyle = "#404050";
  ctx.beginPath();
  ctx.ellipse(cx - 18, armY + 1, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 18, armY + 1, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Effort face
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 17, cy - 1, 3, 2);
  ctx.fillRect(cx - 13, cy - 1, 3, 2);
  // Sweat
  ctx.fillStyle = "#88ccff80";
  ctx.beginPath();
  ctx.ellipse(cx - 20, cy - 2, 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── boxing — punching forward alternating left/right ───────────────
function drawBoxing(ctx, cx, cy, pal, t) {
  const punch = t * Math.PI * 2;
  const leftPunch = Math.max(0, Math.sin(punch)) * 14;
  const rightPunch = Math.max(0, Math.sin(punch + Math.PI)) * 14;
  const bob = Math.abs(Math.sin(punch)) * 2;
  const jy = cy - bob;
  shd(ctx, cx, cy + 16);
  // Legs in stance
  px(ctx, cx - 5, jy + 5, 4, 9, pal.pants);
  px(ctx, cx + 2, jy + 5, 4, 9, pal.pants);
  px(ctx, cx - 6, jy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 2, jy + 13, 5, 3, "#1a1a2a");
  // Body
  px(ctx, cx - 6, jy - 2, 12, 9, pal.shirt);
  // Arms with boxing gloves
  const lx = cx - 10 - leftPunch * 0.3;
  const ly = jy - 2 + leftPunch * 0.1;
  px(ctx, lx, ly, 4, 4, pal.skin);
  ctx.fillStyle = "#c04040";
  ctx.beginPath();
  ctx.arc(lx - 2, ly + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  const rx = cx + 6 + rightPunch * 0.3;
  const ry = jy - 4 - rightPunch * 0.1;
  px(ctx, rx, ry, 4, 4, pal.skin);
  ctx.fillStyle = "#c04040";
  ctx.beginPath();
  ctx.arc(rx + 6, ry + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, jy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, jy - 12, 4, 3);
  ctx.fillRect(cx + 1, jy - 12, 4, 3);
  // Impact stars on punch
  if (leftPunch > 10) {
    ctx.fillStyle = "#ffff80";
    ctx.font = "8px serif";
    ctx.fillText("*", lx - 8, ly - 2);
  }
  if (rightPunch > 10) {
    ctx.fillStyle = "#ffff80";
    ctx.font = "8px serif";
    ctx.fillText("*", rx + 10, ry);
  }
}

// ── cycling — seated on exercise bike, legs pedaling ───────────────
function drawCycling(ctx, cx, cy, pal, t) {
  const pedal = t * Math.PI * 2;
  const legLY = Math.sin(pedal) * 6;
  const legRY = Math.sin(pedal + Math.PI) * 6;
  shd(ctx, cx, cy + 16);
  // Legs pedaling
  px(ctx, cx - 4, cy + 2 + legLY, 4, 8 - legLY * 0.3, pal.pants);
  px(ctx, cx + 1, cy + 2 + legRY, 4, 8 - legRY * 0.3, pal.pants);
  px(ctx, cx - 5, cy + 10 + legLY, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 10 + legRY, 5, 3, "#1a1a2a");
  // Body leaning forward
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.translate(-cx, -cy);
  px(ctx, cx - 6, cy - 4, 12, 8, pal.shirt);
  // Arms gripping handlebars
  px(ctx, cx - 9, cy - 6, 4, 6, pal.skin);
  px(ctx, cx + 5, cy - 6, 4, 6, pal.skin);
  // Head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 15, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 14, 4, 3);
  ctx.fillRect(cx + 1, cy - 14, 4, 3);
  ctx.restore();
  // Sweat
  ctx.fillStyle = "#88ccff80";
  ctx.beginPath();
  ctx.ellipse(cx + 9, cy - 8, 1.5, 2.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── lifting_weights — standing dumbbell curl ───────────────────────
function drawLiftingWeights(ctx, cx, cy, pal, t) {
  const curl = Math.sin(t * Math.PI * 2);
  const armLift = Math.max(0, curl) * 12;
  const armLiftR = Math.max(0, -curl) * 12;
  shd(ctx, cx, cy + 16);
  // Legs
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  // Body
  px(ctx, cx - 6, cy - 2, 12, 9, pal.shirt);
  // Left arm curling
  px(ctx, cx - 10, cy - armLift, 4, 6 + armLift * 0.3, pal.skin);
  // Left dumbbell
  ctx.fillStyle = "#606070";
  ctx.fillRect(cx - 14, cy - 2 - armLift, 4, 4);
  ctx.fillRect(cx - 12, cy - armLift, 8, 2);
  ctx.fillStyle = "#404050";
  ctx.fillRect(cx - 6, cy - 2 - armLift, 4, 4);
  // Right arm curling
  px(ctx, cx + 6, cy - armLiftR, 4, 6 + armLiftR * 0.3, pal.skin);
  // Right dumbbell
  ctx.fillStyle = "#606070";
  ctx.fillRect(cx + 10, cy - 2 - armLiftR, 4, 4);
  ctx.fillRect(cx + 4, cy - armLiftR, 8, 2);
  ctx.fillStyle = "#404050";
  ctx.fillRect(cx + 2, cy - 2 - armLiftR, 4, 4);
  // Head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 13, 4, 3);
  ctx.fillRect(cx + 1, cy - 13, 4, 3);
  // Effort expression
  ctx.fillStyle = "#c89060";
  ctx.fillRect(cx - 3, cy - 7, 6, 2);
  // Sweat
  ctx.fillStyle = "#88ccff80";
  ctx.beginPath();
  ctx.ellipse(cx + 9, cy - 6, 1, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── rowing — seated, pull-back stroke on rowing ergometer ─────────
function drawRowing(ctx, cx, cy, pal, t) {
  const stroke = t * Math.PI * 2;
  const pullBack = Math.sin(stroke) * 0.5 + 0.5; // 0=reach forward, 1=pulled back
  const lean = pullBack * 6 - 2; // body leans back when pulling
  const armReach = (1 - pullBack) * 12; // arms reach forward at start of stroke
  shd(ctx, cx, cy + 16);
  // Legs (bent at catch, straight at finish)
  const kneeH = (1 - pullBack) * 8;
  px(ctx, cx - 4, cy + 4 - kneeH, 4, 8 + kneeH, pal.pants);
  px(ctx, cx + 1, cy + 4 - kneeH, 4, 8 + kneeH, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  // Body leaning back on drive phase
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean * 0.015);
  ctx.translate(-cx, -cy);
  px(ctx, cx - 6, cy - 3, 12, 9, pal.shirt);
  // Arms — reach forward on catch, pull to waist on drive
  const lArmX = cx - 10 + armReach * 0.4;
  const rArmX = cx + 6 + armReach * 0.4;
  px(ctx, lArmX, cy - 2, 4, 5, pal.skin);
  px(ctx, rArmX, cy - 2, 4, 5, pal.skin);
  // Handle / oar bar (horizontal)
  ctx.fillStyle = "#806040";
  ctx.fillRect(lArmX - 2, cy - 1, rArmX - lArmX + 8, 2);
  // Head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 15, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 14, 4, 3);
  ctx.fillRect(cx + 1, cy - 14, 4, 3);
  ctx.restore();
  // Sweat droplet at hard pull
  if (pullBack > 0.8) {
    ctx.fillStyle = "#88ccff80";
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 8, 1.5, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── ping_pong_l — swing synced to ball arriving on left side ──────
function drawPingPongL(ctx, cx, cy, pal, t) {
  // Hit when ball is near left side (ppBall.t < 0.15)
  const hitPhase = Math.max(0, 1 - ppBall.t / 0.15);
  const swing = hitPhase * 16;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin); // back arm
  // hitting arm
  const ax = cx + 6 + swing * 0.4,
    ay = cy - 2 - swing * 0.2;
  px(ctx, cx + 4, cy + 1, 6, 3, pal.skin);
  ctx.fillStyle = "#c04040";
  ctx.beginPath();
  ctx.ellipse(ax + 6, ay - 2, 7, 6, swing * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#300808";
  ctx.beginPath();
  ctx.ellipse(ax + 6, ay - 2, 4, 3, swing * 0.04, 0, Math.PI * 2);
  ctx.fill();
  // grip line
  ctx.fillStyle = "#8b3030";
  ctx.fillRect(ax + 2, ay, 4, 2);
  // head
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 13, 4, 3);
  ctx.fillRect(cx + 1, cy - 13, 4, 3);
  ctx.fillStyle = "#c89060";
  ctx.fillRect(cx - 3, cy - 7, 6, 2);
  // watching ball — head turns toward table
  if (ppBall.active) {
    ctx.fillStyle = "#1a1b26";
    ctx.fillRect(cx - 2, cy - 11, 3, 2); // shifted eyes
  }
}

// ── ping_pong_r — swing synced to ball arriving on right side ─────
function drawPingPongR(ctx, cx, cy, pal, t) {
  const hitPhase = Math.max(0, (ppBall.t - 0.85) / 0.15);
  const swing = hitPhase * 16;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy - 3, 11, 9, pal.shirt);
  px(ctx, cx + 4, cy + 1, 6, 3, pal.skin);
  const ax = cx - 6 - swing * 0.4,
    ay = cy - 2 - swing * 0.2;
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin);
  ctx.fillStyle = "#4040c0";
  ctx.beginPath();
  ctx.ellipse(ax - 6, ay - 2, 7, 6, -swing * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#080830";
  ctx.beginPath();
  ctx.ellipse(ax - 6, ay - 2, 4, 3, -swing * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#303080";
  ctx.fillRect(ax - 8, ay, 4, 2);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 13, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(cx - 5, cy - 13, 4, 3);
  ctx.fillRect(cx + 1, cy - 13, 4, 3);
  ctx.fillStyle = "#c89060";
  ctx.fillRect(cx - 3, cy - 7, 6, 2);
}

// ── Draw ping pong ball flying across the table ───────────────────
function drawPingPongBall(ctx) {
  if (!ppBall.active || !PP_L.tx || !PP_R.tx) return;
  const lx = OX + PP_L.tx * T + T * 0.5;
  const ly = OY + PP_L.ty * T + T * 0.2;
  const rx = OX + PP_R.tx * T - T * 0.5;
  const ry = OY + PP_R.ty * T + T * 0.2;
  const bx = lx + (rx - lx) * ppBall.t;
  const arc = Math.sin(ppBall.t * Math.PI) * 18; // ball arc height
  const by = ly + (ry - ly) * ppBall.t - arc;
  // shadow on table
  const shadowY = ly + (ry - ly) * ppBall.t;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(bx, shadowY + 4, 3 - arc * 0.05, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // ball
  ctx.fillStyle = "#f5f5f0";
  ctx.beginPath();
  ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // highlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bx - 1, by - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // spin trail
  const speed = ppBall.dir * 3;
  ctx.fillStyle = "rgba(255,255,240,0.4)";
  ctx.beginPath();
  ctx.arc(bx - speed * 1.5, by, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,240,0.15)";
  ctx.beginPath();
  ctx.arc(bx - speed * 3, by, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

// ── Ping Pong Mini-Game ──────────────────────────────────────────
function launchPingPongGame() {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.93);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#7aa2f7;font-size:11px;margin-bottom:14px;text-shadow:0 0 12px #7aa2f7;letter-spacing:2px;";
  title.textContent = "🏓 PING PONG";
  overlay.appendChild(title);

  const gc_canvas = document.createElement("canvas");
  const GW = 580,
    GH = 280;
  gc_canvas.width = GW;
  gc_canvas.height = GH;
  gc_canvas.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;cursor:crosshair;display:block;";
  overlay.appendChild(gc_canvas);

  const instr = document.createElement("div");
  instr.style.cssText =
    "color:#a9b1d650;font-size:5px;margin-top:10px;letter-spacing:1px;";
  instr.textContent = "MOUSE: move paddle  |  CLICK: power hit  |  ESC: exit";
  overlay.appendChild(instr);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:10px;background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:5px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:4px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  const gc = gc_canvas.getContext("2d");
  const PW = 8,
    PH = 56,
    BR = 5;
  let mouseY = GH / 2;
  let powerPending = false;
  let rafId = null;

  const gs = {
    ball: { x: GW / 2, y: GH / 2, vx: 0, vy: 0 },
    playerY: GH / 2 - PH / 2,
    cpuY: GH / 2 - PH / 2,
    playerScore: 0,
    cpuScore: 0,
    serving: true,
    winner: null,
  };

  gc_canvas.addEventListener("mousemove", (e) => {
    const rect = gc_canvas.getBoundingClientRect();
    mouseY = (e.clientY - rect.top) * (GH / rect.height);
  });

  gc_canvas.addEventListener("click", () => {
    if (gs.winner) {
      gs.playerScore = 0;
      gs.cpuScore = 0;
      gs.winner = null;
      gs.serving = true;
      gs.ball.x = GW / 2;
      gs.ball.y = GH / 2;
      gs.ball.vx = 0;
      gs.ball.vy = 0;
      return;
    }
    if (gs.serving) {
      gs.serving = false;
      const ang = (Math.random() - 0.5) * 0.6;
      const dir = Math.random() > 0.5 ? 1 : -1;
      gs.ball.vx = dir * (3.5 + Math.random() * 1.5);
      gs.ball.vy = Math.sin(ang) * 4;
      return;
    }
    if (gs.ball.x < 60) powerPending = true;
  });

  function closeGame() {
    if (rafId) cancelAnimationFrame(rafId);
    overlay.remove();
  }
  closeBtn.addEventListener("click", closeGame);

  function onKey(e) {
    if (e.key === "Escape") {
      closeGame();
      document.removeEventListener("keydown", onKey);
    }
  }
  document.addEventListener("keydown", onKey);

  function resetBall() {
    gs.ball.x = GW / 2;
    gs.ball.y = GH / 2;
    gs.ball.vx = 0;
    gs.ball.vy = 0;
    gs.serving = true;
  }

  function loop() {
    gs.playerY = Math.max(0, Math.min(GH - PH, mouseY - PH / 2));
    const cpuTarget = gs.ball.y - PH / 2;
    const cpuSpd = 3.2 + gs.playerScore * 0.25;
    gs.cpuY +=
      Math.sign(cpuTarget - gs.cpuY) *
      Math.min(cpuSpd, Math.abs(cpuTarget - gs.cpuY));
    gs.cpuY = Math.max(0, Math.min(GH - PH, gs.cpuY));

    if (!gs.serving && !gs.winner) {
      gs.ball.x += gs.ball.vx;
      gs.ball.y += gs.ball.vy;

      if (gs.ball.y - BR < 0) {
        gs.ball.y = BR;
        gs.ball.vy = Math.abs(gs.ball.vy);
        blip(400, 0.05);
      }
      if (gs.ball.y + BR > GH) {
        gs.ball.y = GH - BR;
        gs.ball.vy = -Math.abs(gs.ball.vy);
        blip(400, 0.05);
      }

      // Player paddle (left)
      if (
        gs.ball.vx < 0 &&
        gs.ball.x - BR < 22 + PW &&
        gs.ball.x - BR > 18 &&
        gs.ball.y + BR > gs.playerY &&
        gs.ball.y - BR < gs.playerY + PH
      ) {
        gs.ball.x = 22 + PW + BR;
        const hit = (gs.ball.y - gs.playerY) / PH - 0.5;
        const pwr = powerPending ? 1.6 : 1.05;
        gs.ball.vx = Math.min(Math.abs(gs.ball.vx) * pwr, 14);
        gs.ball.vy = hit * 9 + (Math.random() - 0.5) * 1.5;
        powerPending = false;
        blip(700, 0.08, "square", 0.05);
      }

      // CPU paddle (right)
      if (
        gs.ball.vx > 0 &&
        gs.ball.x + BR > GW - 22 - PW &&
        gs.ball.x + BR < GW - 18 &&
        gs.ball.y + BR > gs.cpuY &&
        gs.ball.y - BR < gs.cpuY + PH
      ) {
        gs.ball.x = GW - 22 - PW - BR;
        const hit = (gs.ball.y - gs.cpuY) / PH - 0.5;
        gs.ball.vx = -Math.min(Math.abs(gs.ball.vx) * 1.04, 14);
        gs.ball.vy = hit * 9 + (Math.random() - 0.5) * 1.5;
        blip(500, 0.07, "square", 0.04);
      }

      if (gs.ball.x < 0) {
        gs.cpuScore++;
        blip(200, 0.35, "sawtooth", 0.06);
        resetBall();
        if (gs.cpuScore >= 5) {
          gs.winner = "CPU WINS";
          if (typeof window.saveGameScore === "function")
            window.saveGameScore("pingpong", gs.playerScore);
        }
      }
      if (gs.ball.x > GW) {
        gs.playerScore++;
        blip(880, 0.18, "square", 0.06);
        resetBall();
        if (gs.playerScore >= 5) {
          gs.winner = "YOU WIN!";
          if (typeof window.saveGameScore === "function")
            window.saveGameScore("pingpong", gs.playerScore);
        }
      }
    }

    // Draw table
    gc.fillStyle = "#0d2d1a";
    gc.fillRect(0, 0, GW, GH);
    gc.strokeStyle = "#ffffff35";
    gc.lineWidth = 1;
    gc.strokeRect(8, 8, GW - 16, GH - 16);
    gc.setLineDash([6, 6]);
    gc.beginPath();
    gc.moveTo(GW / 2, 0);
    gc.lineTo(GW / 2, GH);
    gc.stroke();
    gc.setLineDash([]);

    // Net
    for (let ny = 0; ny < GH; ny += 10) {
      gc.fillStyle = ny % 20 === 0 ? "#ffffff80" : "#ffffff30";
      gc.fillRect(GW / 2 - 1, ny, 2, 8);
    }

    // Paddles
    gc.shadowBlur = 12;
    gc.shadowColor = "#7aa2f7";
    gc.fillStyle = "#7aa2f7";
    gc.fillRect(22, gs.playerY, PW, PH);
    gc.shadowColor = "#f7768e";
    gc.fillStyle = "#f7768e";
    gc.fillRect(GW - 22 - PW, gs.cpuY, PW, PH);
    gc.shadowBlur = 0;

    // Ball
    if (!gs.serving) {
      gc.shadowColor = "#ffffffa0";
      gc.shadowBlur = 10;
      gc.fillStyle = "#f5f5f0";
      gc.beginPath();
      gc.arc(gs.ball.x, gs.ball.y, BR, 0, Math.PI * 2);
      gc.fill();
      gc.shadowBlur = 0;
      // trail
      gc.globalAlpha = 0.3;
      gc.fillStyle = "#ffffff";
      gc.beginPath();
      gc.arc(
        gs.ball.x - gs.ball.vx * 2,
        gs.ball.y - gs.ball.vy * 2,
        BR * 0.6,
        0,
        Math.PI * 2,
      );
      gc.fill();
      gc.globalAlpha = 1;
    } else {
      const pulse = 0.4 + 0.4 * Math.sin(Date.now() * 0.008);
      gc.globalAlpha = pulse;
      gc.fillStyle = "#f5f5f0";
      gc.beginPath();
      gc.arc(GW / 2, GH / 2, BR, 0, Math.PI * 2);
      gc.fill();
      gc.globalAlpha = 1;
      gc.fillStyle = "#e0af68";
      gc.font = "7px 'Press Start 2P',monospace";
      gc.textAlign = "center";
      gc.fillText("CLICK TO SERVE", GW / 2, GH / 2 - 22);
      gc.textAlign = "left";
    }

    // Scores
    gc.fillStyle = "#c8d3f5";
    gc.font = "18px 'Press Start 2P',monospace";
    gc.textAlign = "center";
    gc.fillText(gs.playerScore, GW / 4, 38);
    gc.fillText(gs.cpuScore, (GW * 3) / 4, 38);
    gc.fillStyle = "#ffffff30";
    gc.font = "5px 'Press Start 2P',monospace";
    gc.fillText("YOU", GW / 4, 52);
    gc.fillText("CPU", (GW * 3) / 4, 52);
    gc.textAlign = "left";

    // Winner
    if (gs.winner) {
      gc.fillStyle = "rgba(5,5,15,0.75)";
      gc.fillRect(0, 0, GW, GH);
      gc.fillStyle = gs.playerScore >= 5 ? "#9ece6a" : "#f7768e";
      gc.font = "22px 'Press Start 2P',monospace";
      gc.textAlign = "center";
      gc.shadowColor = gc.fillStyle;
      gc.shadowBlur = 16;
      gc.fillText(gs.winner, GW / 2, GH / 2 - 18);
      gc.shadowBlur = 0;
      gc.fillStyle = "#a9b1d6";
      gc.font = "7px 'Press Start 2P',monospace";
      gc.fillText("CLICK TO PLAY AGAIN", GW / 2, GH / 2 + 20);
      gc.textAlign = "left";
    }

    rafId = requestAnimationFrame(loop);
  }

  loop();
}

// ── Snake Mini-Game (on arcade machine) ─────────────────────────
function launchSnakeGame() {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#9ece6a;font-size:11px;margin-bottom:10px;text-shadow:0 0 12px #9ece6a;letter-spacing:2px;";
  title.textContent = "🐍 SNAKE";
  overlay.appendChild(title);

  const scoreEl = document.createElement("div");
  scoreEl.style.cssText =
    "color:#e0af68;font-size:7px;margin-bottom:8px;letter-spacing:1px;";
  scoreEl.textContent = "SCORE: 0  HI: 0";
  overlay.appendChild(scoreEl);

  const gc = document.createElement("canvas");
  const COLS = 24,
    ROWS = 18,
    CS = 16;
  const GW = COLS * CS,
    GH = ROWS * CS;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;display:block;background:#0a0f0a;";
  overlay.appendChild(gc);

  const instr = document.createElement("div");
  instr.style.cssText =
    "color:#a9b1d650;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instr.textContent = "ARROW KEYS / WASD: move  |  ESC: exit";
  overlay.appendChild(instr);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:8px;background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:5px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:4px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  const ctx2 = gc.getContext("2d");
  let hiScore = parseInt(localStorage.getItem("snake_hi") || "0");
  let rafId = null;
  let gs = null;

  function mkFood(snake) {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function startGame() {
    const startX = Math.floor(COLS / 2),
      startY = Math.floor(ROWS / 2);
    gs = {
      snake: [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      score: 0,
      frame: 0,
      speed: 8,
      dead: false,
      started: false,
    };
    gs.food = mkFood(gs.snake);
    render();
  }

  function closeGame() {
    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  closeBtn.addEventListener("click", closeGame);

  function onKey(e) {
    if (e.key === "Escape") {
      closeGame();
      return;
    }
    if (!gs) return;
    if (gs.dead) {
      startGame();
      return;
    }
    if (
      !gs.started &&
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
      ].includes(e.key)
    ) {
      gs.started = true;
    }
    const dirs = {
      ArrowUp: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const nd = dirs[e.key];
    if (nd && !(nd.x === -gs.dir.x && nd.y === -gs.dir.y)) {
      gs.nextDir = nd;
      e.preventDefault();
    }
  }
  document.addEventListener("keydown", onKey);

  function update() {
    if (!gs.started || gs.dead) return;
    gs.dir = gs.nextDir;
    const head = { x: gs.snake[0].x + gs.dir.x, y: gs.snake[0].y + gs.dir.y };
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gs.dead = true;
      blip(150, 0.3, "sawtooth", 0.12);
      return;
    }
    if (gs.snake.some((s) => s.x === head.x && s.y === head.y)) {
      gs.dead = true;
      if (gs.score > 0 && typeof window.saveGameScore === "function")
        window.saveGameScore("snake", gs.score);
      blip(150, 0.3, "sawtooth", 0.12);
      return;
    }
    gs.snake.unshift(head);
    if (head.x === gs.food.x && head.y === gs.food.y) {
      gs.score++;
      if (gs.score > hiScore) {
        hiScore = gs.score;
        localStorage.setItem("snake_hi", hiScore);
      }
      gs.speed = Math.max(3, 8 - Math.floor(gs.score / 5));
      gs.food = mkFood(gs.snake);
      blip(700, 0.08, "square", 0.04);
    } else {
      gs.snake.pop();
    }
    scoreEl.textContent = "SCORE: " + gs.score + "  HI: " + hiScore;
  }

  function render() {
    ctx2.clearRect(0, 0, GW, GH);
    // Grid dots
    ctx2.fillStyle = "#111a11";
    for (let gy = 0; gy < ROWS; gy++)
      for (let gx = 0; gx < COLS; gx++)
        ctx2.fillRect(gx * CS + CS / 2 - 1, gy * CS + CS / 2 - 1, 2, 2);
    if (!gs) return;
    // Food (pulsing apple)
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
    ctx2.fillStyle = "#f7768e";
    ctx2.globalAlpha = pulse;
    ctx2.beginPath();
    ctx2.arc(
      gs.food.x * CS + CS / 2,
      gs.food.y * CS + CS / 2,
      CS / 2 - 2,
      0,
      Math.PI * 2,
    );
    ctx2.fill();
    ctx2.globalAlpha = 1;
    // Snake body
    for (let i = gs.snake.length - 1; i >= 0; i--) {
      const seg = gs.snake[i];
      const t = i / gs.snake.length;
      ctx2.fillStyle = gs.dead
        ? "#556055"
        : i === 0
          ? "#9ece6a"
          : `hsl(${100 - t * 20},${60 - t * 20}%,${40 - t * 10}%)`;
      const pad = i === 0 ? 1 : 2;
      ctx2.fillRect(
        seg.x * CS + pad,
        seg.y * CS + pad,
        CS - pad * 2,
        CS - pad * 2,
      );
      if (i === 0 && !gs.dead) {
        ctx2.fillStyle = "#1a1a28";
        if (gs.dir.x !== 0) {
          ctx2.fillRect(
            seg.x * CS + CS / 2 + gs.dir.x * 3,
            seg.y * CS + CS / 2 - 3,
            2,
            2,
          );
          ctx2.fillRect(
            seg.x * CS + CS / 2 + gs.dir.x * 3,
            seg.y * CS + CS / 2 + 1,
            2,
            2,
          );
        } else {
          ctx2.fillRect(
            seg.x * CS + CS / 2 - 3,
            seg.y * CS + CS / 2 + gs.dir.y * 3,
            2,
            2,
          );
          ctx2.fillRect(
            seg.x * CS + CS / 2 + 1,
            seg.y * CS + CS / 2 + gs.dir.y * 3,
            2,
            2,
          );
        }
      }
    }
    // Overlay messages
    if (!gs.started && !gs.dead) {
      ctx2.fillStyle = "rgba(0,0,0,0.55)";
      ctx2.fillRect(0, GH / 2 - 24, GW, 48);
      ctx2.fillStyle = "#9ece6a";
      ctx2.font = "8px 'Press Start 2P',monospace";
      ctx2.textAlign = "center";
      ctx2.fillText("PRESS ANY ARROW", GW / 2, GH / 2 - 6);
      ctx2.fillText("KEY TO START", GW / 2, GH / 2 + 10);
      ctx2.textAlign = "left";
    }
    if (gs.dead) {
      ctx2.fillStyle = "rgba(0,0,0,0.65)";
      ctx2.fillRect(0, GH / 2 - 28, GW, 56);
      ctx2.fillStyle = "#f7768e";
      ctx2.font = "10px 'Press Start 2P',monospace";
      ctx2.textAlign = "center";
      ctx2.fillText("GAME OVER", GW / 2, GH / 2 - 8);
      ctx2.fillStyle = "#e0af68";
      ctx2.font = "6px 'Press Start 2P',monospace";
      ctx2.fillText("SCORE: " + gs.score, GW / 2, GH / 2 + 8);
      ctx2.fillStyle = "#a9b1d6";
      ctx2.font = "5px 'Press Start 2P',monospace";
      ctx2.fillText("PRESS ANY KEY TO RETRY", GW / 2, GH / 2 + 22);
      ctx2.textAlign = "left";
    }
  }

  function loop() {
    gs.frame++;
    if (gs.frame % gs.speed === 0) update();
    render();
    rafId = requestAnimationFrame(loop);
  }

  startGame();
  rafId = requestAnimationFrame(loop);
}

// ── Darts Mini-Game ──────────────────────────────────────────────
function launchDartsGame() {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#f7768e;font-size:11px;margin-bottom:10px;text-shadow:0 0 12px #f7768e;letter-spacing:2px;";
  title.textContent = "🎯 DARTS";
  overlay.appendChild(title);

  const scoreEl = document.createElement("div");
  scoreEl.style.cssText =
    "color:#e0af68;font-size:7px;margin-bottom:8px;letter-spacing:1px;";
  scoreEl.textContent = "SCORE: 0  HI: 0  DARTS: 3";
  overlay.appendChild(scoreEl);

  const gc = document.createElement("canvas");
  const GW = 400,
    GH = 400;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    "border:2px solid #3a3860;border-radius:4px;cursor:crosshair;display:block;background:#0a0a14;";
  overlay.appendChild(gc);

  const instr = document.createElement("div");
  instr.style.cssText =
    "color:#a9b1d650;font-size:5px;margin-top:8px;letter-spacing:1px;";
  instr.textContent =
    "CLICK to throw when crosshair is on target  |  SPACE/ENTER also works  |  ESC: exit";
  overlay.appendChild(instr);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ EXIT";
  closeBtn.style.cssText =
    "margin-top:8px;background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:5px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:4px;";
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  const ctx2 = gc.getContext("2d");
  const CX = GW / 2,
    CY = GH / 2,
    BOARD_R = 175;
  let hiScore = parseInt(localStorage.getItem("darts_hi") || "0");
  let rafId = null;

  const gs = {
    dartsLeft: 3,
    totalScore: 0,
    darts: [],
    crosshair: { x: CX, y: CY - 20, vx: 2.5, vy: 1.8 },
    phase: "aiming",
    throwAnim: null,
    lastScore: null,
    lastScoreTime: 0,
  };

  function getDartScore(dx, dy) {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = BOARD_R;
    if (dist <= r * 0.04) return 50;
    if (dist <= r * 0.08) return 25;
    if (dist <= r * 0.18) return 20;
    if (dist <= r * 0.35) return 15;
    if (dist <= r * 0.5) return 10;
    if (dist <= r * 0.65) return 5;
    if (dist <= r * 0.8) return 3;
    if (dist <= r * 1.0) return 1;
    return 0;
  }

  function drawBoard() {
    ctx2.save();
    ctx2.shadowColor = "#f7768e30";
    ctx2.shadowBlur = 20;
    ctx2.fillStyle = "#2a1a08";
    ctx2.beginPath();
    ctx2.arc(CX, CY, BOARD_R + 10, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();
    const rings = [
      [BOARD_R, "#101010"],
      [BOARD_R * 0.95, "#1a6030"],
      [BOARD_R * 0.85, "#cc2020"],
      [BOARD_R * 0.65, "#1a6030"],
      [BOARD_R * 0.5, "#cc2020"],
      [BOARD_R * 0.35, "#1a6030"],
      [BOARD_R * 0.18, "#e8d870"],
      [BOARD_R * 0.08, "#101010"],
      [BOARD_R * 0.04, "#cc2020"],
    ];
    for (const [r, c] of rings) {
      ctx2.fillStyle = c;
      ctx2.beginPath();
      ctx2.arc(CX, CY, r, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.strokeStyle = "rgba(255,255,255,0.12)";
    ctx2.lineWidth = 0.8;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 - Math.PI / 20;
      ctx2.beginPath();
      ctx2.moveTo(
        CX + Math.cos(angle) * BOARD_R * 0.08,
        CY + Math.sin(angle) * BOARD_R * 0.08,
      );
      ctx2.lineTo(
        CX + Math.cos(angle) * BOARD_R,
        CY + Math.sin(angle) * BOARD_R,
      );
      ctx2.stroke();
    }
    ctx2.fillStyle = "#f0e8d0";
    ctx2.beginPath();
    ctx2.arc(CX, CY, 4, 0, Math.PI * 2);
    ctx2.fill();
    const lbls = [
      ["50", 0],
      ["25", BOARD_R * 0.06],
      ["20", BOARD_R * 0.27],
      ["15", BOARD_R * 0.44],
      ["10", BOARD_R * 0.58],
      ["5", BOARD_R * 0.73],
      ["3", BOARD_R * 0.88],
    ];
    ctx2.font = "5px 'Press Start 2P',monospace";
    ctx2.textAlign = "center";
    for (const [lbl, offset] of lbls) {
      if (offset < BOARD_R * 0.06) {
        ctx2.fillStyle = "#fff";
        ctx2.fillText(lbl, CX, CY + 3);
        continue;
      }
      ctx2.fillStyle = "rgba(255,255,255,0.5)";
      ctx2.fillText(lbl, CX + offset + 6, CY - 4);
    }
    ctx2.textAlign = "left";
  }

  function drawLandedDarts() {
    for (const d of gs.darts) {
      ctx2.fillStyle = "#e0af68";
      ctx2.fillRect(d.x - 1, d.y + 2, 2, 12);
      ctx2.fillStyle = "#c0c0c0";
      ctx2.fillRect(d.x - 1, d.y - 2, 2, 4);
      ctx2.fillStyle = "#f7768e";
      ctx2.fillRect(d.x - 3, d.y + 12, 2, 5);
      ctx2.fillRect(d.x + 1, d.y + 12, 2, 5);
    }
  }

  function render() {
    ctx2.clearRect(0, 0, GW, GH);
    drawBoard();
    drawLandedDarts();

    if (gs.phase === "aiming") {
      const ch = gs.crosshair;
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
      ctx2.strokeStyle = `rgba(247,118,142,${pulse})`;
      ctx2.lineWidth = 1.5;
      const cs = 16;
      ctx2.beginPath();
      ctx2.moveTo(ch.x - cs, ch.y);
      ctx2.lineTo(ch.x - 4, ch.y);
      ctx2.moveTo(ch.x + 4, ch.y);
      ctx2.lineTo(ch.x + cs, ch.y);
      ctx2.moveTo(ch.x, ch.y - cs);
      ctx2.lineTo(ch.x, ch.y - 4);
      ctx2.moveTo(ch.x, ch.y + 4);
      ctx2.lineTo(ch.x, ch.y + cs);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(ch.x, ch.y, 6, 0, Math.PI * 2);
      ctx2.stroke();
    }

    if (gs.throwAnim && gs.phase === "throwing") {
      const ta = gs.throwAnim;
      const t = Math.min(ta.t, 1);
      const tx = ta.sx + (ta.ex - ta.sx) * t;
      const ty2 = ta.sy + (ta.ey - ta.sy) * t;
      const ang = Math.atan2(ta.ey - ta.sy, ta.ex - ta.sx);
      ctx2.save();
      ctx2.translate(tx, ty2);
      ctx2.rotate(ang);
      ctx2.fillStyle = "#e0af68";
      ctx2.fillRect(-14, -1, 18, 2);
      ctx2.fillStyle = "#c0c0c0";
      ctx2.fillRect(4, -1.5, 4, 3);
      ctx2.fillStyle = "#f7768e";
      ctx2.fillRect(-14, -3, 5, 2);
      ctx2.fillRect(-14, 1, 5, 2);
      ctx2.restore();
    }

    if (gs.lastScore !== null) {
      const age = Date.now() - gs.lastScoreTime;
      if (age < 1400) {
        const alpha = Math.max(0, 1 - age / 1400);
        ctx2.save();
        ctx2.globalAlpha = alpha;
        ctx2.fillStyle =
          gs.lastScore >= 25
            ? "#f7768e"
            : gs.lastScore >= 10
              ? "#e0af68"
              : "#9ece6a";
        ctx2.font = `bold ${Math.round(12 + gs.lastScore * 0.15)}px 'Press Start 2P',monospace`;
        ctx2.textAlign = "center";
        ctx2.fillText("+" + gs.lastScore, CX, 50 - age * 0.015);
        ctx2.textAlign = "left";
        ctx2.restore();
      } else {
        gs.lastScore = null;
      }
    }

    if (gs.phase === "gameover") {
      ctx2.fillStyle = "rgba(0,0,0,0.72)";
      ctx2.fillRect(0, CY - 70, GW, 130);
      ctx2.fillStyle = "#f7768e";
      ctx2.font = "14px 'Press Start 2P',monospace";
      ctx2.textAlign = "center";
      ctx2.fillText("ROUND OVER", CX, CY - 36);
      ctx2.fillStyle = "#e0af68";
      ctx2.font = "9px 'Press Start 2P',monospace";
      ctx2.fillText(
        "SCORE: " + gs.totalScore + "  HI: " + hiScore,
        CX,
        CY - 14,
      );
      const grade =
        gs.totalScore >= 100
          ? "BULLSEYE MASTER!"
          : gs.totalScore >= 50
            ? "SHARP SHOOTER!"
            : gs.totalScore >= 25
              ? "DECENT THROW!"
              : "KEEP PRACTICING!";
      ctx2.fillStyle = "#bb9af7";
      ctx2.font = "6px 'Press Start 2P',monospace";
      ctx2.fillText(grade, CX, CY + 6);
      ctx2.fillStyle = "#9ece6a";
      ctx2.font = "5px 'Press Start 2P',monospace";
      ctx2.fillText("CLICK TO PLAY AGAIN", CX, CY + 28);
      ctx2.textAlign = "left";
    }

    scoreEl.textContent =
      "SCORE: " +
      gs.totalScore +
      "  HI: " +
      hiScore +
      "  DARTS: " +
      gs.dartsLeft;
  }

  function updateCrosshair() {
    if (gs.phase !== "aiming") return;
    const ch = gs.crosshair;
    ch.x += ch.vx;
    ch.y += ch.vy;
    ch.vx += (Math.random() - 0.5) * 0.25;
    ch.vy += (Math.random() - 0.5) * 0.25;
    const spd = Math.sqrt(ch.vx * ch.vx + ch.vy * ch.vy);
    if (spd > 4.5) {
      ch.vx *= 3.8 / spd;
      ch.vy *= 3.8 / spd;
    }
    if (spd < 1.2) {
      ch.vx *= 1.8;
      ch.vy *= 1.8;
    }
    const dist = Math.sqrt((ch.x - CX) ** 2 + (ch.y - CY) ** 2);
    if (dist > BOARD_R * 0.9) {
      ch.vx += (CX - ch.x) * 0.025;
      ch.vy += (CY - ch.y) * 0.025;
    }
  }

  function throwDart() {
    if (gs.phase !== "aiming") return;
    const ch = gs.crosshair;
    const jit = 6 * (1 - gs.totalScore / 200);
    const ex = Math.max(
      CX - BOARD_R,
      Math.min(CX + BOARD_R, ch.x + (Math.random() - 0.5) * jit),
    );
    const ey = Math.max(
      CY - BOARD_R,
      Math.min(CY + BOARD_R, ch.y + (Math.random() - 0.5) * jit),
    );
    gs.throwAnim = { sx: CX, sy: GH + 50, ex, ey, t: 0 };
    gs.phase = "throwing";
    blip(300, 0.04, "triangle", 0.03);
  }

  gc.addEventListener("click", () => {
    if (gs.phase === "gameover") {
      gs.dartsLeft = 3;
      gs.totalScore = 0;
      gs.darts = [];
      gs.lastScore = null;
      gs.phase = "aiming";
      gs.crosshair = { x: CX, y: CY - 20, vx: 2.5, vy: 1.8 };
      return;
    }
    throwDart();
  });

  function closeGame() {
    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener("keydown", onDartsKey);
    overlay.remove();
  }
  closeBtn.addEventListener("click", closeGame);

  function onDartsKey(e) {
    if (e.key === "Escape") {
      closeGame();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      if (gs.phase === "gameover") {
        gs.dartsLeft = 3;
        gs.totalScore = 0;
        gs.darts = [];
        gs.lastScore = null;
        gs.phase = "aiming";
        gs.crosshair = { x: CX, y: CY - 20, vx: 2.5, vy: 1.8 };
      } else {
        throwDart();
      }
      e.preventDefault();
    }
  }
  document.addEventListener("keydown", onDartsKey);

  function loop() {
    updateCrosshair();
    if (gs.phase === "throwing" && gs.throwAnim) {
      gs.throwAnim.t += 0.045;
      if (gs.throwAnim.t >= 1) {
        const ta = gs.throwAnim;
        const sc = getDartScore(ta.ex - CX, ta.ey - CY);
        gs.darts.push({ x: ta.ex, y: ta.ey, score: sc });
        gs.totalScore += sc;
        gs.lastScore = sc;
        gs.lastScoreTime = Date.now();
        if (gs.totalScore > hiScore) {
          hiScore = gs.totalScore;
          localStorage.setItem("darts_hi", hiScore);
        }
        gs.dartsLeft--;
        gs.throwAnim = null;
        if (gs.dartsLeft <= 0) {
          gs.phase = "gameover";
          if (gs.totalScore > 0 && typeof window.saveGameScore === "function")
            window.saveGameScore("darts", gs.totalScore);
        } else {
          gs.phase = "aiming";
        }
        blip(sc >= 25 ? 880 : sc >= 10 ? 660 : 440, 0.08, "square", 0.06);
      }
    }
    render();
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

// ── Aquarium fish animation ───────────────────────────────────────
const aquariumFish = [
  { x: 0.3, y: 0.4, speed: 0.012, color: "#ff6040", size: 4, phase: 0 },
  { x: 0.7, y: 0.6, speed: -0.008, color: "#40a0ff", size: 3.5, phase: 1.5 },
  { x: 0.5, y: 0.3, speed: 0.015, color: "#ffcc20", size: 3, phase: 3 },
  { x: 0.2, y: 0.7, speed: -0.01, color: "#60ff80", size: 3, phase: 4.5 },
];
function drawAquariumFish(ctx, tick) {
  const rX = PER_ROW * STEP_X + 2;
  const [_aqTx, _aqTy] = getAdminPos("aquarium", rX + 0.3, 8);
  const aqx = OX + _aqTx * T,
    aqy = OY + _aqTy * T;
  const aqW = T * 2.5,
    aqH = T * 1.8;
  // Clip to inside of tank glass
  const cx = aqx + 4,
    cy = aqy + 4,
    cw = aqW - 8,
    ch = aqH - 8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, cy, cw, ch);
  ctx.clip();

  for (const f of aquariumFish) {
    f.x += f.speed * 0.016;
    // Bounce off walls instead of wrapping
    if (f.x > 0.92) {
      f.x = 0.92;
      f.speed = -Math.abs(f.speed);
    }
    if (f.x < 0.08) {
      f.x = 0.08;
      f.speed = Math.abs(f.speed);
    }
    const fx = cx + f.x * cw;
    const fy = cy + f.y * ch + Math.sin(tick * 0.05 + f.phase) * 3;
    const flip = f.speed > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(flip, 1);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-f.size, 0);
    ctx.lineTo(-f.size - 3, -2.5);
    ctx.lineTo(-f.size - 3, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(f.size * 0.4, -1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(f.size * 0.5, -1, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Bubbles (clipped inside tank)
  ctx.fillStyle = "#80c0ff30";
  for (let i = 0; i < 3; i++) {
    const bx = cx + ((tick * 0.7 + i * 30) % cw);
    const by = cy + ch - ((tick * 0.4 + i * 20) % ch);
    ctx.beginPath();
    ctx.arc(bx, by, 1.5 + i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore(); // remove clip
}

// ── Dust motes floating in window light shafts ──
let dustMotes = [];
function drawDustMotes(ctx, tick) {
  const tod = getTimeOfDay();
  if (tod.state === "night") return; // no dust at night
  // Init once
  if (dustMotes.length === 0) {
    for (let w = 0; w < 4; w++) {
      for (let j = 0; j < 3; j++) {
        const wx = OX + (3 + w * 6) * T + 4;
        dustMotes.push({
          x: wx + Math.random() * (T - 12),
          y: OY + 10 + Math.random() * T * 2,
          wy: OY + T, // shaft top
          wh: T * 2.5, // shaft height
          wx: wx,
          speed: 0.1 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random(),
        });
      }
    }
  }
  ctx.save();
  for (const m of dustMotes) {
    m.y += m.speed;
    m.x = m.wx + (T - 12) / 2 + Math.sin(tick * 0.02 + m.phase) * 6;
    if (m.y > m.wy + m.wh) {
      m.y = m.wy;
      m.x = m.wx + Math.random() * (T - 12);
    }
    ctx.globalAlpha = 0.25 + Math.sin(tick * 0.03 + m.phase) * 0.15;
    ctx.fillStyle = "#ffe8a0";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Fireflies outside windows at night ──
let fireflies = [];
function drawFireflies(ctx, tick) {
  const tod = getTimeOfDay();
  if (tod.state !== "night") {
    return;
  }
  if (fireflies.length === 0) {
    for (let w = 0; w < 4; w++) {
      for (let j = 0; j < 2; j++) {
        const wx = OX + (3 + w * 6) * T + 4;
        fireflies.push({
          x: wx + Math.random() * (T - 12),
          y: OY + 6 + Math.random() * (T - 14),
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          wx: wx,
          phase: Math.random() * Math.PI * 2,
          trail: [],
        });
      }
    }
  }
  ctx.save();
  for (const f of fireflies) {
    f.vx += (Math.random() - 0.5) * 0.05;
    f.vy += (Math.random() - 0.5) * 0.05;
    f.vx *= 0.98;
    f.vy *= 0.98;
    f.x += f.vx;
    f.y += f.vy;
    // Clamp to window
    if (f.x < f.wx + 2) f.vx = Math.abs(f.vx);
    if (f.x > f.wx + T - 14) f.vx = -Math.abs(f.vx);
    if (f.y < OY + 4) f.vy = Math.abs(f.vy);
    if (f.y > OY + T - 12) f.vy = -Math.abs(f.vy);
    // Trail
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 4) f.trail.shift();
    const glow = 0.4 + Math.sin(tick * 0.08 + f.phase) * 0.3;
    // Draw trail
    for (let t = 0; t < f.trail.length; t++) {
      ctx.globalAlpha = glow * (t / f.trail.length) * 0.4;
      ctx.fillStyle = "#a0ff60";
      ctx.beginPath();
      ctx.arc(f.trail[t].x, f.trail[t].y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw firefly
    ctx.globalAlpha = glow;
    ctx.fillStyle = "#c0ff40";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
    ctx.fill();
    // Glow halo
    ctx.globalAlpha = glow * 0.2;
    ctx.fillStyle = "#a0ff60";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Dart animation — darts fly toward board when agent is at darts spot ──
let dartAnims = []; // {startTime, angle, progress}
function drawDartAnimation(ctx, tick) {
  const rX = PER_ROW * STEP_X + 2;
  // Check if any agent is at the darts spot
  const dartPlayer = Object.values(agentStates).find(
    (s) =>
      s.arrived &&
      s.activityAnim === "stretching" &&
      IDLE_SPOTS[s.slotIdx]?.type === "darts",
  );
  if (!dartPlayer) {
    dartAnims = [];
    return;
  }

  // Spawn a new dart every ~60 ticks
  if (tick % 60 < 1 || dartAnims.length === 0) {
    dartAnims.push({
      angle: -0.3 + Math.random() * 0.6, // spread
      t: 0,
      stuck: false,
      stuckX: 0,
      stuckY: 0,
    });
    if (dartAnims.length > 5) dartAnims.shift(); // max 5 darts
  }

  const [_dBx, _dBy] = getAdminPos("darts", rX + 1.5, 0);
  const boardX = OX + _dBx * T;
  const boardY = OY + _dBy * T + 4;
  // Agent throw position
  const throwX = OX + dartPlayer.sx ? dartPlayer.sx - OX : (rX + 1.5) * T;
  const throwY = dartPlayer.sy ? dartPlayer.sy - 16 : OY + 7 * T;

  for (const d of dartAnims) {
    if (!d.stuck) {
      d.t += 0.04;
      if (d.t >= 1) {
        d.stuck = true;
        d.stuckX = boardX + (Math.random() - 0.5) * 16;
        d.stuckY = boardY + (Math.random() - 0.5) * 16;
      }
    }

    if (d.stuck) {
      // Dart stuck in board
      const dx2 = d.stuckX,
        dy2 = d.stuckY;
      ctx.save();
      ctx.translate(dx2, dy2);
      ctx.rotate(-Math.PI / 2 + d.angle);
      // Dart body
      ctx.fillStyle = "#c0c0d0";
      ctx.fillRect(-1, -8, 2, 8);
      // Flights (feathers)
      ctx.fillStyle = "#cc2020";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-4, -12);
      ctx.lineTo(0, -10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(4, -12);
      ctx.lineTo(0, -10);
      ctx.fill();
      // Tip
      ctx.fillStyle = "#808080";
      ctx.fillRect(-0.5, 0, 1, 3);
      ctx.restore();
    } else {
      // Flying dart
      const px = throwX + (boardX - throwX) * d.t + d.angle * 20 * (1 - d.t);
      const py =
        throwY + (boardY - throwY) * d.t - Math.sin(d.t * Math.PI) * 15;
      ctx.save();
      const flyAngle =
        Math.atan2(boardY - throwY, boardX - throwX) + d.angle * 0.5;
      ctx.translate(px, py);
      ctx.rotate(flyAngle);
      // Dart body
      ctx.fillStyle = "#c0c0d0";
      ctx.fillRect(-1, -6, 2, 6);
      ctx.fillStyle = "#cc2020";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-3, -9);
      ctx.lineTo(0, -7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(3, -9);
      ctx.lineTo(0, -7);
      ctx.fill();
      ctx.fillStyle = "#808080";
      ctx.fillRect(-0.5, 0, 1, 2);
      ctx.restore();
      // Motion trail
      ctx.fillStyle = "rgba(200,200,220,0.3)";
      ctx.beginPath();
      ctx.arc(px - 4, py + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── smoking_beer (couch) — beer in one hand, cigarette in other ──
function drawSmokingBeer(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  // cigarette cycle: 0-0.35 resting, 0.35-0.65 raise to mouth, 0.65-0.8 puff, 0.8-1 lower
  const cigT = t % 1;
  const armRaise =
    cigT < 0.35
      ? 0
      : cigT < 0.65
        ? ease.inOut((cigT - 0.35) / 0.3) * 14
        : cigT < 0.8
          ? ease.inOut((0.8 - cigT) / 0.15) * 14
          : 0;
  const puffing = cigT > 0.55 && cigT < 0.78;

  shd(ctx, cx - 8, cy + 10, 18, 3);

  // legs (sitting, slightly spread)
  px(ctx, cx - 22, cy + 4, 14, 6, pal.pants);
  px(ctx, cx - 12, cy + 9, 5, 5, pal.pants);
  px(ctx, cx - 26, cy + 9, 7, 3, "#1a1a2a");

  // body slightly slouched back
  px(ctx, cx - 8, cy - 2, 13, 10, pal.shirt);
  px(ctx, cx - 2, cy - 1, 2, 8, "#ffffff18");

  // LEFT arm holding big beer mug (same as drinking_beer)
  px(ctx, cx - 11, cy - 1, 4, 10, pal.skin);
  const my = cy - 12;
  ctx.fillStyle = "#e8b820";
  ctx.fillRect((cx - 14) | 0, my | 0, 13, 15);
  ctx.fillStyle = "#f5d040";
  ctx.fillRect((cx - 13) | 0, my | 0, 11, 5);
  ctx.fillStyle = "#fffff080";
  ctx.fillRect((cx - 12) | 0, my | 0, 4, 4);
  ctx.fillStyle = "#c09010";
  ctx.fillRect((cx - 1) | 0, (my + 2) | 0, 5, 9);
  ctx.fillStyle = "#a07008";
  ctx.fillRect((cx - 1) | 0, (my + 2) | 0, 2, 9);
  ctx.fillStyle = "#c89018";
  ctx.fillRect((cx - 12) | 0, (my + 5) | 0, 9, 9);
  ctx.fillStyle = "#d4a020";
  ctx.fillRect((cx - 12) | 0, (my + 5) | 0, 2, 9);

  // RIGHT arm — cigarette hand (raises to mouth)
  const cArmY = cy + 1 - armRaise;
  px(ctx, cx + 5, cArmY, 8, 3, pal.skin);
  // forearm/wrist
  const cigTipX = cx + 13,
    cigTipY = cArmY - 2;
  // cigarette stick
  ctx.fillStyle = "#f5f0e0";
  ctx.save();
  ctx.translate(cigTipX, cigTipY);
  ctx.rotate(-0.3);
  ctx.fillRect(-1, -1, 10, 3);
  // filter (orange tip)
  ctx.fillStyle = "#d08030";
  ctx.fillRect(8, -1, 3, 3);
  // lit ember
  ctx.fillStyle = "#ff6020";
  ctx.beginPath();
  ctx.arc(-1, 0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff9040";
  ctx.beginPath();
  ctx.arc(-1, 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Smoke from cigarette tip — always drifting
  if (Math.random() < 0.12) {
    PS.smoke(cigTipX - 3, cigTipY - 3);
  }

  // HEAD — side profile, slightly tilted back & content
  ctx.save();
  ctx.translate(cx + 2, cy - 8);
  ctx.rotate(puffing ? -0.12 : -0.05);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // ear
  px(ctx, 6, -1, 3, 5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 6, 0, Math.PI, 0);
  ctx.fill();
  if (!pal.hat) {
    px(ctx, -7, -5, 3, 4, pal.hair);
    px(ctx, 3, -5, 3, 4, pal.hair);
  }
  if (pal.hat) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-8, -14, 16, 6);
    ctx.fillRect(-10, -10, 20, 4);
  }
  // EYES — heavy lidded / squinting contentedly
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -2, 4, 2);
  ctx.fillRect(1, -2, 4, 2);
  ctx.fillStyle = "#ffffff40";
  ctx.fillRect(-4, -2, 1, 1);
  ctx.fillRect(1, -2, 1, 1);
  // mouth — pursed for puffing OR relaxed smirk
  if (puffing) {
    // puckered mouth exhaling
    ctx.fillStyle = "#c87050";
    ctx.beginPath();
    ctx.ellipse(0, 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // exhale smoke cloud from mouth
    if (Math.random() < 0.3) PS.smoke(cx + 14, cy - 5);
  } else {
    ctx.fillStyle = "#c8906060";
    ctx.fillRect(-2, 3, 5, 2);
    ctx.fillRect(-2, 4, 1, 1);
    ctx.fillRect(2, 4, 1, 1); // tiny smirk
  }
  if (pal.beard) {
    ctx.fillStyle = pal.hair + "bb";
    ctx.fillRect(-4, 4, 8, 3);
  }
  ctx.restore();
}

// ── petting_cat — agent bent down, hand extended ──────────────────
function drawPettingCat(ctx, cx, cy, pal, t) {
  const lean = Math.sin(t * Math.PI * 2 * 0.3) * 3; // gentle sway
  shd(ctx, cx, cy + 16);
  // legs
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  // body leaning forward
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.25);
  px(ctx, -6, -2, 12, 9, pal.shirt);
  ctx.restore();
  // arm reaching down to pet
  px(ctx, cx + 4, cy + 2 + lean, 6, 3, pal.skin);
  px(ctx, cx + 9, cy + 6 + lean, 4, 3, pal.skin); // hand stroking
  // other arm for balance
  px(ctx, cx - 10, cy + 1, 6, 3, pal.skin);
  // head tilted looking at cat
  ctx.save();
  ctx.translate(cx - 1, cy - 8);
  ctx.rotate(0.3);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -2, 4, 3);
  ctx.fillRect(1, -2, 4, 3);
  // happy eyes — squinted
  ctx.fillStyle = "#c89060";
  ctx.fillRect(-2, 3, 5, 1); // smile
  ctx.restore();
}

// ── cleaning — agent bent over wiping floor ────────────────────────
function drawCleaning(ctx, cx, cy, pal, t) {
  const wipe = Math.sin(t * Math.PI * 4) * 8; // wiping motion
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  // body bent forward a lot
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.5);
  px(ctx, -6, -2, 12, 9, pal.shirt);
  ctx.restore();
  // both arms extended forward wiping
  px(ctx, cx - 10, cy + 4, 8, 3, pal.skin);
  px(ctx, cx + wipe * 0.3, cy + 8, 8, 3, pal.skin); // wiping arm
  // tissue/cloth in hand
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect((cx + wipe * 0.3 + 6) | 0, (cy + 7) | 0, 8, 5);
  ctx.fillStyle = "#d0d0e0";
  ctx.fillRect((cx + wipe * 0.3 + 7) | 0, (cy + 8) | 0, 6, 3);
  // head down
  ctx.save();
  ctx.translate(cx - 2, cy - 6);
  ctx.rotate(0.5);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 5, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-3, -1, 3, 2);
  ctx.fillRect(1, -1, 3, 2);
  // disgusted expression
  ctx.fillStyle = "#c8906060";
  ctx.fillRect(-2, 3, 5, 1);
  ctx.fillRect(-2, 4, 2, 1); // frown
  ctx.restore();
}

// ── standing_up (transition: chair → walk) ───────────────────────
function drawStandingUp(ctx, cx, cy, pal, t) {
  const e = ease.inOut(t);
  const sinkY = (1 - e) * 9; // start sunk, rise to full height
  const legFold = (1 - e) * 5;
  shd(ctx, cx, cy + 14);
  px(ctx, cx - 4, cy + 6 + sinkY, 4, Math.max(3, 8 - legFold) | 0, pal.pants);
  px(ctx, cx + 1, cy + 6 + sinkY, 4, Math.max(3, 8 - legFold) | 0, pal.pants);
  // shoes emerge as agent rises
  if (e > 0.35) {
    ctx.globalAlpha = (e - 0.35) / 0.65;
    px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
    px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
    ctx.globalAlpha = 1;
  }
  px(ctx, cx - 5, cy - 2 + sinkY, 11, 9, pal.shirt);
  px(ctx, cx, cy - 1 + sinkY, 1, 7, "#ffffff18");
  const armLift = (1 - e) * 4;
  px(ctx, cx - 11, cy + 1 + armLift, 7, 3, pal.skin);
  px(ctx, cx + 4, cy + 1 + armLift, 7, 3, pal.skin);
  drawHeadFront(ctx, cx, cy - 12 + sinkY * 0.75, pal, false);
}

// ── playing_arcade — standing at arcade cabinet ──────────────────
function drawPlayingArcade(ctx, cx, cy, pal, t) {
  const s = Math.sin(t * Math.PI * 2);
  const bounce = Math.abs(Math.sin(t * Math.PI * 4)) * 2;
  const lean = 3;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5 - bounce, 4, 9 + bounce, pal.pants);
  px(ctx, cx + 1, cy + 5 - bounce, 4, 9 + bounce, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  ctx.save();
  ctx.translate(cx, cy - bounce);
  ctx.rotate(0.2);
  px(ctx, -6, -2, 12, 9, pal.shirt);
  ctx.restore();
  px(ctx, cx - 8 + s * 3, cy + 2 - bounce + lean, 5, 3, pal.skin);
  px(ctx, cx - 7 + s * 3, cy + 5 - bounce + lean, 2, 4, "#444");
  px(ctx, cx - 8 + s * 3, cy + 9 - bounce + lean, 4, 2, "#333");
  const tap = Math.sin(t * Math.PI * 8) > 0 ? 1 : 0;
  px(ctx, cx + 5, cy + 2 - bounce + lean, 5, 3, pal.skin);
  px(ctx, cx + 8, cy + 5 - bounce + lean + tap, 3, 2, pal.skin);
  px(ctx, cx + 7, cy + 7 - bounce + lean, 3, 2, "#f7768e");
  px(ctx, cx + 11, cy + 7 - bounce + lean, 3, 2, "#9ece6a");
  drawHeadFront(ctx, cx + lean, cy - 12 - bounce, pal, false);
}

// ── drinking_espresso — sitting at bar sipping ───────────────────
function drawDrinkingEspresso(ctx, cx, cy, pal, t) {
  const sip = Math.sin(t * Math.PI * 2);
  const drinking = sip > 0.7;
  const cupY = drinking ? -6 : 2;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 6, 4, 7, pal.pants);
  px(ctx, cx + 1, cy + 6, 4, 7, pal.pants);
  px(ctx, cx - 5, cy + 12, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 12, 5, 3, "#1a1a2a");
  px(ctx, cx - 8, cy + 5, 16, 2, "#8a6040");
  px(ctx, cx - 2, cy + 7, 4, 10, "#8a6040");
  px(ctx, cx - 6, cy - 3, 12, 9, pal.shirt);
  px(ctx, cx - 9, cy + cupY, 5, 3, pal.skin);
  px(ctx, cx - 11, cy + cupY - 1, 5, 4, "#6a4020");
  px(ctx, cx - 10, cy + cupY, 3, 2, "#f0e8d8");
  if (!drinking) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    const w1 = Math.sin(t * Math.PI * 3) * 2;
    const w2 = Math.sin(t * Math.PI * 3 + 1) * 2;
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + cupY - 3);
    ctx.quadraticCurveTo(cx - 10 + w1, cy + cupY - 7, cx - 9, cy + cupY - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + cupY - 3);
    ctx.quadraticCurveTo(cx - 8 + w2, cy + cupY - 7, cx - 7, cy + cupY - 10);
    ctx.stroke();
    ctx.restore();
  }
  px(ctx, cx + 5, cy + 1, 6, 3, pal.skin);
  drawHeadFront(ctx, cx, cy - 11, pal, drinking);
}

// ── djing — standing at DJ console ───────────────────────────────
function drawDJing(ctx, cx, cy, pal, t) {
  const bob = Math.sin(t * Math.PI * 6) * 2;
  const nod = Math.sin(t * Math.PI * 6) * 0.1;
  const discAngle = t * Math.PI * 2;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 6, cy + 5 - bob, 4, 9 + bob, pal.pants);
  px(ctx, cx + 3, cy + 5 - bob, 4, 9 + bob, pal.pants);
  px(ctx, cx - 7, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 3, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 6, cy - 2 - bob, 12, 9, pal.shirt);
  const txOff = Math.cos(discAngle) * 4;
  const tyOff = Math.sin(discAngle) * 2;
  px(ctx, cx - 10 + txOff, cy + 1 - bob + tyOff, 5, 3, pal.skin);
  const fader = Math.sin(t * Math.PI * 4) * 3;
  px(ctx, cx + 7, cy + 1 - bob, 5, 3, pal.skin);
  px(ctx, cx + 10, cy + 2 - bob + fader, 3, 2, pal.skin);
  ctx.save();
  ctx.translate(cx, cy - 11 - bob);
  ctx.rotate(nod);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -2, 4, 3);
  ctx.fillRect(1, -2, 4, 3);
  ctx.strokeStyle = "#303040";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -4, 9, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  px(ctx, -9, -2, 3, 6, "#303040");
  px(ctx, 7, -2, 3, 6, "#303040");
  ctx.restore();
}

// ── fixing_server — crouching at server rack ─────────────────────
function drawFixingServer(ctx, cx, cy, pal, t) {
  const reach = Math.sin(t * Math.PI * 2) * 3;
  const spark = Math.sin(t * Math.PI * 8) > 0.9;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 5, cy + 4, 5, 5, pal.pants);
  px(ctx, cx + 1, cy + 4, 5, 5, pal.pants);
  px(ctx, cx - 7, cy + 8, 5, 6, pal.pants);
  px(ctx, cx + 3, cy + 8, 5, 6, pal.pants);
  px(ctx, cx - 8, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 3, cy + 13, 5, 3, "#1a1a2a");
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.3);
  px(ctx, -6, -3, 12, 8, pal.shirt);
  ctx.restore();
  px(ctx, cx + 6, cy - 2 + reach, 6, 3, pal.skin);
  px(ctx, cx + 11, cy - 1 + reach, 4, 3, pal.skin);
  if (spark) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    px(ctx, cx + 13, cy - 2 + reach, 2, 2, "#ffdd30");
    px(ctx, cx + 12, cy - 3 + reach, 1, 1, "#fff");
    px(ctx, cx + 15, cy - 1 + reach, 1, 1, "#fff");
    ctx.restore();
  }
  px(ctx, cx - 9, cy + 1, 5, 3, pal.skin);
  px(ctx, cx - 12, cy, 2, 5, "#888");
  px(ctx, cx - 13, cy - 1, 1, 2, "#cc4");
  ctx.save();
  ctx.translate(cx + 2, cy - 9);
  ctx.rotate(0.25);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 5, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -1, 3, 3);
  ctx.fillRect(2, -1, 3, 3);
  ctx.restore();
}

// ── watching_3dprint — leaning forward watching printer ───────────
function drawWatching3DPrint(ctx, cx, cy, pal, t) {
  const tilt = Math.sin(t * Math.PI * 2) * 0.15;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.25);
  px(ctx, -6, -2, 12, 9, pal.shirt);
  ctx.restore();
  px(ctx, cx + 4, cy + 2, 4, 3, pal.shirt);
  px(ctx, cx - 9, cy - 2, 5, 3, pal.skin);
  px(ctx, cx - 8, cy - 5, 4, 4, pal.skin);
  ctx.save();
  ctx.translate(cx - 2, cy - 12);
  ctx.rotate(tilt);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 6, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, 0, 3, 2);
  ctx.fillRect(2, 0, 3, 2);
  ctx.fillStyle = "#c89060";
  ctx.fillRect(-2, 4, 5, 1);
  ctx.restore();
}

// ── shooting_basket — throwing basketball ────────────────────────
function drawShootingBasket(ctx, cx, cy, pal, t) {
  const phase = t < 0.4 ? 0 : t < 0.6 ? 1 : 2;
  const lift = phase === 1 ? 2 : 0;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5 + lift, 4, 9 - lift, pal.pants);
  px(ctx, cx + 1, cy + 5 + lift, 4, 9 - lift, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 6, cy - 2 - lift, 12, 9, pal.shirt);
  if (phase === 0) {
    px(ctx, cx - 7, cy - 8 - lift, 5, 3, pal.skin);
    px(ctx, cx + 3, cy - 8 - lift, 5, 3, pal.skin);
    ctx.fillStyle = "#e88030";
    ctx.beginPath();
    ctx.arc(cx, cy - 14 - lift, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c06020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy - 14 - lift, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (phase === 1) {
    const releaseT = (t - 0.4) / 0.2;
    px(ctx, cx - 5, cy - 14 - lift, 4, 3, pal.skin);
    px(ctx, cx + 2, cy - 14 - lift, 4, 3, pal.skin);
    const ballY = cy - 18 - lift - releaseT * 14;
    const ballX = cx + releaseT * 4;
    ctx.fillStyle = "#e88030";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c06020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    px(ctx, cx - 5, cy - 14, 4, 3, pal.skin);
    px(ctx, cx + 2, cy - 14, 4, 3, pal.skin);
    const ftT = (t - 0.6) / 0.4;
    const ballY = cy - 32 + ftT * 10;
    const ballX = cx + 4 + ftT * 2;
    ctx.fillStyle = "#e88030";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c06020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHeadFront(ctx, cx, cy - 11 - lift, pal, false);
}

// ── in_hammock — agent lounging in a swinging hammock ────────────
function drawInHammock(ctx, cx, cy, pal, t) {
  const swing = Math.sin(t * Math.PI * 2 * 0.25) * 6; // gentle sway
  const ph = t * Math.PI * 2;
  const bodyY = cy + 4 + Math.sin(ph * 0.3) * 1.5; // subtle bobbing
  const sway = swing * 0.4;
  // hammock ropes
  ctx.strokeStyle = "#c8a050";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 16 + sway, bodyY - 4);
  ctx.lineTo(cx - 8 + sway, bodyY + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 16 + sway, bodyY - 4);
  ctx.lineTo(cx + 8 + sway, bodyY + 6);
  ctx.stroke();
  // hammock fabric (curved bed)
  ctx.strokeStyle = "#d4824a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 14 + sway, bodyY + 4);
  ctx.quadraticCurveTo(cx + sway, bodyY + 14, cx + 14 + sway, bodyY + 4);
  ctx.stroke();
  ctx.strokeStyle = "#c07038";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12 + sway, bodyY + 5);
  ctx.quadraticCurveTo(cx + sway, bodyY + 12, cx + 12 + sway, bodyY + 5);
  ctx.stroke();
  // body (lying horizontal)
  const bx = cx - 10 + sway,
    by = bodyY + 2;
  px(ctx, bx, by, 20, 5, pal.shirt); // torso
  px(ctx, bx + 15, by + 1, 8, 4, pal.pants); // legs
  px(ctx, bx - 2, by + 1, 5, 4, pal.pants); // other leg
  // head
  const headX = cx + 8 + sway,
    headY = bodyY - 2;
  px(ctx, headX - 4, headY - 8, 8, 7, pal.skin); // head
  px(ctx, headX - 4, headY - 10, 8, 3, pal.hair); // hair
  // closed eyes (relaxing)
  ctx.fillStyle = "#603020";
  ctx.fillRect((headX - 2) | 0, (headY - 6) | 0, 2, 1);
  ctx.fillRect((headX + 1) | 0, (headY - 6) | 0, 2, 1);
  // Zzz particles floating
  if (((t * 10) | 0) % 3 === 0) {
    ctx.font = "5px monospace";
    ctx.fillStyle = "#a0c0ff80";
    ctx.fillText("z", cx + 12 + sway, bodyY - 8 - ((t * 15) % 12));
  }
}

// ── playing_foosball — at foosball table side view ───────────────
function drawPlayingFoosball(ctx, cx, cy, pal, t) {
  const twist = Math.sin(t * Math.PI * 4) * 0.3;
  const lean = Math.sin(t * Math.PI * 2) * 2;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 6, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 3, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 7, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 3, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx - 6 + lean, cy - 2, 12, 9, pal.shirt);
  px(ctx, cx - 10 + lean, cy + 2, 4, 3, pal.skin);
  px(ctx, cx + 8 + lean, cy + 2, 4, 3, pal.skin);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 14 + lean, cy + 3);
  ctx.lineTo(cx + 14 + lean, cy + 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 14 + lean, cy + 6);
  ctx.lineTo(cx + 14 + lean, cy + 6);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx + lean, cy + 4);
  ctx.rotate(twist);
  px(ctx, -2, -3, 4, 6, "#4060c0");
  ctx.restore();
  drawHeadFront(ctx, cx + lean, cy - 11, pal, false);
}

// ── using_telescope — standing looking through telescope ─────────
function drawUsingTelescope(ctx, cx, cy, pal, t) {
  const adj = Math.sin(t * Math.PI * 2) * 2;
  const mouthOpen = Math.sin(t * Math.PI * 2) > 0.8;
  shd(ctx, cx, cy + 16);
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.2);
  px(ctx, -6, -2, 12, 9, pal.shirt);
  ctx.restore();
  px(ctx, cx + 6, cy - 4 + adj, 5, 3, pal.skin);
  px(ctx, cx - 9, cy - 2, 5, 3, pal.skin);
  ctx.strokeStyle = "#606080";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 6);
  ctx.lineTo(cx + 12, cy - 14 + adj * 0.5);
  ctx.stroke();
  ctx.fillStyle = "#404060";
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#80a0d0";
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 14 + adj * 0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx - 4, cy - 12);
  ctx.rotate(0.15);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 5, 0, -Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1b26";
  ctx.fillRect(-4, -1, 3, 1);
  ctx.fillRect(2, -1, 3, 3);
  if (mouthOpen) {
    ctx.fillStyle = "#1a1b26";
    ctx.beginPath();
    ctx.ellipse(0, 4, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#c89060";
    ctx.fillRect(-2, 3, 4, 1);
  }
  ctx.restore();
}

// ── DISPATCH: state name → draw fn ───────────────────────────────
const CHAR_DRAW = {
  walking: drawWalking,
  sitting_down: drawSittingDown,
  standing_up: drawStandingUp,
  typing_normal: drawTypingNormal,
  typing_furious: drawTypingFurious,
  thinking: drawThinking,
  drinking_desk: drawDrinkingDesk,
  spinning_chair: drawSpinningChair,
  celebrating: drawCelebrating,
  sitting_couch: drawSittingDown,
  sleeping: drawSleeping,
  smoking_beer: drawSmokingBeer,
  drinking_beer: drawDrinkingBeer,
  phone: drawPhone,
  stretching: drawStretching,
  at_coffee: drawAtCoffee,
  at_fridge: drawAtFridge,
  eating: drawEating,
  window_gaze: drawWindowGaze,
  headphones: drawHeadphones,
  air_guitar: drawAirGuitar,
  yoga: drawYoga,
  reading: drawReading,
  desk_nap: drawDeskNap,
  desk_yawn: drawDeskYawn,
  doodling: drawDoodling,
  plant_care: drawPlantCare,
  chatting_l: drawChattingL,
  chatting_r: drawChattingR,
  arguing_l: drawArguingL,
  arguing_r: drawArguingR,
  gossiping_l: drawGossipingL,
  gossiping_r: drawGossipingR,
  gaming: drawGaming,
  treadmill: drawTreadmill,
  bench_press: drawBenchPress,
  boxing: drawBoxing,
  cycling: drawCycling,
  lifting_weights: drawLiftingWeights,
  ping_pong_l: drawPingPongL,
  ping_pong_r: drawPingPongR,
  petting_cat: drawPettingCat,
  cleaning: drawCleaning,
  playing_arcade: drawPlayingArcade,
  drinking_espresso: drawDrinkingEspresso,
  djing: drawDJing,
  fixing_server: drawFixingServer,
  watching_3dprint: drawWatching3DPrint,
  shooting_basket: drawShootingBasket,
  in_hammock: drawInHammock,
  playing_foosball: drawPlayingFoosball,
  using_telescope: drawUsingTelescope,
  rowing: drawRowing,
};

// ════════════════════════════════════════════════════════════════
//  THOUGHT BUBBLE & NAME LABEL
// ════════════════════════════════════════════════════════════════
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function drawThoughtBubble(ctx, cx, cy, text, tick) {
  if (!text) return;
  ctx.font = "bold 8px 'Press Start 2P', monospace";
  const tw = ctx.measureText(text).width;
  const bw = tw + 20,
    bh = 20;
  const bx = cx - bw / 2 + 4,
    by = cy - 90;
  const wob = Math.sin(tick * 0.06) * 1.5;
  [
    [cx + 2, cy - 24, 2.5],
    [cx + 9, cy - 50 + wob, 3.5],
    [cx + 16, cy - 68 + wob, 4],
  ].forEach(([x, y, r]) => {
    ctx.fillStyle = "rgba(187,154,247,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(6,8,20,0.97)";
  ctx.strokeStyle = "#bb9af7";
  ctx.lineWidth = 2;
  rrect(ctx, bx, by, bw, bh, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, bx + 10, by + 14);
}
// Speech bubble — classic talk bubble with a tail, distinct from thought bubble
const SPEECH_PHRASES = {
  working: [
    "shipping!",
    "git push!",
    "almost!",
    "nice code!",
    "tests pass!",
    "lgtm!",
    "one more fix",
    "let's go!",
    "prod ready?",
    "refactor time",
  ],
  furious: [
    "SHIP IT!",
    "no sleep!",
    "prod is down!",
    "debug mode",
    "stack trace...",
    "WHY?!",
    "it compiled!",
    "send it!",
    "rip logs",
    "deploy!",
  ],
  thinking: [
    "bug found!",
    "wait...",
    "i see it",
    "oh no",
    "hmm...",
    "uh oh",
    "classic",
    "interesting",
    "hold on",
    "analyzing",
  ],
  idle: [
    "need coffee...",
    "brb...",
    "lunch?",
    "anyone here?",
    "bored.jpg",
    "slack me",
    "tea time",
    "nap soon",
    ":zzz:",
    "hey!",
  ],
};
function drawSpeechBubble(ctx, cx, cy, text, alpha) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 7px 'Press Start 2P', monospace";
  const tw = ctx.measureText(text).width;
  const pad = 9,
    bw = tw + pad * 2,
    bh = 18;
  const bx = cx - bw / 2 + 8,
    by = cy - 78;
  // bubble body
  ctx.fillStyle = "rgba(6,8,20,0.96)";
  ctx.strokeStyle = "#7aa2f7";
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, by, bw, bh, 4);
  ctx.fill();
  ctx.stroke();
  // tail (triangle pointing down-left toward agent head)
  const tx_ = bx + 10,
    tailY = by + bh;
  ctx.fillStyle = "rgba(6,8,20,0.96)";
  ctx.beginPath();
  ctx.moveTo(tx_ - 4, tailY);
  ctx.lineTo(tx_ + 4, tailY);
  ctx.lineTo(cx, cy - 55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7aa2f7";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx_ - 4, tailY - 1);
  ctx.lineTo(cx, cy - 56);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx_ + 4, tailY - 1);
  ctx.lineTo(cx, cy - 56);
  ctx.stroke();
  // text
  ctx.fillStyle = "#c8d3f5";
  ctx.fillText(text, bx + pad, by + 12);
  ctx.restore();
}

function drawLabel(ctx, cx, cy, name, scale, burnout, trait) {
  if (scale < 0.05) return;
  const BURNOUT_ICONS = ["", "😴", "😰", "🥵", "💀"];
  const icon = burnout >= 1 && burnout <= 4 ? BURNOUT_ICONS[burnout] : "";
  const traitDot =
    trait === "extrovert" ? "📣" : trait === "introvert" ? "🔇" : "";
  ctx.font = "bold 8px 'Press Start 2P', monospace";
  const tw = ctx.measureText(name).width;
  const extraW = (icon ? 12 : 0) + (traitDot ? 12 : 0);
  const bw = tw + 14 + extraW,
    bh = 14,
    bx = cx - bw / 2,
    by = cy + 22;
  ctx.save();
  ctx.translate(cx, by + bh / 2);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -(by + bh / 2));
  ctx.fillStyle = "rgba(3,4,14,0.97)";
  rrect(ctx, bx, by, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle =
    trait === "extrovert"
      ? "#f7768e44"
      : trait === "introvert"
        ? "#7aa2f744"
        : "#5060a0";
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, by, bw, bh, 3);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, bx + 7, by + 10);
  let iconX = bx + tw + 9;
  if (traitDot) {
    ctx.font = "8px sans-serif";
    ctx.fillText(traitDot, iconX, by + 11);
    iconX += 12;
  }
  if (icon) {
    ctx.font = "9px sans-serif";
    ctx.fillText(icon, iconX, by + 11);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
//  LAYOUT GENERATOR
// ════════════════════════════════════════════════════════════════
const FL_A = "#e4e0d8",
  FL_B = "#dcd8d0";
const WL_TOP = "#2e2c48",
  WL_BASE = "#3a3860";
const DESK_TOP = "#c4b488",
  DESK_FRONT = "#a09060",
  DESK_EDGE = "#8a7840";
const CHAIR_C = "#363878",
  CHAIR_SEAT = "#484a98";
const COUCH_C = "#3a2868",
  COUCH_SEAT = "#4e3888",
  COUCH_HI = "#604ca0";
// MON_DARK и SCREEN_C объявлены в начале файла

let DESK_DEFS = [],
  DESK_SLOTS = [],
  COUCH_DEFS = [],
  COUCH_SLOTS = [],
  layoutN = 0;
let IDLE_SPOTS = []; // all activity spots for idle agents
let GROUP_PAIRS = {}; // groupId -> [slotIndexA, slotIndexB]
let KITCHEN_WALL_COL = 0,
  KITCHEN_START_ROW = 0,
  KITCHEN_DOOR_ROW = 0; // enclosed kitchen
let PER_ROW = 3,
  STEP_X = 7,
  STEP_Y = 4,
  START_ROW = 1; // desk layout constants (global for obstacle grid / kanban)
let ACT_ZONE_Y = 0; // Y row where gym/gaming/ping-pong zone starts
// Ping pong ball — shared between both players
let PP_L = { tx: 0, ty: 0 },
  PP_R = { tx: 0, ty: 0 }; // player tile positions
let ppBall = { t: 0.5, dir: 1, speed: 0.38, active: false }; // t: 0=left, 1=right

// New feature globals
let printerActive = 0; // countdown timer for printer animation
let trashLevel = 0; // 0-10: how full the trash can is
let trashAgentId = null; // agent currently assigned to stomp trash

let _maxLayoutN = 12; // minimum 12 agents worth of space — office never shrinks
function generateLayout(n) {
  const count = Math.max(1, n);
  _maxLayoutN = Math.max(_maxLayoutN, count);
  const stableCount = Math.max(count, _maxLayoutN); // never shrink below peak
  if (stableCount === layoutN) return false;
  layoutN = stableCount;
  DESK_DEFS = [];
  DESK_SLOTS = [];
  COUCH_DEFS = [];
  COUCH_SLOTS = [];

  // 3 стола в ряд — у каждого агента своё место
  PER_ROW = 3;
  STEP_X = 7;
  STEP_Y = 4;
  START_ROW = 1;
  for (let i = 0; i < stableCount; i++) {
    const col = i % PER_ROW,
      row = Math.floor(i / PER_ROW);
    const dtx = 1 + col * STEP_X,
      dty = START_ROW + row * STEP_Y;
    DESK_DEFS.push({ tx: dtx, ty: dty });
    DESK_SLOTS.push({ tx: dtx + 0.8, ty: dty + 1.9 });
  }

  // 5 диванов в ряд, у каждого агента свой диван
  const deskRows = Math.ceil(stableCount / PER_ROW),
    LOUNGE_Y = START_ROW + deskRows * STEP_Y + 1;
  const COUCH_PER_ROW = 5;
  for (let i = 0; i < stableCount; i++) {
    const col = i % COUCH_PER_ROW,
      row = Math.floor(i / COUCH_PER_ROW);
    const cx = 1.5 + col * 5.2;
    const cy = LOUNGE_Y + row * 3;
    COUCH_DEFS.push({ tx: cx, ty: cy, w: 3 });
    COUCH_SLOTS.push({ tx: cx + 1.3, ty: cy + 0.4 });
  }

  const couchRows = Math.ceil(stableCount / COUCH_PER_ROW);
  const baseRows = LOUNGE_Y + couchRows * 3 + 1; // 1-row gap between lounge and activity zone
  ACT_ZONE_Y = baseRows;
  ROWS = Math.max(baseRows + 24, 70); // min 70 rows to fit all BUILTIN objects
  CH = OY + ROWS * T + OY;
  const cv = document.getElementById("office");
  if (cv) cv.height = CH;
  bgBuf.height = CH;

  // ── Build IDLE_SPOTS (activity spots for idle agents) ────────────
  IDLE_SPOTS = [];
  GROUP_PAIRS = {};

  // Couch slots become idle spots with varied animations
  const COUCH_ANIMS = [
    "sleeping",
    "smoking_beer",
    "phone",
    "stretching",
    "reading",
    "drinking_beer",
  ];
  COUCH_SLOTS.forEach((s, i) => {
    IDLE_SPOTS.push({
      tx: s.tx,
      ty: s.ty,
      anim: COUCH_ANIMS[i % COUCH_ANIMS.length],
      type: "couch",
      w: 8,
      _objId: "couch_" + i,
      _defObjTx: COUCH_DEFS[i].tx,
      _defObjTy: COUCH_DEFS[i].ty,
      _offsetX: s.tx - COUCH_DEFS[i].tx,
      _offsetY: s.ty - COUCH_DEFS[i].ty,
    });
  });

  // Window spots — along top wall between windows
  const winSpots = [4, 10, 16, 22].filter((x) => x < COLS - 2);
  winSpots.forEach((wx) => {
    IDLE_SPOTS.push({
      tx: wx,
      ty: 1.4,
      anim: "window_gaze",
      type: "window",
      w: 6,
    });
  });

  // Plants — away from kitchen (wall at COLS-11), no plant inside kitchen
  [
    [4.5, 0.5], // top wall, between desk col 0 and 1
    [COLS - 13, LOUNGE_Y - 1.5], // right of center, outside kitchen
  ].forEach(([px, py]) => {
    if (px > 0 && py > 0 && px < COLS - 1 && py < ROWS - 1)
      IDLE_SPOTS.push({
        tx: px,
        ty: py,
        anim: "plant_care",
        type: "plant",
        w: 4,
      });
  });

  // Open floor spots (for dancing, yoga, guitar)
  const floorAnims = ["headphones", "air_guitar", "yoga", "doodling"];
  const floorY = Math.floor(ROWS * 0.45);
  for (let i = 0; i < 4; i++) {
    IDLE_SPOTS.push({
      tx: 3 + i * 5,
      ty: floorY,
      anim: floorAnims[i % floorAnims.length],
      type: "floor",
      w: 5,
    });
  }

  // Enclosed kitchen room (right side, 6 columns wide)
  KITCHEN_WALL_COL = COLS - 11; // partition wall at col 17 — wider kitchen
  KITCHEN_START_ROW = Math.floor(ROWS * 0.38);
  KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1; // door opening (5 rows wide for traffic)
  const kitX = KITCHEN_WALL_COL + 1; // first interior column
  const kitY = KITCHEN_START_ROW;
  // 9 unique spots spread across the wider kitchen
  IDLE_SPOTS.push({
    tx: kitX + 0.5,
    ty: kitY + 0.5,
    anim: "at_coffee",
    type: "kitchen",
    w: 12,
  });
  IDLE_SPOTS.push({
    tx: kitX + 7,
    ty: kitY + 0.5,
    anim: "at_fridge",
    type: "kitchen",
    w: 8,
  });
  IDLE_SPOTS.push({
    tx: kitX + 1,
    ty: kitY + 2.5,
    anim: "eating",
    type: "kitchen",
    w: 7,
  });
  IDLE_SPOTS.push({
    tx: kitX + 3,
    ty: kitY + 2.5,
    anim: "eating",
    type: "kitchen",
    w: 6,
  });
  IDLE_SPOTS.push({
    tx: kitX + 5,
    ty: kitY + 2.5,
    anim: "eating",
    type: "kitchen",
    w: 5,
  });
  IDLE_SPOTS.push({
    tx: kitX + 7,
    ty: kitY + 2.5,
    anim: "eating",
    type: "kitchen",
    w: 5,
  });
  IDLE_SPOTS.push({
    tx: kitX + 1.5,
    ty: kitY + 1.2,
    anim: "reading",
    type: "kitchen",
    w: 5,
  });
  IDLE_SPOTS.push({
    tx: kitX + 4,
    ty: kitY + 1.2,
    anim: "phone",
    type: "kitchen",
    w: 6,
  });
  IDLE_SPOTS.push({
    tx: kitX + 7,
    ty: kitY + 1.2,
    anim: "stretching",
    type: "kitchen",
    w: 4,
  });

  // Group activity spots (pairs that face each other)
  const groupActivities = [
    ["chatting_l", "chatting_r"],
    ["arguing_l", "arguing_r"],
    ["gossiping_l", "gossiping_r"],
  ];
  const groupY = Math.floor(ROWS * 0.55);
  for (let g = 0; g < 3; g++) {
    const gx = 5 + g * 7,
      gy = groupY;
    const iA = IDLE_SPOTS.length;
    IDLE_SPOTS.push({
      tx: gx - 1.2,
      ty: gy,
      anim: groupActivities[g][0],
      type: "group",
      groupId: g,
      role: "L",
      w: 10,
    });
    const iB = IDLE_SPOTS.length;
    IDLE_SPOTS.push({
      tx: gx + 1.2,
      ty: gy,
      anim: groupActivities[g][1],
      type: "group",
      groupId: g,
      role: "R",
      w: 10,
    });
    GROUP_PAIRS[g] = [iA, iB];
  }

  // ── Gym zone (left side of activity area) ────────────────────────
  const gymX = 1,
    gymY = ACT_ZONE_Y + 1;
  const _gymDefTx = 1,
    _gymDefTy = ACT_ZONE_Y + 0.5;
  IDLE_SPOTS.push({
    tx: gymX + 0.5,
    ty: gymY,
    anim: "treadmill",
    type: "gym",
    w: 8,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 0.5 - _gymDefTx,
    _offsetY: gymY - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 3.5,
    ty: gymY,
    anim: "treadmill",
    type: "gym",
    w: 8,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 3.5 - _gymDefTx,
    _offsetY: gymY - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 0.8,
    ty: gymY + 3,
    anim: "yoga",
    type: "gym",
    w: 6,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 0.8 - _gymDefTx,
    _offsetY: gymY + 3 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 3,
    ty: gymY + 3,
    anim: "stretching",
    type: "gym",
    w: 5,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 3 - _gymDefTx,
    _offsetY: gymY + 3 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 5.5,
    ty: gymY + 1.5,
    anim: "headphones",
    type: "gym",
    w: 4,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 5.5 - _gymDefTx,
    _offsetY: gymY + 1.5 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 3.5,
    ty: gymY + 2.5,
    anim: "bench_press",
    type: "gym",
    w: 6,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 3.5 - _gymDefTx,
    _offsetY: gymY + 2.5 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 6,
    ty: gymY + 0.5,
    anim: "boxing",
    type: "gym",
    w: 4,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 6 - _gymDefTx,
    _offsetY: gymY + 0.5 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 6,
    ty: gymY + 2.5,
    anim: "cycling",
    type: "gym",
    w: 4,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 6 - _gymDefTx,
    _offsetY: gymY + 2.5 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 0.5,
    ty: gymY + 2.5,
    anim: "lifting_weights",
    type: "gym",
    w: 6,
    _objId: "gym",
    _defObjTx: _gymDefTx,
    _defObjTy: _gymDefTy,
    _offsetX: gymX + 0.5 - _gymDefTx,
    _offsetY: gymY + 2.5 - _gymDefTy,
  });
  IDLE_SPOTS.push({
    tx: gymX + 5,
    ty: gymY + 4,
    anim: "rowing",
    type: "gym",
    w: 5,
    _objId: "rowing_machine",
    _defObjTx: _gymDefTx + 4,
    _defObjTy: _gymDefTy + 3.8,
    _offsetX: gymX + 5 - (_gymDefTx + 4),
    _offsetY: gymY + 4 - (_gymDefTy + 3.8),
  });

  // ── Gaming/TV zone (center of activity area) ─────────────────────
  const tvX = 10,
    tvY = ACT_ZONE_Y + 1;
  const _tvDefTx = 10,
    _tvDefTy = ACT_ZONE_Y + 0.3;
  IDLE_SPOTS.push({
    tx: tvX + 1,
    ty: tvY + 1,
    anim: "gaming",
    type: "gaming",
    w: 10,
    _objId: "tv",
    _defObjTx: _tvDefTx,
    _defObjTy: _tvDefTy,
    _offsetX: tvX + 1 - _tvDefTx,
    _offsetY: tvY + 1 - _tvDefTy,
  });
  IDLE_SPOTS.push({
    tx: tvX + 3,
    ty: tvY + 1,
    anim: "gaming",
    type: "gaming",
    w: 9,
    _objId: "tv",
    _defObjTx: _tvDefTx,
    _defObjTy: _tvDefTy,
    _offsetX: tvX + 3 - _tvDefTx,
    _offsetY: tvY + 1 - _tvDefTy,
  });
  IDLE_SPOTS.push({
    tx: tvX + 5,
    ty: tvY + 1,
    anim: "gaming",
    type: "gaming",
    w: 8,
    _objId: "tv",
    _defObjTx: _tvDefTx,
    _defObjTy: _tvDefTy,
    _offsetX: tvX + 5 - _tvDefTx,
    _offsetY: tvY + 1 - _tvDefTy,
  });
  IDLE_SPOTS.push({
    tx: tvX + 2.5,
    ty: tvY + 3.5,
    anim: "reading",
    type: "gaming",
    w: 4,
    _objId: "tv",
    _defObjTx: _tvDefTx,
    _defObjTy: _tvDefTy,
    _offsetX: tvX + 2.5 - _tvDefTx,
    _offsetY: tvY + 3.5 - _tvDefTy,
  });

  // ── Ping pong zone (right-center of activity area) ────────────────
  const ppX = Math.min(19, COLS - 8),
    ppY = ACT_ZONE_Y + 2;
  const _ppDefTx = ppX - 2,
    _ppDefTy = ACT_ZONE_Y + 1;
  PP_L = { tx: ppX - 1.5, ty: ppY };
  PP_R = { tx: ppX + 4, ty: ppY };
  const ppIA = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: PP_L.tx,
    ty: PP_L.ty,
    anim: "ping_pong_l",
    type: "group",
    groupId: 10,
    role: "L",
    w: 9,
    _objId: "pingpong",
    _defObjTx: _ppDefTx,
    _defObjTy: _ppDefTy,
    _offsetX: 0.5,
    _offsetY: 1,
  });
  const ppIB = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: PP_R.tx,
    ty: PP_R.ty,
    anim: "ping_pong_r",
    type: "group",
    groupId: 10,
    role: "R",
    w: 9,
    _objId: "pingpong",
    _defObjTx: _ppDefTx,
    _defObjTy: _ppDefTy,
    _offsetX: 6,
    _offsetY: 1,
  });
  GROUP_PAIRS[10] = [ppIA, ppIB];

  // ── Printer spot ─────────────────────────────────────────────────
  IDLE_SPOTS.push({
    tx: KITCHEN_WALL_COL - 3,
    ty: KITCHEN_START_ROW - 2,
    anim: "reading",
    type: "printer",
    w: 5,
  });

  // ══════════════════════════════════════════════════════════════════
  //  RIGHT ENTERTAINMENT ZONE (cols PER_ROW*STEP_X+2 to COLS-2)
  // ══════════════════════════════════════════════════════════════════
  const rX = PER_ROW * STEP_X + 2; // right zone start col (~23)

  // ── 1. Water Cooler (pair chat) ────────────────────────────────
  const wcY = 2;
  const _coolerDefTx = rX + 2.5,
    _coolerDefTy = 2;
  const wc1 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: wcY + 1,
    anim: "chatting_l",
    type: "group",
    groupId: 20,
    role: "L",
    w: 8,
    _objId: "cooler",
    _defObjTx: _coolerDefTx,
    _defObjTy: _coolerDefTy,
    _offsetX: -1,
    _offsetY: 1,
  });
  const wc2 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: rX + 3.5,
    ty: wcY + 1,
    anim: "chatting_r",
    type: "group",
    groupId: 20,
    role: "R",
    w: 8,
    _objId: "cooler",
    _defObjTx: _coolerDefTx,
    _defObjTy: _coolerDefTy,
    _offsetX: 1,
    _offsetY: 1,
  });
  GROUP_PAIRS[20] = [wc1, wc2];

  // ── 2. Dartboard (solo — agent throws darts) ───────────────────
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: 6,
    anim: "stretching",
    type: "darts",
    w: 7,
    _objId: "darts",
    _defObjTx: rX + 1.5,
    _defObjTy: 0,
    _offsetX: 0,
    _offsetY: 6,
  });

  // ── 3. Aquarium (solo — agent watches fish) ────────────────────
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: 9,
    anim: "window_gaze",
    type: "aquarium",
    w: 8,
    _objId: "aquarium",
    _defObjTx: rX + 0.3,
    _defObjTy: 8,
    _offsetX: 1.2,
    _offsetY: 1,
  });

  // ── 4. Trophy Cabinet (solo — agent admires trophies) ──────────
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: 13,
    anim: "window_gaze",
    type: "trophy_cabinet",
    w: 6,
    _objId: "trophy_cabinet",
    _defObjTx: rX + 0.3,
    _defObjTy: 12,
    _offsetX: 1.2,
    _offsetY: 1,
  });

  // ── 4b. Rubber Duck (right panel — agents visit for debugging inspiration) ──
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: 11.5,
    anim: "window_gaze",
    type: "rubber_duck",
    w: 5,
    _objId: "rubber_duck",
    _defObjTx: rX + 0.3,
    _defObjTy: 10.5,
    _offsetX: 1.2,
    _offsetY: 1,
  });
  IDLE_SPOTS.push({
    tx: rX + 1.5,
    ty: 5,
    anim: "window_gaze",
    type: "lava_lamp",
    w: 4,
    _objId: "lava_lamp",
    _defObjTx: rX + 0.3,
    _defObjTy: 4.5,
    _offsetX: 1.2,
    _offsetY: 0.5,
  });
  const _cbDefTx = 15,
    _cbDefTy = ACT_ZONE_Y + 17;
  IDLE_SPOTS.push({
    tx: _cbDefTx + 1.5,
    ty: _cbDefTy + 0.5,
    anim: "window_gaze",
    type: "crystal_ball",
    w: 5,
    _objId: "crystal_ball",
    _defObjTx: _cbDefTx,
    _defObjTy: _cbDefTy,
    _offsetX: 1.5,
    _offsetY: 0.5,
  });

  // ── 5. Whiteboard (main office, top wall — agent doodles) ───────
  IDLE_SPOTS.push({
    tx: 18,
    ty: 2,
    anim: "doodling",
    type: "whiteboard",
    w: 6,
    _objId: "whiteboard",
    _defObjTx: 17,
    _defObjTy: 0,
    _offsetX: 1,
    _offsetY: 2,
  });

  // ══ Zone 1: RECREATION (ACT_ZONE+9, spread across full width) ══

  // ── 7. Foosball Table (recreation, cols 8-10) ─────────────────
  const fb1 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: 8,
    ty: ACT_ZONE_Y + 10,
    anim: "playing_foosball",
    type: "group",
    groupId: 21,
    role: "L",
    w: 7,
    _objId: "foosball",
    _defObjTx: 8,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 0,
    _offsetY: 1,
  });
  const fb2 = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: 11,
    ty: ACT_ZONE_Y + 10,
    anim: "playing_foosball",
    type: "group",
    groupId: 21,
    role: "R",
    w: 7,
    _objId: "foosball",
    _defObjTx: 8,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 3,
    _offsetY: 1,
  });
  GROUP_PAIRS[21] = [fb1, fb2];

  // ── 8. Basketball Hoop (recreation, cols 12-13) ───────────────
  IDLE_SPOTS.push({
    tx: 13,
    ty: ACT_ZONE_Y + 10,
    anim: "shooting_basket",
    type: "basketball",
    w: 5,
    _objId: "basketball",
    _defObjTx: 12,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ── 9. Arcade Machine (recreation, cols 16-17) ────────────────
  IDLE_SPOTS.push({
    tx: 17,
    ty: ACT_ZONE_Y + 10,
    anim: "playing_arcade",
    type: "arcade",
    w: 7,
    _objId: "arcade",
    _defObjTx: 16,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ── 10. DJ Console (recreation, cols 20-22) ───────────────────
  IDLE_SPOTS.push({
    tx: 21,
    ty: ACT_ZONE_Y + 10,
    anim: "djing",
    type: "dj",
    w: 5,
    _objId: "dj_console",
    _defObjTx: 20,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 1,
    _offsetY: 1,
  });
  IDLE_SPOTS.push({
    tx: 26,
    ty: ACT_ZONE_Y + 10,
    anim: "air_guitar",
    type: "jukebox",
    w: 4,
    _objId: "jukebox",
    _defObjTx: 25,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 1,
    _offsetY: 1,
  });
  IDLE_SPOTS.push({
    tx: 33,
    ty: ACT_ZONE_Y + 10,
    anim: "playing_arcade",
    type: "pinball",
    w: 5,
    _objId: "pinball",
    _defObjTx: 32,
    _defObjTy: ACT_ZONE_Y + 9,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ══ Zone 2: MAKERS LAB (ACT_ZONE+14, left side) ═══════════════

  // ── 11. Server Rack (makers lab, cols 2-3) ────────────────────
  IDLE_SPOTS.push({
    tx: 3,
    ty: ACT_ZONE_Y + 15,
    anim: "fixing_server",
    type: "server",
    w: 4,
    _objId: "server_rack",
    _defObjTx: 2,
    _defObjTy: ACT_ZONE_Y + 14,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ── 12. 3D Printer (makers lab, cols 7-8) ─────────────────────
  IDLE_SPOTS.push({
    tx: 8,
    ty: ACT_ZONE_Y + 15,
    anim: "watching_3dprint",
    type: "printer3d",
    w: 4,
    _objId: "printer_3d",
    _defObjTx: 7,
    _defObjTy: ACT_ZONE_Y + 14,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ── 13. Telescope (makers lab, cols 23-24, right side) ────────
  IDLE_SPOTS.push({
    tx: 19,
    ty: ACT_ZONE_Y + 15,
    anim: "using_telescope",
    type: "telescope",
    w: 5,
    _objId: "telescope",
    _defObjTx: 18,
    _defObjTy: ACT_ZONE_Y + 14,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ══ Zone 3: CAFE (ACT_ZONE+14, center-right) ═════════════════

  // ── 14. Espresso Bar (cafe, cols 13-15) ───────────────────────
  IDLE_SPOTS.push({
    tx: 14,
    ty: ACT_ZONE_Y + 15,
    anim: "drinking_espresso",
    type: "espresso",
    w: 6,
    _objId: "espresso_bar",
    _defObjTx: 13,
    _defObjTy: ACT_ZONE_Y + 14,
    _offsetX: 1,
    _offsetY: 1,
  });

  // ── Nap Pod (makers lab, col 22) ─────────────────────────────
  IDLE_SPOTS.push({
    tx: 22.8,
    ty: ACT_ZONE_Y + 14.8,
    anim: "sleeping",
    type: "nap_pod",
    w: 4,
    _objId: "nap_pod",
    _defObjTx: 22,
    _defObjTy: ACT_ZONE_Y + 14,
    _offsetX: 0.8,
    _offsetY: 0.8,
  });

  // ── Bookshelf spot (right wall, social zone — well below conference table) ──
  IDLE_SPOTS.push({
    tx: COLS - 4,
    ty: ACT_ZONE_Y + 14,
    anim: "reading",
    type: "shelf",
    w: 5,
  });
  // ── Hammock (recreation zone, col 29-32, row ACT+12) ─────────────
  IDLE_SPOTS.push({
    tx: 30.5,
    ty: ACT_ZONE_Y + 12,
    anim: "in_hammock",
    type: "hammock",
    w: 5,
    _objId: "hammock",
    _defObjTx: 29,
    _defObjTy: ACT_ZONE_Y + 11,
    _offsetX: 1.5,
    _offsetY: 1,
  });

  // ── Vending machine spot (inside kitchen) ────────────────────────
  IDLE_SPOTS.push({
    tx: KITCHEN_WALL_COL + 1.5,
    ty: ACT_ZONE_Y - 1.5,
    anim: "eating",
    type: "kitchen",
    w: 3,
  });

  // ── Conference table — 2 GROUP_PAIRS, in social zone below gym ───
  const confY = ACT_ZONE_Y + 10; // below gym/gaming/pp zone
  const confX = 4;
  const _confDefTx = 4,
    _confDefTy = ACT_ZONE_Y + 10;
  // Pair 11: north side facing each other
  const ci11A = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: confX + 0.5,
    ty: confY + 0.5,
    anim: "chatting_l",
    type: "group",
    groupId: 11,
    role: "L",
    w: 7,
    _objId: "conf_table",
    _defObjTx: _confDefTx,
    _defObjTy: _confDefTy,
    _offsetX: 0.5,
    _offsetY: 0.5,
  });
  const ci11B = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: confX + 4.5,
    ty: confY + 0.5,
    anim: "chatting_r",
    type: "group",
    groupId: 11,
    role: "R",
    w: 7,
    _objId: "conf_table",
    _defObjTx: _confDefTx,
    _defObjTy: _confDefTy,
    _offsetX: 4.5,
    _offsetY: 0.5,
  });
  GROUP_PAIRS[11] = [ci11A, ci11B];
  // Pair 12: south side
  const ci12A = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: confX + 1.5,
    ty: confY + 2,
    anim: "arguing_l",
    type: "group",
    groupId: 12,
    role: "L",
    w: 6,
    _objId: "conf_table",
    _defObjTx: _confDefTx,
    _defObjTy: _confDefTy,
    _offsetX: 1.5,
    _offsetY: 2,
  });
  const ci12B = IDLE_SPOTS.length;
  IDLE_SPOTS.push({
    tx: confX + 3.5,
    ty: confY + 2,
    anim: "arguing_r",
    type: "group",
    groupId: 12,
    role: "R",
    w: 6,
    _objId: "conf_table",
    _defObjTx: _confDefTx,
    _defObjTy: _confDefTy,
    _offsetX: 3.5,
    _offsetY: 2,
  });
  GROUP_PAIRS[12] = [ci12A, ci12B];

  // Cat bowl positions (preserve state across layout changes)
  const prevBowls = CAT_BOWLS;
  CAT_BOWLS = [
    { tx: 25, ty: 18, type: "food", hasFod: prevBowls[0]?.hasFod ?? true },
    { tx: 27, ty: 18, type: "water", hasFod: prevBowls[1]?.hasFod ?? true },
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
    const c = Math.round(tx),
      r = Math.round(ty);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) obstacleGrid[r][c] = 1;
  }
  function markRect(tx, ty, w, h) {
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++)
        mark(Math.floor(tx) + dc, Math.floor(ty) + dr);
  }

  // Outer walls (with entrance door gap on right wall)
  for (let c = 0; c < COLS; c++) {
    obstacleGrid[0][c] = 1;
    obstacleGrid[ROWS - 1][c] = 1;
  }
  // Entrance door on right wall at row 5-7 (work zone)
  for (let r = 0; r < ROWS; r++) {
    obstacleGrid[r][0] = 1;
    const isEntrance = r >= 5 && r <= 7;
    if (!isEntrance) obstacleGrid[r][COLS - 1] = 1;
  }

  // Kitchen partition wall (col 23, rows 10-19, door at 12-15)
  for (let r = 10; r <= 19; r++) {
    if (r >= 12 && r <= 15) continue; // door
    mark(23, r);
  }

  // Room walls as obstacles
  // Lounge wall (row 21)
  const loungeDoorL = Math.floor(COLS * 0.3),
    loungeDoorR = Math.floor(COLS * 0.5);
  for (let c = 1; c < COLS - 1; c++) {
    if (c >= loungeDoorL && c <= loungeDoorR) continue;
    mark(c, 21);
  }
  // (Activity wall removed — open flow between lounge and activity zone)
  // (Sports wall, gym/gaming divider, sports/social divider all removed — open layout)

  const rXobs = PER_ROW * STEP_X + 2;

  // All objects use getAdminPos so obstacles follow admin positions
  // ── Desks ─────
  for (let i = 0; i < DESK_DEFS.length; i++) {
    const [dx, dy] = getAdminPos("desk_" + i, DESK_DEFS[i].tx, DESK_DEFS[i].ty);
    markRect(dx, dy, 3, 2);
  }

  // ── Couches ─────
  for (let i = 0; i < COUCH_DEFS.length; i++) {
    const [cx, cy] = getAdminPos(
      "couch_" + i,
      COUCH_DEFS[i].tx,
      COUCH_DEFS[i].ty,
    );
    markRect(cx, cy, COUCH_DEFS[i].w || 3, 2);
  }

  // ── Ping pong table ─────
  if (ACT_ZONE_Y > 0) {
    const ppX2 = Math.min(19, COLS - 8);
    const [ppTx, ppTy] = getAdminPos("pingpong", ppX2 - 2, ACT_ZONE_Y + 1);
    markRect(ppTx, ppTy, 6, 2);
  }

  // ── TV + gaming sofa ─────
  if (ACT_ZONE_Y > 0) {
    const [tvTx, tvTy] = getAdminPos("tv", 10, ACT_ZONE_Y + 0.3);
    markRect(tvTx, tvTy, 4, 3);
    markRect(tvTx + 1, tvTy + 3.5, 4, 1); // sofa
  }

  // ── Gym ─────
  if (ACT_ZONE_Y > 0) {
    const [gmTx, gmTy] = getAdminPos("gym", 1, ACT_ZONE_Y + 0.5);
    markRect(gmTx, gmTy, 5, 3);
    const [_rmObTx, _rmObTy] = getAdminPos(
      "rowing_machine",
      gmTx + 4,
      ACT_ZONE_Y + 4.3,
    );
    markRect(_rmObTx, _rmObTy, 2, 1);
  }

  // ── Kanban board (right entertainment zone) ─────
  {
    const rXkb = PER_ROW * STEP_X + 2;
    const [kbTx, kbTy] = getAdminPos("kanban", rXkb + 0.2, 2.5);
    const kanbanCol = Math.floor(kbTx);
    const kanbanW = Math.min(5, COLS - 1 - kanbanCol);
    if (kanbanW >= 2) markRect(kanbanCol, Math.floor(kbTy), kanbanW, 4);
  }

  // ── Bookshelf ─────
  if (ACT_ZONE_Y > 0) {
    const [bsTx, bsTy] = getAdminPos(
      "bookshelf",
      COLS - 5.5,
      ACT_ZONE_Y + 13.2,
    );
    markRect(bsTx, bsTy, 5, 4);
  }

  // ── Conference table ─────
  if (ACT_ZONE_Y > 0) {
    const [cfTx, cfTy] = getAdminPos("conf_table", 4, ACT_ZONE_Y + 10);
    markRect(cfTx, cfTy, 6, 3);
  }

  // ── Water cooler ─────
  const [wcTx, wcTy] = getAdminPos("cooler", rXobs + 2.5, 2);
  mark(Math.floor(wcTx), Math.floor(wcTy));
  mark(Math.floor(wcTx) + 1, Math.floor(wcTy));

  // ── Aquarium ─────
  const [aqTx, aqTy] = getAdminPos("aquarium", rXobs + 0.3, 8);
  markRect(aqTx, aqTy, 3, 2);

  // ── Trophy Cabinet ─────
  const [tcbObsTx, tcbObsTy] = getAdminPos("trophy_cabinet", rXobs + 0.3, 12);
  markRect(tcbObsTx, tcbObsTy, 2, 3);

  // ── Rubber Duck ─────
  const [rdObsTx, rdObsTy] = getAdminPos("rubber_duck", rXobs + 0.3, 10.5);
  markRect(rdObsTx, rdObsTy, 2, 2);
  // ── Lava Lamp ─────
  const [llObsTx, llObsTy] = getAdminPos("lava_lamp", rXobs + 0.3, 4.5);
  markRect(llObsTx, llObsTy, 1.5, 2.5);
  // ── Crystal Ball ─────
  if (ACT_ZONE_Y > 0) {
    const [cbObsTx, cbObsTy] = getAdminPos("crystal_ball", 15, ACT_ZONE_Y + 17);
    markRect(cbObsTx, cbObsTy, 2, 2.5);
  }

  // ── Whiteboard ─────
  const [wbObsTx, wbObsTy] = getAdminPos("whiteboard", 17, 0);
  markRect(wbObsTx, wbObsTy, 3, 1.6);

  // ── Zone 1: RECREATION obstacles (ACT_ZONE+9) ─────
  if (ACT_ZONE_Y > 0) {
    const [fbObsTx, fbObsTy] = getAdminPos("foosball", 8, ACT_ZONE_Y + 9);
    markRect(fbObsTx, fbObsTy, 3, 2);

    const [bbObsTx, bbObsTy] = getAdminPos("basketball", 12, ACT_ZONE_Y + 9);
    markRect(bbObsTx, bbObsTy, 2, 2);

    const [arcObsTx, arcObsTy] = getAdminPos("arcade", 16, ACT_ZONE_Y + 9);
    markRect(arcObsTx, arcObsTy, 2, 2);

    const [djObsTx, djObsTy] = getAdminPos("dj_console", 20, ACT_ZONE_Y + 9);
    markRect(djObsTx, djObsTy, 3, 1);

    const [jbObsTx, jbObsTy] = getAdminPos("jukebox", 25, ACT_ZONE_Y + 9);
    markRect(jbObsTx, jbObsTy, 2, 2);
    const [pbObsTx, pbObsTy] = getAdminPos("pinball", 32, ACT_ZONE_Y + 9);
    markRect(pbObsTx, pbObsTy, 2, 2);
    const [hmObsTx, hmObsTy] = getAdminPos("hammock", 29, ACT_ZONE_Y + 11);
    markRect(hmObsTx, hmObsTy, 4, 2);
  }

  // ── Zone 2: MAKERS LAB obstacles (ACT_ZONE+14) ─────
  if (ACT_ZONE_Y > 0) {
    const [srvObsTx, srvObsTy] = getAdminPos("server_rack", 2, ACT_ZONE_Y + 14);
    markRect(srvObsTx, srvObsTy, 2, 2);

    const [p3ObsTx, p3ObsTy] = getAdminPos("printer_3d", 7, ACT_ZONE_Y + 14);
    markRect(p3ObsTx, p3ObsTy, 2, 2);

    const [telObsTx, telObsTy] = getAdminPos("telescope", 18, ACT_ZONE_Y + 14);
    markRect(telObsTx, telObsTy, 1, 2);
  }

  // ── Zone 3: CAFE obstacles (ACT_ZONE+14) ─────
  if (ACT_ZONE_Y > 0) {
    const [espObsTx, espObsTy] = getAdminPos(
      "espresso_bar",
      13,
      ACT_ZONE_Y + 14,
    );
    markRect(espObsTx, espObsTy, 3, 2);
  }

  // ── Printer ─────
  if (KITCHEN_WALL_COL > 0) {
    const [prTx, prTy] = getAdminPos(
      "printer",
      KITCHEN_WALL_COL - 3,
      KITCHEN_START_ROW - 2,
    );
    markRect(prTx, prTy, 2, 1);
  }

  // ── Trash can ─────
  const [trTx, trTy] = getAdminPos("trashcan", KITCHEN_WALL_COL - 2, 3);
  mark(Math.floor(trTx), Math.floor(trTy));

  // ── Vending machine ─────
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    const [vmTx, vmTy] = getAdminPos(
      "vending",
      KITCHEN_WALL_COL + 1,
      ACT_ZONE_Y - 2,
    );
    markRect(vmTx, vmTy, 2, 3);
  }

  // ── Zen Garden ─────
  if (ACT_ZONE_Y > 0) {
    const [zgObsTx, zgObsTy] = getAdminPos("zen_garden", 24, ACT_ZONE_Y + 23);
    markRect(zgObsTx, zgObsTy, 2, 1.5);
  }

  // Zone divider wall removed from obstacle grid — purely visual, agents walk freely

  // ── Gaming sofa ─────
  if (ACT_ZONE_Y > 0) {
    const [gsTx, gsTy] = getAdminPos("gaming_sofa", 11, ACT_ZONE_Y + 3.7);
    markRect(gsTx, gsTy, 4, 1);
  }

  // ── Kitchen counter ─────
  if (KITCHEN_WALL_COL > 0) {
    const kitIntXobs = KITCHEN_WALL_COL + 1;
    const [kcTx, kcTy] = getAdminPos(
      "kitchen_counter",
      kitIntXobs,
      KITCHEN_START_ROW,
    );
    markRect(kcTx, kcTy, 9, 1);
    // Fridge
    const [frTx, frTy] = getAdminPos(
      "fridge",
      kitIntXobs + 8,
      KITCHEN_START_ROW,
    );
    markRect(frTx, frTy, 1, 2);
  }

  // ── Kitchen dining table ─────
  if (KITCHEN_WALL_COL > 0) {
    const kitIntXobs = KITCHEN_WALL_COL + 1;
    const [ktTx, ktTy] = getAdminPos(
      "kitchen_table",
      kitIntXobs + 2,
      KITCHEN_START_ROW + 1,
    );
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
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 1 || nx > COLS - 2 || ny < 1 || ny > ROWS - 2) continue;
      const k = ny * COLS + nx;
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
  let [sx, sy] = nearestFree(
    Math.max(1, Math.min(COLS - 2, Math.round(fromTx))),
    Math.max(1, Math.min(ROWS - 2, Math.round(fromTy))),
  );
  let [ex, ey] = nearestFree(
    Math.max(1, Math.min(COLS - 2, Math.round(toTx))),
    Math.max(1, Math.min(ROWS - 2, Math.round(toTy))),
  );
  if (sx === ex && sy === ey) return null;

  // Bresenham line check — is direct path clear?
  let blocked = false;
  {
    let cx = sx,
      cy = sy;
    const dx = Math.abs(ex - sx),
      dy = Math.abs(ey - sy);
    const stepX = sx < ex ? 1 : -1,
      stepY = sy < ey ? 1 : -1;
    let err = dx - dy;
    for (let i = 0; i < dx + dy + 2; i++) {
      if (obstacleGrid[cy]?.[cx]) {
        blocked = true;
        break;
      }
      if (cx === ex && cy === ey) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += stepX;
      }
      if (e2 < dx) {
        err += dx;
        cy += stepY;
      }
    }
  }
  if (!blocked) return null;

  // A* on tile grid
  const key = (x, y) => y * COLS + x;
  const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
  const nodes = {};
  const open = new Set();
  const closed = new Set();
  const sk = key(sx, sy);
  nodes[sk] = { x: sx, y: sy, g: 0, f: h(sx, sy), pk: null };
  open.add(sk);
  const DIRS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const COSTS = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
  let limit = 3000,
    found = null;
  while (open.size && limit-- > 0) {
    let bk = null,
      bf = Infinity;
    for (const k of open) {
      const f = nodes[k].f;
      if (f < bf) {
        bf = f;
        bk = k;
      }
    }
    open.delete(bk);
    closed.add(bk);
    const cur = nodes[bk];
    if (cur.x === ex && cur.y === ey) {
      found = bk;
      break;
    }
    for (let d = 0; d < 8; d++) {
      const nx = cur.x + DIRS[d][0],
        ny = cur.y + DIRS[d][1];
      if (nx < 1 || nx > COLS - 2 || ny < 1 || ny > ROWS - 2) continue;
      if (obstacleGrid[ny]?.[nx]) continue;
      if (d >= 4 && (obstacleGrid[cur.y]?.[nx] || obstacleGrid[ny]?.[cur.x]))
        continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cur.g + COSTS[d];
      if (!nodes[nk] || ng < nodes[nk].g) {
        nodes[nk] = { x: nx, y: ny, g: ng, f: ng + h(nx, ny), pk: bk };
        open.add(nk);
      }
    }
  }
  if (!found) return null;
  // Reconstruct — skip start node, use float tile centers, exact dest at end
  const path = [];
  let k = found;
  while (k !== null && nodes[k].pk !== null) {
    path.unshift(nodes[k]);
    k = nodes[k].pk;
  }
  const wps = path.map((n) => ({ tx: n.x + 0.5, ty: n.y + 0.5 }));
  wps.push({ tx: toTx, ty: toTy });
  return wps.length ? wps : null;
}

// ════════════════════════════════════════════════════════════════
//  NEW FEATURE DRAW FUNCTIONS
// ════════════════════════════════════════════════════════════════

// ── Kanban board — shows myTasks on the office wall ──────────────
// Positioned on the right wall of the main office, ABOVE the kitchen partition
function drawKanban(ctx) {
  if (!myTasks || KITCHEN_WALL_COL === 0) return;
  // Position: right entertainment zone, below darts and above aquarium
  const rX = PER_ROW * STEP_X + 2;
  const [_kbTx, _kbTy] = getAdminPos("kanban", rX + 0.2, 2.5);
  const bx = OX + _kbTx * T;
  const by = OY + _kbTy * T;
  const bw = Math.min((COLS - 1 - _kbTx - 0.3) * T, T * 4.5);
  const bh = T * 2.5;

  if (bw < T * 2) return; // not enough space

  // Board background (corkboard feel)
  ctx.save();
  ctx.shadowColor = "#00000060";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#6b4c28";
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
  ctx.fillStyle = "#c8a870";
  ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
  // Cork texture dots
  ctx.fillStyle = "#b89860";
  for (let i = 0; i < 20; i++) {
    const dx = 8 + ((i * 37) % (bw - 16));
    const dy = 20 + ((i * 53) % (bh - 30));
    ctx.beginPath();
    ctx.arc(bx + dx, by + dy, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header
  ctx.fillStyle = "#3d2a0a";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("KANBAN", bx + bw / 2, by + 14);

  // Divider line
  ctx.fillStyle = "#a08050";
  ctx.fillRect(bx + 4, by + 20, bw - 8, 2);

  // Two columns
  const colW = (bw - 12) / 2;
  const col1x = bx + 5,
    col2x = bx + 7 + colW;
  const colY = by + 26;

  // Column headers
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e0af68";
  ctx.fillText("TODO", col1x + 2, colY + 2);
  ctx.fillStyle = "#9ece6a";
  ctx.fillText("DONE", col2x + 2, colY + 2);
  ctx.fillStyle = "#a08050";
  ctx.fillRect(bx + colW + 6, by + 20, 2, bh - 24); // column divider

  // Task cards
  const todo = myTasks.filter((t) => t.status === "todo").slice(0, 6);
  const done = myTasks.filter((t) => t.status === "done").slice(0, 6);
  const cardH = 12,
    gap = 2;

  todo.forEach((task, i) => {
    const cy2 = colY + 8 + i * (cardH + gap);
    if (cy2 + cardH > by + bh - 4) return;
    ctx.fillStyle = "#e0af6830";
    ctx.fillRect(col1x, cy2, colW - 2, cardH);
    ctx.fillStyle = "#e0af68";
    ctx.fillRect(col1x, cy2, 3, cardH); // priority bar
    ctx.fillStyle = "#3d2a0a";
    ctx.font = "6px monospace";
    const maxChars = Math.max(3, Math.floor((colW - 14) / 4));
    const rawLabel = task.title || "TASK-" + (i + 1);
    const label = rawLabel.substring(0, maxChars);
    ctx.fillText(label, col1x + 6, cy2 + 9);
  });

  done.forEach((task, i) => {
    const cy2 = colY + 8 + i * (cardH + gap);
    if (cy2 + cardH > by + bh - 4) return;
    ctx.fillStyle = "#9ece6a20";
    ctx.fillRect(col2x, cy2, colW - 2, cardH);
    ctx.fillStyle = "#9ece6a";
    ctx.fillRect(col2x, cy2, 3, cardH);
    ctx.fillStyle = "#3d2a0a80";
    ctx.font = "6px monospace";
    const maxChars = Math.max(3, Math.floor((colW - 14) / 4));
    const rawLabel = task.title || "TASK-" + (i + 1);
    const label = rawLabel.substring(0, maxChars);
    ctx.fillText(label, col2x + 6, cy2 + 9);
    // Strikethrough line
    ctx.fillStyle = "#3d2a0a50";
    ctx.fillRect(col2x + 6, cy2 + 6, Math.min(label.length * 4, colW - 14), 1);
  });

  if (myTasks.length === 0) {
    ctx.fillStyle = "#a08050";
    ctx.font = "6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("no tasks", bx + bw / 2, colY + 14);
  }

  // Pushpin decorations
  [
    [col1x + colW / 2, by + 12],
    [col2x + colW / 2, by + 12],
  ].forEach(([px, py2]) => {
    ctx.fillStyle = "#c04040";
    ctx.beginPath();
    ctx.arc(px, py2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6060";
    ctx.beginPath();
    ctx.arc(px - 1, py2 - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.textAlign = "left";
}

// ── Dynamic windows — sky color changes with time of day ─────────
function getTimeOfDay() {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const t = h + m / 60; // fractional hour
  // 4 states: night (0-5), dawn (5-7), day (7-18), sunset (18-20), night (20-24)
  if (t < 5) return { state: "night", blend: 0 };
  if (t < 7) return { state: "dawn", blend: (t - 5) / 2 }; // 0→1 over 2 hours
  if (t < 18) return { state: "day", blend: 1 };
  if (t < 20) return { state: "sunset", blend: 1 - (t - 18) / 2 }; // 1→0 over 2 hours
  return { state: "night", blend: 0 };
}

function getDailyWeather() {
  const d = new Date();
  const seed = d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate();
  return ["rain", "snow", "sun", "rain", "snow", "sun", "rain"][seed % 7];
}

function drawDynamicWindows(ctx) {
  const tod = getTimeOfDay();

  // Sky colors per state
  const skies = {
    night: {
      top: "#0a0a20",
      bot: "#101830",
      stars: true,
      moon: true,
      shaft: 0,
    },
    dawn: {
      top: "#2a1838",
      bot: "#e06848",
      stars: false,
      moon: false,
      shaft: 0.03,
    },
    day: {
      top: "#4a90d0",
      bot: "#88c8f0",
      stars: false,
      moon: false,
      shaft: 0.06,
    },
    sunset: {
      top: "#1a1040",
      bot: "#d06030",
      stars: false,
      moon: false,
      shaft: 0.03,
    },
  };
  const sky = skies[tod.state] || skies.day;

  for (let i = 0; i < 4; i++) {
    const wx = OX + (3 + i * 6) * T + 4,
      wy = OY + 5;
    const ww = T - 12,
      wh = T - 14;

    // Sky gradient
    const grad = ctx.createLinearGradient(wx + 2, wy + 2, wx + 2, wy + 2 + wh);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(wx + 2, wy + 2, ww, wh);

    // Stars (night only)
    if (sky.stars) {
      ctx.fillStyle = "#ffffff";
      const starSeed = i * 7;
      for (let s = 0; s < 5; s++) {
        const sx = wx + 4 + ((starSeed + s * 13) % (ww - 4));
        const sy = wy + 4 + ((starSeed + s * 17) % (wh - 6));
        const twinkle = Math.sin(Date.now() * 0.003 + s * 2) > 0.3 ? 1 : 0.3;
        ctx.globalAlpha = twinkle;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // Moon (night, top-right of first window)
    if (sky.moon && i === 0) {
      ctx.fillStyle = "#e8e0c0";
      ctx.beginPath();
      ctx.arc(wx + ww - 4, wy + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath();
      ctx.arc(wx + ww - 2, wy + 7, 3.5, 0, Math.PI * 2);
      ctx.fill(); // crescent
    }

    // Dawn/sunset glow
    if (tod.state === "dawn" || tod.state === "sunset") {
      ctx.save();
      ctx.globalAlpha = 0.3;
      const glow = ctx.createRadialGradient(
        wx + ww / 2,
        wy + wh,
        0,
        wx + ww / 2,
        wy + wh,
        wh,
      );
      glow.addColorStop(0, tod.state === "dawn" ? "#ffaa40" : "#ff6020");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(wx + 2, wy + 2, ww, wh);
      ctx.restore();
    }

    // Clouds (day only, subtle)
    if (tod.state === "day") {
      ctx.fillStyle = "#ffffff30";
      const cx = wx + ((Date.now() * 0.01 + i * 20) % (ww + 10)) - 5;
      ctx.beginPath();
      ctx.arc(cx, wy + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.arc(cx + 4, wy + 7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.arc(cx + 8, wy + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weather particles outside windows
    {
      const wx2 = wx + 2,
        wy2 = wy + 2;
      const weather = getDailyWeather();
      const t = Date.now() * 0.001;
      if (weather === "rain") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(wx2, wy2, ww, wh);
        ctx.clip();
        ctx.strokeStyle = "#88b8e0";
        ctx.lineWidth = 1;
        for (let d = 0; d < 5; d++) {
          const dropX = wx2 + ((d * 11 + i * 5) % ww);
          const dropY = wy2 + ((t * 55 + d * 19) % (wh + 6));
          if (dropY >= wy2 + wh) continue;
          ctx.globalAlpha = 0.18 + (d % 3) * 0.08;
          ctx.beginPath();
          ctx.moveTo(dropX + 1, dropY - 3);
          ctx.lineTo(dropX, dropY + 3);
          ctx.stroke();
        }
        ctx.restore();
      } else if (weather === "snow") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(wx2, wy2, ww, wh);
        ctx.clip();
        ctx.fillStyle = "#ddeeff";
        for (let d = 0; d < 5; d++) {
          const fx =
            wx2 +
            Math.abs((d * 9 + i * 7 + Math.sin(t * 0.8 + d * 1.7) * 3) % ww);
          const fy = wy2 + ((t * 12 + d * 22) % wh);
          ctx.globalAlpha = 0.4 + (d % 2) * 0.2;
          ctx.beginPath();
          ctx.arc(fx, fy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (weather === "sun" && tod.state !== "night") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(wx2, wy2, ww, wh);
        ctx.clip();
        const pulse = 0.04 + Math.sin(t * 0.4 + i) * 0.015;
        const sunX = wx2 + ww / 2,
          sunY = wy2;
        for (let r = 0; r < 6; r++) {
          const a = (r / 6) * Math.PI + Math.sin(t * 0.5 + r) * 0.03;
          const grad = ctx.createLinearGradient(
            sunX,
            sunY,
            sunX + Math.cos(a) * wh * 2,
            sunY + Math.sin(a) * wh * 2,
          );
          grad.addColorStop(0, "#ffe860cc");
          grad.addColorStop(1, "#ffe86000");
          ctx.fillStyle = grad;
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.moveTo(sunX, sunY);
          ctx.lineTo(
            sunX + Math.cos(a - 0.15) * wh * 2,
            sunY + Math.sin(a - 0.15) * wh * 2,
          );
          ctx.lineTo(
            sunX + Math.cos(a + 0.15) * wh * 2,
            sunY + Math.sin(a + 0.15) * wh * 2,
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Light shaft into room
    if (sky.shaft > 0) {
      ctx.save();
      ctx.globalAlpha = sky.shaft;
      ctx.fillStyle =
        tod.state === "dawn"
          ? "#ffcc6040"
          : tod.state === "sunset"
            ? "#ff804040"
            : "#ffe8a040";
      ctx.beginPath();
      ctx.moveTo(wx, wy + T - 10);
      ctx.lineTo(wx + T - 8, wy + T - 10);
      ctx.lineTo(wx + T, wy + T * 2.5);
      ctx.lineTo(wx - 8, wy + T * 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── Office lighting tint — warm/cool overlay based on time of day ─
function drawOfficeLighting(ctx) {
  const tod = getTimeOfDay();
  // rgba tint per state: [r,g,b,alpha]
  const tints = {
    night: [20, 40, 120, 0.18], // cool blue — artificial indoor light
    dawn: [255, 140, 60, 0.1], // warm peach — early morning sun creeping in
    day: [255, 240, 200, 0.0], // no tint — bright neutral daylight
    sunset: [255, 110, 30, 0.14], // amber/orange — golden hour
  };
  const cur = tints[tod.state] || tints.day;
  // For dawn/sunset we interpolate between the adjacent states
  let [r, g, b, a] = cur;
  if (tod.state === "dawn") {
    // blend: 0 = full night, 1 = full day
    const night = tints.night,
      day = tints.day;
    r = night[0] + (cur[0] - night[0]) * tod.blend;
    g = night[1] + (cur[1] - night[1]) * tod.blend;
    b = night[2] + (cur[2] - night[2]) * tod.blend;
    a = night[3] + (cur[3] - night[3]) * tod.blend;
  } else if (tod.state === "sunset") {
    // blend: 1 = just turned sunset, 0 = night
    const night = tints.night;
    r = cur[0] + (night[0] - cur[0]) * (1 - tod.blend);
    g = cur[1] + (night[1] - cur[1]) * (1 - tod.blend);
    b = cur[2] + (night[2] - cur[2]) * (1 - tod.blend);
    a = cur[3] + (night[3] - cur[3]) * (1 - tod.blend);
  }
  if (a < 0.005) return; // nothing to draw during bright day
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
  ctx.fillRect(OX, OY, COLS * T, ROWS * T);
  ctx.restore();
}

function drawWallClock(ctx) {
  const now = new Date();
  const h = now.getHours() % 12,
    m = now.getMinutes(),
    s = now.getSeconds();
  // Position: on right wall, mid-height (between desk rows)
  const clockRowDef = Math.max(4, Math.floor(ROWS * 0.2));
  const [_clkTx, _clkTy] = getAdminPos("clock", COLS - 1.5, clockRowDef);
  const [cx, cy] = ts(_clkTx, _clkTy);
  const px2 = cx + T / 2,
    py2 = cy + T * 0.5;
  const R = 15;
  // Frame
  ctx.fillStyle = "#1a1824";
  ctx.beginPath();
  ctx.arc(px2, py2, R + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a3858";
  ctx.beginPath();
  ctx.arc(px2, py2, R + 2, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = "#f0ece4";
  ctx.beginPath();
  ctx.arc(px2, py2, R, 0, Math.PI * 2);
  ctx.fill();
  // Hour marks
  ctx.strokeStyle = "#1a1824";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r1 = i % 3 === 0 ? R - 3 : R - 2;
    ctx.beginPath();
    ctx.moveTo(px2 + Math.cos(a) * r1, py2 + Math.sin(a) * r1);
    ctx.lineTo(px2 + Math.cos(a) * (R - 0.5), py2 + Math.sin(a) * (R - 0.5));
    ctx.stroke();
  }
  // Hour hand
  const hAngle = ((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = "#1a1824";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px2, py2);
  ctx.lineTo(
    px2 + Math.cos(hAngle) * (R * 0.55),
    py2 + Math.sin(hAngle) * (R * 0.55),
  );
  ctx.stroke();
  // Minute hand
  const mAngle = (m / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = "#2a2844";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px2, py2);
  ctx.lineTo(
    px2 + Math.cos(mAngle) * (R * 0.78),
    py2 + Math.sin(mAngle) * (R * 0.78),
  );
  ctx.stroke();
  // Second hand
  const sAngle = (s / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = "#f7768e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px2, py2);
  ctx.lineTo(
    px2 + Math.cos(sAngle) * (R * 0.88),
    py2 + Math.sin(sAngle) * (R * 0.88),
  );
  ctx.stroke();
  // Center dot
  ctx.fillStyle = "#1a1824";
  ctx.beginPath();
  ctx.arc(px2, py2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

function drawTrashCan(ctx, level) {
  const [tx2, ty2] = ts(KITCHEN_WALL_COL - 2, 3);
  const cx2 = tx2 + T / 2,
    cy2 = ty2 + T * 0.5;
  // Can body
  ctx.fillStyle = "#404050";
  ctx.beginPath();
  ctx.moveTo(cx2 - 8, cy2 + 14);
  ctx.lineTo(cx2 + 8, cy2 + 14);
  ctx.lineTo(cx2 + 6, cy2 - 8);
  ctx.lineTo(cx2 - 6, cy2 - 8);
  ctx.closePath();
  ctx.fill();
  // Rim
  ctx.fillStyle = "#505060";
  ctx.fillRect((cx2 - 8) | 0, (cy2 - 10) | 0, 16, 3);
  // Trash papers sticking out proportional to level
  if (level > 0) {
    const papers = Math.floor(level);
    const paperColors = ["#f0ece4", "#e4f0e0", "#e0e8f4", "#f4e8e0"];
    for (let p = 0; p < papers && p < 8; p++) {
      const px3 = cx2 - 4 + (p % 3) * 4 + Math.sin(p * 1.3) * 2;
      const dropY = cy2 - 8 - p * (level / papers) * 2.5;
      ctx.fillStyle = paperColors[p % paperColors.length];
      ctx.save();
      ctx.translate(px3, dropY);
      ctx.rotate(((p % 3) - 1) * 0.3);
      ctx.fillRect(-3, -6, 6, 8);
      ctx.fillStyle = "#80808040";
      ctx.fillRect(-2, -4, 4, 1);
      ctx.fillRect(-2, -2, 3, 1);
      ctx.restore();
    }
  }
  // Level indicator tint
  if (level >= 8) {
    ctx.fillStyle = "#f7768e40";
    ctx.beginPath();
    ctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ════════════════════════════════════════════════════════════════
//  BACKGROUND RENDERER  (with drop shadows)
// ════════════════════════════════════════════════════════════════
const bgBuf = document.createElement("canvas");
bgBuf.width = CW;
bgBuf.height = 900;
const bgx = bgBuf.getContext("2d");
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
  const edy =
    OY +
    (KITCHEN_DOOR_ROW > 0 ? KITCHEN_DOOR_ROW : Math.floor(ROWS * 0.38)) * T;
  const doorH = T * 3;
  const o = ease.inOut(clamp(doorAnim.open, 0, 1)); // 0=closed, 1=fully open

  // Repaint the door area (covers static bg door)
  fillR(ctx, edx, edy, T, doorH, "#3a3050"); // dark void behind door
  // Door frame (same as static bg)
  fillR(ctx, edx, edy, 4, doorH, "#6a5090");
  fillR(ctx, edx + T - 4, edy, 4, doorH, "#6a5090");
  fillR(ctx, edx, edy - 3, T, 4, "#6a5090"); // top
  fillR(ctx, edx, edy + doorH, T, 4, "#6a5090"); // bottom

  // Door leaf — foreshorten as it swings inward (hinge on left side)
  const maxW = T - 12;
  const doorW = Math.round(maxW * (1 - o));
  if (doorW > 1) {
    fillR(ctx, edx + 4, edy + 2, doorW, doorH - 4, "#5a4030");
    fillR(ctx, edx + 6, edy + 4, doorW - 2, doorH - 8, "#6a4c38");
    // Panel grooves
    fillR(ctx, edx + 5, edy + T, doorW - 2, 2, "#4a3028");
    fillR(ctx, edx + 5, edy + T * 2, doorW - 2, 2, "#4a3028");
    // Handle (disappears as door swings away)
    if (o < 0.55) {
      const hx = edx + 4 + Math.max(2, Math.round(doorW * 0.45));
      ctx.fillStyle = "#c0b060";
      ctx.beginPath();
      ctx.arc(hx, edy + T * 1.5, 3 * (1 - o * 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Edge of door (visible when swinging)
  if (o > 0.05 && o < 0.98) {
    fillR(ctx, edx + 4 + doorW, edy + 2, 3, doorH - 4, "#3a2818");
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
      T * 3,
    );
    lg.addColorStop(0, "#ffffd0");
    lg.addColorStop(1, "transparent");
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
      const wall =
        col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
      // Kitchen area: cols 23-34, rows 10-19 (fixed position)
      const KIT_ROW_START = 10,
        KIT_ROW_END = 19,
        KIT_COL = 23;
      const inKitchen =
        col > KIT_COL &&
        col < COLS - 1 &&
        row >= KIT_ROW_START &&
        row <= KIT_ROW_END;
      const isKitPartWall =
        col === KIT_COL &&
        row >= KIT_ROW_START &&
        row <= KIT_ROW_END &&
        !(row >= KIT_ROW_START + 2 && row <= KIT_ROW_START + 5);
      if (wall) {
        if (row === 0) {
          fillR(ctx, x, y, T, T, "#16152e");
          fillR(ctx, x, y + T - 4, T, 4, "#22204a");
          fillR(ctx, x, y + T - 1, T, 1, "#2e2c60");
        } else {
          fillR(ctx, x, y, T, T, WL_TOP);
        }
      } else if (isKitPartWall) {
        // Kitchen partition wall segment
        fillR(ctx, x, y, T, T, "#252344");
        fillR(ctx, x, y, 4, T, "#1e1c38"); // shadow side
        fillR(ctx, x + T - 4, y, 4, T, "#3a3860"); // lit side
        fillR(ctx, x + 4, y, T - 8, 2, "#3a3860"); // top highlight
      } else if (inKitchen) {
        // Kitchen tile floor — cool grey checker
        const checker = (row + col) % 2;
        fillR(ctx, x, y, T, T, checker ? "#cec8bc" : "#c4beb2");
        fillR(ctx, x, y + T - 1, T, 1, "rgba(0,0,0,0.13)"); // grout H
        fillR(ctx, x + T - 1, y, 1, T, "rgba(0,0,0,0.13)"); // grout V
      } else {
        // Wood floor planks — rows of alternating shades with grain
        const pi = (row + ((col / 5) | 0)) % 3;
        const plankC = ["#e2ddd2", "#ddd8cd", "#d8d3c8"][pi];
        fillR(ctx, x, y, T, T, plankC);
        fillR(ctx, x, y + T - 1, T, 1, "rgba(0,0,0,0.09)"); // groove
        if ((col * 7 + row * 13) % 17 === 0)
          fillR(ctx, x + ((col * 5) % 24), y, 1, T, "rgba(0,0,0,0.04)"); // grain
      }
    }
  }
  // Kitchen partition door frame (fixed position col 23, rows 12-14)
  {
    const dx = OX + 23 * T,
      dy = OY + 12 * T;
    fillR(ctx, dx, dy, T, T * 4, "#2e2c50");
    fillR(ctx, dx, dy, 4, T * 4, "#4a4880");
    fillR(ctx, dx + T - 4, dy, 4, T * 4, "#4a4880");
  }

  // ── Main entrance door (right wall) — agents spawn here ──────
  {
    const edx = OX + (COLS - 1) * T;
    const edy =
      OY +
      (KITCHEN_DOOR_ROW > 0 ? KITCHEN_DOOR_ROW : Math.floor(ROWS * 0.38)) * T;
    // Door opening (3 tiles tall)
    fillR(ctx, edx, edy, T, T * 3, "#3a3050");
    // Door frame
    fillR(ctx, edx, edy, 4, T * 3, "#6a5090");
    fillR(ctx, edx + T - 4, edy, 4, T * 3, "#6a5090");
    fillR(ctx, edx, edy - 3, T, 4, "#6a5090"); // top frame
    fillR(ctx, edx, edy + T * 3, T, 4, "#6a5090"); // bottom frame
    // Door surface (brown wood, slightly open)
    fillR(ctx, edx + 4, edy + 2, T - 12, T * 3 - 4, "#5a4030");
    fillR(ctx, edx + 6, edy + 4, T - 16, T * 3 - 8, "#6a4c38");
    // Door handle
    ctx.fillStyle = "#c0b060";
    ctx.beginPath();
    ctx.arc(edx + 10, edy + T * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Windows — static frames only (sky color drawn dynamically)
  for (let i = 0; i < 4; i++) {
    const wx = OX + (3 + i * 6) * T + 4,
      wy = OY + 5;
    fillR(ctx, wx, wy, T - 8, T - 10, "#0a0a14"); // dark placeholder
    ctx.strokeStyle = "#3a3860";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx + 0.5, wy + 0.5, T - 9, T - 11);
    ctx.beginPath();
    ctx.moveTo(wx + (T - 8) / 2, wy);
    ctx.lineTo(wx + (T - 8) / 2, wy + T - 10);
    ctx.moveTo(wx, wy + (T - 10) / 2);
    ctx.lineTo(wx + T - 8, wy + (T - 10) / 2);
    ctx.strokeStyle = "#3a386080";
    ctx.stroke();
  }

  // Ceiling strip lights
  for (let li = 1; li < COLS - 1; li += 6) {
    const lx = OX + li * T + T / 2,
      ly = OY + T;
    fillR(ctx, lx - 10, ly - 3, 20, 4, "#c0b8d8");
    fillR(ctx, lx - 8, ly + 1, 16, 3, "#fffff060");
    ctx.save();
    ctx.globalAlpha = 0.045;
    const lg = ctx.createRadialGradient(lx, ly + T, 0, lx, ly + T, T * 4);
    lg.addColorStop(0, "#fffff0");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.fillRect(OX, ly, CW - OX * 2, T * 8);
    ctx.restore();
  }

  // Lounge rug
  if (COUCH_DEFS.length > 0) {
    const [rx, ry] = ts(1.5, COUCH_DEFS[0].ty - 0.5);
    const rugW = Math.min(COUCH_DEFS.length * 3.5 + 2, COLS - 3) * T;
    ctx.save();
    ctx.shadowColor = "#00000050";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    fillR(ctx, rx, ry, rugW, T * 2, "#3a2060");
    ctx.restore();
    fillR(ctx, rx + 4, ry + 4, rugW - 8, T * 2 - 8, "#4a2878");
    ctx.strokeStyle = "#5a3898";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 7, ry + 7, rugW - 14, T * 2 - 14);
  }

  // Desks
  for (let _di = 0; _di < DESK_DEFS.length; _di++) {
    const { tx: _dtx, ty: _dty } = DESK_DEFS[_di];
    const [_dATx, _dATy] = getAdminPos("desk_" + _di, _dtx, _dty);
    const [x, y] = ts(_dATx, _dATy);
    const W = T * 2,
      H = T;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 5;
    fillR(ctx, x, y, W, H, DESK_TOP);
    ctx.restore();
    fillR(ctx, x, y, W, 3, "#d4c49a");
    fillR(ctx, x, y + H, W, 7, DESK_FRONT);
    fillR(ctx, x + W, y, 3, H + 7, "#7a6030");
    ctx.strokeStyle = DESK_EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    fillR(ctx, x + W / 2 - 14, y + 3, 28, 20, MON_DARK);
    fillR(ctx, x + W / 2 - 13, y + 4, 26, 18, "#0e0e1a");
    fillR(ctx, x + W / 2 - 11, y + 6, 22, 14, SCREEN_C);
    fillR(ctx, x + W / 2 - 3, y + H - 8, 6, 8, "#2a2a3c");
    const gl = ["#7aa2f770", "#9ece6a50", "#bb9af760", "#f7768e40"];
    for (let li = 0; li < 4; li++)
      fillR(ctx, x + W / 2 - 9, y + 8 + li * 3, 6 + (li % 3) * 5, 2, gl[li]);
    fillR(ctx, x + W / 2 - 12, y + H - 10, 24, 7, "#1e1e30");
    fillR(ctx, x + W / 2 - 11, y + H - 9, 22, 5, "#2a2a42");
    fillR(ctx, x + W / 2 + 14, y + H - 9, 6, 7, "#2a2a3c");
    const cx2 = x + W / 2 - 9,
      cy2 = y + H + 9;
    fillR(ctx, cx2, cy2, 18, 15, CHAIR_C);
    fillR(ctx, cx2 + 2, cy2 + 2, 14, 11, CHAIR_SEAT);
    fillR(ctx, cx2, cy2 - 9, 18, 9, CHAIR_C);
    fillR(ctx, cx2 + 2, cy2 - 8, 14, 7, CHAIR_SEAT);
    fillR(ctx, cx2 - 2, cy2 + 13, 4, 3, "#181828");
    fillR(ctx, cx2 + 16, cy2 + 13, 4, 3, "#181828");
    fillR(ctx, cx2 + 7, cy2 + 14, 4, 3, "#181828");
  }

  // Couches
  for (let _ci = 0; _ci < COUCH_DEFS.length; _ci++) {
    const { tx: _ctx2, ty: _cty2, w } = COUCH_DEFS[_ci];
    const [_cATx, _cATy] = getAdminPos("couch_" + _ci, _ctx2, _cty2);
    const [x, y] = ts(_cATx, _cATy);
    const W = w * T,
      H = T * 0.85;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 5;
    fillR(ctx, x, y, W, H + 10, COUCH_C);
    ctx.restore();
    fillR(ctx, x, y, W, 10, COUCH_C);
    fillR(ctx, x + 2, y + 1, W - 4, 8, "#4a3880");
    fillR(ctx, x, y + 10, W, H, COUCH_SEAT);
    fillR(ctx, x + 3, y + 13, W - 6, H - 6, COUCH_HI);
    fillR(ctx, x, y + 10 + H, W, 6, "#281e50");
    fillR(ctx, x + W, y, 3, H + 16, "#1e1640");
    fillR(ctx, x, y, 9, H + 10, COUCH_C);
    fillR(ctx, x + W - 9, y, 9, H + 10, COUCH_C);
    const sec = Math.max(1, Math.floor(w));
    for (let s = 1; s < sec; s++)
      fillR(ctx, x + s * (W / sec) - 1, y + 10, 2, H, "#382860");
    const tx2 = x + 10,
      ty2 = y + 10 + H + 8;
    fillR(ctx, tx2, ty2, W - 20, 16, "#5a4830");
    fillR(ctx, tx2 + 2, ty2 + 2, W - 24, 12, "#6a5840");
    fillR(ctx, tx2, ty2 + 16, W - 20, 4, "#3a2818");
    fillR(ctx, tx2 + 4, ty2 + 4, 6, 6, "#b8a020");
    fillR(ctx, tx2 + 5, ty2 + 3, 4, 2, "#f0f0c0");
  }

  // Plants — draw at positions defined in IDLE_SPOTS (type:'plant')
  let _plantIdx = 0;
  IDLE_SPOTS.filter((s) => s.type === "plant").forEach(
    ({ tx: ptx, ty: pty }) => {
      const [_plTx, _plTy] = getAdminPos("plant_" + _plantIdx, ptx, pty);
      _plantIdx++;
      if (_plTx >= COLS - 1 || _plTy >= ROWS - 1) return;
      const [px, py] = ts(_plTx, _plTy);
      const pcx = px + T / 2;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(pcx, py + T - 3, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Terracotta pot
      ctx.save();
      ctx.shadowColor = "#00000060";
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#a04820";
      ctx.beginPath();
      ctx.moveTo(pcx - 9, py + T - 8);
      ctx.lineTo(pcx - 7, py + T - 2);
      ctx.lineTo(pcx + 7, py + T - 2);
      ctx.lineTo(pcx + 9, py + T - 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#c06030"; // pot rim
      ctx.fillRect(pcx - 10, py + T - 11, 20, 4);
      ctx.fillStyle = "#904018"; // pot base strip
      ctx.fillRect(pcx - 6, py + T - 2, 12, 2);
      ctx.fillStyle = "#7a3010"; // soil
      ctx.fillRect(pcx - 8, py + T - 10, 16, 4);
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(pcx - 6, py + T - 10, 12, 3);
      // Leaves — tropical / monstera style
      const leafBase = py + T - 10;
      // Main stem
      ctx.strokeStyle = "#2a5018";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pcx, leafBase);
      ctx.lineTo(pcx, leafBase - 22);
      ctx.stroke();
      // Left leaf
      ctx.fillStyle = "#1e5818";
      ctx.beginPath();
      ctx.moveTo(pcx - 1, leafBase - 10);
      ctx.quadraticCurveTo(pcx - 16, leafBase - 20, pcx - 14, leafBase - 28);
      ctx.quadraticCurveTo(pcx - 6, leafBase - 22, pcx - 1, leafBase - 10);
      ctx.fill();
      ctx.fillStyle = "#3a7828";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pcx - 1, leafBase - 10);
      ctx.quadraticCurveTo(pcx - 10, leafBase - 18, pcx - 10, leafBase - 26);
      ctx.stroke();
      // Right leaf
      ctx.fillStyle = "#2a6820";
      ctx.beginPath();
      ctx.moveTo(pcx + 1, leafBase - 14);
      ctx.quadraticCurveTo(pcx + 16, leafBase - 24, pcx + 13, leafBase - 30);
      ctx.quadraticCurveTo(pcx + 4, leafBase - 24, pcx + 1, leafBase - 14);
      ctx.fill();
      // Center leaf (top)
      ctx.fillStyle = "#3a7828";
      ctx.beginPath();
      ctx.moveTo(pcx - 1, leafBase - 20);
      ctx.quadraticCurveTo(pcx - 6, leafBase - 36, pcx, leafBase - 38);
      ctx.quadraticCurveTo(pcx + 6, leafBase - 36, pcx + 1, leafBase - 20);
      ctx.fill();
      // Leaf highlights
      ctx.strokeStyle = "#60a840";
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
    },
  );

  // Enclosed kitchen room — appliances (right side)
  if (ROWS > 6 && KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1; // first interior column
    const [_kcTx, _kcTy] = getAdminPos(
      "kitchen_counter",
      kitIntX,
      KITCHEN_START_ROW,
    );
    const [kx, ky] = ts(_kcTx, _kcTy);

    // Long counter along back wall (right wall side)
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;
    fillR(ctx, kx, ky, T * 9, T * 0.6, "#c4b488");
    ctx.restore();
    fillR(ctx, kx, ky, T * 9, 3, "#d4c49a"); // counter highlight
    fillR(ctx, kx, ky + T * 0.6, T * 9, 5, DESK_FRONT); // counter front

    // ── Coffee Machine (espresso style) ──
    const cmx = kx + 6,
      cmy = ky - 26;
    // Body
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 4;
    fillR(ctx, cmx, cmy + 4, 22, 26, "#282838");
    ctx.restore();
    fillR(ctx, cmx + 1, cmy + 4, 20, 2, "#383848"); // top highlight
    // Rounded top
    ctx.fillStyle = "#282838";
    ctx.beginPath();
    ctx.arc(cmx + 11, cmy + 5, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#383848";
    ctx.beginPath();
    ctx.arc(cmx + 11, cmy + 5, 9, Math.PI, Math.PI + 0.5);
    ctx.fill();
    // Chrome band
    fillR(ctx, cmx + 1, cmy + 10, 20, 2, "#a0a8b8");
    fillR(ctx, cmx + 1, cmy + 11, 20, 1, "#808890");
    // Portafilter holder (chrome)
    fillR(ctx, cmx + 6, cmy + 20, 10, 3, "#b0b8c8");
    fillR(ctx, cmx + 4, cmy + 22, 14, 2, "#9098a8");
    fillR(ctx, cmx + 8, cmy + 24, 6, 3, "#a0a8b8"); // spout
    // Drip tray
    fillR(ctx, cmx + 2, cmy + 27, 18, 3, "#505060");
    fillR(ctx, cmx + 3, cmy + 28, 16, 1, "#404050");
    // Display panel
    fillR(ctx, cmx + 3, cmy + 13, 16, 6, "#0a0e18");
    fillR(ctx, cmx + 4, cmy + 14, 14, 4, "#101828");
    // Indicator lights
    fillR(ctx, cmx + 5, cmy + 15, 2, 2, "#40e040"); // green = ready
    fillR(ctx, cmx + 9, cmy + 15, 2, 2, "#e04040"); // red = power
    // "COFFEE" label
    ctx.fillStyle = "#606878";
    ctx.font = "3px monospace";
    ctx.fillText("COFFEE", cmx + 3, cmy + 9);
    // Steam nozzle (side)
    fillR(ctx, cmx + 20, cmy + 16, 3, 2, "#9098a8");
    fillR(ctx, cmx + 21, cmy + 18, 2, 5, "#808890");

    // ── Microwave ──
    const mcx = kx + T + 8,
      mcy = ky - 22;
    ctx.save();
    ctx.shadowColor = "#00000050";
    ctx.shadowBlur = 3;
    fillR(ctx, mcx, mcy, 30, 22, "#303040");
    ctx.restore();
    fillR(ctx, mcx + 1, mcy, 28, 1, "#404050"); // top highlight
    // Glass door window
    fillR(ctx, mcx + 2, mcy + 3, 18, 14, "#1a1a2a"); // door frame
    fillR(ctx, mcx + 3, mcy + 4, 16, 12, "#1a2a3a"); // glass
    fillR(ctx, mcx + 4, mcy + 5, 14, 10, "#12202e"); // interior dark
    // Rotating plate inside (subtle circle)
    ctx.strokeStyle = "#2a3a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mcx + 11, mcy + 10, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Handle (right side)
    fillR(ctx, mcx + 21, mcy + 5, 2, 10, "#505868");
    fillR(ctx, mcx + 22, mcy + 6, 1, 8, "#606878");
    // Digital clock display
    fillR(ctx, mcx + 24, mcy + 4, 5, 4, "#0a0e10");
    ctx.fillStyle = "#40e850";
    ctx.font = "3px monospace";
    ctx.fillText("12:00", mcx + 24, mcy + 7);
    // Control buttons
    fillR(ctx, mcx + 24, mcy + 10, 3, 2, "#e05050"); // stop
    fillR(ctx, mcx + 24, mcy + 13, 3, 2, "#50e050"); // start
    fillR(ctx, mcx + 24, mcy + 16, 3, 2, "#5080e0"); // timer
    // Bottom vent
    for (let vi = 0; vi < 5; vi++)
      fillR(ctx, mcx + 3 + vi * 4, mcy + 19, 2, 1, "#404050");

    // ── Toaster (chrome) ──
    const tsx = kx + T * 2 + 14,
      tsy = ky - 14;
    ctx.save();
    ctx.shadowColor = "#00000040";
    ctx.shadowBlur = 2;
    fillR(ctx, tsx, tsy, 16, 14, "#c0c8d0");
    ctx.restore();
    fillR(ctx, tsx + 1, tsy, 14, 1, "#d8e0e8"); // top highlight
    fillR(ctx, tsx, tsy + 1, 16, 1, "#b0b8c0"); // subtle edge
    // Two slots on top
    fillR(ctx, tsx + 2, tsy - 1, 4, 2, "#404048");
    fillR(ctx, tsx + 9, tsy - 1, 4, 2, "#404048");
    // Bread peeking out (tiny)
    fillR(ctx, tsx + 3, tsy - 2, 2, 2, "#d4a850");
    fillR(ctx, tsx + 10, tsy - 2, 2, 2, "#d4a850");
    // Chrome body detail
    fillR(ctx, tsx + 1, tsy + 4, 14, 1, "#d0d8e0");
    fillR(ctx, tsx + 1, tsy + 8, 14, 1, "#a8b0b8");
    // Push lever (side)
    fillR(ctx, tsx + 15, tsy + 3, 2, 6, "#808890");
    fillR(ctx, tsx + 16, tsy + 4, 1, 3, "#606870");
    // Crumb tray
    fillR(ctx, tsx + 1, tsy + 13, 14, 2, "#a0a8b0");
    fillR(ctx, tsx + 2, tsy + 14, 12, 1, "#909098");

    // ── Knife Block ──
    const kbx = kx + T * 3 + 8,
      kby = ky - 18;
    // Wooden block body
    fillR(ctx, kbx, kby + 4, 10, 14, "#6a4020");
    fillR(ctx, kbx + 1, kby + 5, 8, 12, "#7a4c28");
    fillR(ctx, kbx + 1, kby + 4, 8, 1, "#805530"); // top highlight
    // Knife handles sticking out
    fillR(ctx, kbx + 2, kby, 2, 6, "#303030"); // black handle
    fillR(ctx, kbx + 4, kby + 1, 2, 5, "#8b2020"); // red handle
    fillR(ctx, kbx + 6, kby + 2, 2, 4, "#204080"); // blue handle
    fillR(ctx, kbx + 8, kby + 1, 1, 5, "#c0c8d0"); // blade glint
    // Blade tips visible
    fillR(ctx, kbx + 2, kby - 1, 1, 2, "#c0c8d0");
    fillR(ctx, kbx + 4, kby, 1, 2, "#c0c8d0");
    fillR(ctx, kbx + 6, kby + 1, 1, 2, "#c0c8d0");

    // ── Cutting Board with food ──
    const cbx = kx + T * 4,
      cby = ky - 8;
    // Wooden board
    fillR(ctx, cbx, cby, 20, 10, "#c8a060");
    fillR(ctx, cbx + 1, cby + 1, 18, 8, "#d0a868");
    fillR(ctx, cbx, cby, 20, 1, "#d8b870"); // highlight
    // Board grain lines
    fillR(ctx, cbx + 5, cby + 2, 1, 6, "#b89850");
    fillR(ctx, cbx + 12, cby + 2, 1, 6, "#b89850");
    // Food pieces (chopped veggies)
    fillR(ctx, cbx + 3, cby + 3, 3, 2, "#e05030"); // tomato
    fillR(ctx, cbx + 7, cby + 4, 2, 2, "#40b040"); // lettuce
    fillR(ctx, cbx + 10, cby + 3, 3, 2, "#f0c020"); // cheese
    fillR(ctx, cbx + 14, cby + 4, 2, 2, "#e08030"); // carrot
    fillR(ctx, cbx + 14, cby + 2, 2, 2, "#40b040"); // more green

    // ── Sink (far end of counter) ──
    const snx = kx + T * 7,
      sny = ky - 4;
    // Basin (inset into counter)
    fillR(ctx, snx, sny, T * 1.5, 10, "#a09870"); // counter around
    fillR(ctx, snx + 3, sny + 2, T * 1.5 - 6, 7, "#606858"); // basin dark
    fillR(ctx, snx + 4, sny + 3, T * 1.5 - 8, 5, "#505848"); // basin inner
    fillR(ctx, snx + 5, sny + 4, T * 1.5 - 10, 3, "#485040"); // water dark
    // Chrome faucet - base
    fillR(ctx, snx + T - 2, sny - 2, 4, 4, "#b0b8c8");
    // Faucet curved pipe (going up then arching over)
    fillR(ctx, snx + T - 1, sny - 14, 3, 12, "#c0c8d8"); // vertical pipe
    fillR(ctx, snx + T - 1, sny - 15, 3, 2, "#d0d8e8"); // top highlight
    fillR(ctx, snx + T - 6, sny - 13, 6, 2, "#b0b8c8"); // horizontal arm
    fillR(ctx, snx + T - 7, sny - 13, 2, 3, "#a0a8b8"); // spout tip
    // Faucet handles
    fillR(ctx, snx + T - 5, sny - 3, 3, 2, "#d04040"); // hot
    fillR(ctx, snx + T + 3, sny - 3, 3, 2, "#4040d0"); // cold

    // Fridge (tall, silver)
    const [_frATx, _frATy] = getAdminPos(
      "fridge",
      kitIntX + 8,
      KITCHEN_START_ROW,
    );
    const [frx, fry] = ts(_frATx, _frATy);
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 6;
    fillR(ctx, frx + 2, fry, 24, T * 1.5, "#d0d8e8");
    ctx.restore();
    fillR(ctx, frx + 3, fry + 1, 22, T * 0.55, "#e0e8f4"); // freezer
    fillR(ctx, frx + 3, fry + T * 0.55 + 1, 22, T * 0.9, "#e8f0f8"); // main
    fillR(ctx, frx + 6, fry + T * 0.55, 12, 2, "#b0b8c8"); // divider
    fillR(ctx, frx + 24, fry + 5, 2, 9, "#a0a8b8"); // freezer handle
    fillR(ctx, frx + 24, fry + T * 0.6, 2, 10, "#a0a8b8"); // main handle
    fillR(ctx, frx + 4, fry + 8, 7, 2, "#80b8e0");

    // Dining table in middle of kitchen (vertical orientation)
    const [tbx, tby] = ts(
      ...getAdminPos("kitchen_table", kitIntX + 2, KITCHEN_START_ROW + 1),
    );
    const tbW = T * 4,
      tbH = T * 3;
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    fillR(ctx, tbx, tby, tbW, tbH, "#a09060");
    ctx.restore();
    fillR(ctx, tbx, tby, tbW, 3, "#c4b488"); // table top highlight
    fillR(ctx, tbx + 2, tby + 2, tbW - 4, tbH - 4, "#b8a470"); // table surface
    // 4 legs
    fillR(ctx, tbx + 3, tby + tbH, 5, T * 0.3, "#7a6030");
    fillR(ctx, tbx + tbW - 8, tby + tbH, 5, T * 0.3, "#7a6030");
    // Plates around table
    const plates = [
      [tbx + T * 0.6, tby + T * 0.5],
      [tbx + tbW - T * 0.6, tby + T * 0.5],
      [tbx + T * 0.6, tby + tbH - T * 0.5],
      [tbx + tbW - T * 0.6, tby + tbH - T * 0.5],
    ];
    for (const [ppx, ppy] of plates) {
      ctx.fillStyle = "#e8e0d0";
      ctx.beginPath();
      ctx.ellipse(ppx, ppy, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d0c8b0";
      ctx.beginPath();
      ctx.ellipse(ppx, ppy, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fruit vase in center
    const vx = tbx + tbW / 2,
      vy = tby + tbH / 2;
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(vx - 8, vy + 4);
    ctx.lineTo(vx - 10, vy - 4);
    ctx.quadraticCurveTo(vx, vy - 10, vx + 10, vy - 4);
    ctx.lineTo(vx + 8, vy + 4);
    ctx.quadraticCurveTo(vx, vy + 6, vx - 8, vy + 4);
    ctx.fill();
    ctx.fillStyle = "#A0522D";
    ctx.beginPath();
    ctx.ellipse(vx, vy - 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fruits
    ctx.fillStyle = "#cc2233";
    ctx.beginPath();
    ctx.arc(vx - 4, vy - 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx + 3, vy - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8922e";
    ctx.beginPath();
    ctx.arc(vx + 5, vy - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx - 6, vy - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a2d8e";
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
    ctx.fillStyle = "#3a9040";
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
        fillR(ctx, wx, wy, T, T, "#d0caba");
        // Door frame edges
        if (c === doorStart) fillR(ctx, wx - 2, wy, 4, T, "#6a5090");
        if (c === doorEnd) fillR(ctx, wx + T - 2, wy, 4, T, "#6a5090");
      } else {
        fillR(ctx, wx, wy, T, T, "#252344");
        fillR(ctx, wx, wy, T, 4, "#3a3860"); // top highlight
        fillR(ctx, wx, wy + T - 2, T, 2, "#1e1c38"); // bottom shadow
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
        fillR(ctx, wx, wy, T, T, "#d0caba");
        if (r === doorStart) fillR(ctx, wx, wy - 2, T, 4, "#6a5090");
        if (r === doorEnd) fillR(ctx, wx, wy + T - 2, T, 4, "#6a5090");
      } else {
        fillR(ctx, wx, wy, T, T, "#252344");
        fillR(ctx, wx, wy, 4, T, "#1e1c38"); // left shadow
        fillR(ctx, wx + T - 4, wy, 4, T, "#3a3860"); // right highlight
      }
    }
  }

  // ── Lounge wall (horizontal, row 21, door in center) ──
  drawHWall(21, 1, COLS - 2, Math.floor(COLS * 0.3), Math.floor(COLS * 0.5));

  // (Activity zone wall and gym/gaming divider removed — open layout)

  // (Sports wall and dividers removed — open layout below lounge)

  // ── Room labels (small, subtle) ──
  // (Room labels removed — clean open layout)

  // Nameplate
  const npX = OX + Math.floor((COLS - 10) / 2) * T,
    npY = OY + 6;
  fillR(ctx, npX, npY, 10 * T, 20, "#2a2848");
  fillR(ctx, npX + 2, npY, 10 * T - 4, 18, "#1e1c38");
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "bold 9px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("AGENT OFFICE", OX + (COLS / 2) * T, npY + 14);
  ctx.textAlign = "left";

  // ── Bookshelf (right wall, social zone — below conference table) ──
  if (ACT_ZONE_Y > 0) {
    const [_shTx, _shTy] = getAdminPos(
      "bookshelf",
      COLS - 5.5,
      ACT_ZONE_Y + 13.2,
    );
    const [bsx, bsy] = ts(_shTx, _shTy);
    const bW = T * 4.5,
      bH = T * 3.5;
    // Shadow
    ctx.save();
    ctx.shadowColor = "#00000090";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    fillR(ctx, bsx, bsy, bW, bH, "#3d2410");
    ctx.restore();
    // Back panel
    fillR(ctx, bsx + 6, bsy + 2, bW - 12, bH - 2, "#5a3818");
    // Side panels (thick wood)
    fillR(ctx, bsx, bsy, 7, bH, "#4a2c14");
    fillR(ctx, bsx + bW - 7, bsy, 7, bH, "#4a2c14");
    // Wood grain highlights on sides
    ctx.fillStyle = "#6a4020";
    ctx.fillRect(bsx + 2, bsy + 8, 2, bH - 16);
    ctx.fillStyle = "#3a2010";
    ctx.fillRect(bsx + 4, bsy + 12, 1, bH - 24);
    ctx.fillStyle = "#6a4020";
    ctx.fillRect(bsx + bW - 5, bsy + 8, 2, bH - 16);
    // Top board
    fillR(ctx, bsx, bsy, bW, 6, "#5a3818");
    fillR(ctx, bsx, bsy, bW, 2, "#7a5030"); // top highlight
    // Bottom board
    fillR(ctx, bsx, bsy + bH - 5, bW, 5, "#3d2010");
    // Three shelves
    const shH = 4;
    const sh = [bsy + T * 1.0, bsy + T * 2.0, bsy + T * 3.0];
    for (const sy of sh) {
      fillR(ctx, bsx + 6, sy, bW - 12, shH, "#3a2010");
      fillR(ctx, bsx + 6, sy - 1, bW - 12, 2, "#7a5030"); // shelf highlight
    }
    // Books helper
    const drawBookRow = (cols, bottomY, count) => {
      let bkx = bsx + 9;
      for (let i = 0; i < count; i++) {
        const bkw = 5 + ((i * 3) % 5);
        const bkh = 10 + ((i * 7) % 12);
        const bc = cols[i % cols.length];
        fillR(ctx, bkx, bottomY - bkh, bkw, bkh, bc);
        fillR(ctx, bkx, bottomY - bkh, 1, bkh, bc + "55"); // spine shadow
        fillR(ctx, bkx + 1, bottomY - bkh, bkw - 2, 2, "#ffffff20"); // top edge
        bkx += bkw + 2;
        if (bkx > bsx + bW - 12) break;
      }
    };
    const bc1 = [
      "#f7768e",
      "#7aa2f7",
      "#9ece6a",
      "#e0af68",
      "#bb9af7",
      "#2ac3de",
      "#ff9e64",
      "#f7768e",
    ];
    const bc2 = [
      "#2ac3de",
      "#e0af68",
      "#bb9af7",
      "#f7768e",
      "#9ece6a",
      "#7aa2f7",
      "#ff9e64",
      "#2ac3de",
    ];
    const bc3 = [
      "#9ece6a",
      "#ff9e64",
      "#7aa2f7",
      "#f7768e",
      "#e0af68",
      "#bb9af7",
      "#2ac3de",
      "#9ece6a",
    ];
    drawBookRow(bc1, sh[0] - 1, 10);
    drawBookRow(bc2, sh[1] - 1, 10);
    drawBookRow(bc3, sh[2] - 1, 10);
    // Decorative items on top shelf
    // Small plant pot
    ctx.fillStyle = "#904020";
    ctx.fillRect(bsx + bW - 22, bsy + 3, 12, 8);
    ctx.fillStyle = "#b05030";
    ctx.fillRect(bsx + bW - 23, bsy + 2, 14, 3);
    ctx.fillStyle = "#2a6020";
    ctx.beginPath();
    ctx.arc(bsx + bW - 16, bsy - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a8030";
    ctx.beginPath();
    ctx.arc(bsx + bW - 20, bsy - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    // Trophy / award
    ctx.fillStyle = "#c8a020";
    ctx.fillRect(bsx + 14, bsy + 4, 8, 6);
    ctx.fillStyle = "#e0c040";
    ctx.beginPath();
    ctx.arc(bsx + 18, bsy + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8a020";
    ctx.fillRect(bsx + 16, bsy + 8, 4, 3);
    ctx.fillStyle = "#a08010";
    ctx.fillRect(bsx + 12, bsy + 10, 12, 2);
  }

  // ── Printer (right side, before kitchen wall) ─────────────────────
  if (KITCHEN_WALL_COL > 0 && KITCHEN_START_ROW > 0) {
    const [_prTx, _prTy] = getAdminPos(
      "printer",
      KITCHEN_WALL_COL - 3,
      KITCHEN_START_ROW - 2,
    );
    const [prx, pry] = ts(_prTx, _prTy);
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 6;
    fillR(ctx, prx + 2, pry + 4, T * 1.6, T * 0.9, "#c0c0cc");
    ctx.restore();
    fillR(ctx, prx + 4, pry + 6, T * 1.6 - 4, T * 0.9 - 4, "#d0d0dc");
    // Paper slot (dark groove)
    fillR(ctx, prx + 8, pry + 8, T * 1.6 - 12, 3, "#808090");
    // Status light
    ctx.fillStyle = "#9ece6a";
    ctx.beginPath();
    ctx.arc(prx + T * 1.6 - 4, pry + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    // Brand strip
    fillR(ctx, prx + 4, pry + 6, T * 1.6 - 4, 5, "#a0a0b0");
    // Output tray
    fillR(ctx, prx + 4, pry + T * 0.9 + 2, T * 1.6 - 4, 4, "#b0b0bc");
  }

  // ── Vending Machine (inside kitchen area) ────────────────────────
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    const [_vmTx, _vmTy] = getAdminPos(
      "vending",
      KITCHEN_WALL_COL + 1,
      ACT_ZONE_Y - 2,
    );
    const [vmx, vmy] = ts(_vmTx, _vmTy);
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 8;
    fillR(ctx, vmx, vmy, T * 1.5, T * 2.2, "#282840");
    ctx.restore();
    fillR(ctx, vmx + 2, vmy + 2, T * 1.5 - 4, T * 2.2 - 4, "#30304a");
    fillR(ctx, vmx + 4, vmy + 6, T * 1.5 - 8, T * 1.4, "#101828");
    const vmColors = [
      "#e0a030",
      "#c04040",
      "#40a060",
      "#8040c0",
      "#2ac3de",
      "#f7768e",
    ];
    for (let r = 0; r < 3; r++)
      for (let c2 = 0; c2 < 3; c2++) {
        fillR(
          ctx,
          vmx + 6 + c2 * 12,
          vmy + 8 + r * 14,
          10,
          11,
          vmColors[(r * 3 + c2) % 6],
        );
        fillR(ctx, vmx + 7 + c2 * 12, vmy + 9 + r * 14, 4, 3, "#ffffff30");
      }
    fillR(ctx, vmx + 4, vmy + T * 1.4 + 8, 8, 3, "#404058");
    fillR(ctx, vmx + 14, vmy + T * 1.4 + 6, T * 1.5 - 18, 8, "#0a1828");
    fillR(ctx, vmx + 15, vmy + T * 1.4 + 7, T * 1.5 - 20, 6, SCREEN_C);
    fillR(ctx, vmx + 4, vmy + T * 2.2 - 8, T * 1.5 - 8, 6, "#1a1830");
  }

  // ── Conference Table (social zone below gym) ─────────────────────
  if (ACT_ZONE_Y > 0) {
    const [_cfTx, _cfTy] = getAdminPos("conf_table", 4, ACT_ZONE_Y + 10);
    const [cfx, cfy] = ts(_cfTx, _cfTy);
    const ctW = T * 6,
      ctH = T * 2;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    // Oval table
    ctx.fillStyle = "#5a3c18";
    ctx.beginPath();
    ctx.ellipse(
      cfx + ctW / 2,
      cfy + ctH / 2,
      ctW / 2,
      ctH / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#6a4820";
    ctx.beginPath();
    ctx.ellipse(
      cfx + ctW / 2,
      cfy + ctH / 2,
      ctW / 2 - 3,
      ctH / 2 - 3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Wood grain
    ctx.strokeStyle = "#5a3c1840";
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
        Math.PI * 2,
      );
      ctx.stroke();
    }
    // Chairs around table (north and south)
    const chairCol = CHAIR_C;
    for (let i = 0; i < 4; i++) {
      const chx = cfx + T * 0.7 + i * T * 1.3;
      // North chairs
      fillR(ctx, chx, cfy - T * 0.5, T * 0.8, T * 0.5, chairCol);
      fillR(
        ctx,
        chx + 2,
        cfy - T * 0.5 + 2,
        T * 0.8 - 4,
        T * 0.5 - 4,
        CHAIR_SEAT,
      );
      // South chairs
      fillR(ctx, chx, cfy + ctH + 4, T * 0.8, T * 0.5, chairCol);
      fillR(ctx, chx + 2, cfy + ctH + 6, T * 0.8 - 4, T * 0.5 - 4, CHAIR_SEAT);
    }
  }

  // ── Trash Can (static body drawn on background) ───────────────────
  {
    const [_trTx, _trTy] = getAdminPos("trashcan", KITCHEN_WALL_COL - 2, 3);
    const [tcx, tcy] = ts(_trTx, _trTy);
    const cx2 = tcx + T / 2,
      cy2 = tcy + T * 0.5;
    // Shadow
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 4;
    // Can body (tapered cylinder)
    ctx.fillStyle = "#505060";
    ctx.beginPath();
    ctx.moveTo(cx2 - 9, cy2 + 14);
    ctx.lineTo(cx2 + 9, cy2 + 14);
    ctx.lineTo(cx2 + 7, cy2 - 6);
    ctx.lineTo(cx2 - 7, cy2 - 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Lid
    ctx.fillStyle = "#606878";
    ctx.fillRect((cx2 - 10) | 0, (cy2 - 10) | 0, 20, 4);
    // Lid handle
    ctx.fillStyle = "#707880";
    ctx.fillRect((cx2 - 3) | 0, (cy2 - 14) | 0, 6, 5);
    // Horizontal bands on can body
    ctx.fillStyle = "#5a5a6a";
    ctx.fillRect((cx2 - 8) | 0, cy2 | 0, 16, 2);
    ctx.fillRect((cx2 - 8) | 0, (cy2 + 8) | 0, 16, 2);
    // Recycling symbol hint
    ctx.fillStyle = "#3a8a3a";
    ctx.font = "6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("\u267B", cx2, cy2 + 6);
    ctx.textAlign = "left";
  }

  // ════ RIGHT ENTERTAINMENT ZONE ══════════════════════════════════
  {
    const rX = PER_ROW * STEP_X + 2;

    // ── 1. Water Cooler ─────────────────────────────────────────
    const [_coolerTx, _coolerTy] = getAdminPos("cooler", rX + 2.5, 2);
    const [wcx, wcy] = ts(_coolerTx, _coolerTy);
    // Cooler body
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 8;
    fillR(ctx, wcx, wcy, T * 1.5, T * 2, "#d0d8e0");
    ctx.restore();
    fillR(ctx, wcx + 3, wcy + 3, T * 1.5 - 6, T * 0.7, "#80c0e8"); // water tank
    fillR(ctx, wcx + 3, wcy + T * 0.7 + 3, T * 1.5 - 6, T * 1.3 - 6, "#e8ecf0"); // body
    fillR(ctx, wcx + T * 0.75 - 4, wcy + T * 0.8, 8, 5, "#707880"); // tap
    ctx.fillStyle = "#4488dd";
    ctx.fillRect(wcx + 6, wcy + T * 0.9 + 4, 7, 4);
    ctx.fillStyle = "#dd4444";
    ctx.fillRect(wcx + T * 1.5 - 13, wcy + T * 0.9 + 4, 7, 4);
    // Water jug
    ctx.fillStyle = "#70b8e880";
    ctx.beginPath();
    ctx.ellipse(wcx + T * 0.75, wcy - 2, 12, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#5090b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(wcx + T * 0.75, wcy - 2, 12, 14, 0, Math.PI, 0);
    ctx.stroke();
    // Drip tray
    fillR(ctx, wcx + 4, wcy + T * 2 - 5, T * 1.5 - 8, 4, "#a0a8b0");

    // ── 3. Aquarium (right zone, row 8) ─────────────────────────
    const [_aqTx, _aqTy] = getAdminPos("aquarium", rX + 0.3, 8);
    const [aqx, aqy] = ts(_aqTx, _aqTy);
    const aqW = T * 2.5,
      aqH = T * 1.8;
    // Stand/legs
    fillR(ctx, aqx + 4, aqy + aqH, 6, 8, "#404050");
    fillR(ctx, aqx + aqW - 10, aqy + aqH, 6, 8, "#404050");
    fillR(ctx, aqx, aqy + aqH, aqW, 3, "#505060"); // base
    // Tank frame
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 6;
    fillR(ctx, aqx, aqy, aqW, aqH, "#1a3a50");
    ctx.restore();
    // Glass
    fillR(ctx, aqx + 3, aqy + 3, aqW - 6, aqH - 6, "#1a4a6880");
    // Water
    fillR(ctx, aqx + 3, aqy + 8, aqW - 6, aqH - 11, "#1860a040");
    // Sand at bottom
    fillR(ctx, aqx + 3, aqy + aqH - 10, aqW - 6, 7, "#c8b07030");
    // Pebbles
    ctx.fillStyle = "#908060";
    [6, 14, 22, 30, 38, 48, 56].forEach((px) => {
      ctx.beginPath();
      ctx.ellipse(
        aqx + (px % aqW) + 4,
        aqy + aqH - 6,
        2 + (px % 3),
        1.5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    // Seaweed
    ctx.strokeStyle = "#2a8040";
    ctx.lineWidth = 2;
    [8, 20, 50].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(aqx + sx, aqy + aqH - 8);
      ctx.quadraticCurveTo(
        aqx + sx - 4,
        aqy + aqH - 22,
        aqx + sx + 2,
        aqy + aqH - 30,
      );
      ctx.stroke();
    });
    // Glass reflection
    ctx.fillStyle = "#ffffff18";
    fillR(ctx, aqx + 5, aqy + 5, 4, aqH - 14);
    // Frame top rim
    fillR(ctx, aqx - 1, aqy - 2, aqW + 2, 4, "#606070");

    // ── 4. Trophy Cabinet (right zone, row 12) ──────────────────
    const [_tcbTx, _tcbTy] = getAdminPos("trophy_cabinet", rX + 0.3, 12);
    const [tcbx, tcby] = ts(_tcbTx, _tcbTy);
    const tcbW = T * 2,
      tcbH = T * 2.5;
    // Cabinet body shadow
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 8;
    fillR(ctx, tcbx, tcby, tcbW, tcbH, "#4a3010");
    ctx.restore();
    // Cabinet body
    fillR(ctx, tcbx + 2, tcby + 2, tcbW - 4, tcbH - 4, "#5a3c18");
    // Crown molding (top)
    fillR(ctx, tcbx - 2, tcby - 4, tcbW + 4, 5, "#3a2408");
    fillR(ctx, tcbx - 1, tcby - 3, tcbW + 2, 3, "#6a5020");
    // Glass door left
    fillR(ctx, tcbx + 3, tcby + 7, tcbW / 2 - 5, tcbH - 11, "#1a385090");
    ctx.strokeStyle = "#806040";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      tcbx + 3 + 0.5,
      tcby + 7 + 0.5,
      tcbW / 2 - 5 - 1,
      tcbH - 11 - 1,
    );
    // Glass door right
    fillR(
      ctx,
      tcbx + tcbW / 2 + 2,
      tcby + 7,
      tcbW / 2 - 5,
      tcbH - 11,
      "#1a385090",
    );
    ctx.strokeRect(
      tcbx + tcbW / 2 + 2 + 0.5,
      tcby + 7 + 0.5,
      tcbW / 2 - 5 - 1,
      tcbH - 11 - 1,
    );
    // Center divider
    fillR(ctx, tcbx + tcbW / 2 - 1, tcby + 7, 2, tcbH - 11, "#3a2408");
    // Door handles
    ctx.fillStyle = "#c09830";
    ctx.fillRect(tcbx + tcbW / 2 - 5, tcby + tcbH / 2 - 3, 4, 6);
    ctx.fillRect(tcbx + tcbW / 2 + 1, tcby + tcbH / 2 - 3, 4, 6);
    // Shelf lines inside cabinet
    [0.33, 0.66].forEach((frac) => {
      const sy = tcby + 7 + (tcbH - 11) * frac;
      fillR(ctx, tcbx + 3, sy - 1, tcbW - 6, 2, "#3a2408");
      fillR(ctx, tcbx + 3, sy + 1, tcbW - 6, 1, "#6a5020");
    });
    // Trophies on shelves (5 trophies: 2 top, 2 mid, 1 bottom)
    const trophyColors = [
      "#e0af68",
      "#c8d3f5",
      "#bb9af7",
      "#9ece6a",
      "#e0af68",
    ];
    [
      [0.22, 0.14],
      [0.65, 0.14],
      [0.25, 0.47],
      [0.62, 0.47],
      [0.44, 0.78],
    ].forEach(([fx, fy], ti) => {
      const trx = tcbx + 4 + fx * (tcbW - 8),
        trY = tcby + 8 + fy * (tcbH - 14);
      const tc = trophyColors[ti % trophyColors.length];
      ctx.fillStyle = tc;
      // Cup shape
      ctx.beginPath();
      ctx.moveTo(trx - 4, trY + 5);
      ctx.lineTo(trx - 5, trY - 1);
      ctx.lineTo(trx + 5, trY - 1);
      ctx.lineTo(trx + 4, trY + 5);
      ctx.closePath();
      ctx.fill();
      // Handles
      ctx.strokeStyle = tc;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(trx - 5, trY + 2, 2, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(trx + 5, trY + 2, 2, Math.PI * 0.5, -Math.PI * 0.5);
      ctx.stroke();
      // Stem
      ctx.fillStyle = tc;
      ctx.fillRect(trx - 1, trY + 5, 2, 3);
      // Base
      ctx.fillRect(trx - 3, trY + 8, 6, 2);
      // Shine
      ctx.fillStyle = "#ffffff50";
      ctx.fillRect(trx - 3, trY - 1, 2, 4);
    });
    // Base plinth
    fillR(ctx, tcbx, tcby + tcbH, tcbW, 4, "#3a2408");
    // Label
    ctx.fillStyle = "#c09830";
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText("TROPHIES", tcbx + tcbW / 2, tcby + tcbH + 12);
    ctx.textAlign = "left";

    // ── 2. Dartboard (ON the top wall — row 0) ──────────────────
    const [_dartTx, _dartTy] = getAdminPos("darts", rX + 1.5, 0);
    const dartWallX = OX + _dartTx * T;
    const dartWallY = OY + _dartTy * T + 4;
    const DR = 13;
    // Wooden backing
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 4;
    fillR(
      ctx,
      dartWallX - DR - 3,
      dartWallY - DR - 3,
      DR * 2 + 6,
      DR * 2 + 6,
      "#4a3018",
    );
    ctx.restore();
    // Board circle
    ctx.fillStyle = "#101010";
    ctx.beginPath();
    ctx.arc(dartWallX, dartWallY, DR, 0, Math.PI * 2);
    ctx.fill();
    // Rings
    const rings = [
      [DR - 1, "#1a6030"],
      [DR - 3, "#cc2020"],
      [DR - 5, "#e8d870"],
      [DR - 7, "#1a6030"],
      [DR - 9, "#cc2020"],
      [4, "#e8d870"],
      [2, "#cc2020"],
    ];
    for (const [r, c] of rings) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(dartWallX, dartWallY, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wires
    ctx.strokeStyle = "#c0c0c040";
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
    ctx.fillStyle = "#f0e8d0";
    ctx.beginPath();
    ctx.arc(dartWallX, dartWallY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Social zone entertainment objects ─────────────────────────
  if (ACT_ZONE_Y > 0) {
    // ── Arcade Machine (recreation, col 16) ────────────────────
    const [_arcTx, _arcTy] = getAdminPos("arcade", 16, ACT_ZONE_Y + 9);
    const [arcx, arcy] = ts(_arcTx, _arcTy);
    const arcW = T * 2,
      arcH = T * 2;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 8;
    fillR(ctx, arcx, arcy, arcW, arcH, "#1a1a30");
    ctx.restore();
    fillR(ctx, arcx + 2, arcy + 2, arcW - 4, 12, "#c02040");
    ctx.fillStyle = "#ffcc00";
    ctx.font = "5px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARCADE", arcx + arcW / 2, arcy + 10);
    ctx.textAlign = "left";
    const marqueeCols = ["#ff0", "#0ff", "#f0f", "#0f0", "#ff0", "#0ff"];
    for (let li = 0; li < 6; li++) {
      ctx.fillStyle = marqueeCols[li];
      ctx.beginPath();
      ctx.arc(arcx + 6 + li * 9, arcy + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    fillR(ctx, arcx + 4, arcy + 16, arcW - 8, arcH * 0.4, "#0a1828");
    fillR(ctx, arcx + 6, arcy + 18, arcW - 12, arcH * 0.4 - 4, "#102838");
    fillR(ctx, arcx + 10, arcy + 22, 6, 6, "#f7768e");
    fillR(ctx, arcx + arcW - 18, arcy + 24, 6, 6, "#9ece6a");
    fillR(ctx, arcx + 4, arcy + arcH * 0.65, arcW - 8, 14, "#282840");
    fillR(ctx, arcx + 10, arcy + arcH * 0.65 + 2, 4, 8, "#808090");
    ctx.fillStyle = "#c04040";
    ctx.beginPath();
    ctx.arc(arcx + 12, arcy + arcH * 0.65 + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e04040";
    ctx.beginPath();
    ctx.arc(arcx + arcW - 16, arcy + arcH * 0.65 + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#40a0e0";
    ctx.beginPath();
    ctx.arc(arcx + arcW - 8, arcy + arcH * 0.65 + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    fillR(ctx, arcx + arcW / 2 - 3, arcy + arcH - 10, 6, 3, "#404058");

    // ── Espresso Bar (cafe, col 13) ─────────────────────────────
    const [_espTx, _espTy] = getAdminPos("espresso_bar", 13, ACT_ZONE_Y + 14);
    const [espx, espy] = ts(_espTx, _espTy);
    const espW = T * 3,
      espH = T * 1.5;
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 6;
    fillR(ctx, espx, espy, espW, espH, "#5a3c20");
    ctx.restore();
    fillR(ctx, espx + 2, espy + 2, espW - 4, espH - 4, "#6a4828");
    fillR(ctx, espx, espy, espW, 4, "#7a5830");
    fillR(ctx, espx + espW / 2 - 8, espy - 12, 16, 14, "#404050");
    fillR(ctx, espx + espW / 2 - 6, espy - 10, 12, 8, "#505060");
    fillR(ctx, espx + espW / 2 - 2, espy - 4, 4, 6, "#606070");
    fillR(ctx, espx + espW / 2 + 4, espy - 8, 2, 4, "#808090");
    ctx.fillStyle = "#e0d8c8";
    [espx + 6, espx + 16, espx + espW - 18].forEach((cx2) => {
      ctx.fillRect(cx2, espy - 4, 6, 5);
      ctx.fillStyle = "#c0b8a8";
      ctx.fillRect(cx2 + 1, espy - 3, 4, 3);
      ctx.fillStyle = "#e0d8c8";
    });
    const bottleCols = ["#802020", "#208020", "#a06020", "#202080"];
    bottleCols.forEach((bc, i) => {
      fillR(ctx, espx + 4 + i * 12, espy - 22, 6, 10, bc);
      fillR(ctx, espx + 5 + i * 12, espy - 26, 4, 5, bc);
    });
    for (let si = 0; si < 3; si++) {
      const stx = espx + 8 + (si * (espW - 16)) / 2;
      fillR(ctx, stx, espy + espH + 2, 10, 4, "#404050");
      fillR(ctx, stx + 4, espy + espH + 6, 3, 8, "#505060");
      fillR(ctx, stx + 1, espy + espH + 14, 8, 2, "#404050");
    }

    // ── Server Rack (makers lab, col 2) ─────────────────────────
    const [_srvTx, _srvTy] = getAdminPos("server_rack", 2, ACT_ZONE_Y + 14);
    const [srvx, srvy] = ts(_srvTx, _srvTy);
    const srvW = T * 2,
      srvH = T * 2.2;
    ctx.save();
    ctx.shadowColor = "#00000080";
    ctx.shadowBlur = 8;
    fillR(ctx, srvx, srvy, srvW, srvH, "#101018");
    ctx.restore();
    fillR(ctx, srvx + 2, srvy + 2, srvW - 4, srvH - 4, "#181820");
    for (let ru = 0; ru < 5; ru++) {
      const ruy = srvy + 6 + (ru * (srvH - 12)) / 5;
      fillR(ctx, srvx + 4, ruy, srvW - 8, (srvH - 20) / 5, "#202030");
      fillR(ctx, srvx + 5, ruy + 1, srvW - 10, 2, "#282838");
      const ledCols = ["#40e040", "#4080ff", "#e0a020", "#40e040", "#4080ff"];
      for (let li = 0; li < 4; li++) {
        ctx.fillStyle = ledCols[(ru + li) % 5];
        ctx.beginPath();
        ctx.arc(srvx + 8 + li * 8, ruy + 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    fillR(ctx, srvx + 4, srvy + srvH - 8, srvW - 8, 6, "#0a0a12");
    ctx.strokeStyle = "#303040";
    ctx.lineWidth = 1;
    for (let ci = 0; ci < 3; ci++) {
      ctx.beginPath();
      ctx.moveTo(srvx + 8 + ci * 10, srvy + srvH - 6);
      ctx.quadraticCurveTo(
        srvx + 8 + ci * 10 + 5,
        srvy + srvH + 4,
        srvx + 12 + ci * 10,
        srvy + srvH - 2,
      );
      ctx.stroke();
    }

    // ── 3D Printer (makers lab, col 7) ──────────────────────────
    const [_p3Tx, _p3Ty] = getAdminPos("printer_3d", 7, ACT_ZONE_Y + 14);
    const [p3x, p3y] = ts(_p3Tx, _p3Ty);
    const p3W = T * 2,
      p3H = T * 1.8;
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    fillR(ctx, p3x, p3y, p3W, p3H, "#303040");
    ctx.restore();
    fillR(ctx, p3x + 3, p3y + 3, p3W - 6, p3H - 6, "#40405060");
    fillR(ctx, p3x, p3y, 4, p3H, "#303040");
    fillR(ctx, p3x + p3W - 4, p3y, 4, p3H, "#303040");
    fillR(ctx, p3x, p3y, p3W, 4, "#303040");
    fillR(ctx, p3x, p3y + p3H - 4, p3W, 4, "#303040");
    fillR(ctx, p3x + 6, p3y + p3H - 12, p3W - 12, 6, "#505060");
    fillR(ctx, p3x + 8, p3y + p3H - 14, p3W - 16, 2, "#606070");
    fillR(ctx, p3x + 6, p3y + 6, p3W - 12, 3, "#404050");
    fillR(ctx, p3x + p3W / 2 - 3, p3y + 6, 6, 10, "#606070");
    fillR(ctx, p3x + p3W / 2 - 1, p3y + 16, 2, 4, "#808090");
    fillR(ctx, p3x + p3W / 2 - 4, p3y + p3H - 18, 8, 6, "#9ece6a");
    fillR(ctx, p3x + p3W / 2 - 2, p3y + p3H - 22, 4, 4, "#7aa2f7");

    // ── Basketball Hoop (recreation, col 12) ───────────────────
    const [_bbTx, _bbTy] = getAdminPos("basketball", 12, ACT_ZONE_Y + 9);
    const [bbx, bby] = ts(_bbTx, _bbTy);
    fillR(ctx, bbx + T - 2, bby + T * 0.4, 4, T * 1.8, "#606070");
    fillR(ctx, bbx + 4, bby, T * 1.8, T * 1.0, "#e8e0d0");
    fillR(ctx, bbx + 6, bby + 2, T * 1.8 - 4, T * 1.0 - 4, "#d8d0c0");
    ctx.strokeStyle = "#c04020";
    ctx.lineWidth = 2;
    ctx.strokeRect(bbx + T * 0.6, bby + T * 0.2, T * 0.6, T * 0.5);
    ctx.strokeStyle = "#e06020";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(bbx + T * 0.9, bby + T * 1.0 + 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff80";
    ctx.lineWidth = 0.8;
    for (let ni = 0; ni < 5; ni++) {
      const nx = bbx + T * 0.9 - 6 + ni * 3;
      ctx.beginPath();
      ctx.moveTo(nx, bby + T * 1.0 + 4);
      ctx.quadraticCurveTo(
        nx + (ni - 2) * 0.5,
        bby + T * 1.3,
        bbx + T * 0.9,
        bby + T * 1.5,
      );
      ctx.stroke();
    }

    // ── Foosball Table (recreation, col 8) ──────────────────────
    const [_fbTx, _fbTy] = getAdminPos("foosball", 8, ACT_ZONE_Y + 9);
    const [fbx, fby] = ts(_fbTx, _fbTy);
    const fbW = T * 3,
      fbH = T * 1.5;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 6;
    fillR(ctx, fbx, fby, fbW, fbH, "#1a5030");
    ctx.restore();
    fillR(ctx, fbx + 2, fby + 2, fbW - 4, fbH - 4, "#206038");
    fillR(ctx, fbx, fby, fbW, 3, "#2a6840");
    fillR(ctx, fbx, fby + fbH - 3, fbW, 3, "#103020");
    fillR(ctx, fbx, fby, 3, fbH, "#2a6840");
    fillR(ctx, fbx + fbW - 3, fby, 3, fbH, "#103020");
    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 2;
    for (let ri = 0; ri < 4; ri++) {
      const ry = fby + 8 + (ri * (fbH - 16)) / 3;
      ctx.beginPath();
      ctx.moveTo(fbx - 4, ry);
      ctx.lineTo(fbx + fbW + 4, ry);
      ctx.stroke();
      const playerCount = ri % 2 === 0 ? 3 : 2;
      const teamCol = ri < 2 ? "#e04040" : "#4040e0";
      for (let pi = 0; pi < playerCount; pi++) {
        const px = fbx + 10 + (pi * (fbW - 20)) / playerCount;
        fillR(ctx, px, ry - 4, 6, 8, teamCol);
        fillR(ctx, px + 1, ry - 6, 4, 3, "#f5c2a0");
      }
    }
    fillR(ctx, fbx - 2, fby + fbH * 0.3, 4, fbH * 0.4, "#404050");
    fillR(ctx, fbx + fbW - 2, fby + fbH * 0.3, 4, fbH * 0.4, "#404050");
    fillR(ctx, fbx + 4, fby + fbH, 4, 8, "#1a3020");
    fillR(ctx, fbx + fbW - 8, fby + fbH, 4, 8, "#1a3020");

    // ── DJ Console (recreation, col 20) ─────────────────────────
    const [_djTx, _djTy] = getAdminPos("dj_console", 20, ACT_ZONE_Y + 9);
    const [djx, djy] = ts(_djTx, _djTy);
    const djW = T * 2.5,
      djH = T * 1.2;
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    fillR(ctx, djx, djy, djW, djH, "#1a1a2a");
    ctx.restore();
    fillR(ctx, djx + 2, djy + 2, djW - 4, djH - 4, "#222234");
    ctx.fillStyle = "#303040";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a28";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.25, djy + djH * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#303040";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a28";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.75, djy + djH * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    fillR(ctx, djx + djW * 0.38, djy + 4, djW * 0.24, djH - 8, "#2a2a3c");
    fillR(ctx, djx + djW * 0.42, djy + 8, 3, djH - 16, "#505060");
    fillR(ctx, djx + djW * 0.52, djy + 10, 3, djH - 20, "#505060");
    ctx.fillStyle = "#7080a0";
    ctx.beginPath();
    ctx.arc(djx + djW * 0.43, djy + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(djx + djW * 0.53, djy + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#606070";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(djx - 4, djy + djH * 0.3, 6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillStyle = "#404050";
    ctx.beginPath();
    ctx.ellipse(djx - 4, djy + djH * 0.3 - 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(djx - 4, djy + djH * 0.3 + 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Hammock (recreation zone, col 29) ───────────────────────
    {
      const [_hmTx, _hmTy] = getAdminPos("hammock", 29, ACT_ZONE_Y + 11);
      const [hmx, hmy] = ts(_hmTx, _hmTy);
      drawHammock(ctx, hmx - T / 2, hmy + 4, globalTick);
    }
    // ── Jukebox (gaming room, col 25) ──────────────────────────
    {
      const [_jbTx, _jbTy] = getAdminPos("jukebox", 25, ACT_ZONE_Y + 9);
      const [jbx, jby] = ts(_jbTx, _jbTy);
      drawJukebox(ctx, jbx - T / 2, jby - 8, globalTick);
    }
    // ── Pinball Machine (gaming room, col 32 row ACT+9) ────────
    {
      const [_pbTx, _pbTy] = getAdminPos("pinball", 32, ACT_ZONE_Y + 9);
      const [pbmx, pbmy] = ts(_pbTx, _pbTy);
      drawPinballMachine(ctx, pbmx - T / 2 + 2, pbmy - 12, globalTick);
    }

    // ── Telescope (makers lab, col 23) ──────────────────────────
    const [_telTx, _telTy] = getAdminPos("telescope", 18, ACT_ZONE_Y + 14);
    const [telx, tely] = ts(_telTx, _telTy);
    ctx.strokeStyle = "#606070";
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
    fillR(ctx, -16, -4, 32, 8, "#404050");
    fillR(ctx, 14, -5, 6, 10, "#505060");
    fillR(ctx, -18, -3, 4, 6, "#505060");
    ctx.restore();
    ctx.fillStyle = "#303040";
    ctx.beginPath();
    ctx.arc(telx + T * 0.5 - 12, tely + T * 0.5 + 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Nap Pod (makers lab, col 22) — hi-tech sleep capsule ─────
    const [_napTx, _napTy] = getAdminPos("nap_pod", 22, ACT_ZONE_Y + 14);
    const [napx, napy] = ts(_napTx, _napTy);
    const napW = T * 2.5,
      napH = T * 1.2;
    // Pod shell (oval/capsule shape)
    ctx.save();
    ctx.shadowColor = "#2060c060";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#1a2840";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2 + 4,
      napW / 2 + 2,
      napH / 2 + 4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#243858";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2 + 2,
      napW / 2,
      napH / 2 + 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Pod top highlight (gloss)
    ctx.fillStyle = "#2e4870";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2,
      napW / 2 - 2,
      napH / 2 - 2,
      0,
      -Math.PI * 0.8,
      -Math.PI * 0.1,
    );
    ctx.fill();
    // Visor window (blue-tinted oval)
    ctx.fillStyle = "#0a1828";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2 + 2,
      napW / 2 - 6,
      napH / 2 - 3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#0d2040";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2,
      napW / 2 - 8,
      napH / 2 - 5,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Interior glow (pulsing blue)
    ctx.fillStyle = "#1040a0";
    ctx.beginPath();
    ctx.ellipse(
      napx + napW / 2,
      napy + napH / 2,
      napW / 2 - 10,
      napH / 2 - 7,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Status strip (right side of pod)
    fillR(ctx, napx + napW - 6, napy + 6, 4, napH, "#182030");
    fillR(ctx, napx + napW - 5, napy + 8, 2, 4, "#40a0ff");
    fillR(ctx, napx + napW - 5, napy + 14, 2, 4, "#4060ff");
    // Base/stand
    fillR(ctx, napx + 4, napy + napH + 6, napW - 8, 5, "#182030");
    fillR(ctx, napx + napW / 2 - 8, napy + napH + 4, 16, 8, "#101828");
    // Label
    ctx.fillStyle = "#2ac3de";
    ctx.font = "5px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NAP", napx + napW / 2, napy + napH + 18);
    ctx.textAlign = "left";
  }

  // ════ Activity zone ═══════════════════════════════════════════
  if (ACT_ZONE_Y > 0) {
    // Zone divider wall (lounge → activity) with door opening in center
    const [zx, zy] = ts(1, ACT_ZONE_Y);
    const zoneW = (COLS - 2) * T;
    const doorStart = Math.floor(zoneW * 0.35),
      doorEnd = Math.floor(zoneW * 0.65);
    // Left wall segment (thin floor divider)
    fillR(ctx, zx, zy + Math.floor(T / 2) - 2, doorStart, 5, "#252344");
    fillR(ctx, zx, zy + Math.floor(T / 2) - 2, doorStart, 2, "#3a3860");
    // Right wall segment (thin floor divider)
    fillR(
      ctx,
      zx + doorEnd,
      zy + Math.floor(T / 2) - 2,
      zoneW - doorEnd,
      5,
      "#252344",
    );
    fillR(
      ctx,
      zx + doorEnd,
      zy + Math.floor(T / 2) - 2,
      zoneW - doorEnd,
      2,
      "#3a3860",
    );

    // ── GYM (left side) ──────────────────────────────────────────
    const [_gymTx, _gymTy] = getAdminPos("gym", 1, ACT_ZONE_Y + 0.5);
    const [gx, gy] = ts(_gymTx, _gymTy);

    // Treadmill 1
    const [t1x, t1y] = ts(_gymTx, _gymTy + 0.3);
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 5;
    fillR(ctx, t1x + 2, t1y + 8, T * 1.2, T * 0.7, "#282840");
    ctx.restore();
    fillR(ctx, t1x + 4, t1y + 10, T * 1.2 - 4, T * 0.35, "#1a1a2e");
    fillR(ctx, t1x + 4, t1y + 10, T * 1.2 - 4, T * 0.35, "#3a3060"); // belt tint
    fillR(ctx, t1x + 2, t1y + 6, 8, 4, "#404058"); // control panel
    fillR(ctx, t1x + 3, t1y + 7, 6, 2, SCREEN_C);
    fillR(ctx, t1x + 4, t1y + 7, 2, 1, "#9ece6a");
    // legs/frame
    fillR(ctx, t1x + 4, t1y + T * 0.7 + 10, 4, 8, "#1e1e30");
    fillR(ctx, t1x + T * 1.2, t1y + T * 0.7 + 10, 4, 8, "#1e1e30");

    // Treadmill 2
    const [t2x, t2y] = ts(_gymTx + 3, _gymTy + 0.3);
    fillR(ctx, t2x + 2, t2y + 8, T * 1.2, T * 0.7, "#282840");
    fillR(ctx, t2x + 4, t2y + 10, T * 1.2 - 4, T * 0.35, "#3a3060");
    fillR(ctx, t2x + 2, t2y + 6, 8, 4, "#404058");
    fillR(ctx, t2x + 3, t2y + 7, 6, 2, SCREEN_C);
    fillR(ctx, t2x + 4, t2y + 7, 2, 1, "#7aa2f7");
    fillR(ctx, t2x + 4, t2y + T * 0.7 + 10, 4, 8, "#1e1e30");
    fillR(ctx, t2x + T * 1.2, t2y + T * 0.7 + 10, 4, 8, "#1e1e30");

    // ── Dumbbell Rack (below treadmill 1) ──
    const [drx, dry] = ts(_gymTx, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    // Rack frame
    fillR(ctx, drx, dry, T * 2, T * 0.8, "#3a3020");
    ctx.restore();
    fillR(ctx, drx + 2, dry + 2, T * 2 - 4, T * 0.8 - 4, "#4a4030");
    // Shelf divider
    fillR(ctx, drx + 2, dry + Math.floor(T * 0.4), T * 2 - 4, 2, "#5a5040");
    // Top shelf dumbbells (3)
    // Dumbbell 1 (small, iron)
    fillR(ctx, drx + 6, dry + 6, 4, 4, "#404050");
    fillR(ctx, drx + 4, dry + 7, 2, 2, "#404050");
    fillR(ctx, drx + 12, dry + 7, 2, 2, "#404050");
    // Dumbbell 2 (medium, chrome)
    fillR(ctx, drx + 20, dry + 5, 6, 4, "#606070");
    fillR(ctx, drx + 17, dry + 6, 3, 3, "#606070");
    fillR(ctx, drx + 26, dry + 6, 3, 3, "#606070");
    // Dumbbell 3 (small, dark)
    fillR(ctx, drx + 36, dry + 6, 4, 4, "#353545");
    fillR(ctx, drx + 34, dry + 7, 2, 2, "#353545");
    fillR(ctx, drx + 42, dry + 7, 2, 2, "#353545");
    // Bottom shelf dumbbells (3)
    const bsy = dry + Math.floor(T * 0.4) + 4;
    // Dumbbell 4 (big, iron)
    fillR(ctx, drx + 5, bsy + 2, 8, 4, "#404050");
    fillR(ctx, drx + 3, bsy + 1, 3, 5, "#505060");
    fillR(ctx, drx + 13, bsy + 1, 3, 5, "#505060");
    // Dumbbell 5 (big, chrome)
    fillR(ctx, drx + 22, bsy + 2, 8, 4, "#606070");
    fillR(ctx, drx + 20, bsy + 1, 3, 5, "#707080");
    fillR(ctx, drx + 30, bsy + 1, 3, 5, "#707080");
    // Dumbbell 6 (medium, dark)
    fillR(ctx, drx + 38, bsy + 2, 6, 4, "#353545");
    fillR(ctx, drx + 36, bsy + 1, 2, 5, "#454555");
    fillR(ctx, drx + 44, bsy + 1, 2, 5, "#454555");

    // ── Bench Press (below treadmill 2) ──
    const [bpx, bpy] = ts(_gymTx + 3, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    // Bench pad
    fillR(ctx, bpx + 8, bpy + 6, T * 1.4, T * 0.35, "#3a3040");
    ctx.restore();
    fillR(ctx, bpx + 10, bpy + 8, T * 1.4 - 4, T * 0.35 - 4, "#4a3858");
    // Bench legs
    fillR(ctx, bpx + 10, bpy + T * 0.35 + 6, 4, 6, "#2a2a3a");
    fillR(ctx, bpx + T * 1.4 + 2, bpy + T * 0.35 + 6, 4, 6, "#2a2a3a");
    // Uprights
    fillR(ctx, bpx + 4, bpy - 6, 3, 18, "#606070");
    fillR(ctx, bpx + T * 1.4 + 12, bpy - 6, 3, 18, "#606070");
    // Upright hooks
    fillR(ctx, bpx + 3, bpy - 2, 5, 2, "#707080");
    fillR(ctx, bpx + T * 1.4 + 11, bpy - 2, 5, 2, "#707080");
    // Barbell bar
    fillR(ctx, bpx, bpy, T * 1.8, 2, "#808090");
    // Weight plates (left)
    ctx.fillStyle = "#404050";
    ctx.beginPath();
    ctx.ellipse(bpx + 3, bpy + 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#353545";
    ctx.beginPath();
    ctx.ellipse(bpx + 7, bpy + 1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Weight plates (right)
    ctx.fillStyle = "#404050";
    ctx.beginPath();
    ctx.ellipse(bpx + T * 1.8 - 3, bpy + 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#353545";
    ctx.beginPath();
    ctx.ellipse(bpx + T * 1.8 - 7, bpy + 1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Punching Bag (right of treadmills) ──
    const [pbx, pby] = ts(_gymTx + 6, _gymTy + 0.5);
    // Chain from ceiling
    ctx.strokeStyle = "#808090";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pbx + 10, pby - 16);
    ctx.lineTo(pbx + 10, pby);
    ctx.stroke();
    // Mounting bracket
    fillR(ctx, pbx + 6, pby - 16, 8, 3, "#505060");
    // Bag body
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#a03020";
    ctx.beginPath();
    ctx.ellipse(pbx + 10, pby + 16, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Bag highlight
    ctx.fillStyle = "#b8402e";
    ctx.beginPath();
    ctx.ellipse(pbx + 8, pby + 12, 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bag bottom cap
    fillR(ctx, pbx + 6, pby + 32, 8, 3, "#802818");
    // Shadow below
    ctx.fillStyle = "#00000030";
    ctx.beginPath();
    ctx.ellipse(pbx + 10, pby + 40, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Exercise Bike (right of bench press) ──
    const [ebx, eby] = ts(_gymTx + 6, _gymTy + 2.5);
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    // Bike frame base
    fillR(ctx, ebx + 2, eby + T * 0.8, T * 1.2, 4, "#303040");
    ctx.restore();
    // Front leg
    fillR(ctx, ebx + 2, eby + T * 0.8 + 4, 4, 8, "#303040");
    // Rear leg
    fillR(ctx, ebx + T * 1.2 - 2, eby + T * 0.8 + 4, 4, 8, "#303040");
    // Seat post
    fillR(ctx, ebx + T * 0.8, eby + T * 0.2, 3, T * 0.6, "#505060");
    // Seat
    fillR(ctx, ebx + T * 0.8 - 4, eby + T * 0.2 - 2, 12, 4, "#2a2a3a");
    fillR(ctx, ebx + T * 0.8 - 3, eby + T * 0.2 - 3, 10, 3, "#3a3a4a");
    // Handlebar post
    fillR(ctx, ebx + 6, eby + T * 0.1, 3, T * 0.7, "#505060");
    // Handlebars
    fillR(ctx, ebx + 2, eby + T * 0.1 - 2, 14, 3, "#606070");
    fillR(ctx, ebx + 2, eby + T * 0.1 - 2, 3, 6, "#606070");
    fillR(ctx, ebx + 13, eby + T * 0.1 - 2, 3, 6, "#606070");
    // Display panel
    fillR(ctx, ebx + 5, eby + T * 0.1 - 8, 8, 6, "#101828");
    fillR(ctx, ebx + 6, eby + T * 0.1 - 7, 6, 4, SCREEN_C);
    fillR(ctx, ebx + 7, eby + T * 0.1 - 6, 2, 1, "#7aa2f7");
    // Wheel
    ctx.strokeStyle = "#404050";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ebx + 8, eby + T * 0.8 - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Pedals
    fillR(ctx, ebx + 4, eby + T * 0.8 - 4, 3, 3, "#505060");
    fillR(ctx, ebx + 11, eby + T * 0.8 - 4, 3, 3, "#505060");

    // ── Yoga Mat with Props (below dumbbells) ──
    const [ymx, ymy] = ts(_gymTx + 0.5, _gymTy + 4);
    ctx.save();
    ctx.shadowColor = "#00000040";
    ctx.shadowBlur = 4;
    // Mat
    fillR(ctx, ymx, ymy, T * 2.5, T * 0.5, "#2a6838");
    ctx.restore();
    // Mat border/edge highlight
    fillR(ctx, ymx, ymy, T * 2.5, 2, "#358045");
    fillR(ctx, ymx, ymy + T * 0.5 - 2, T * 2.5, 2, "#1e5528");
    // Texture lines on mat
    fillR(ctx, ymx + 8, ymy + 4, T * 2.5 - 16, 1, "#2e7040");
    fillR(ctx, ymx + 8, ymy + T * 0.25, T * 2.5 - 16, 1, "#2e7040");
    fillR(ctx, ymx + 8, ymy + T * 0.5 - 6, T * 2.5 - 16, 1, "#2e7040");
    // Yoga block (purple, on right end of mat)
    fillR(ctx, ymx + T * 2.5 - 14, ymy + 2, 10, T * 0.5 - 4, "#6a3088");
    fillR(ctx, ymx + T * 2.5 - 13, ymy + 3, 8, T * 0.5 - 6, "#7a40a0");
    // Water bottle (next to mat)
    fillR(ctx, ymx + T * 2.5 + 4, ymy + T * 0.25 - 8, 6, 16, "#4090c0");
    fillR(ctx, ymx + T * 2.5 + 5, ymy + T * 0.25 - 8, 4, 4, "#50a0d0");
    // Bottle cap
    fillR(ctx, ymx + T * 2.5 + 5, ymy + T * 0.25 - 10, 4, 3, "#305870");

    // ── Rowing Ergometer (right of yoga mat) ──
    const [_rowTx, _rowTy] = getAdminPos(
      "rowing_machine",
      _gymTx + 4,
      _gymTy + 3.8,
    );
    const [rwx, rwy] = ts(_rowTx, _rowTy);
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    // Main rail/monorail
    fillR(ctx, rwx + 2, rwy + T * 0.65, T * 1.6, 4, "#303040");
    ctx.restore();
    // Side rails
    fillR(ctx, rwx + 2, rwy + T * 0.55, 4, 14, "#404050");
    fillR(ctx, rwx + T * 1.6 - 2, rwy + T * 0.55, 4, 14, "#404050");
    // Seat (slides along rail)
    fillR(ctx, rwx + T * 0.6, rwy + T * 0.5, 10, 6, "#3a3050");
    fillR(ctx, rwx + T * 0.6 + 1, rwy + T * 0.5 - 1, 8, 4, "#4a4068");
    // Footplate
    fillR(ctx, rwx + 4, rwy + T * 0.3, 14, 12, "#2a3048");
    fillR(ctx, rwx + 5, rwy + T * 0.3 + 2, 6, 3, "#3a4058"); // left strap
    fillR(ctx, rwx + 5, rwy + T * 0.3 + 7, 6, 3, "#3a4058"); // right strap
    // Handle/chain housing
    fillR(ctx, rwx + 2, rwy + T * 0.2, 6, T * 0.45, "#252535");
    fillR(ctx, rwx + 3, rwy + T * 0.22, 4, T * 0.41, "#303045");
    // Chain (dotted)
    ctx.fillStyle = "#707080";
    for (let ci = 0; ci < 5; ci++)
      ctx.fillRect(rwx + 8 + ci * 4, rwy + T * 0.4, 2, 2);
    // Pull handle
    fillR(ctx, rwx + T * 1.1, rwy + T * 0.38, 8, 3, "#808090");
    fillR(ctx, rwx + T * 1.1, rwy + T * 0.34, 4, 6, "#707080");
    fillR(ctx, rwx + T * 1.1 + 4, rwy + T * 0.34, 4, 6, "#707080");
    // Display monitor
    fillR(ctx, rwx + 2, rwy, 8, T * 0.2, "#0d1a2a");
    fillR(ctx, rwx + 3, rwy + 2, 6, T * 0.2 - 4, SCREEN_C);
    fillR(ctx, rwx + 4, rwy + 3, 2, 1, "#7aa2f7");
    fillR(ctx, rwx + 7, rwy + 3, 1, 1, "#9ece6a");
    // Leg shadow
    ctx.fillStyle = "#00000030";
    ctx.beginPath();
    ctx.ellipse(rwx + T * 0.8, rwy + T * 0.75, T * 0.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── GAMING/TV ZONE (center) ──────────────────────────────────
    const [_tvATx, _tvATy] = getAdminPos("tv", 10, ACT_ZONE_Y + 0.3);
    const [tvx, tvy] = ts(_tvATx, _tvATy);

    // Big TV (wall-mounted look)
    ctx.save();
    ctx.shadowColor = "#0050ff30";
    ctx.shadowBlur = 20;
    fillR(ctx, tvx, tvy, T * 4, T * 2.5, "#0a0a18");
    ctx.restore();
    fillR(ctx, tvx + 4, tvy + 4, T * 4 - 8, T * 2.5 - 8, SCREEN_C);
    // TV screen content (colorful game)
    fillR(ctx, tvx + 6, tvy + 6, T * 4 - 14, 8, "#0d1a3a"); // sky
    fillR(ctx, tvx + 6, tvy + T * 2.5 - 14, T * 4 - 14, 8, "#1a3a10"); // ground
    // pixel character on screen
    fillR(ctx, tvx + 12, tvy + 10, 6, 8, "#f7768e"); // game char
    fillR(ctx, tvx + 13, tvy + 8, 4, 4, "#f5c2a0"); // head
    // score
    ctx.fillStyle = "#9ece6a";
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.fillText("SCORE:9999", tvx + T * 2 + 4, tvy + 10);
    // TV stand
    fillR(ctx, tvx + T * 2 - 4, tvy + T * 2.5, 8, 6, "#181828");
    fillR(ctx, tvx + T * 2 - 10, tvy + T * 2.5 + 6, 20, 4, "#1e1e30");

    // Console unit (relative to TV position)
    const [cx2, cy2] = ts(_tvATx + 1, _tvATy + 2.7);
    fillR(ctx, cx2, cy2, T * 1.2, T * 0.4, "#1a1a2e");
    fillR(ctx, cx2 + 2, cy2 + 2, T * 1.2 - 4, T * 0.4 - 4, "#22223a");
    fillR(ctx, cx2 + 4, cy2 + 4, 8, 4, "#0d0d1a"); // disk slot
    fillR(ctx, cx2 + T * 1.2 - 12, cy2 + 4, 6, 6, "#3a3a60"); // power button area
    fillR(ctx, cx2 + T * 1.2 - 10, cy2 + 5, 4, 4, "#404060");
    ctx.fillStyle = "#9ece6a80";
    ctx.beginPath();
    ctx.arc(cx2 + T * 1.2 - 8, cy2 + 7, 2, 0, Math.PI * 2);
    ctx.fill();

    // Gaming sofa (3-seat, independent from TV) — flipped: back at bottom
    const [_gsATx, _gsATy] = getAdminPos("gaming_sofa", 11, ACT_ZONE_Y + 3.7);
    const [sfx, sfy] = ts(_gsATx, _gsATy);
    const sfH = T * 0.7 + 10;
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 8;
    fillR(ctx, sfx, sfy, T * 4, sfH, COUCH_C);
    ctx.restore();
    // Seat cushions (top part)
    fillR(ctx, sfx, sfy, T * 4, T * 0.7, COUCH_SEAT);
    fillR(ctx, sfx + 3, sfy + 3, T * 4 - 6, T * 0.7 - 6, COUCH_HI);
    // Back rest (bottom part)
    fillR(ctx, sfx, sfy + T * 0.7, T * 4, 10, COUCH_C);
    fillR(ctx, sfx + 2, sfy + T * 0.7 + 1, T * 4 - 4, 8, "#4a3880");
    // Armrests
    fillR(ctx, sfx, sfy, 9, sfH, COUCH_C);
    fillR(ctx, sfx + T * 4 - 9, sfy, 9, sfH, COUCH_C);
    // Section dividers
    fillR(ctx, sfx + T - 1, sfy, 2, T * 0.7, "#382860");
    fillR(ctx, sfx + T * 2 - 1, sfy, 2, T * 0.7, "#382860");
    fillR(ctx, sfx + T * 3 - 1, sfy, 2, T * 0.7, "#382860");

    // ── PING PONG TABLE (right-center) ──────────────────────────
    const ppX2 = Math.min(19, COLS - 8);
    const [_ppATx, _ppATy] = getAdminPos(
      "pingpong",
      ppX2 - 2,
      ACT_ZONE_Y + 1.5,
    );
    const [ppx, ppy] = ts(_ppATx, _ppATy);

    // Table surface (no floating text)
    const ppW = T * 6,
      ppH = T * 1.5;
    ctx.save();
    ctx.shadowColor = "#00000080";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    fillR(ctx, ppx, ppy, ppW, ppH, "#164028");
    ctx.restore();
    // Surface with border
    fillR(ctx, ppx + 2, ppy + 2, ppW - 4, ppH - 4, "#1d7040");
    // Table border stripe (white)
    ctx.strokeStyle = "#ffffffcc";
    ctx.lineWidth = 2;
    ctx.strokeRect(ppx + 4, ppy + 4, ppW - 8, ppH - 8);
    // Center line (vertical)
    fillR(ctx, ppx + ppW / 2 - 1, ppy + 4, 2, ppH - 8, "#ffffffb0");
    // Side edge highlights
    fillR(ctx, ppx, ppy, ppW, 3, "#30a060"); // top edge highlight
    fillR(ctx, ppx, ppy + ppH - 3, ppW, 3, "#0d3020"); // bottom shadow
    fillR(ctx, ppx, ppy, 3, ppH, "#30a060"); // left edge
    fillR(ctx, ppx + ppW - 3, ppy, 3, ppH, "#0d3020"); // right edge
    // Net posts
    ctx.fillStyle = "#808890";
    ctx.fillRect(ppx + ppW / 2 - 2, ppy - 8, 4, 10); // left post above table
    ctx.fillRect(ppx + ppW / 2 - 2, ppy + ppH - 2, 4, 10); // right post below table
    ctx.fillStyle = "#a0a8b8";
    ctx.fillRect(ppx + ppW / 2 - 1, ppy - 7, 2, 8);
    // Net mesh (white stripes between posts)
    ctx.fillStyle = "#ffffffd0";
    ctx.fillRect(ppx + ppW / 2 - 2, ppy, 4, 3); // top of net
    ctx.fillStyle = "#ffffff80";
    for (let ni = 1; ni < 6; ni++) {
      ctx.fillRect(ppx + ppW / 2 - 1, ppy + ni * (ppH / 6), 2, 1);
    }
    ctx.fillStyle = "#ffffffd0";
    ctx.fillRect(ppx + ppW / 2 - 2, ppy + ppH - 3, 4, 3);
    // Table legs (4 legs with cross bar)
    const legH = T * 0.55;
    ctx.fillStyle = "#0e2818";
    ctx.fillRect(ppx + 6, ppy + ppH, 5, legH);
    ctx.fillRect(ppx + ppW - 11, ppy + ppH, 5, legH);
    ctx.fillRect(ppx + 6, ppy + ppH + legH, ppW - 12, 4);
    // Paddles resting on table edges
    const drawPaddle = (ex, ey, color) => {
      ctx.fillStyle = "#2a1808";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 5, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color + "88";
      ctx.beginPath();
      ctx.ellipse(ex - 1, ey - 1, 2, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawPaddle(ppx + 14, ppy + ppH / 2, "#e03030");
    drawPaddle(ppx + ppW - 14, ppy + ppH / 2, "#3030e0");
  }

  // ── Cat bowls (structure only — contents drawn dynamically) ──────
  for (const bowl of CAT_BOWLS) {
    const [bx, by] = ts(bowl.tx, bowl.ty);
    const isWater = bowl.type === "water";
    const rimOuter = isWater ? "#2860c0" : "#c04878";
    const rimInner = isWater ? "#4090e8" : "#e060a0";
    const rimFloor = isWater ? "#3070d0" : "#d05090";
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
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
    ctx.font = "7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isWater ? "💧" : "🐾", bx + T / 2, by + T * 0.28);
    ctx.textAlign = "left";
  }
}

// Draw cat bowls dynamically (food/water appears/disappears)
function drawCatBowls(ctx, tick) {
  for (const bowl of CAT_BOWLS) {
    const cx = OX + bowl.tx * T + T / 2;
    const cy = OY + bowl.ty * T + T * 0.58; // bowl center Y
    if (bowl.type === "food") {
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
          ctx.fillStyle = "#c06010";
          ctx.beginPath();
          ctx.ellipse(cx + kx, cy + ky, 3, 2.2, kx * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e8902a";
          ctx.beginPath();
          ctx.ellipse(
            cx + kx - 0.5,
            cy + ky - 0.5,
            2,
            1.5,
            kx * 0.3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else {
        // Empty — faint reflection inside bowl
        ctx.fillStyle = "rgba(180,80,120,0.3)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // "empty" text hint
        ctx.fillStyle = "#ffffff50";
        ctx.font = "5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("…", cx, cy + 1);
        ctx.textAlign = "left";
      }
    } else {
      // Water bowl
      if (bowl.hasFod) {
        // Animated water — blue fill with ripple
        ctx.fillStyle = "#2a80e880";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Water surface ripples
        const phase = (tick * 0.05) % (Math.PI * 2);
        ctx.strokeStyle = "#60c0ff90";
        ctx.lineWidth = 1;
        for (let r = 0; r < 2; r++) {
          const rp = phase + r * Math.PI;
          const rw = 3 + Math.sin(rp) * 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rw, rw * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Highlight glint
        ctx.fillStyle = "#ffffff70";
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 1, 2, 1, -0.3, 0, Math.PI);
        ctx.fill();
      } else {
        // Empty water — dry bowl
        ctx.fillStyle = "rgba(40,100,180,0.2)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff40";
        ctx.font = "5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("…", cx, cy + 1);
        ctx.textAlign = "left";
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  DYNAMIC EFFECTS  (monitor glow, animated light shafts, coffee steam)
// ════════════════════════════════════════════════════════════════
function drawDynamicEffects(ctx, tick) {
  // Animated monitor content + glow for working agents
  for (const [id, sp] of Object.entries(agentStates)) {
    if (!sp.arrived || !sp.isWorking || sp.state === "walking") continue;
    const def = DESK_DEFS[Math.min(sp.slotIdx, DESK_DEFS.length - 1)];
    if (!def) continue;
    const [dx, dy] = ts(def.tx, def.ty);
    const W = T * 2;
    const sx = dx + W / 2 - 9,
      sy = dy + 8;
    ctx.save();
    // Bright code lines on screen
    const lineC = ["#7aa2f7", "#9ece6a", "#bb9af7", "#ff9e64", "#2ac3de"];
    for (let li = 0; li < 4; li++) {
      const lw = 4 + (((tick * 0.4 + li * 6 + sp.slotIdx * 4) | 0) % 16);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = lineC[(li + ((tick / 20) | 0)) % lineC.length];
      ctx.fillRect(sx + 1, sy + li * 3, lw, 2);
    }
    // Cursor blink
    if ((tick >> 3) & 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      const lw = 4 + (((tick * 0.4 + 3 * 6 + sp.slotIdx * 4) | 0) % 16);
      ctx.fillRect(sx + 1 + lw, sy + 9, 2, 2);
    }
    // Screen glow — bright halo around desk
    ctx.globalAlpha = 0.12 + Math.sin(tick * 0.04) * 0.04;
    const g = ctx.createRadialGradient(sx + 11, sy + 7, 0, sx + 11, sy + 7, 50);
    g.addColorStop(0, sp.palette.accent);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(sx - 30, sy - 20, 82, 70);
    ctx.restore();
  }

  // Animated window light shafts — more visible
  for (let i = 0; i < 4; i++) {
    const wx = OX + (3 + i * 6) * T + 4,
      wy = OY + 5;
    const alpha = 0.07 + Math.sin(tick * 0.012 + i * 2.1) * 0.025;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffe8a0";
    ctx.beginPath();
    ctx.moveTo(wx, wy + T - 10);
    ctx.lineTo(wx + T - 8, wy + T - 10);
    ctx.lineTo(wx + T + 6, wy + T * 3.5);
    ctx.lineTo(wx - 14, wy + T * 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Kitchen appliance animations (steam, water, microwave glow) ──
  if (ROWS > 6 && KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1;
    const [_kcTx2, _kcTy2] = getAdminPos(
      "kitchen_counter",
      kitIntX,
      KITCHEN_START_ROW,
    );
    const [kx2, ky2] = ts(_kcTx2, _kcTy2);

    // Coffee steam particles (always rising gently)
    const steamX = kx2 + 17,
      steamBaseY = ky2 - 28;
    ctx.save();
    for (let si = 0; si < 4; si++) {
      const phase = tick * 0.06 + si * 1.8;
      const sy2 = steamBaseY - ((tick * 0.3 + si * 8) % 18);
      const sx2 = steamX + Math.sin(phase) * 2;
      const sa = 0.35 - ((tick * 0.3 + si * 8) % 18) / 50;
      if (sa > 0) {
        ctx.globalAlpha = sa;
        ctx.fillStyle = "#d0d8e8";
        ctx.fillRect(sx2 | 0, sy2 | 0, 2, 2);
      }
    }
    ctx.restore();

    // Microwave interior glow (subtle pulse)
    const mgx = kx2 + T + 12,
      mgy = ky2 - 17;
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(tick * 0.08) * 0.04;
    const mg = ctx.createRadialGradient(mgx, mgy, 0, mgx, mgy, 10);
    mg.addColorStop(0, "#40a0ff");
    mg.addColorStop(1, "transparent");
    ctx.fillStyle = mg;
    ctx.fillRect(mgx - 10, mgy - 8, 20, 16);
    ctx.restore();

    // Sink water drops (intermittent dripping)
    const wdx = kx2 + T * 7 + T - 6,
      wdy = ky2 - 10;
    ctx.save();
    const drip = tick % 80;
    if (drip < 30) {
      const dy = drip * 0.4;
      ctx.globalAlpha = 0.6 - drip * 0.015;
      ctx.fillStyle = "#80c0e0";
      ctx.fillRect(wdx | 0, (wdy + dy) | 0, 1, 2);
    }
    // Tiny splash at bottom
    if (drip > 25 && drip < 35) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#80c0e0";
      ctx.fillRect((wdx - 1) | 0, (wdy + 12) | 0, 1, 1);
      ctx.fillRect((wdx + 1) | 0, (wdy + 11) | 0, 1, 1);
    }
    ctx.restore();
  }

  // ── Printer LED blink (always-on idle animation) ──────────────
  if (KITCHEN_WALL_COL > 0 && KITCHEN_START_ROW > 0) {
    const [_prBlinkTx, _prBlinkTy] = getAdminPos(
      "printer",
      KITCHEN_WALL_COL - 3,
      KITCHEN_START_ROW - 2,
    );
    const [prBx, prBy] = ts(_prBlinkTx, _prBlinkTy);
    const ledX = prBx + T * 1.6 - 4,
      ledY = prBy + 7;
    const blink = Math.sin(tick * 0.08) > 0.3;
    ctx.save();
    if (blink) {
      ctx.globalAlpha = 0.9 + Math.sin(tick * 0.08) * 0.1;
      ctx.fillStyle = "#9ece6a";
      ctx.beginPath();
      ctx.arc(ledX, ledY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.15 + Math.sin(tick * 0.08) * 0.1;
      const prGlow = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, 8);
      prGlow.addColorStop(0, "#9ece6a");
      prGlow.addColorStop(1, "transparent");
      ctx.fillStyle = prGlow;
      ctx.fillRect(ledX - 8, ledY - 8, 16, 16);
    } else {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#3a5a1a";
      ctx.beginPath();
      ctx.arc(ledX, ledY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Espresso bar steam (makers lab) ──────────────────────────
  if (ACT_ZONE_Y > 0) {
    const [_espStTx, _espStTy] = getAdminPos(
      "espresso_bar",
      13,
      ACT_ZONE_Y + 14,
    );
    const [espStX, espStY] = ts(_espStTx, _espStTy);
    ctx.save();
    for (let si = 0; si < 3; si++) {
      const phase = tick * 0.05 + si * 2.1;
      const sRise = (tick * 0.25 + si * 9) % 20;
      const sx3 = espStX + T * 1.5 - 5 + Math.sin(phase) * 2;
      const sy3 = espStY - 14 - sRise;
      const sa3 = 0.3 - sRise / 65;
      if (sa3 > 0) {
        ctx.globalAlpha = sa3;
        ctx.fillStyle = "#c8d0e0";
        ctx.fillRect(sx3 | 0, sy3 | 0, 2, 2);
      }
    }
    ctx.restore();
  }

  // ── Corkboard (main office, top wall) ────────────────────────
  {
    const [_cbTx, _cbTy] = getAdminPos("corkboard", 10.5, 0);
    const [cbx, cby] = ts(_cbTx, _cbTy);
    const cbW = T * 2.5,
      cbH = T * 1.6;
    // Frame
    ctx.save();
    ctx.shadowColor = "#00000070";
    ctx.shadowBlur = 5;
    fillR(ctx, cbx - 3, cby - 3, cbW + 6, cbH + 6, "#4a3010");
    ctx.restore();
    // Cork surface
    fillR(ctx, cbx, cby, cbW, cbH, "#c88840");
    // Cork texture dots
    ctx.fillStyle = "#b07830";
    const dotPat = [
      [4, 3],
      [14, 8],
      [26, 5],
      [38, 11],
      [50, 4],
      [62, 9],
      [74, 3],
      [86, 7],
      [96, 12],
      [8, 15],
      [20, 19],
      [32, 14],
      [44, 20],
      [56, 16],
      [68, 22],
      [80, 17],
      [92, 21],
      [6, 28],
      [18, 24],
      [30, 30],
      [42, 26],
      [54, 31],
      [66, 25],
    ];
    for (const [dx, dy] of dotPat)
      if (dx < cbW && dy < cbH) ctx.fillRect(cbx + dx, cby + dy, 2, 2);
    // Sticky notes
    const notes = [
      { x: 3, y: 3, w: 22, h: 18, col: "#f7e468", lines: ["TODO", "fix"] },
      { x: 28, y: 3, w: 22, h: 18, col: "#f7a8c8", lines: ["SHIP", "it!"] },
      { x: 53, y: 3, w: 22, h: 18, col: "#a8d8f7", lines: ["PR", "#42"] },
      { x: 3, y: 26, w: 22, h: 18, col: "#b8f7a8", lines: ["DONE", "ok"] },
      { x: 28, y: 26, w: 22, h: 18, col: "#f7c8a8", lines: ["IDEA", "v2"] },
      { x: 53, y: 26, w: 22, h: 18, col: "#d8a8f7", lines: ["MTG", "10am"] },
    ];
    for (const n of notes) {
      if (n.x + n.w > cbW || n.y + n.h > cbH) continue;
      // Note shadow
      ctx.fillStyle = "#00000025";
      ctx.fillRect(cbx + n.x + 2, cby + n.y + 2, n.w, n.h);
      // Note body
      ctx.fillStyle = n.col;
      ctx.fillRect(cbx + n.x, cby + n.y, n.w, n.h);
      // Note fold corner
      ctx.fillStyle = n.col + "99";
      ctx.beginPath();
      ctx.moveTo(cbx + n.x + n.w - 6, cby + n.y);
      ctx.lineTo(cbx + n.x + n.w, cby + n.y + 6);
      ctx.lineTo(cbx + n.x + n.w, cby + n.y);
      ctx.fill();
      // Note text lines
      ctx.fillStyle = "#0000008a";
      ctx.font = "3px monospace";
      ctx.textAlign = "left";
      ctx.fillText(n.lines[0], cbx + n.x + 3, cby + n.y + 8);
      if (n.lines[1]) ctx.fillText(n.lines[1], cbx + n.x + 3, cby + n.y + 15);
      // Push pin
      ctx.fillStyle = "#cc3030";
      ctx.beginPath();
      ctx.arc(cbx + n.x + n.w / 2, cby + n.y + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ee5050";
      ctx.beginPath();
      ctx.arc(cbx + n.x + n.w / 2 - 0.5, cby + n.y + 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Board label
    ctx.fillStyle = "#2a1808";
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPRINT BOARD", cbx + cbW / 2, cby + cbH - 3);
    ctx.textAlign = "left";
  }

  // ── Whiteboard (main office, top wall) ───────────────────────
  {
    const [_wbTx, _wbTy] = getAdminPos("whiteboard", 17, 0);
    const [wbx, wby] = ts(_wbTx, _wbTy);
    const wbW = T * 3,
      wbH = T * 1.6;
    // Metal frame / shadow
    ctx.save();
    ctx.shadowColor = "#00000060";
    ctx.shadowBlur = 5;
    fillR(ctx, wbx - 3, wby - 3, wbW + 6, wbH + 6, "#606070");
    ctx.restore();
    // Frame inner
    fillR(ctx, wbx - 1, wby - 1, wbW + 2, wbH + 2, "#808090");
    // White surface
    fillR(ctx, wbx, wby, wbW, wbH, "#f0f0f5");
    // Subtle horizontal lines (ruled guide)
    ctx.strokeStyle = "#e0e0ea";
    ctx.lineWidth = 0.5;
    for (let ly = 8; ly < wbH - 4; ly += 8) {
      ctx.beginPath();
      ctx.moveTo(wbx + 3, wby + ly);
      ctx.lineTo(wbx + wbW - 3, wby + ly);
      ctx.stroke();
    }
    // Chalk scribbles — equations and diagrams
    ctx.strokeStyle = "#3060c0";
    ctx.lineWidth = 1.5;
    // Arrow diagram
    ctx.beginPath();
    ctx.moveTo(wbx + 6, wby + 12);
    ctx.lineTo(wbx + 18, wby + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wbx + 15, wby + 9);
    ctx.lineTo(wbx + 18, wby + 12);
    ctx.lineTo(wbx + 15, wby + 15);
    ctx.stroke();
    // Box
    ctx.strokeRect(wbx + 22, wby + 6, 14, 12);
    // Text: f(x)
    ctx.fillStyle = "#1840a0";
    ctx.font = "bold 5px monospace";
    ctx.fillText("f(x)", wbx + 24, wby + 15);
    // Equals sign + result
    ctx.fillStyle = "#3060c0";
    ctx.fillText("= O(n²)", wbx + 40, wby + 15);
    // Second row: a simple diagram circle with lines
    ctx.strokeStyle = "#c04060";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(wbx + 10, wby + 30, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wbx + 17, wby + 30);
    ctx.lineTo(wbx + 30, wby + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wbx + 37, wby + 30, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Checkmark
    ctx.strokeStyle = "#208040";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wbx + 50, wby + 24);
    ctx.lineTo(wbx + 54, wby + 30);
    ctx.lineTo(wbx + 62, wby + 18);
    ctx.stroke();
    // Marker tray (bottom edge)
    fillR(ctx, wbx, wby + wbH, wbW, 5, "#707080");
    // Markers on tray
    const markerColors = ["#c04040", "#2060c0", "#208040"];
    for (let mi = 0; mi < 3; mi++) {
      fillR(ctx, wbx + 6 + mi * 12, wby + wbH + 1, 7, 3, markerColors[mi]);
    }
    // Label
    ctx.fillStyle = "#505060";
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText("WHITEBOARD", wbx + wbW / 2, wby + wbH + 14);
    ctx.textAlign = "left";
  }

  // ── Neon Sign (top wall, clickable color-cycler) ──────────────
  {
    const [_nsTx, _nsTy] = getAdminPos("neon_sign", 3, 0);
    const [nsx, nsy] = ts(_nsTx, _nsTy);
    const nsW = T * 3,
      nsH = T * 1;
    const nsColor = NEON_COLORS[neonSignColorIdx];
    const nsGlow = 0.6 + Math.sin(globalTick * 0.07) * 0.3;
    ctx.save();
    // Dark backing panel
    fillR(ctx, nsx, nsy, nsW, nsH, "#0a0a18");
    // Glowing border
    ctx.shadowColor = nsColor;
    ctx.shadowBlur = 14 * nsGlow;
    ctx.strokeStyle = nsColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 + nsGlow * 0.3;
    ctx.strokeRect(nsx + 1, nsy + 1, nsW - 2, nsH - 2);
    // Inner subtle fill
    ctx.globalAlpha = 0.07 + nsGlow * 0.05;
    ctx.fillStyle = nsColor;
    ctx.fillRect(nsx + 2, nsy + 2, nsW - 4, nsH - 4);
    // Neon text
    ctx.globalAlpha = nsGlow;
    ctx.fillStyle = nsColor;
    ctx.shadowColor = nsColor;
    ctx.shadowBlur = 10 * nsGlow;
    ctx.font = "7px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText("VIBE", nsx + nsW / 2, nsy + nsH / 2 + 3);
    ctx.textAlign = "left";
    ctx.restore();
  }

  // ── Nap pod ambient glow (makers lab) ────────────────────────
  if (ACT_ZONE_Y > 0) {
    const [_napGlTx, _napGlTy] = getAdminPos("nap_pod", 22, ACT_ZONE_Y + 14);
    const [npGx, npGy] = ts(_napGlTx, _napGlTy);
    const napPulse = 0.06 + Math.sin(tick * 0.04) * 0.03;
    ctx.save();
    ctx.globalAlpha = napPulse;
    const napG = ctx.createRadialGradient(
      npGx + T,
      npGy + T * 0.6,
      0,
      npGx + T,
      npGy + T * 0.6,
      T * 1.2,
    );
    napG.addColorStop(0, "#40a0ff");
    napG.addColorStop(1, "transparent");
    ctx.fillStyle = napG;
    ctx.fillRect(npGx - T * 0.2, npGy - T * 0.2, T * 2.4, T * 1.6);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════════════════
//  AGENT STATE  (dt-based lerp, full state machine)
// ════════════════════════════════════════════════════════════════
const TOOLS_MAP = {
  Bash: "⚡bash",
  Read: "📖read",
  Write: "✍write",
  Edit: "✏edit",
  Grep: "🔍grep",
  Glob: "📂glob",
  WebFetch: "🌐fetch",
  WebSearch: "🔎web",
  Agent: "🤖spawn",
  TodoWrite: "📋todo",
};

class AgentState {
  constructor(id, slug) {
    this.id = id;
    this.slug = slug;
    // Spawn on a random couch in the lounge (then walk to activity)
    const couchPositions =
      COUCH_SLOTS.length > 0
        ? COUCH_SLOTS
        : [
            { tx: 5, ty: 24 },
            { tx: 10, ty: 24 },
          ];
    const spawnCouch =
      couchPositions[Math.floor(Math.random() * couchPositions.length)];
    this.tx = spawnCouch.tx + (Math.random() - 0.5) * 0.5;
    this.ty = spawnCouch.ty + (Math.random() - 0.5) * 0.5;
    this.targetTx = this.tx;
    this.targetTy = this.ty;
    this.palette = getPalette(slug);
    // state machine
    this.state = "sitting_couch"; // start sitting on couch
    this._spawnSitTimer = 2 + Math.random() * 3; // sit for 2-5 seconds before moving
    this._simsWaiting = false;
    this._simsTarget = null;
    this._simsArrivalPending = false;
    this.nextState = null; // queued after non-loop anim finishes
    this.animTime = 0; // accumulated seconds in current state
    this.animT = 0; // normalized [0..1]
    // logic
    this.isWorking = false;
    this.slotIdx = -1;
    this.arrived = false;
    this.idleTimer = 0;
    this.walkTimer = 0; // how long trying to reach idle slot
    this.isCleaning = false; // true while assigned to clean cat mess
    this._cleanTimer = 0;
    this.thought = "";
    this.burnout = 0; // 0-4: fresh, tired, drained, burnout, crispy
    this._wasWorking = false; // track working transition for burnout
    // celebrating
    this.celebrating = false;
    this.celebrateTimer = 0;
    // label spring
    this.labelScale = 0;
    this.labelVel = 0;
    // spawn flash (scale-in)
    this.spawnScale = 0;
    this.spawnAlpha = 1;
    this.spawnBurst = true;
    // stable prefs
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
    // 4 кардинально разных поведения на диване
    const cs = Math.abs(h) % 4;
    this.couchIdleState = ["sleeping", "drinking_beer", "phone", "stretching"][
      cs
    ];
    // Persistent personality trait — introvert prefers solo/desk spots, extrovert prefers social spots
    this.trait = Math.abs(h) % 3 === 0 ? "extrovert" : "introvert"; // ~33% extrovert, ~67% introvert
    this.activityAnim = null;
    this.activityDur = 0;
    this.flip = Math.abs(h) % 3 === 1; // зеркалит позу на диване
    this.prevStatus = "";
    this.prevTool = ""; // track tool completion
    this.waypoints = []; // A* path waypoints
    this.facing = "S"; // direction: N,NE,E,SE,S,SW,W,NW,IDLE
    // mood tracking
    this.workTicks = 0; // accumulated seconds in working state
    this.totalTicks = 0; // total accumulated seconds alive
    this._moodEmoji = ""; // cached mood emoji
    // speech bubbles
    this.speechBubble = ""; // current speech text
    this.speechBubbleLife = 0; // countdown seconds (>0 = visible)
    this._speechCooldown = 5 + Math.random() * 8; // speech bubbles appear faster
    // wave / nod when passing other agents
    this.waveEmoji = ""; // '👋' or '🙂' shown briefly above head
    this.waveTimer = 0; // countdown seconds (>0 = visible)
    this._greetCooldown = {}; // agentId → remaining cooldown seconds
    // high-five when both working at nearby desks
    this.highFiveTimer = 0; // countdown seconds (>0 = visible)
    this._highFiveCooldown = {}; // agentId → remaining cooldown seconds
    this._departingDesk = false; // true while playing standing_up before leaving desk
  }

  get depth() {
    return this.ty + this.tx * 0.001;
  }
  get sx() {
    return OX + this.tx * T + T / 2;
  }
  get sy() {
    return OY + this.ty * T + T / 2;
  }

  setAnim(state, next = null) {
    if (this.state === state) return;
    this.state = state;
    this.nextState = next;
    this.animTime = 0;
    this.animT = 0;
  }

  // Set movement target and compute pathfinding waypoints
  setTarget(tx, ty) {
    if (
      Math.abs(this.targetTx - tx) < 0.01 &&
      Math.abs(this.targetTy - ty) < 0.01
    )
      return;
    this.targetTx = tx;
    this.targetTy = ty;
    this.waypoints = astar(this.tx, this.ty, tx, ty) || [];
  }

  _updateFacing(dtx, dty) {
    const ax = Math.abs(dtx),
      ay = Math.abs(dty);
    if (ax < 0.01 && ay < 0.01) {
      this.facing = "IDLE";
      return;
    }
    const angle = Math.atan2(dty, dtx); // radians, 0=E, PI/2=S
    // 8 sectors of 45 degrees each
    const sector = Math.round(angle / (Math.PI / 4));
    const DIR8 = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    this.facing = DIR8[((sector % 8) + 8) % 8];
  }

  moveToward(dt, speed = 3.5) {
    // Follow A* waypoints first
    while (this.waypoints.length > 0) {
      const wp = this.waypoints[0];
      const dtx = wp.tx - this.tx,
        dty = wp.ty - this.ty;
      const dist = Math.sqrt(dtx * dtx + dty * dty);
      if (dist < 0.18) {
        this.waypoints.shift();
        continue;
      }
      const step = Math.min(speed * dt, dist);
      this.tx += (dtx / dist) * step;
      this.ty += (dty / dist) * step;
      this._updateFacing(dtx, dty);
      return false;
    }
    // Direct movement to final target
    const dtx = this.targetTx - this.tx,
      dty = this.targetTy - this.ty;
    const dist = Math.sqrt(dtx * dtx + dty * dty);
    if (dist < 0.04) {
      this.tx = this.targetTx;
      this.ty = this.targetTy;
      this.facing = "IDLE";
      return true;
    }
    const step = Math.min(speed * dt, dist);
    this.tx += (dtx / dist) * step;
    this.ty += (dty / dist) * step;
    this._updateFacing(dtx, dty);
    return false;
  }

  update(agentData, deskSet, dt, tick) {
    // ── Spawn scale-in spring ─────────────────────────────────────
    if (this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + dt * 4);
    }

    // ── Wave / nod timer decay ────────────────────────────────────
    if (this.waveTimer > 0) this.waveTimer -= dt;
    for (const k of Object.keys(this._greetCooldown)) {
      this._greetCooldown[k] -= dt;
      if (this._greetCooldown[k] <= 0) delete this._greetCooldown[k];
    }
    // ── High-five timer decay ─────────────────────────────────────
    if (this.highFiveTimer > 0) this.highFiveTimer -= dt;
    for (const k of Object.keys(this._highFiveCooldown)) {
      this._highFiveCooldown[k] -= dt;
      if (this._highFiveCooldown[k] <= 0) delete this._highFiveCooldown[k];
    }

    // ── Label spring (k=180, d=16) ────────────────────────────────
    const lf = (1 - this.labelScale) * 180 - this.labelVel * 16;
    this.labelVel += lf * dt;
    this.labelScale = clamp(this.labelScale + this.labelVel * dt, 0, 1.25);

    // ── Detect task completion → celebrate (one-shot) ──────────────
    const working =
      agentData.status === "working" || agentData.status === "thinking";
    if (
      this.prevStatus &&
      this.prevStatus !== "idle" &&
      this.isWorking &&
      !working &&
      !this.celebrating
    ) {
      this.celebrating = true;
      this.celebrateTimer = ANIM.celebrating.frames / ANIM.celebrating.fps;
      PS.confetti(this.sx, this.sy);
      sndState();
    }
    // ── Detect tool completion → small confetti burst (one-shot) ──
    const curTool = agentData.currentTool || "";
    if (this.prevTool && this.prevTool !== "" && !curTool && working) {
      PS.confetti(this.sx, this.sy - 16);
      blip(880, 0.06, "square", 0.03);
      setTimeout(() => blip(1100, 0.05, "square", 0.02), 80);
    }
    this.prevTool = curTool;
    // ── Burnout tracking ──────────────────────────────────────────
    if (this._wasWorking && !working) {
      this.burnout = Math.min(4, this.burnout + 1);
    }
    this._wasWorking = working;
    this.prevStatus = agentData.status;
    this.lastAgentData = agentData;
    // ── Mood tracking (rolling 60s window) ───────────────────────
    this.totalTicks += dt;
    if (working) this.workTicks += dt;
    // Keep only last 60s worth of history by clamping totals
    if (this.totalTicks > 60) {
      const excess = this.totalTicks - 60;
      this.totalTicks = 60;
      this.workTicks = Math.max(0, this.workTicks - excess);
    }
    const ratio = this.totalTicks > 2 ? this.workTicks / this.totalTicks : 0;
    this._moodEmoji =
      ratio >= 0.7 ? "🔥" : ratio >= 0.4 ? "😊" : ratio >= 0.1 ? "😐" : "😤";
    // ── Speech bubble timer ───────────────────────────────────────
    if (this.speechBubbleLife > 0) {
      this.speechBubbleLife -= dt;
      if (this.speechBubbleLife <= 0) {
        this.speechBubble = "";
        this.speechBubbleLife = 0;
      }
    }
    if (this._speechCooldown > 0) {
      this._speechCooldown -= dt;
    } else if (this.speechBubbleLife <= 0 && this.totalTicks > 6) {
      // pick a pool based on current state
      let pool;
      if (this.state === "typing_furious") pool = SPEECH_PHRASES.furious;
      else if (working) pool = SPEECH_PHRASES.working;
      else if (this.state === "thinking") pool = SPEECH_PHRASES.thinking;
      else pool = SPEECH_PHRASES.idle;
      this.speechBubble = pool[Math.floor(Math.random() * pool.length)];
      this.speechBubbleLife = 3.5 + Math.random() * 1.5;
      this._speechCooldown = 18 + Math.random() * 22;
    }
    if (this.celebrating) {
      this.celebrateTimer -= dt;
      if (this.celebrateTimer <= 0) this.celebrating = false;
    }

    // ── Slot assignment ───────────────────────────────────────────
    // If cleaning, don't touch slot assignment — cleaning logic controls movement
    if (this.isCleaning) return;

    // ── Spawn: sit on couch briefly before moving ─────────────────
    if (this._spawnSitTimer > 0) {
      this._spawnSitTimer -= dt;
      this.state = "sitting_couch";
      if (this._spawnSitTimer <= 0) {
        this.state = "walking";
        this._spawnSitTimer = 0;
      }
      return; // don't do anything else while spawning
    }

    // ── Sims mode: wait on couch until user gives command ─────────
    if (simsMode && this._simsWaiting && !this.isWorking) {
      if (this.arrived) {
        if (this.state !== "sitting_couch") this.state = "sitting_couch";
        return;
      }
      // Not yet arrived at couch — walk there, skip slot logic
      if (this.state !== "walking") this.setAnim("walking");
      const _simsWS = this.burnout >= 3 ? 2.5 : 3.5;
      if (this.moveToward(dt, _simsWS)) {
        this.arrived = true;
        this.state = "sitting_couch";
      }
      return;
    }

    // ── Stand-up transition: agent rises from chair before walking ──
    if (this._departingDesk) {
      if (this.animT >= 0.99) {
        // Animation done — now actually leave the desk
        this._departingDesk = false;
        this.isWorking = false;
        this.slotIdx = -1;
        this.arrived = false;
        this.activityAnim = null;
        this.activityDur = 0;
      }
      return; // freeze slot logic while standing up
    }

    if (working !== this.isWorking) {
      // Agent stopped working while seated at desk → play standing_up first
      const deskStates = [
        "typing_normal",
        "typing_furious",
        "thinking",
        "drinking_desk",
        "spinning_chair",
        "desk_yawn",
        "desk_nap",
        "doodling",
      ];
      if (this.isWorking && this.arrived && deskStates.includes(this.state)) {
        this._departingDesk = true;
        this.setAnim("standing_up");
        return;
      }
      // Release idle slot when transitioning away from idle
      if (
        !this.isWorking &&
        this.slotIdx >= 0 &&
        idleOccupied[this.slotIdx] === this.id
      ) {
        delete idleOccupied[this.slotIdx];
      }
      this.isWorking = working;
      this.slotIdx = -1;
      this.arrived = false;
      this.activityAnim = null;
      this.activityDur = 0;
    }
    if (working) {
      if (this.slotIdx === -1) {
        for (let i = 0; i < DESK_SLOTS.length; i++) {
          if (!deskSet.has(i)) {
            this.slotIdx = i;
            deskSet.add(i);
            break;
          }
        }
        if (this.slotIdx === -1)
          this.slotIdx = deskSet.size % DESK_SLOTS.length;
      }
      const slot = DESK_SLOTS[Math.min(this.slotIdx, DESK_SLOTS.length - 1)];
      this.setTarget(slot.tx, slot.ty);
    } else {
      // Pick activity if none or expired
      if (this.slotIdx === -1 || this.activityDur <= 0) {
        // Release current slot before picking new
        if (this.slotIdx >= 0 && idleOccupied[this.slotIdx] === this.id) {
          delete idleOccupied[this.slotIdx];
        }
        this.slotIdx = -1;

        // In sims mode: return to couch and wait for next command
        if (simsMode) {
          this._simsWaiting = true;
          this.arrived = false;
          this.activityDur = 0;
          const _sc =
            COUCH_SLOTS.length > 0 ? COUCH_SLOTS[0] : { tx: 5, ty: 24 };
          this.setTarget(_sc.tx, _sc.ty);
          return; // handled — _simsWaiting block will walk agent back next tick
        }

        // Build list of available slots (not held by any other agent)
        const avail = [];
        for (let i = 0; i < IDLE_SPOTS.length; i++) {
          const holder = idleOccupied[i];
          if (
            holder !== undefined &&
            holder !== this.id &&
            !String(holder).startsWith("__reserved_")
          )
            continue; // taken by another (reserved = claimable)
          const sp = IDLE_SPOTS[i];
          // Trait-based weight multiplier: extroverts love social, introverts love solo
          const isGroup = sp.type === "group" || sp.type === "gaming";
          const traitMult = isGroup
            ? this.trait === "extrovert"
              ? 3.5
              : 0.12
            : this.trait === "introvert"
              ? 2.2
              : 1.0;
          if (sp.type === "group") {
            const pair = GROUP_PAIRS[sp.groupId];
            const otherIdx = pair[0] === i ? pair[1] : pair[0];
            const otherHolder = idleOccupied[otherIdx];
            // Group: only join if partner already occupied by someone else
            if (otherHolder !== undefined && otherHolder !== this.id) {
              avail.push({ i, w: sp.w * traitMult });
            }
            // Skip if partner is free — we don't go alone
          } else {
            avail.push({ i, w: sp.w * traitMult });
          }
        }
        // If no solo slots available, try to INITIATE a group pair
        // by finding a group where BOTH slots are free, and reserve both
        if (avail.length < 3) {
          for (const [gid, pair] of Object.entries(GROUP_PAIRS)) {
            const [a, b] = pair;
            if (
              idleOccupied[a] === undefined &&
              idleOccupied[b] === undefined
            ) {
              // Reserve the partner slot as 'waiting' so next agent picks it
              idleOccupied[b] = "__reserved_" + gid;
              const groupInitMult = this.trait === "extrovert" ? 5.0 : 0.2;
              avail.push({ i: a, w: IDLE_SPOTS[a].w * 2 * groupInitMult }); // boost weight, scaled by trait
              break; // only one group initiation per tick
            }
          }
        }
        if (avail.length > 0) {
          const totalW = avail.reduce((s, a) => s + a.w, 0);
          let r = Math.random() * totalW;
          for (const a of avail) {
            r -= a.w;
            if (r <= 0) {
              this.slotIdx = a.i;
              break;
            }
          }
          if (this.slotIdx === -1) this.slotIdx = avail[avail.length - 1].i;
        } else {
          this.slotIdx = Math.floor(
            Math.random() * Math.max(1, IDLE_SPOTS.length),
          );
        }
        idleOccupied[this.slotIdx] = this.id; // claim slot
        const sp = IDLE_SPOTS[this.slotIdx];
        this.activityAnim = sp.anim;
        this.activityDur = 15 + Math.random() * 25; // 15–40 seconds
        this.arrived = false;
        this.walkTimer = 0;
      }
      const sp = IDLE_SPOTS[Math.min(this.slotIdx, IDLE_SPOTS.length - 1)];
      this.setTarget(sp.tx, sp.ty);
    }

    // ── Advance anim timer ────────────────────────────────────────
    const cfg = ANIM[this.state] ?? ANIM.walking;
    this.animTime += dt;
    const totalDur = cfg.frames / cfg.fps;
    if (cfg.loop) {
      this.animT = (this.animTime % totalDur) / totalDur;
    } else {
      this.animT = Math.min(this.animTime / totalDur, 1);
      if (this.animT >= 0.99 && this.nextState) {
        this.setAnim(this.nextState);
      }
    }

    // ── Override: celebration ─────────────────────────────────────
    if (this.celebrating) {
      if (this.state !== "celebrating") this.setAnim("celebrating");
      this.moveToward(dt, 2);
      this.thought = "🎉";
      return;
    }

    // ── Movement / state machine ──────────────────────────────────
    if (!this.arrived) {
      if (this.state !== "walking") this.setAnim("walking");
      const walkSpeed = this.burnout >= 3 ? 2.5 : 3.5;
      if (this.moveToward(dt, walkSpeed)) {
        this.arrived = true;
        this.idleTimer = 0;
        this.walkTimer = 0;
        // Sims arrival celebration
        if (simsMode && this._simsArrivalPending) {
          this._simsArrivalPending = false;
          const exclamations = [
            "Ого!",
            "Круто!",
            "Кайф!",
            "Вау!",
            "Йой!",
            "Топ!",
            "Файно!",
            "Кльово!",
            "Ура!",
            "Супер!",
          ];
          simsArrivalFx.push({
            x: this.sx,
            y: this.sy,
            life: 2.2,
            maxLife: 2.2,
            text: exclamations[Math.floor(Math.random() * exclamations.length)],
          });
          PS.confetti(this.sx, this.sy - 10);
          PS.burst(this.sx, this.sy, this.pal ? this.pal.accent : "#9ece6a");
          this.speechBubble =
            exclamations[Math.floor(Math.random() * exclamations.length)];
          this.speechBubbleLife = 3;
        }
        if (working) this.setAnim("sitting_down", "typing_normal");
        else this.setAnim(this.activityAnim || this.couchIdleState);
      } else if (!working) {
        // Timeout: give up on this slot after 20s and pick another
        this.walkTimer += dt;
        if (this.walkTimer > 20) {
          if (this.slotIdx >= 0 && idleOccupied[this.slotIdx] === this.id)
            delete idleOccupied[this.slotIdx];
          this.slotIdx = -1;
          this.activityDur = 0;
          this.walkTimer = 0;
        }
      }
    } else {
      this.idleTimer += dt;
      if (working) {
        const furious =
          agentData.currentTool === "Bash" ||
          agentData.currentTool === "Write" ||
          agentData.currentTool === "Edit";
        const wantBase =
          agentData.status === "thinking"
            ? "thinking"
            : furious
              ? "typing_furious"
              : "typing_normal";
        const notBusy =
          this.state !== "sitting_down" &&
          this.state !== "drinking_desk" &&
          this.state !== "spinning_chair";
        if (notBusy && this.state !== wantBase) this.setAnim(wantBase);
        // Idle variety: coffee every ~30s
        if (this.idleTimer > 30 && this.state === "typing_normal") {
          this.setAnim("drinking_desk", "typing_normal");
          this.idleTimer = 0;
        }
        // Idle variety: yawn+stretch if tired (~45s after last break, burnout >= 1)
        if (
          this.idleTimer > 45 &&
          this.burnout >= 1 &&
          this.state === "typing_normal"
        ) {
          this.setAnim("desk_yawn", "typing_normal");
          this.idleTimer = 0;
        }
        // Idle variety: spin every ~60s
        if (this.idleTimer > 60 && this.state === "typing_normal") {
          this.setAnim("spinning_chair", "typing_normal");
          this.idleTimer = 0;
        }
        if (this.state === "typing_furious")
          PS.sweat(this.sx + 10, this.sy - 10);
        if (this.state === "typing_normal" || this.state === "thinking")
          PS.smoke(this.sx + 18, this.sy - 14);
      } else {
        this.activityDur -= dt;
        const want = this.activityAnim || this.couchIdleState;
        if (this.state !== want && this.state !== "sitting_couch")
          this.setAnim(want);
        // Particles by activity
        if (this.state === "sleeping" || this.state === "desk_nap")
          PS.zzz(this.sx + 12, this.sy - 16);
        if (this.state === "drinking_beer") PS.foam(this.sx - 4, this.sy - 18);
        if (this.state === "at_coffee" || this.state === "eating")
          PS.smoke(this.sx + 8, this.sy - 14);
        if (this.state === "headphones" || this.state === "air_guitar") {
          if (Math.random() < 0.02)
            PS.emit(this.sx + 8, this.sy - 18, 1, {
              vx: (Math.random() - 0.5) * 20,
              vy: -30,
              spread: 4,
              gravity: -5,
              life: 1,
              size: 4,
              color: this.palette.accent,
            });
        }
      }
    }

    // ── Thought content ───────────────────────────────────────────
    this.thought =
      agentData.currentTool && working
        ? (TOOLS_MAP[agentData.currentTool] ??
          agentData.currentTool.toLowerCase())
        : agentData.status === "thinking"
          ? "..."
          : "";
  }

  draw(ctx) {
    ctx.save();
    // spawn scale-in
    if (this.spawnScale < 1) {
      ctx.translate(this.sx, this.sy);
      ctx.scale(this.spawnScale, this.spawnScale);
      ctx.translate(-this.sx, -this.sy);
    }
    // зеркало для диванных поз — разнообразие
    const onCouch =
      this.state === "sleeping" ||
      this.state === "drinking_beer" ||
      this.state === "stretching" ||
      this.state === "sitting_couch";
    if (this.flip && onCouch) {
      ctx.translate(this.sx, this.sy);
      ctx.scale(-1, 1);
      ctx.translate(-this.sx, -this.sy);
    }
    const AGENT_SCALE = 1.15;
    ctx.translate(this.sx, this.sy);
    ctx.scale(AGENT_SCALE, AGENT_SCALE);
    ctx.translate(-this.sx, -this.sy);
    const fn =
      this.state === "walking"
        ? (WALK_DIR_FN[this.facing] ?? drawWalkS)
        : (CHAR_DRAW[this.state] ?? drawWalking);
    fn(ctx, this.sx, this.sy, this.palette, this.animT);
    ctx.restore();
  }

  drawOverlay(ctx, tick) {
    drawLabel(
      ctx,
      this.sx,
      this.sy,
      getRole(this.lastAgentData || { slug: this.slug }),
      this.labelScale,
      this.burnout,
      this.trait,
    );
    const showThought =
      this.thought &&
      (this.state === "typing_normal" ||
        this.state === "typing_furious" ||
        this.state === "thinking");
    if (showThought)
      drawThoughtBubble(ctx, this.sx, this.sy - 8, this.thought, tick);
    // ── Speech bubble ─────────────────────────────────────────────
    if (this.speechBubble && this.speechBubbleLife > 0 && !showThought) {
      const fadeIn = clamp(
        1 -
          (this.speechBubbleLife -
            (this.speechBubbleLife > 3.5 ? this.speechBubbleLife - 0.4 : 0)) /
            0.4,
        0,
        1,
      );
      const fadeOut = clamp(this.speechBubbleLife / 0.6, 0, 1);
      const alpha = Math.min(fadeIn, fadeOut) * this.labelScale;
      drawSpeechBubble(ctx, this.sx, this.sy, this.speechBubble, alpha);
    }
    // ── Mood emoji above head ─────────────────────────────────────
    if (this._moodEmoji && this.totalTicks > 2 && this.labelScale > 0.1) {
      const bob = Math.sin(tick * 0.06 + this.sx) * 2;
      ctx.save();
      ctx.globalAlpha =
        clamp((this.totalTicks - 2) / 2, 0, 1) * this.labelScale;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this._moodEmoji, this.sx, this.sy - 44 + bob);
      ctx.restore();
    }
    // ── Wave / nod emoji (shown when passing another agent) ───────
    if (this.waveTimer > 0 && this.labelScale > 0.1) {
      const fadeAlpha = clamp(this.waveTimer / 0.5, 0, 1) * this.labelScale;
      const waveOff = Math.sin(this.waveTimer * 18) * 4; // wiggle
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.waveEmoji, this.sx + 14, this.sy - 50 + waveOff);
      ctx.restore();
    }
    // ── High-five emoji (shown when both at desk working nearby) ──
    if (this.highFiveTimer > 0 && this.labelScale > 0.1) {
      const progress = 1 - this.highFiveTimer / 2.2; // 0→1 over lifetime
      const fadeAlpha = clamp(this.highFiveTimer / 0.5, 0, 1) * this.labelScale;
      const riseOff = -progress * 14; // float upward as it fades
      const scale = 1 + Math.sin(progress * Math.PI) * 0.4; // pop then shrink
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = `${Math.round(14 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🤝", this.sx, this.sy - 56 + riseOff);
      ctx.restore();
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  CAT  🐱
// ════════════════════════════════════════════════════════════════
function drawCat(ctx, cx, cy, tick, state, catObj) {
  const phase = tick * 0.04;
  const tailSwing = Math.sin(phase) * 0.5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state === "sleeping") {
    // curled up — horizontal oval
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d07820";
    // tail curled over body
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 2, 8, Math.PI * 0.2, Math.PI * 1.1);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e8902a";
    ctx.stroke();
    ctx.arc(cx + 6, cy + 2, 8, Math.PI * 0.2, Math.PI * 1.1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#d07820";
    ctx.stroke();
    // head tucked, tiny ears
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy, 7, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // ears (small nubs)
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 4);
    ctx.lineTo(cx - 11, cy - 9);
    ctx.lineTo(cx - 8, cy - 4);
    ctx.closePath();
    ctx.fillStyle = "#e8902a";
    ctx.fill();
    // closed eyes
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 1, 2, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 1, 2, Math.PI, 0);
    ctx.stroke();
    // stripes
    ctx.strokeStyle = "#c07018";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 1);
    ctx.lineTo(cx + 4, cy + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx + 6, cy - 1);
    ctx.stroke();
    return;
  }

  if (state === "eating") {
    // Cat leaning down to eat from bowl — head lowered, tail up happy
    ctx.fillStyle = "#e8902a";
    // Body leaning forward
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 9, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Belly
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 5, 4.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Tail up and happy (curled)
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.quadraticCurveTo(cx - 16, cy - 4, cx - 12, cy - 14);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.quadraticCurveTo(cx - 16, cy - 4, cx - 12, cy - 14);
    ctx.stroke();
    // Head down toward bowl (tilted forward)
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 7, cy + 4, 7, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 1);
    ctx.lineTo(cx + 4, cy - 7);
    ctx.lineTo(cx + 8, cy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 1);
    ctx.lineTo(cx + 10, cy - 7);
    ctx.lineTo(cx + 13, cy - 1);
    ctx.closePath();
    ctx.fill();
    // Closed happy eyes (eating)
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 3, 2, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 3, 2, Math.PI, 0);
    ctx.stroke();
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 6, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eating particles (little kibble bits)
    const ep = tick * 0.06;
    ctx.fillStyle = "#e8902a80";
    ctx.beginPath();
    ctx.arc(
      cx + 10 + Math.cos(ep) * 3,
      cy + 8 + Math.sin(ep * 1.3) * 2,
      1.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      cx + 7 + Math.cos(ep + 2) * 2,
      cy + 9 + Math.sin(ep * 0.9) * 1.5,
      1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    return;
  }

  if (state === "pooping") {
    // squatting - very low, haunches down
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 8);
    ctx.lineTo(cx - 3, cy - 15);
    ctx.lineTo(cx, cy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 8);
    ctx.lineTo(cx + 3, cy - 15);
    ctx.lineTo(cx + 6, cy - 8);
    ctx.closePath();
    ctx.fill();
    // head raised (looking away embarrassed)
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 6, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // embarrassed eyes (looking away)
    ctx.fillStyle = "#1a1020";
    ctx.fillRect((cx + 5) | 0, (cy - 8) | 0, 2, 3);
    ctx.fillRect((cx + 10) | 0, (cy - 8) | 0, 2, 3);
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 5, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill(); // nose
    // blush
    ctx.fillStyle = "#ff808060";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 5, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy - 5, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // tail up
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.quadraticCurveTo(cx - 14, cy - 8, cx - 10, cy - 18);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.quadraticCurveTo(cx - 14, cy - 8, cx - 10, cy - 18);
    ctx.stroke();
    // squatted legs
    ctx.fillStyle = "#d07820";
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy + 8, 4, 3, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 8, 4, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // --- Playing (spinning, chasing tail) ---
  if (state === "playing" && catObj) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(catObj.playAngle);
    ctx.translate(-cx, -cy);
    // Body
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail arcing out (target of chase)
    const tAngle = catObj.playAngle * 0.7 + 1;
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(
      cx - 18,
      cy - 2,
      cx - 12 + Math.cos(tAngle) * 8,
      cy - 10 + Math.sin(tAngle) * 6,
    );
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(
      cx - 18,
      cy - 2,
      cx - 12 + Math.cos(tAngle) * 8,
      cy - 10 + Math.sin(tAngle) * 6,
    );
    ctx.stroke();
    // Head (looking at tail)
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 13);
    ctx.lineTo(cx + 1, cy - 20);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 13);
    ctx.lineTo(cx + 8, cy - 20);
    ctx.lineTo(cx + 12, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Excited eyes (big pupils)
    ctx.fillStyle = "#1a1020";
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 10, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 10, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((cx + 2) | 0, (cy - 12) | 0, 1, 1);
    ctx.fillRect((cx + 8) | 0, (cy - 12) | 0, 1, 1);
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 7, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // --- Grooming (licking paw) ---
  if (state === "grooming" && catObj) {
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail resting
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 16, cy + 10, cx - 14, cy + 2);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 16, cy + 10, cx - 14, cy + 2);
    ctx.stroke();
    // Head
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 13);
    ctx.lineTo(cx + 1, cy - 20);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 13);
    ctx.lineTo(cx + 8, cy - 20);
    ctx.lineTo(cx + 12, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Paw raised to face (oscillating)
    const pawY = cy - 6 + Math.sin(catObj.groomPhase) * 3;
    const pawX = cx + 8 + Math.cos(catObj.groomPhase * 0.7) * 2;
    ctx.fillStyle = "#d07820";
    ctx.beginPath();
    ctx.ellipse(pawX, pawY, 4, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Closed content eyes
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 10, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 10, 2, 0, Math.PI);
    ctx.stroke();
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 7, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tiny tongue
    if (Math.sin(catObj.groomPhase * 2) > 0.3) {
      ctx.fillStyle = "#ff8090";
      ctx.beginPath();
      ctx.ellipse(cx + 7, cy - 5.5, 1.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // --- Stretching (front paws forward, butt up) ---
  if (state === "stretching") {
    // Elongated body
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 14, 6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Butt raised
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 2, 7, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Front paws stretched forward
    ctx.fillStyle = "#d07820";
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 8, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 9, 5, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Head down between paws
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 2, 7, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 7, cy - 9);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 2);
    ctx.lineTo(cx + 12, cy - 9);
    ctx.lineTo(cx + 15, cy - 2);
    ctx.closePath();
    ctx.fill();
    // Closed content eyes
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 9, cy + 1, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 13, cy + 1, 2, 0, Math.PI);
    ctx.stroke();
    // Tail up from butt
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 2);
    ctx.quadraticCurveTo(cx - 18, cy - 10, cx - 14, cy - 18);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 2);
    ctx.quadraticCurveTo(cx - 18, cy - 10, cx - 14, cy - 18);
    ctx.stroke();
    return;
  }

  // --- Hunting (crouching, butt wiggle, then pounce) ---
  if (state === "hunting" && catObj) {
    const wiggle = catObj.huntPhase === 0 ? Math.sin(tick * 0.3) * 3 : 0;
    // Low crouching body
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + wiggle * 0.3, cy + 5, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Butt wiggling
    ctx.beginPath();
    ctx.ellipse(cx - 7 + wiggle, cy + 3, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head low, focused
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy + 2, 7, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Ears perked
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 2);
    ctx.lineTo(cx + 6, cy - 10);
    ctx.lineTo(cx + 9, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy - 2);
    ctx.lineTo(cx + 11, cy - 10);
    ctx.lineTo(cx + 14, cy - 2);
    ctx.closePath();
    ctx.fill();
    // Big focused eyes
    ctx.fillStyle = "#1a1020";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 13, cy, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2860";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy, 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 13, cy, 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((cx + 7) | 0, (cy - 2) | 0, 1, 1);
    ctx.fillRect((cx + 12) | 0, (cy - 2) | 0, 1, 1);
    // Tail low, twitching
    const tTwitch = Math.sin(tick * 0.2) * 4;
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 3);
    ctx.quadraticCurveTo(cx - 18, cy + tTwitch, cx - 16, cy - 2 + tTwitch);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 3);
    ctx.quadraticCurveTo(cx - 18, cy + tTwitch, cx - 16, cy - 2 + tTwitch);
    ctx.stroke();
    return;
  }

  // --- Knocking (at desk, pushing item) ---
  if (state === "knocking" && catObj) {
    // Sitting at desk edge
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 13);
    ctx.lineTo(cx + 1, cy - 20);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 13);
    ctx.lineTo(cx + 8, cy - 20);
    ctx.lineTo(cx + 12, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Devious eyes (half-lidded)
    ctx.fillStyle = "#1a1020";
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 9, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 9, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Paw reaching out to push (if in push phase)
    if (catObj.knockPhase >= 1) {
      const pawExt = catObj.knockPhase === 2 ? 6 : Math.sin(tick * 0.15) * 3;
      ctx.fillStyle = "#d07820";
      ctx.beginPath();
      ctx.ellipse(cx + 12 + pawExt, cy + 2, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 7, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy - 4, cx - 10, cy - 12);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy - 4, cx - 10, cy - 12);
    ctx.stroke();
    return;
  }

  // --- Zoomies (running fast, same as walking but with motion blur effect) ---
  if (state === "zoomies") {
    // Ghost trail effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    // Main body
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head (leaning forward)
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 7, cy - 6, 7, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Ears flattened back
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 8);
    ctx.lineTo(cx - 2, cy - 14);
    ctx.lineTo(cx + 4, cy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 9);
    ctx.lineTo(cx + 2, cy - 15);
    ctx.lineTo(cx + 8, cy - 10);
    ctx.closePath();
    ctx.fill();
    // Wild eyes
    ctx.fillStyle = "#1a1020";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 8, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 11, cy - 8, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((cx + 5) | 0, (cy - 10) | 0, 2, 2);
    ctx.fillRect((cx + 10) | 0, (cy - 10) | 0, 2, 2);
    // Legs in running motion
    const run = tick * 0.15;
    ctx.fillStyle = "#d07820";
    ctx.beginPath();
    ctx.ellipse(cx - 3 + Math.sin(run) * 4, cy + 9, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      cx + 5 + Math.sin(run + Math.PI) * 4,
      cy + 9,
      4,
      2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Tail straight back
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 2);
    ctx.lineTo(cx - 20, cy - 2);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 2);
    ctx.lineTo(cx - 20, cy - 2);
    ctx.stroke();
    return;
  }

  // --- Purring (sitting, content) ---
  if (state === "purring") {
    // Vibrating slightly (purr effect)
    const pVib = Math.sin(tick * 0.5) * 0.5;
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + pVib, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c870";
    ctx.beginPath();
    ctx.ellipse(cx + pVib, cy + 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail curled around
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy + 12, cx - 4, cy + 10);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy + 12, cx - 4, cy + 10);
    ctx.stroke();
    // Head
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 4 + pVib, cy - 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 13);
    ctx.lineTo(cx + 1, cy - 20);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 13);
    ctx.lineTo(cx + 8, cy - 20);
    ctx.lineTo(cx + 12, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Happy closed eyes (upturned)
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 10, 2.5, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 10, 2.5, Math.PI, 0);
    ctx.stroke();
    // Content smile
    ctx.strokeStyle = "#e06080";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 6, 2, 0, Math.PI);
    ctx.stroke();
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 7, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // --- Window watching (facing away/up, ears twitching) ---
  if (state === "window_watching") {
    // Body from behind (facing top wall)
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d07820";
    // Stripes on back
    ctx.strokeStyle = "#c07018";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 3);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 1);
    ctx.lineTo(cx + 5, cy + 4);
    ctx.stroke();
    // Back of head
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears (twitching)
    const earTwitch = Math.sin(tick * 0.08) * 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 13);
    ctx.lineTo(cx - 4 + earTwitch, cy - 21);
    ctx.lineTo(cx - 1, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 13);
    ctx.lineTo(cx + 4 - earTwitch, cy - 21);
    ctx.lineTo(cx + 7, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Inner ears
    ctx.fillStyle = "#d07050";
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 13);
    ctx.lineTo(cx - 3 + earTwitch, cy - 19);
    ctx.lineTo(cx - 1, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 13);
    ctx.lineTo(cx + 3 - earTwitch, cy - 19);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.closePath();
    ctx.fill();
    // Tail wrapped
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy + 10, cx - 6, cy + 10);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.quadraticCurveTo(cx - 14, cy + 10, cx - 6, cy + 10);
    ctx.stroke();
    return;
  }

  // --- Hiding (only tail visible poking from under desk) ---
  if (state === "hiding") {
    // Only draw a wavy tail sticking out
    const tWave = Math.sin(tick * 0.06) * 4;
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + 6);
    ctx.quadraticCurveTo(
      cx + 14,
      cy + 2 + tWave,
      cx + 18,
      cy - 2 + tWave * 0.5,
    );
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + 6);
    ctx.quadraticCurveTo(
      cx + 14,
      cy + 2 + tWave,
      cx + 18,
      cy - 2 + tWave * 0.5,
    );
    ctx.stroke();
    // Tip of tail
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 18, cy - 2 + tWave * 0.5, 3, 2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // --- Scared (puffed up, arched back, big eyes) ---
  if (state === "scared") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.3, 1.3);
    ctx.translate(-cx, -cy);
    // Arched body
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fur spikes around body
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sx2 = cx + Math.cos(a) * 10,
        sy2 = cy + Math.sin(a) * 10;
      const ex = cx + Math.cos(a) * 15,
        ey = cy + Math.sin(a) * 15;
      ctx.beginPath();
      ctx.moveTo(sx2, sy2);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    // Puffed tail (straight up, bushy)
    ctx.strokeStyle = "#e8902a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.quadraticCurveTo(cx - 14, cy - 14, cx - 10, cy - 22);
    ctx.stroke();
    ctx.strokeStyle = "#d07820";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.quadraticCurveTo(cx - 14, cy - 14, cx - 10, cy - 22);
    ctx.stroke();
    // Head
    ctx.fillStyle = "#e8902a";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 10, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears perked
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 15);
    ctx.lineTo(cx + 1, cy - 22);
    ctx.lineTo(cx + 5, cy - 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 15);
    ctx.lineTo(cx + 8, cy - 22);
    ctx.lineTo(cx + 12, cy - 15);
    ctx.closePath();
    ctx.fill();
    // BIG scared eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy - 11, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 11, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1020";
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy - 11, 2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 11, 2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((cx + 1) | 0, (cy - 13) | 0, 1, 1);
    ctx.fillRect((cx + 8) | 0, (cy - 13) | 0, 1, 1);
    // Nose
    ctx.fillStyle = "#e06080";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 8, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Open mouth (surprised)
    ctx.fillStyle = "#401020";
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 5, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Normal sitting/walking cat
  // Body
  ctx.fillStyle = "#e8902a";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly (lighter)
  ctx.fillStyle = "#f5c870";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.strokeStyle = "#e8902a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 4);
  ctx.quadraticCurveTo(
    cx - 16 + Math.sin(phase) * 6,
    cy + 10,
    cx - 12 + Math.cos(phase + 1) * 10,
    cy - 4 + Math.sin(phase) * 4,
  );
  ctx.stroke();
  ctx.strokeStyle = "#d07820";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 4);
  ctx.quadraticCurveTo(
    cx - 16 + Math.sin(phase) * 6,
    cy + 10,
    cx - 12 + Math.cos(phase + 1) * 10,
    cy - 4 + Math.sin(phase) * 4,
  );
  ctx.stroke();
  // Feet
  ctx.fillStyle = "#d07820";
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy + 9, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 9, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = "#e8902a";
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy - 8, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy - 13);
  ctx.lineTo(cx + 1, cy - 20);
  ctx.lineTo(cx + 5, cy - 13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy - 13);
  ctx.lineTo(cx + 8, cy - 20);
  ctx.lineTo(cx + 12, cy - 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d07050";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 13);
  ctx.lineTo(cx + 2, cy - 18);
  ctx.lineTo(cx + 4, cy - 13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 13);
  ctx.lineTo(cx + 8, cy - 18);
  ctx.lineTo(cx + 10, cy - 13);
  ctx.closePath();
  ctx.fill();
  // Eyes
  const blink = Math.floor(tick / 120) % 8 === 0 && tick % 8 < 2;
  ctx.fillStyle = "#1a1020";
  if (blink) {
    ctx.fillRect((cx + 1) | 0, (cy - 10) | 0, 4, 1);
    ctx.fillRect((cx + 7) | 0, (cy - 10) | 0, 4, 1);
  } else {
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 10, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 10, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2860";
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 10, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 10, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((cx + 2) | 0, (cy - 12) | 0, 1, 1);
    ctx.fillRect((cx + 8) | 0, (cy - 12) | 0, 1, 1);
  }
  // Nose
  ctx.fillStyle = "#e06080";
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy - 7, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Whiskers
  ctx.strokeStyle = "#ffffff70";
  ctx.lineWidth = 0.8;
  [
    [cx + 6, cy - 7, cx - 4, cy - 8],
    [cx + 6, cy - 7, cx + 15, cy - 8],
    [cx + 6, cy - 6, cx - 4, cy - 5],
    [cx + 6, cy - 6, cx + 15, cy - 5],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  // Tabby stripes
  ctx.strokeStyle = "#c07018";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 2);
  ctx.lineTo(cx - 3, cy + 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx + 1, cy - 1);
  ctx.stroke();
}

function drawMess(ctx, mx, my, tick) {
  // Poop pile with smell waves
  ctx.fillStyle = "#6a3a10";
  ctx.beginPath();
  ctx.ellipse(mx, my + 6, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx, my + 2, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx, my - 1, 3.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a4a18";
  ctx.beginPath();
  ctx.ellipse(mx - 1, my + 5, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Smell lines
  ctx.strokeStyle = "#60a82080";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const off = i * 5,
      sw = Math.sin(tick * 0.1 + i * 2.1) * 3;
    ctx.beginPath();
    ctx.moveTo(mx - 4 + off, my - 4);
    ctx.quadraticCurveTo(mx - 6 + off + sw, my - 10, mx - 4 + off, my - 16);
    ctx.stroke();
  }
}

// ── drawGoose ──────────────────────────────────────────────────────
function drawGoose(ctx, cx, cy, tick, state, gooseObj) {
  const phase = tick * 0.05;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 11, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state === "napping") {
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dde0e4";
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 3, 7, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e88a20";
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy + 1);
    ctx.lineTo(cx + 11, cy + 2);
    ctx.lineTo(cx + 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    const zOff = Math.sin(tick * 0.06) * 2;
    ctx.fillStyle = "rgba(150,180,255,0.7)";
    ctx.font = "bold 7px monospace";
    ctx.fillText("z", cx + 10, cy - 6 + zOff);
    ctx.fillText("z", cx + 14, cy - 11 + zOff);
    return;
  }

  if (state === "swimming") {
    ctx.fillStyle = "#4488cc30";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4488cc50";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const rOff = Math.sin(tick * 0.08 + i * 1.5) * 3;
      ctx.beginPath();
      ctx.arc(cx + i * 6 + rOff, cy + 9, 4, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 6, 3.5, 7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - 13, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e88a20";
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy - 14);
    ctx.lineTo(cx + 15, cy - 13);
    ctx.lineTo(cx + 9, cy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 14, 1.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (state === "hiding_bush") {
    ctx.fillStyle = "#2a8a40";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e7030";
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy + 5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#34a050";
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e88a20";
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 7);
    ctx.lineTo(cx + 9, cy - 6);
    ctx.lineTo(cx + 4, cy - 5);
    ctx.closePath();
    ctx.fill();
    const eyeShift = Math.sin(tick * 0.1) * 1.5;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cx - 1 + eyeShift, cy - 7, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2 + eyeShift, cy - 7, 1.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const wobble = state === "waddling" ? Math.sin(phase * 2) * 2 : 0;
  const neckExt = state === "honking" || state === "bothering_cat" ? 4 : 0;
  const lowPosture = state === "chasing_agent" ? 3 : 0;
  const peckOff =
    state === "pecking" ? (Math.sin(tick * 0.3) * 0.5 + 0.5) * 8 : 0;
  const flapAngle = state === "flapping" ? Math.sin(tick * 0.2) * 0.8 : 0;
  const flapLift =
    state === "flapping" ? Math.abs(Math.sin(tick * 0.2)) * 3 : 0;

  const bodyY = cy + 3 + lowPosture - flapLift;

  // Orange feet
  ctx.fillStyle = "#e88a20";
  const footStep =
    state === "waddling" || state === "stealing" || state === "chasing_agent"
      ? Math.sin(phase * 3) * 3
      : 0;
  ctx.beginPath();
  ctx.ellipse(cx - 3 + footStep, cy + 11, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 3 - footStep, cy + 11, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d07818";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 5 + footStep, cy + 11);
  ctx.lineTo(cx - 3 + footStep, cy + 10);
  ctx.lineTo(cx - 1 + footStep, cy + 11);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 1 - footStep, cy + 11);
  ctx.lineTo(cx + 3 - footStep, cy + 10);
  ctx.lineTo(cx + 5 - footStep, cy + 11);
  ctx.stroke();

  // Tail feathers
  ctx.fillStyle = "#e0e3e8";
  ctx.beginPath();
  ctx.moveTo(cx - 8, bodyY + 1);
  ctx.lineTo(cx - 14, bodyY - 3);
  ctx.lineTo(cx - 12, bodyY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 8, bodyY + 2);
  ctx.lineTo(cx - 15, bodyY - 1);
  ctx.lineTo(cx - 13, bodyY + 5);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.ellipse(cx + wobble, bodyY, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dde0e4";
  ctx.beginPath();
  ctx.ellipse(cx + wobble + 1, bodyY + 2, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  if (state === "flapping") {
    ctx.fillStyle = "#e8eaee";
    ctx.save();
    ctx.translate(cx - 5, bodyY - 2);
    ctx.rotate(-flapAngle - 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 5, bodyY - 2);
    ctx.rotate(flapAngle + 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (tick % 8 < 2) {
      ctx.fillStyle = "rgba(220,225,235,0.6)";
      for (let i = 0; i < 3; i++) {
        const fx = cx + (Math.random() - 0.5) * 20,
          fy = bodyY - 10 + Math.random() * 6;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 2, 1, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (state === "chasing_agent") {
    ctx.fillStyle = "#e8eaee";
    ctx.beginPath();
    ctx.ellipse(cx - 6, bodyY - 1, 3, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, bodyY - 1, 3, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#e0e3e8";
    ctx.beginPath();
    ctx.ellipse(cx - 5, bodyY + 1, 3, 5.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, bodyY + 1, 3, 5.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck
  const neckBaseX = cx + 6 + wobble;
  const neckBaseY = bodyY - 4;
  const neckTopY = neckBaseY - 10 - neckExt + peckOff;
  const neckTopX = neckBaseX + 2;
  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.moveTo(neckBaseX - 3, neckBaseY);
  ctx.quadraticCurveTo(neckTopX - 4, neckTopY + 5, neckTopX - 3, neckTopY);
  ctx.lineTo(neckTopX + 3, neckTopY);
  ctx.quadraticCurveTo(neckTopX + 4, neckTopY + 5, neckBaseX + 3, neckBaseY);
  ctx.closePath();
  ctx.fill();

  // Head
  const headX = neckTopX;
  const headY = neckTopY - 2;
  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.ellipse(headX, headY, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#e88a20";
  if (state === "honking" || state === "bothering_cat") {
    ctx.beginPath();
    ctx.moveTo(headX + 4, headY - 2);
    ctx.lineTo(headX + 13, headY - 4);
    ctx.lineTo(headX + 4, headY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headX + 4, headY);
    ctx.lineTo(headX + 13, headY + 3);
    ctx.lineTo(headX + 4, headY + 2);
    ctx.closePath();
    ctx.fill();
  } else if (state === "stealing") {
    ctx.beginPath();
    ctx.moveTo(headX + 4, headY - 1);
    ctx.lineTo(headX + 11, headY);
    ctx.lineTo(headX + 4, headY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f7d060";
    ctx.fillRect(headX + 9, headY - 1, 7, 3);
    ctx.fillStyle = "#f06060";
    ctx.fillRect(headX + 14, headY - 1, 3, 3);
  } else {
    ctx.beginPath();
    ctx.moveTo(headX + 4, headY - 1);
    ctx.lineTo(headX + 11, headY);
    ctx.lineTo(headX + 4, headY + 1);
    ctx.closePath();
    ctx.fill();
  }

  // Eye
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(headX + 1, headY - 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(headX + 0.5, headY - 2, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // State effects
  if (state === "honking") {
    const vib = Math.sin(tick * 0.5) * 1.5;
    ctx.save();
    ctx.fillStyle = "#ff3333";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HONK!", cx + vib, headY - 12);
    ctx.restore();
    ctx.textAlign = "left";
  }

  if (state === "bothering_cat") {
    if ((tick >> 3) & 1) {
      ctx.fillStyle = "rgba(255,60,60,0.8)";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("honk", cx, headY - 10);
      ctx.textAlign = "left";
    }
  }

  if (state === "pecking") {
    if (tick % 6 < 2) {
      ctx.fillStyle = "rgba(160,140,100,0.5)";
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(
          cx + 8 + Math.random() * 6,
          cy + 8 + Math.random() * 4,
          2,
          2,
        );
      }
    }
  }
}

class CatState {
  constructor() {
    this.tx = 5 + Math.random() * (COLS * 0.5);
    this.ty = 3 + Math.random() * 4;
    this.targetTx = this.tx;
    this.targetTy = this.ty;
    this.state = "sitting"; // sitting, walking, sleeping, pooping, eating, playing, grooming, stretching, hunting, knocking, zoomies, purring, window_watching, hiding, scared
    this.stateTimer = 4 + Math.random() * 6;
    this.flip = false;
    this.messExists = false;
    this.messTx = 0;
    this.messTy = 0;
    this.cleaningAgentId = null;
    this.messAssignTimer = 0;
    this.eatTarget = null; // which bowl it's heading to
    // New state properties
    this.playAngle = 0; // playing: spinning angle
    this.groomPhase = 0; // grooming: paw animation phase
    this.huntPhase = 0; // hunting: 0=crouch/wiggle, 1=pounce
    this.huntPounceTimer = 0;
    this.knockPhase = 0; // knocking: 0=walking, 1=pause, 2=push
    this.knockParticle = null; // {x,y,vy} falling item
    this.zoomieTimer = 0; // time until next direction change
    this.zoomieTrails = []; // speed line positions
    this.purrTarget = null; // agent being purred at
    this.purrHearts = []; // [{x,y,life}]
    this.hideDesk = null; // desk being hidden under
    this.scaredTimer = 0; // how long scared state lasts
    this.prevState = ""; // for stretching transition from sleeping
  }
  get sx() {
    return OX + this.tx * T + T / 2;
  }
  get sy() {
    return OY + this.ty * T + T / 2;
  }

  pickTarget() {
    // 30% chance to head to a food bowl (only if it has food)
    const fullBowls = CAT_BOWLS.filter((b) => b.hasFod);
    if (fullBowls.length > 0 && Math.random() < 0.3) {
      const bowl = fullBowls[Math.floor(Math.random() * fullBowls.length)];
      this.targetTx = bowl.tx + 0.5;
      this.targetTy = bowl.ty + 0.5;
      this.eatTarget = bowl;
    } else {
      this.eatTarget = null;
      // Wander around main office floor (avoid kitchen and walls)
      this.targetTx = 2 + Math.random() * Math.min(COLS - 8, 20);
      this.targetTy = 2 + Math.random() * Math.max(4, Math.min(ROWS * 0.6, 12));
    }
  }

  _findNearestDesk() {
    let best = null,
      bestD = Infinity;
    for (const d of DESK_DEFS) {
      const dx = d.tx - this.tx,
        dy = d.ty - this.ty;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  }
  _findIdleAgent() {
    let best = null,
      bestD = Infinity;
    for (const [id, sp] of Object.entries(agentStates)) {
      if (sp.arrived && !sp.isWorking) {
        const dx = sp.tx - this.tx,
          dy = sp.ty - this.ty;
        const dist = dx * dx + dy * dy;
        if (dist < bestD) {
          bestD = dist;
          best = sp;
        }
      }
    }
    return best;
  }

  update(dt, tick) {
    this.stateTimer -= dt;

    // --- Scared interrupt: check if any agent is within 1.5 tiles and moving ---
    if (this.state !== "scared" && this.state !== "hiding") {
      for (const sp of Object.values(agentStates)) {
        if (sp.state === "walking" && !sp.arrived) {
          const dx = sp.tx - this.tx,
            dy = sp.ty - this.ty;
          if (Math.sqrt(dx * dx + dy * dy) < 1.5) {
            this.prevState = this.state;
            this.state = "scared";
            this.scaredTimer = 2;
            this.stateTimer = 2;
            // Run away from the agent
            this.targetTx = this.tx + (this.tx - sp.tx) * 3;
            this.targetTy = this.ty + (this.ty - sp.ty) * 3;
            this.targetTx = Math.max(2, Math.min(COLS - 3, this.targetTx));
            this.targetTy = Math.max(2, Math.min(ROWS * 0.6, this.targetTy));
            break;
          }
        }
      }
    }

    // --- Walking ---
    if (this.state === "walking") {
      const dtx = this.targetTx - this.tx,
        dty = this.targetTy - this.ty;
      const dist = Math.sqrt(dtx * dtx + dty * dty);
      if (dist < 0.25) {
        if (this.eatTarget && this.eatTarget.hasFod) {
          this.eatTarget.hasFod = false; // eat the food
          this.state = "eating";
          this.stateTimer = 4 + Math.random() * 5;
        } else if (this.eatTarget && !this.eatTarget.hasFod) {
          this.eatTarget = null;
          this.state = "sitting";
          this.stateTimer = 2;
        } else {
          this.state = "sitting";
          this.stateTimer = 5 + Math.random() * 10;
        }
      } else {
        const step = Math.min(1.2 * dt, dist);
        this.tx += (dtx / dist) * step;
        this.ty += (dty / dist) * step;
        this.flip = dtx < 0;
      }
    }

    // --- Scared: run away fast ---
    if (this.state === "scared") {
      this.scaredTimer -= dt;
      const dtx = this.targetTx - this.tx,
        dty = this.targetTy - this.ty;
      const dist = Math.sqrt(dtx * dtx + dty * dty);
      if (dist > 0.25) {
        const step = Math.min(3.5 * dt, dist); // fast!
        this.tx += (dtx / dist) * step;
        this.ty += (dty / dist) * step;
        this.flip = dtx < 0;
      }
      if (this.scaredTimer <= 0) {
        this.state = "sitting";
        this.stateTimer = 3 + Math.random() * 4;
      }
    }

    // --- Playing (spinning) ---
    if (this.state === "playing") {
      this.playAngle += dt * 4; // spin speed
    }

    // --- Grooming ---
    if (this.state === "grooming") {
      this.groomPhase += dt * 3;
    }

    // --- Hunting ---
    if (this.state === "hunting") {
      if (this.huntPhase === 0) {
        // Crouch and wiggle butt for first 2 seconds
        if (this.stateTimer < (this._huntDuration || 4) - 2) {
          this.huntPhase = 1;
          this.huntPounceTimer = 0.3;
          // Pounce forward ~2 tiles in facing direction
          const angle = Math.random() * Math.PI * 2;
          this.targetTx = Math.max(
            2,
            Math.min(COLS - 3, this.tx + Math.cos(angle) * 2),
          );
          this.targetTy = Math.max(
            2,
            Math.min(ROWS * 0.6, this.ty + Math.sin(angle) * 2),
          );
        }
      }
      if (this.huntPhase === 1) {
        const dtx = this.targetTx - this.tx,
          dty = this.targetTy - this.ty;
        const dist = Math.sqrt(dtx * dtx + dty * dty);
        if (dist > 0.15) {
          const step = Math.min(5 * dt, dist); // fast pounce
          this.tx += (dtx / dist) * step;
          this.ty += (dty / dist) * step;
          this.flip = dtx < 0;
        }
      }
    }

    // --- Knocking ---
    if (this.state === "knocking") {
      if (this.knockPhase === 0) {
        // Walking to desk
        const dtx = this.targetTx - this.tx,
          dty = this.targetTy - this.ty;
        const dist = Math.sqrt(dtx * dtx + dty * dty);
        if (dist < 0.3) {
          this.knockPhase = 1;
          this.stateTimer = 1.5; // pause at desk
        } else {
          const step = Math.min(1.2 * dt, dist);
          this.tx += (dtx / dist) * step;
          this.ty += (dty / dist) * step;
          this.flip = dtx < 0;
        }
      } else if (this.knockPhase === 1 && this.stateTimer <= 0.5) {
        // Push something off!
        this.knockPhase = 2;
        this.knockParticle = { x: this.sx, y: this.sy - 5, vy: 0 };
      }
      if (this.knockPhase === 2 && this.knockParticle) {
        this.knockParticle.vy += 200 * dt;
        this.knockParticle.y += this.knockParticle.vy * dt;
        this.knockParticle.x += 20 * dt;
      }
    }

    // --- Zoomies ---
    if (this.state === "zoomies") {
      this.zoomieTimer -= dt;
      if (this.zoomieTimer <= 0) {
        this.zoomieTimer = 0.3 + Math.random() * 0.4;
        this.targetTx = 2 + Math.random() * Math.min(COLS - 4, 22);
        this.targetTy = 2 + Math.random() * Math.max(4, ROWS * 0.5);
      }
      const dtx = this.targetTx - this.tx,
        dty = this.targetTy - this.ty;
      const dist = Math.sqrt(dtx * dtx + dty * dty);
      if (dist > 0.2) {
        const step = Math.min(3.6 * dt, dist); // triple speed
        this.tx += (dtx / dist) * step;
        this.ty += (dty / dist) * step;
        this.flip = dtx < 0;
      }
      // Speed trail
      if (tick % 3 === 0) {
        this.zoomieTrails.push({ x: this.sx, y: this.sy, life: 0.5 });
      }
      this.zoomieTrails = this.zoomieTrails.filter((t) => {
        t.life -= dt;
        return t.life > 0;
      });
    }

    // --- Purring ---
    if (this.state === "purring") {
      if (this.purrTarget) {
        const dtx = this.purrTarget.tx - this.tx,
          dty = this.purrTarget.ty - this.ty;
        const dist = Math.sqrt(dtx * dtx + dty * dty);
        if (dist > 1.0) {
          const step = Math.min(1.2 * dt, dist);
          this.tx += (dtx / dist) * step;
          this.ty += (dty / dist) * step;
          this.flip = dtx < 0;
        }
      }
      // Heart particles
      if (tick % 20 === 0) {
        this.purrHearts.push({
          x: this.sx + (Math.random() - 0.5) * 8,
          y: this.sy - 15,
          life: 1.5,
        });
      }
      this.purrHearts = this.purrHearts.filter((h) => {
        h.life -= dt;
        h.y -= 15 * dt;
        return h.life > 0;
      });
    }

    // --- Window watching: face top wall ---
    if (this.state === "window_watching") {
      // Walk to top-ish area if not there
      if (this.ty > 2.5) {
        const dtx = this.targetTx - this.tx,
          dty = this.targetTy - this.ty;
        const dist = Math.sqrt(dtx * dtx + dty * dty);
        if (dist > 0.3) {
          const step = Math.min(1.2 * dt, dist);
          this.tx += (dtx / dist) * step;
          this.ty += (dty / dist) * step;
        }
      }
    }

    // --- Hiding ---
    if (this.state === "hiding") {
      if (this.hideDesk) {
        const dtx = this.hideDesk.tx + 0.5 - this.tx,
          dty = this.hideDesk.ty + 1 - this.ty;
        const dist = Math.sqrt(dtx * dtx + dty * dty);
        if (dist > 0.3) {
          const step = Math.min(1.2 * dt, dist);
          this.tx += (dtx / dist) * step;
          this.ty += (dty / dist) * step;
          this.flip = dtx < 0;
        }
      }
    }

    // --- Eating timer ---
    if (this.state === "eating" && this.stateTimer <= 0) {
      this.eatTarget = null;
      this.state = "walking";
      this.pickTarget();
      this.stateTimer = 3 + Math.random() * 6;
    }

    // --- State transitions ---
    if (
      this.stateTimer <= 0 &&
      this.state !== "eating" &&
      this.state !== "scared"
    ) {
      const wasState = this.state;
      this.prevState = wasState;
      const r = Math.random();
      // Stretching only from sleeping
      if (wasState === "sleeping" && Math.random() < 0.5) {
        this.state = "stretching";
        this.stateTimer = 3 + Math.random();
      } else if (r < 0.2) {
        this.state = "walking";
        this.pickTarget();
        this.stateTimer = 4 + Math.random() * 8;
      } else if (r < 0.35) {
        this.state = "sleeping";
        this.stateTimer = 10 + Math.random() * 20;
      } else if (r < 0.45) {
        this.state = "sitting";
        this.stateTimer = 5 + Math.random() * 8;
      } else if (!this.messExists && r < 0.48) {
        this.state = "pooping";
        this.stateTimer = 4 + Math.random() * 3;
      } else if (r < 0.56) {
        this.state = "playing";
        this.playAngle = 0;
        this.stateTimer = 5 + Math.random() * 3;
      } else if (r < 0.66) {
        this.state = "grooming";
        this.groomPhase = 0;
        this.stateTimer = 6 + Math.random() * 4;
      } else if (r < 0.71) {
        this.state = "hunting";
        this.huntPhase = 0;
        this._huntDuration = 3 + Math.random() * 2;
        this.stateTimer = this._huntDuration;
      } else if (r < 0.75) {
        // Knocking — walk to nearest desk
        const desk = this._findNearestDesk();
        if (desk) {
          this.state = "knocking";
          this.knockPhase = 0;
          this.knockParticle = null;
          this.targetTx = desk.tx + 1;
          this.targetTy = desk.ty + 1;
          this.stateTimer = 6;
        } else {
          this.state = "sitting";
          this.stateTimer = 4;
        }
      } else if (r < 0.8) {
        this.state = "zoomies";
        this.zoomieTimer = 0;
        this.zoomieTrails = [];
        this.stateTimer = 4 + Math.random();
      } else if (r < 0.88) {
        // Purring — find idle agent
        const agent = this._findIdleAgent();
        if (agent) {
          this.state = "purring";
          this.purrTarget = agent;
          this.purrHearts = [];
          this.targetTx = agent.tx + 0.5;
          this.targetTy = agent.ty + 0.5;
          this.stateTimer = 8 + Math.random() * 6;
        } else {
          this.state = "sitting";
          this.stateTimer = 4;
        }
      } else if (r < 0.93) {
        // Window watching — go to top wall
        this.state = "window_watching";
        this.targetTx = 3 + Math.random() * (COLS * 0.5);
        this.targetTy = 1.5;
        this.stateTimer = 10 + Math.random() * 5;
      } else if (r < 0.95) {
        // Hiding under desk
        const desk = this._findNearestDesk();
        if (desk) {
          this.state = "hiding";
          this.hideDesk = desk;
          this.stateTimer = 8 + Math.random() * 4;
        } else {
          this.state = "sitting";
          this.stateTimer = 4;
        }
      } else {
        this.state = "sitting";
        this.stateTimer = 4 + Math.random() * 6;
      }
    }
    // After pooping, leave mess and walk away
    if (this.state === "pooping" && this.stateTimer < 1 && !this.messExists) {
      this.messExists = true;
      this.messTx = this.tx;
      this.messTy = this.ty + 1;
      this.state = "walking";
      this.pickTarget();
      this.stateTimer = 5;
    }
  }

  draw(ctx, tick) {
    // Speed trails for zoomies (draw behind cat)
    if (this.state === "zoomies") {
      for (const t of this.zoomieTrails) {
        ctx.strokeStyle = `rgba(180,180,200,${t.life * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(t.x - 6, t.y);
        ctx.lineTo(t.x + 6, t.y);
        ctx.stroke();
      }
    }
    ctx.save();
    if (this.flip) {
      ctx.translate(this.sx, this.sy);
      ctx.scale(-1, 1);
      ctx.translate(-this.sx, -this.sy);
    }
    drawCat(ctx, this.sx, this.sy, tick, this.state, this);
    ctx.restore();
    // Purring hearts
    if (this.state === "purring") {
      for (const h of this.purrHearts) {
        ctx.fillStyle = `rgba(255,96,128,${Math.min(1, h.life)})`;
        ctx.font = `${8 + (1.5 - h.life) * 4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("\u2665", h.x, h.y);
      }
      ctx.textAlign = "left";
    }
    // Knock particle (falling item)
    if (this.knockParticle && this.state === "knocking") {
      const p = this.knockParticle;
      ctx.fillStyle = "#aab0d0";
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.fillStyle = "#8890b0";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    // Draw mess
    if (this.messExists) {
      drawMess(
        ctx,
        OX + this.messTx * T + T / 2,
        OY + this.messTy * T + T / 2,
        tick,
      );
    }
  }
}

const cat = new CatState();

// ════════════════════════════════════════════════════════════════
//  GOOSE STATE — Untitled Goose Game-style troublemaker
// ════════════════════════════════════════════════════════════════
class GooseState {
  constructor() {
    // Goose roams the main office floor + entertainment zone
    this.tx = 5 + Math.random() * 10;
    this.ty = 3 + Math.random() * 6;
    this.targetTx = this.tx;
    this.targetTy = this.ty;
    this.state = "waddling";
    this.stateTimer = 4 + Math.random() * 4;
    this.flip = false;
    this.chaseTarget = null;
    this.chaseTimer = 0;
    this.stolenItem = false;
    this.plantSpot = null;
  }
  get sx() {
    return OX + this.tx * T + T / 2;
  }
  get sy() {
    return OY + this.ty * T + T / 2;
  }

  _pickWanderTarget() {
    this.targetTx = 2 + Math.random() * Math.min(COLS - 4, 22);
    this.targetTy = 2 + Math.random() * Math.max(4, ROWS * 0.6);
  }

  _findNearestDesk() {
    let best = null,
      bestD = Infinity;
    for (const d of DESK_DEFS) {
      const dx = d.tx - this.tx,
        dy = d.ty - this.ty;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  }

  _findRandomAgent() {
    const agents = Object.values(agentStates).filter((s) => s.arrived);
    if (agents.length === 0) return null;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  _findPlantSpot() {
    const plants = IDLE_SPOTS.filter((s) => s.type === "plant");
    if (plants.length === 0) return null;
    return plants[Math.floor(Math.random() * plants.length)];
  }

  _findAquariumSpot() {
    const aq = IDLE_SPOTS.find((s) => s.type === "aquarium");
    return aq || null;
  }

  _moveToward(targetX, targetY, speed, dt) {
    const dtx = targetX - this.tx,
      dty = targetY - this.ty;
    const dist = Math.sqrt(dtx * dtx + dty * dty);
    if (dist < 0.25) return true;
    const step = Math.min(speed * dt, dist);
    this.tx += (dtx / dist) * step;
    this.ty += (dty / dist) * step;
    this.flip = dtx < 0;
    return false;
  }

  update(dt, tick) {
    this.stateTimer -= dt;

    // Waddling
    if (this.state === "waddling") {
      if (this._moveToward(this.targetTx, this.targetTy, 1.6, dt)) {
        this.stateTimer = 0;
      }
    }

    // Honking — just stands still, timer runs out
    // Stealing — run to desk, grab item, run away
    if (this.state === "stealing") {
      if (!this.stolenItem) {
        if (this._moveToward(this.targetTx, this.targetTy, 2.0, dt)) {
          this.stolenItem = true;
          this._pickWanderTarget();
        }
      } else {
        this._moveToward(this.targetTx, this.targetTy, 2.8, dt);
      }
    }

    // Chasing agent
    if (this.state === "chasing_agent") {
      this.chaseTimer -= dt;
      if (this.chaseTarget) {
        const sp = this.chaseTarget;
        if (agentStates[sp.id]) {
          this._moveToward(sp.tx, sp.ty, 2.2, dt);
        }
      }
      if (this.chaseTimer <= 0) {
        this.stateTimer = 0;
      }
    }

    // Swimming — sit still at aquarium
    // Flapping — stand in place
    // Pecking — stand in place

    // Hiding in bush — walk to plant, then sit
    if (this.state === "hiding_bush" && this.plantSpot) {
      this._moveToward(this.plantSpot.tx, this.plantSpot.ty, 1.4, dt);
    }

    // Bothering cat — walk toward cat
    if (this.state === "bothering_cat") {
      this._moveToward(cat.tx, cat.ty, 1.8, dt);
    }

    // Swimming — walk to aquarium then sit
    if (this.state === "swimming" && this._swimTarget) {
      this._moveToward(this._swimTarget.tx, this._swimTarget.ty, 1.4, dt);
    }

    // State transitions
    if (this.stateTimer <= 0) {
      this._changeState();
    }
  }

  _changeState() {
    const r = Math.random();

    // 20% chance to honk on any state change
    if (Math.random() < 0.2) {
      this.state = "honking";
      this.stateTimer = 2 + Math.random() * 2;
      return;
    }

    // 5% chance to steal
    if (Math.random() < 0.05) {
      const desk = this._findNearestDesk();
      if (desk) {
        this.state = "stealing";
        this.stolenItem = false;
        this.targetTx = desk.tx + 1;
        this.targetTy = desk.ty + 1;
        this.stateTimer = 8 + Math.random() * 4;
        return;
      }
    }

    if (r < 0.25) {
      this.state = "waddling";
      this._pickWanderTarget();
      this.stateTimer = 5 + Math.random() * 6;
    } else if (r < 0.35) {
      this.state = "pecking";
      this.stateTimer = 3 + Math.random() * 3;
    } else if (r < 0.45) {
      this.state = "flapping";
      this.stateTimer = 3 + Math.random() * 2;
    } else if (r < 0.55) {
      const agent = this._findRandomAgent();
      if (agent) {
        this.state = "chasing_agent";
        this.chaseTarget = agent;
        this.chaseTimer = 8 + Math.random() * 2;
        this.stateTimer = this.chaseTimer;
      } else {
        this.state = "waddling";
        this._pickWanderTarget();
        this.stateTimer = 4;
      }
    } else if (r < 0.62) {
      const plant = this._findPlantSpot();
      if (plant) {
        this.state = "hiding_bush";
        this.plantSpot = plant;
        this.stateTimer = 6 + Math.random() * 4;
      } else {
        this.state = "waddling";
        this._pickWanderTarget();
        this.stateTimer = 4;
      }
    } else if (r < 0.7) {
      this.state = "bothering_cat";
      this.stateTimer = 5 + Math.random() * 3;
    } else if (r < 0.78) {
      const aq = this._findAquariumSpot();
      if (aq) {
        this.state = "swimming";
        this._swimTarget = aq;
        this.stateTimer = 8 + Math.random() * 5;
      } else {
        this.state = "pecking";
        this.stateTimer = 3;
      }
    } else if (r < 0.88) {
      this.state = "napping";
      this.stateTimer = 10 + Math.random() * 10;
    } else {
      this.state = "honking";
      this.stateTimer = 2 + Math.random() * 2;
    }
  }

  draw(ctx, tick) {
    ctx.save();
    if (this.flip) {
      ctx.translate(this.sx, this.sy);
      ctx.scale(-1, 1);
      ctx.translate(-this.sx, -this.sy);
    }
    drawGoose(ctx, this.sx, this.sy, tick, this.state, this);
    ctx.restore();
  }
}

let goose = new GooseState();

// Bowl refill tracking: [{agentId, bowlIdx, refillTimer}]
const bowlRefills = {}; // bowlIdx -> {agentId, timer}

// ════════════════════════════════════════════════════════════════
//  VENDING MACHINE  (snack/drink dispenser with LED display)
// ════════════════════════════════════════════════════════════════
function drawVendingMachine(ctx, x, y, tick) {
  ctx.save();
  const vmW = 26,
    vmH = 50;

  // Cabinet body
  ctx.fillStyle = "#1a2a3a";
  ctx.fillRect(x, y, vmW, vmH);
  ctx.fillStyle = "#223344";
  ctx.fillRect(x + 1, y + 1, vmW - 2, vmH - 2);

  // Top LED brand panel
  const hue = (tick * 2) % 360;
  ctx.fillStyle = `hsl(${hue},90%,40%)`;
  ctx.fillRect(x + 2, y + 2, vmW - 4, 7);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 4px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SNACKS", x + vmW / 2, y + 7);
  ctx.textAlign = "left";

  // Glass display panel
  ctx.fillStyle = "#0a1828";
  ctx.fillRect(x + 2, y + 11, vmW - 4, 26);
  ctx.strokeStyle = "#304860";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 11, vmW - 4, 26);

  // Product rows (3 rows x 3 cols)
  const PRODUCTS = [
    { c: "#e07040", label: "●" }, // chips
    { c: "#40a0e0", label: "▲" }, // drink
    { c: "#e0c040", label: "■" }, // candy
  ];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const px2 = x + 4 + col * 7;
      const py2 = y + 13 + row * 8;
      const prod = PRODUCTS[(row + col) % 3];
      // Slot background
      ctx.fillStyle = "#0d2035";
      ctx.fillRect(px2, py2, 6, 6);
      // Product glow
      const glow = 0.6 + Math.sin(tick * 0.03 + row + col) * 0.2;
      ctx.globalAlpha = glow;
      ctx.fillStyle = prod.c;
      ctx.fillRect(px2 + 1, py2 + 1, 4, 4);
      ctx.globalAlpha = 1;
    }
  }

  // LED display (coin/selection indicator)
  ctx.fillStyle = "#001008";
  ctx.fillRect(x + 3, y + 38, vmW - 6, 6);
  const blink = Math.floor(tick / 20) % 2;
  ctx.fillStyle = blink ? "#40ff80" : "#206040";
  ctx.font = "4px monospace";
  ctx.textAlign = "center";
  ctx.fillText(blink ? "INSERT $" : "A1  ->", x + vmW / 2, y + 43);
  ctx.textAlign = "left";

  // Coin slot & dispense tray
  ctx.fillStyle = "#304860";
  ctx.fillRect(x + vmW - 7, y + 38, 5, 2); // coin slot
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(x + 3, y + 45, vmW - 6, 4); // tray

  // Side highlight
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#a0d0ff";
  ctx.fillRect(x + 1, y + 1, 3, vmH - 2);
  ctx.globalAlpha = 1;

  // Base shadow
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(x + 1, y + vmH - 1, vmW - 2, 2);

  // Label below
  ctx.fillStyle = "#607080";
  ctx.font = "4px 'Press Start 2P',monospace";
  ctx.textAlign = "center";
  ctx.fillText("VEND", x + vmW / 2, y + vmH + 10);
  ctx.textAlign = "left";
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
//  GAME LOOP  (delta-time based)
// ════════════════════════════════════════════════════════════════
const canvas = document.getElementById("office");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const agentsData = {};
const agentStates = {};
const idleOccupied = {}; // slotIdx → agentId  (persistent, exclusive slots)
const doorAnim = { open: 0, target: 0, timer: 0 }; // entrance door swing
let globalTick = 0;
let lastTime = 0;
const startTime = Date.now();

// ── Side panel helpers ────────────────────────────────────────────
function drawLeftPanel(ctx, tick) {
  const W = OX - 6,
    H = CH;
  // Background
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a1c2e";
  ctx.fillRect(W, 0, 3, H);

  // Title
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("◈ AGENTS", W / 2, 22);
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(6, 28, W - 12, 1);

  let y = 46;
  const entries = Object.entries(agentStates);
  for (const [id, sp] of entries) {
    const ad = agentsData[id];
    if (!ad) continue;
    const role = getRole(ad);
    const isWork = sp.isWorking;
    const status = ad.status || "idle";

    // Row bg for working agents
    if (isWork) {
      ctx.fillStyle = "rgba(122,162,247,0.10)";
      ctx.fillRect(4, y - 14, W - 8, 26);
    }

    // Status dot
    const dotC = isWork
      ? "#9ece6a"
      : status === "thinking"
        ? "#e0af68"
        : "#3d4466";
    ctx.fillStyle = dotC;
    ctx.beginPath();
    ctx.arc(13, y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    if (isWork) {
      ctx.fillStyle = dotC + "40";
      ctx.beginPath();
      ctx.arc(13, y - 3, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Role name
    ctx.fillStyle = isWork ? "#e4ecff" : "#8892b0";
    ctx.font = (isWork ? "bold " : "") + "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(role.substring(0, 11), 24, y);

    // Tool / state badge
    if (isWork && ad.currentTool) {
      ctx.fillStyle = "#bb9af7";
      ctx.font = "9px monospace";
      ctx.fillText(ad.currentTool.substring(0, 11), 24, y + 12);
    } else if (!isWork && sp.activityAnim) {
      ctx.fillStyle = "#3d4466";
      ctx.font = "9px monospace";
      ctx.fillText(
        sp.activityAnim.replace(/_/g, " ").substring(0, 13),
        24,
        y + 12,
      );
    }

    y += 28;
    if (y > H - 28) break;
  }

  // Footer — total count
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(6, H - 28, W - 12, 1);
  ctx.fillStyle = "#565f89";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  const total = entries.length;
  const working = entries.filter(([, s]) => s.isWorking).length;
  ctx.fillText(`${working}/${total} working`, W / 2, H - 10);
}

function drawRightPanel(ctx, tick) {
  const panelX = CW - OX + 3;
  const W = OX - 6,
    H = CH;

  // Background
  ctx.fillStyle = "#1a1c2e";
  ctx.fillRect(panelX - 3, 0, 3, H);
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(panelX, 0, W + 6, H);

  // Title
  ctx.fillStyle = "#bb9af7";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("◈ STATS", panelX + W / 2, 22);
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panelX + 6, 28, W - 12, 1);

  const label = (txt, val, col, yy) => {
    ctx.fillStyle = "#565f89";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(txt, panelX + 8, yy);
    ctx.fillStyle = col || "#c8d3f5";
    ctx.font = "bold 14px monospace";
    ctx.fillText(String(val), panelX + 8, yy + 16);
  };

  // Uptime
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  label("UPTIME", `${hh}:${mm}:${ss}`, "#7aa2f7", 46);

  // Agent counts
  const agents = Object.values(agentStates);
  const working = agents.filter((s) => s.isWorking).length;
  const idle = agents.length - working;
  label("ONLINE", agents.length, "#9ece6a", 84);
  label("WORKING", working, "#e0af68", 118);
  label("IDLE", idle, "#565f89", 152);

  // Tasks
  const doneTasks =
    typeof myTasks !== "undefined"
      ? myTasks.filter((t) => t.status === "done").length
      : 0;
  const todoTasks =
    typeof myTasks !== "undefined"
      ? myTasks.filter((t) => t.status === "todo").length
      : 0;
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panelX + 6, 180, W - 12, 1);
  label("TODO", todoTasks, "#e0af68", 194);
  label("DONE", doneTasks, "#9ece6a", 228);

  // Cat status
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panelX + 6, 256, W - 12, 1);
  ctx.fillStyle = "#565f89";
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("CAT", panelX + 8, 270);
  const _catMoods = {
    sleeping: "😴 asleep",
    eating: "🍽 eating",
    playing: "🎾 playing",
    grooming: "🧼 grooming",
    stretching: "🙆 stretch",
    hunting: "🎯 hunting",
    knocking: "😈 knocking",
    zoomies: "💨 zoomies!",
    purring: "💕 purring",
    window_watching: "🪟 watching",
    hiding: "🙈 hiding",
    scared: "😱 scared!",
    pooping: "💩 pooping",
  };
  const catMood = cat.messExists
    ? "💩 mess!"
    : _catMoods[cat.state] || "🐱 roaming";
  ctx.fillStyle = cat.messExists ? "#f7768e" : "#c8d3f5";
  ctx.font = "bold 11px monospace";
  ctx.fillText(catMood, panelX + 8, 286);

  // Goose status
  ctx.fillStyle = "#565f89";
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("GOOSE", panelX + 8, 302);
  const _gooseMoods = {
    waddling: "🦆 waddling",
    honking: "📢 HONK!",
    stealing: "🏃 stealing!",
    chasing_agent: "😤 chasing",
    swimming: "🏊 swimming",
    flapping: "🪽 flapping",
    pecking: "🐦 pecking",
    hiding_bush: "🌿 hiding",
    bothering_cat: "😈 annoying",
    napping: "😴 napping",
  };
  const gooseMood = _gooseMoods[goose.state] || "🦆 waddling";
  ctx.fillStyle =
    goose.state === "honking" || goose.state === "stealing"
      ? "#f7768e"
      : "#c8d3f5";
  ctx.font = "bold 11px monospace";
  ctx.fillText(gooseMood, panelX + 8, 318);

  // Mini activity bar
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panelX + 6, 338, W - 12, 1);
  ctx.fillStyle = "#565f89";
  ctx.font = "9px monospace";
  ctx.fillText("ACTIVITY", panelX + 8, 352);
  if (agents.length > 0) {
    const barW = W - 16;
    const wFrac = working / agents.length;
    ctx.fillStyle = "#1a2040";
    ctx.fillRect(panelX + 8, 358, barW, 8);
    ctx.fillStyle = "#9ece6a";
    ctx.fillRect(panelX + 8, 358, barW * wFrac, 8);
    ctx.fillStyle = "#ffffff20";
    ctx.fillRect(panelX + 8, 358, barW, 3);
  }

  // Blinking indicator
  if ((tick >> 4) & 1) {
    ctx.fillStyle = "#9ece6a";
    ctx.beginPath();
    ctx.arc(panelX + W - 10, 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "left";
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  globalTick++;

  // ── Sims arrival effects tick ────────────────────────────────
  for (let i = simsArrivalFx.length - 1; i >= 0; i--) {
    simsArrivalFx[i].life -= dt;
    if (simsArrivalFx[i].life <= 0) simsArrivalFx.splice(i, 1);
  }

  // ── Door animation ────────────────────────────────────────────
  if (doorAnim.timer > 0) {
    doorAnim.timer -= dt;
    if (doorAnim.timer <= 0) doorAnim.target = 0;
  }
  doorAnim.open = lerp(doorAnim.open, doorAnim.target, Math.min(1, dt * 4));

  // ── Sync ─────────────────────────────────────────────────────
  for (const id of Object.keys(agentStates)) {
    if (!agentsData[id]) {
      // Release any held idle slot
      for (const k of Object.keys(idleOccupied)) {
        if (idleOccupied[k] === id) delete idleOccupied[k];
      }
      PS.puff(
        agentStates[id].sx,
        agentStates[id].sy,
        agentStates[id].palette.accent,
      );
      sndRemove();
      doorAnim.target = 1;
      doorAnim.timer = 1.8; // door opens on departure
      delete agentStates[id];
    }
  }
  for (const [id, a] of Object.entries(agentsData)) {
    if (!agentStates[id]) {
      agentStates[id] = new AgentState(id, a.slug);
      PS.burst(
        agentStates[id].sx,
        agentStates[id].sy,
        getPalette(a.slug).accent,
      );
      sndSpawn();
      doorAnim.target = 1;
      doorAnim.timer = 1.8; // door opens on arrival
    }
  }

  // ── Layout ───────────────────────────────────────────────────
  const n = Object.keys(agentsData).length;
  if (generateLayout(Math.max(1, n))) {
    // Clear all slot bookings — layout changed, spots shifted
    for (const k of Object.keys(idleOccupied)) delete idleOccupied[k];
    for (const sp of Object.values(agentStates)) {
      sp.slotIdx = -1;
      sp.arrived = false;
      sp.activityDur = 0;
    }
    syncIdleSpotsToAdmin();
    buildBackground();
    buildObstacleGrid();
  }

  // ── Update ────────────────────────────────────────────────────
  const deskSet = new Set();
  for (const sp of Object.values(agentStates)) {
    if (sp.arrived && sp.slotIdx >= 0 && sp.isWorking) deskSet.add(sp.slotIdx);
  }
  for (const [id, sp] of Object.entries(agentStates))
    sp.update(agentsData[id], deskSet, dt, globalTick);

  // ── Agent separation (soft collision) ──────────────────────────
  {
    const list = Object.values(agentStates);
    const MIN_WALK = 1.2; // distance when both walking
    const MIN_STAND = 0.6; // distance when one is standing (tighter is ok)
    const STRENGTH = 0.6;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        // Skip if both arrived at their spots (they're supposed to be near each other)
        if (a.arrived && b.arrived) continue;
        const dx = a.tx - b.tx,
          dy = a.ty - b.ty;
        const d2 = dx * dx + dy * dy;
        const MIN = !a.arrived && !b.arrived ? MIN_WALK : MIN_STAND;
        if (d2 > MIN * MIN || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const overlap = ((MIN - d) / d) * STRENGTH;
        const nx = dx * overlap,
          ny = dy * overlap;
        if (!a.arrived && !b.arrived) {
          // both walking — push equally apart
          a.tx += nx * 0.5;
          a.ty += ny * 0.5;
          b.tx -= nx * 0.5;
          b.ty -= ny * 0.5;
        } else if (!a.arrived) {
          // b is seated — push a away fully
          a.tx += nx;
          a.ty += ny;
        } else if (!b.arrived) {
          // a is seated — push b away fully
          b.tx -= nx;
          b.ty -= ny;
        }
      }
    }
  }

  // ── Wave / nod when agents pass each other ─────────────────────
  {
    const list = Object.values(agentStates);
    const WAVE_DIST2 = 2.2 * 2.2; // squared tile distance
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        // At least one agent must be walking (in transit)
        if (a.arrived && b.arrived) continue;
        // Skip if either is in greeting cooldown with the other
        if (a._greetCooldown[b.id] || b._greetCooldown[a.id]) continue;
        const dx = a.tx - b.tx,
          dy = a.ty - b.ty;
        if (dx * dx + dy * dy > WAVE_DIST2) continue;
        // Trigger wave — extroverts wave enthusiastically, introverts nod
        a.waveEmoji = a.trait === "extrovert" ? "👋" : "🙂";
        b.waveEmoji = b.trait === "extrovert" ? "👋" : "🙂";
        a.waveTimer = 1.6;
        b.waveTimer = 1.6;
        const cooldown = 22 + Math.random() * 18;
        a._greetCooldown[b.id] = cooldown;
        b._greetCooldown[a.id] = cooldown;
      }
    }
  }

  // ── High-five when both agents working at nearby desks ─────────
  {
    const list = Object.values(agentStates);
    const HIGHFIVE_DIST2 = 3.5 * 3.5; // tiles — desks can be a row apart
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        // Both must be working AND settled at their desk
        if (!a.isWorking || !b.isWorking) continue;
        if (!a.arrived || !b.arrived) continue;
        // Skip if on cooldown with each other
        if (a._highFiveCooldown[b.id] || b._highFiveCooldown[a.id]) continue;
        // Check desk proximity
        const da = DESK_SLOTS[Math.min(a.slotIdx, DESK_SLOTS.length - 1)];
        const db = DESK_SLOTS[Math.min(b.slotIdx, DESK_SLOTS.length - 1)];
        if (!da || !db) continue;
        const dx = da.tx - db.tx,
          dy = da.ty - db.ty;
        if (dx * dx + dy * dy > HIGHFIVE_DIST2) continue;
        // Trigger high-five
        a.highFiveTimer = 2.2;
        b.highFiveTimer = 2.2;
        // Burst particles at midpoint between the two agents
        const mx = (a.sx + b.sx) / 2,
          my = (a.sy + b.sy) / 2 - 20;
        PS.emit(mx, my, 10, {
          vx: 0,
          vy: -40,
          spread: 80,
          gravity: 120,
          life: 0.7,
          size: 3,
          color: a.palette?.accent ?? "#7aa2f7",
        });
        PS.emit(mx, my, 10, {
          vx: 0,
          vy: -40,
          spread: 80,
          gravity: 120,
          life: 0.7,
          size: 3,
          color: b.palette?.accent ?? "#9ece6a",
        });
        const cooldown = 40 + Math.random() * 30;
        a._highFiveCooldown[b.id] = cooldown;
        b._highFiveCooldown[a.id] = cooldown;
      }
    }
  }

  cat.update(dt, globalTick);
  goose.update(dt, globalTick);

  // ── Ping pong ball physics ──────────────────────────────────────
  {
    // Active only when both players are at their spots
    const ppPair = GROUP_PAIRS[10];
    const bothHere =
      ppPair &&
      ppPair.every((idx) => {
        const holder = idleOccupied[idx];
        return holder && agentStates[holder]?.arrived;
      });
    ppBall.active = bothHere;
    if (ppBall.active) {
      ppBall.t += ppBall.dir * ppBall.speed * dt;
      if (ppBall.t >= 1) {
        ppBall.t = 1;
        ppBall.dir = -1;
      }
      if (ppBall.t <= 0) {
        ppBall.t = 0;
        ppBall.dir = 1;
      }
    }
  }

  // ── Cat mess cleanup ───────────────────────────────────────────
  if (!cat.messExists) {
    if (cat.cleaningAgentId && agentStates[cat.cleaningAgentId]) {
      const sp = agentStates[cat.cleaningAgentId];
      sp.isCleaning = false;
      sp._cleanTimer = 0;
      sp.slotIdx = -1;
      sp.activityDur = 0;
      sp.arrived = false;
    }
    cat.cleaningAgentId = null;
    cat.messAssignTimer = 0;
  } else {
    // Release if cleaner went working
    if (cat.cleaningAgentId && agentStates[cat.cleaningAgentId]?.isWorking) {
      agentStates[cat.cleaningAgentId].isCleaning = false;
      agentStates[cat.cleaningAgentId]._cleanTimer = 0;
      cat.cleaningAgentId = null;
      cat.messAssignTimer = 0;
    }
    // Assign nearest free agent after 3s
    if (cat.cleaningAgentId === null) {
      cat.messAssignTimer += dt;
      if (cat.messAssignTimer >= 3) {
        let nearest = null,
          nearestDist = Infinity;
        for (const [aid, sp] of Object.entries(agentStates)) {
          if (sp.isWorking || sp.isCleaning) continue;
          const dx = sp.tx - cat.messTx,
            dy = sp.ty - cat.messTy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = aid;
          }
        }
        if (nearest) {
          const sp = agentStates[nearest];
          if (sp.slotIdx >= 0 && idleOccupied[sp.slotIdx] === nearest)
            delete idleOccupied[sp.slotIdx];
          sp.slotIdx = -1;
          sp.activityDur = 0;
          sp.isCleaning = true;
          sp._cleanTimer = 0;
          sp.arrived = false;
          cat.cleaningAgentId = nearest;
          cat.messAssignTimer = 0;
        } else {
          cat.messAssignTimer = 2; // retry in 1s
        }
      }
    }
    // Move cleaner toward mess, then clean
    if (cat.cleaningAgentId && agentStates[cat.cleaningAgentId]) {
      const sp = agentStates[cat.cleaningAgentId];
      const dx = cat.messTx - sp.tx,
        dy = cat.messTy - sp.ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.0) {
        if (sp.state !== "walking") sp.setAnim("walking");
        const step = Math.min(3.5 * dt, dist);
        sp.tx += (dx / dist) * step;
        sp.ty += (dy / dist) * step;
        sp.flip = dx < 0;
      } else {
        if (sp.state !== "cleaning") sp.setAnim("cleaning");
        sp._cleanTimer += dt;
        if (sp._cleanTimer >= 4) cat.messExists = false;
      }
    }
  }

  // Bowl refill logic — assign a free agent to refill empty bowls
  for (let bi = 0; bi < CAT_BOWLS.length; bi++) {
    const bowl = CAT_BOWLS[bi];
    if (bowl.hasFod) {
      delete bowlRefills[bi];
      continue;
    }
    if (!bowlRefills[bi]) {
      // Find a free agent not already on refill duty
      const busyIds = Object.values(bowlRefills).map((r) => r.agentId);
      const idle = Object.entries(agentStates).filter(
        ([aid, s]) =>
          !s.isWorking && s.state !== "cleaning" && !busyIds.includes(aid),
      );
      if (idle.length > 0) {
        const [aid] = idle[Math.floor(Math.random() * idle.length)];
        bowlRefills[bi] = { agentId: aid, timer: 0 };
      }
    }
    const refill = bowlRefills[bi];
    if (!refill) continue;
    const sp = agentStates[refill.agentId];
    if (!sp || sp.isWorking) {
      delete bowlRefills[bi];
      continue;
    } // agent left
    const bdx = sp.tx - (bowl.tx + 0.5),
      bdy = sp.ty - (bowl.ty + 0.5);
    const distToBowl = Math.sqrt(bdx * bdx + bdy * bdy);
    if (distToBowl > 1.2) {
      sp.setTarget(bowl.tx + 0.5, bowl.ty + 0.5);
      sp.arrived = false;
    } else {
      // Arrived — pour food (use 'at_coffee' anim as generic pouring)
      if (sp.state !== "at_coffee") sp.setAnim("at_coffee");
      refill.timer += dt;
      if (refill.timer >= 3) {
        bowl.hasFod = true;
        delete bowlRefills[bi];
        sp.arrived = false;
        sp.activityDur = 0;
      }
    }
  }

  // Cat interactions — idle agents nearby
  for (const [id, sp] of Object.entries(agentStates)) {
    if (!sp.arrived || sp.isWorking) continue;
    const dx = sp.tx - cat.tx,
      dy = sp.ty - cat.ty;
    const distToCat = Math.sqrt(dx * dx + dy * dy);
    // Pet the cat if nearby and cat is sitting/sleeping
    if (
      distToCat < 2.5 &&
      (cat.state === "sitting" || cat.state === "sleeping") &&
      sp.state !== "petting_cat" &&
      sp.state !== "cleaning"
    ) {
      sp.setAnim("petting_cat");
    } else if (distToCat >= 2.5 && sp.state === "petting_cat") {
      const want = sp.activityAnim || sp.couchIdleState;
      sp.setAnim(want);
    }
  }

  PS.update(dt);

  // ── Printer activation ────────────────────────────────────────
  for (const [id, sp] of Object.entries(agentStates)) {
    const ad = agentsData[id];
    if (ad && (ad.currentTool === "Write" || ad.currentTool === "Edit")) {
      printerActive = 3;
      trashLevel = Math.min(10, trashLevel + 0.3);
    }
    if (ad && ad.currentTool === "Bash") {
      trashLevel = Math.min(10, trashLevel + 0.3);
    }
  }
  if (printerActive > 0) printerActive -= dt;

  // ── Trash stomp logic ─────────────────────────────────────────
  if (trashLevel >= 8 && trashAgentId === null) {
    // Find nearest idle agent
    const trashTx = KITCHEN_WALL_COL - 2 + 0.5,
      trashTy = 3 + 0.5;
    let nearest = null,
      nearestDist = Infinity;
    for (const [aid, sp] of Object.entries(agentStates)) {
      if (sp.isWorking || sp.isCleaning) continue;
      const dx = sp.tx - trashTx,
        dy = sp.ty - trashTy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = aid;
      }
    }
    if (nearest) {
      trashAgentId = nearest;
      agentStates[nearest].isCleaning = true;
    }
  }
  if (trashAgentId && agentStates[trashAgentId]) {
    const sp = agentStates[trashAgentId];
    if (sp.isWorking) {
      sp.isCleaning = false;
      trashAgentId = null;
    } else {
      const trashTx = KITCHEN_WALL_COL - 2 + 0.5,
        trashTy = 3 + 0.5;
      const dx = trashTx - sp.tx,
        dy = trashTy - sp.ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.2) {
        sp.setTarget(trashTx, trashTy);
        sp.arrived = false;
        if (sp.state !== "walking") sp.setAnim("walking");
      } else {
        if (sp.state !== "stretching") sp.setAnim("stretching");
        sp._cleanTimer = (sp._cleanTimer || 0) + dt;
        if (sp._cleanTimer >= 3) {
          trashLevel = 0;
          trashAgentId = null;
          sp._cleanTimer = 0;
          sp.isCleaning = false;
          sp.arrived = false;
          sp.activityDur = 0;
        }
      }
    }
  } else if (trashAgentId && !agentStates[trashAgentId]) {
    trashAgentId = null;
  }

  // ── Heatmap accumulation (every 6 ticks) ─────────────────────
  if (globalTick % 6 === 0) {
    // Decay all cells slightly
    for (let i = 0; i < heatGrid.length; i++) heatGrid[i] *= 0.997;
    // Accumulate agent positions
    for (const sp of Object.values(agentStates)) {
      const gx = Math.floor(sp.tx),
        gy = Math.floor(sp.ty);
      if (gx >= 0 && gx < HEAT_MAX_COLS && gy >= 0 && gy < HEAT_MAX_ROWS) {
        const idx = gy * HEAT_MAX_COLS + gx;
        heatGrid[idx] += 1;
        if (heatGrid[idx] > heatMax) heatMax = heatGrid[idx];
      }
    }
  }

  // ── Draw ─────────────────────────────────────────────────────
  ctx.clearRect(0, 0, CW, canvas.height);
  ctx.drawImage(bgBuf, 0, 0);
  drawEntranceDoor(ctx);
  drawLeftPanel(ctx, globalTick);
  drawRightPanel(ctx, globalTick);
  drawDynamicEffects(ctx, globalTick);
  drawAquariumFish(ctx, globalTick); // before agents so fish stay behind
  // Rubber duck (animated — bobbing in tray)
  {
    const [_rdTx, _rdTy] = getAdminPos(
      "rubber_duck",
      PER_ROW * STEP_X + 2 + 0.3,
      10.5,
    );
    const [rdx, rdy] = ts(_rdTx, _rdTy);
    drawRubberDuck(ctx, rdx - T / 2, rdy, globalTick);
  }
  // Lava lamp (animated blobs in right zone)
  {
    const [_llTx, _llTy] = getAdminPos(
      "lava_lamp",
      PER_ROW * STEP_X + 2 + 0.3,
      4.5,
    );
    const [llx, lly] = ts(_llTx, _llTy);
    drawLavaLamp(ctx, llx - T / 2, lly - 8, globalTick);
  }
  // Crystal Ball (activity zone oracle)
  if (ACT_ZONE_Y > 0) {
    const [_cbTx, _cbTy] = getAdminPos("crystal_ball", 15, ACT_ZONE_Y + 17);
    const [cbx, cby] = ts(_cbTx, _cbTy);
    drawCrystalBall(ctx, cbx - T / 2, cby - 8, globalTick);
  }
  // Zen Garden (bottom zone, relaxation corner)
  if (ACT_ZONE_Y > 0) {
    const [_zgTx, _zgTy] = getAdminPos("zen_garden", 24, ACT_ZONE_Y + 23);
    const [zgx, zgy] = ts(_zgTx, _zgTy);
    drawZenGarden(ctx, zgx - T / 2, zgy - 8, globalTick);
  }
  // Terrarium (gecko vivarium, bottom corner)
  {
    const [_ttTx, _ttTy] = getAdminPos("terrarium", 30, 61);
    const [ttx, tty] = ts(_ttTx, _ttTy);
    drawTerrarium(ctx, ttx - T / 2, tty - 4, globalTick);
  }
  {
    const [_ncTx, _ncTy] = getAdminPos("newtons_cradle", 33, 61);
    const [ncx, ncy] = ts(_ncTx, _ncTy);
    drawNewtonsCradle(ctx, ncx - T / 2, ncy - 4, globalTick);
  }
  {
    const [_gbTx, _gbTy] = getAdminPos("gumball_machine", 36, 61);
    const [gbx, gby] = ts(_gbTx, _gbTy);
    drawGumballMachine(ctx, gbx - T / 2, gby - 4, globalTick);
  }
  // Vending machine (break room snacks)
  {
    const [_vmTx, _vmTy] = getAdminPos(
      "vending_machine",
      PER_ROW * STEP_X + 2 + 1.2,
      12.5,
    );
    const [vmx, vmy] = ts(_vmTx, _vmTy);
    drawVendingMachine(ctx, vmx - T / 2, vmy - 6, globalTick);
  }

  // Kanban board (live tasks)
  drawKanban(ctx);

  // Dynamic windows (sky based on time of day)
  drawDynamicWindows(ctx);
  drawDustMotes(ctx, globalTick);
  drawFireflies(ctx, globalTick);

  // Screen glow on working agents' faces
  for (const [id, sp] of Object.entries(agentStates)) {
    if (!sp.isWorking || !sp.arrived) continue;
    const glowAlpha = 0.08 + Math.sin(globalTick * 0.04) * 0.03;
    ctx.save();
    ctx.globalAlpha = glowAlpha;
    const grad = ctx.createRadialGradient(
      sp.sx - 10,
      sp.sy - 5,
      0,
      sp.sx - 10,
      sp.sy - 5,
      25,
    );
    grad.addColorStop(0, "#6090ff");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(sp.sx - 35, sp.sy - 30, 50, 50);
    ctx.restore();
  }

  // Wall clock (dynamic hands)
  drawWallClock(ctx);

  // TV game animation — active when any agent is gaming
  if (ACT_ZONE_Y > 0) {
    const anyGaming = Object.values(agentStates).some(
      (s) => s.activityAnim === "gaming" && s.arrived,
    );
    const [_tvATx2, _tvATy2] = getAdminPos("tv", 10, ACT_ZONE_Y + 0.3);
    const [tvx, tvy] = ts(_tvATx2, _tvATy2);
    const sx = tvx + 6,
      sy = tvy + 6,
      sw = T * 4 - 14,
      sh = T * 2.5 - 12;
    if (anyGaming) {
      // Clip to TV screen bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      // Animated game screen
      const gf = (globalTick >> 2) & 3; // 0-3 frame
      // Sky gradient
      ctx.fillStyle = "#0d1a3a";
      ctx.fillRect(sx, sy, sw, sh);
      // Scrolling ground
      ctx.fillStyle = "#1a3a10";
      ctx.fillRect(sx, sy + sh - 10, sw, 10);
      // Platforms (scrolling left)
      const scroll = (globalTick * 1.2) % (sw + 30);
      ctx.fillStyle = "#2a5a20";
      [
        [sw - scroll, sh - 20, 24, 6],
        [sw - scroll + 50, sh - 32, 20, 6],
        [sw - scroll + 90, sh - 18, 18, 6],
      ].forEach(([px, py, pw, ph]) => {
        if (px > -pw && px < sw) ctx.fillRect(sx + px, sy + py, pw, ph);
      });
      // Player character running
      const runFrame = gf;
      const pcy = sy + sh - 22;
      ctx.fillStyle = "#f7768e";
      ctx.fillRect(sx + 18, pcy, 8, 10); // body
      ctx.fillStyle = "#f5c2a0";
      ctx.fillRect(sx + 19, pcy - 7, 6, 7); // head
      ctx.fillStyle = "#3d59a1";
      ctx.fillRect(sx + 17 + (runFrame % 2), pcy + 7, 4, 5); // leg L
      ctx.fillStyle = "#3d59a1";
      ctx.fillRect(sx + 22 - (runFrame % 2), pcy + 7, 4, 5); // leg R
      // Enemy
      const ex = sx + sw - 30 - (globalTick % 20 < 10 ? 1 : 0);
      ctx.fillStyle = "#e0af68";
      ctx.fillRect(ex, pcy + 2, 10, 8);
      ctx.fillStyle = "#f7768e";
      ctx.fillRect(ex + 2, pcy - 2, 6, 6);
      // Score (incrementing)
      ctx.fillStyle = "#9ece6a";
      ctx.font = "4px 'Press Start 2P',monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `SCORE:${String(Math.floor(globalTick * 3)).padStart(4, "0")}`,
        sx + 2,
        sy + 9,
      );
      // Lives
      ctx.fillStyle = "#f7768e";
      for (let li = 0; li < 3; li++)
        ctx.fillRect(sx + sw - 20 + li * 7, sy + 4, 5, 5);
      ctx.restore(); // end clip
    } else {
      // Screen off / screensaver
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.fillStyle = "#050510";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = "#1a1a3a";
      const t2 = (globalTick * 0.3) % (sw * 2);
      ctx.fillRect(sx + (t2 < sw ? t2 : sw * 2 - t2) - 10, sy, 20, sh);
      ctx.restore();
    }
  }

  // Trash can dynamic (papers sticking out)
  drawTrashCan(ctx, trashLevel);

  // Printer paper animation
  if (printerActive > 0 && KITCHEN_WALL_COL > 0 && KITCHEN_START_ROW > 0) {
    const [prx, pry] = ts(KITCHEN_WALL_COL - 3, KITCHEN_START_ROW - 2);
    const slide = Math.min(1, (3 - printerActive) / 1.5); // 0→1 over 1.5s
    const paperY = pry + T * 0.9 + 2 - slide * T * 0.35;
    ctx.fillStyle = "#f0ece4";
    ctx.fillRect((prx + 6) | 0, paperY | 0, (T * 1.6 - 10) | 0, 4);
    ctx.fillStyle = "#80808060";
    ctx.fillRect((prx + 8) | 0, (paperY + 1) | 0, (T * 1.6 - 14) | 0, 1);
  }

  // Phase 1: sprites (depth-sorted) + particles
  const sorted = Object.values(agentStates).sort((a, b) => a.depth - b.depth);
  for (const sp of sorted) sp.draw(ctx);
  drawCatBowls(ctx, globalTick);
  drawPingPongBall(ctx);
  drawDartAnimation(ctx, globalTick);
  cat.draw(ctx, globalTick);
  goose.draw(ctx, globalTick);
  PS.draw(ctx);

  // Phase 2: all overlays strictly on top
  ctx.font = "6px 'Press Start 2P', monospace";
  for (const sp of sorted) sp.drawOverlay(ctx, globalTick);

  // Click animations on interactive objects
  drawClickAnims(ctx, globalTick);

  // Office lighting tint — color shifts with time of day
  drawOfficeLighting(ctx);

  // Sims mode overlay
  if (simsMode) {
    // Draw selection ring for each selected agent
    for (const selId of simsSelectedAgents) {
      const sp = agentStates[selId];
      if (!sp) continue;
      ctx.save();
      // Multi-layer pulsing glow ring
      const glowPulse = 0.5 + Math.sin(globalTick * 0.12) * 0.35;
      const ringScale = 1 + Math.sin(globalTick * 0.08) * 0.12;
      const ringColor = sp.pal ? sp.pal.accent : "#9ece6a";
      // Outer halo (soft bloom)
      ctx.globalAlpha = glowPulse * 0.25;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        sp.sx,
        sp.sy + 16,
        20 * ringScale,
        8 * ringScale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      // Mid ring
      ctx.globalAlpha = glowPulse * 0.5;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(
        sp.sx,
        sp.sy + 16,
        16 * ringScale,
        6.5 * ringScale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      // Inner bright ring
      ctx.globalAlpha = 0.75 + glowPulse * 0.2;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(
        sp.sx,
        sp.sy + 16,
        14 * ringScale,
        5.5 * ringScale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      // Selection chevron above head
      ctx.globalAlpha = 0.6 + glowPulse * 0.35;
      ctx.strokeStyle = ringColor;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2;
      const chevY = sp.sy - 28 - Math.sin(globalTick * 0.1) * 4;
      ctx.beginPath();
      ctx.moveTo(sp.sx - 6, chevY + 6);
      ctx.lineTo(sp.sx, chevY);
      ctx.lineTo(sp.sx + 6, chevY + 6);
      ctx.stroke();
      ctx.restore();
    }
    // Count badge when multiple agents selected
    if (simsSelectedAgents.size > 1) {
      ctx.save();
      ctx.fillStyle = "#9ece6a";
      ctx.shadowColor = "#9ece6a";
      ctx.shadowBlur = 8;
      ctx.font = "bold 8px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillText(simsSelectedAgents.size + " SELECTED", CW / 2, 18);
      ctx.textAlign = "left";
      ctx.restore();
    }
    for (const sp of Object.values(agentStates)) {
      if (sp._simsWaiting) {
        ctx.save();
        const pulse = 0.4 + Math.sin(globalTick * 0.08) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#7aa2f7";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(sp.sx, sp.sy + 16, 12, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (
        !sp.isWorking &&
        !sp.arrived &&
        sp.targetTx !== sp.tx &&
        sp.targetTy !== sp.ty
      ) {
        // Agent en-route to sims-assigned activity — draw A* path + destination marker
        const pts = [{ tx: sp.tx, ty: sp.ty }];
        for (const wp of sp.waypoints) pts.push(wp);
        pts.push({ tx: sp.targetTx, ty: sp.targetTy });
        if (pts.length >= 2) {
          ctx.save();
          ctx.setLineDash([3, 5]);
          ctx.strokeStyle = simsSelectedAgents.has(sp.id)
            ? "#9ece6a"
            : "#7aa2f760";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(OX + pts[0].tx * T + T / 2, OY + pts[0].ty * T + T / 2);
          for (let pi = 1; pi < pts.length; pi++) {
            ctx.lineTo(
              OX + pts[pi].tx * T + T / 2,
              OY + pts[pi].ty * T + T / 2,
            );
          }
          ctx.stroke();
          ctx.setLineDash([]);
          // Pulsing destination marker
          const destPulse = 0.5 + Math.sin(globalTick * 0.12) * 0.35;
          const destX = OX + sp.targetTx * T + T / 2;
          const destY = OY + sp.targetTy * T + T / 2;
          ctx.globalAlpha = destPulse;
          ctx.strokeStyle = "#9ece6a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(destX, destY, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = destPulse * 0.4;
          ctx.strokeStyle = "#9ece6a";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(destX, destY, 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Hover tooltip — show spot name when hovering in sims mode
    if (simsSelectedAgents.size > 0 && simsHoverSpot) {
      const hs = simsHoverSpot.spot;
      const hx = OX + hs.tx * T + T / 2;
      const hy = OY + hs.ty * T - 4;
      ctx.save();
      // Spot type label mapping
      const spotLabels = {
        couch: "Rest",
        kitchen: "Kitchen",
        gym: "Gym",
        gaming: "TV/Gaming",
        arcade: "Arcade",
        nap_pod: "Nap Pod",
        dj: "DJ Booth",
        group: "Social",
        window: "Window",
        plant: "Plant",
        floor: "Chill",
        printer: "Printer",
        darts: "Darts",
        aquarium: "Aquarium",
        trophy_cabinet: "Trophies",
        rubber_duck: "Duck",
        lava_lamp: "Lava Lamp",
        crystal_ball: "Crystal Ball",
        whiteboard: "Whiteboard",
        basketball: "Basketball",
        jukebox: "Jukebox",
        pinball: "Pinball",
        server: "Server",
        printer3d: "3D Printer",
        telescope: "Telescope",
        espresso: "Espresso",
        shelf: "Bookshelf",
        hammock: "Hammock",
        photo_booth: "Photo Booth",
      };
      const label = spotLabels[hs.type] || hs.type;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#1a1c3e";
      ctx.font = "5px 'Press Start 2P',monospace";
      const textW = ctx.measureText(label).width;
      const pad = 4;
      rrect(ctx, hx - textW / 2 - pad, hy - 8, textW + pad * 2, 12, 3);
      ctx.fill();
      ctx.strokeStyle = "#9ece6a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#c8d3f5";
      ctx.textAlign = "center";
      ctx.fillText(label, hx, hy);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Queued activity indicators — orange dashed line + NEXT badge
    for (const sp of Object.values(agentStates)) {
      if (!sp._queuedActivity || sp.isWorking) continue;
      const q = sp._queuedActivity;
      const destX = OX + q.tx * T + T / 2;
      const destY = OY + q.ty * T + T / 2;
      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = "#e0af6890";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sp.sx, sp.sy);
      ctx.lineTo(destX, destY);
      ctx.stroke();
      ctx.setLineDash([]);
      const qPulse = 0.45 + Math.sin(globalTick * 0.1 + 1.5) * 0.3;
      ctx.globalAlpha = qPulse;
      ctx.strokeStyle = "#e0af68";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(destX, destY, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#e0af68";
      ctx.font = "4px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillText("NEXT", sp.sx, sp.sy - 56);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Arrival celebration effects
    for (let i = simsArrivalFx.length - 1; i >= 0; i--) {
      const fx = simsArrivalFx[i];
      const progress = 1 - fx.life / fx.maxLife;
      ctx.save();
      // Rising speech bubble with exclamation
      const bubbleY = fx.y - 20 - progress * 18;
      const bubbleAlpha =
        progress < 0.2
          ? progress / 0.2
          : progress > 0.7
            ? (1 - progress) / 0.3
            : 1;
      ctx.globalAlpha = bubbleAlpha * 0.95;
      ctx.fillStyle = "#1a1c3e";
      ctx.font = "6px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      const bw = ctx.measureText(fx.text).width + 8;
      rrect(ctx, fx.x - bw / 2, bubbleY - 8, bw, 14, 4);
      ctx.fill();
      ctx.strokeStyle = "#f7768e";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#ff9e64";
      ctx.fillText(fx.text, fx.x, bubbleY + 2);
      // Sparkle ring expanding outward
      const sparkleR = 8 + progress * 20;
      ctx.globalAlpha = (1 - progress) * 0.6;
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2 + progress * 3;
        const sx = fx.x + Math.cos(a) * sparkleR;
        const sy = fx.y + Math.sin(a) * sparkleR * 0.5;
        ctx.fillStyle = [
          "#9ece6a",
          "#ff9e64",
          "#7aa2f7",
          "#bb9af7",
          "#f7768e",
          "#e0af68",
          "#73daca",
          "#c8d3f5",
        ][s];
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5 * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.restore();
    }
  }

  // Heatmap overlay (on top of everything, below admin)
  if (heatmapVisible) drawHeatmap(ctx);
  // Productivity chart overlay
  if (productivityVisible) drawProductivityChart(ctx);
  // Daily timeline overlay
  if (timelineVisible) drawTimeline(ctx);

  // Admin editor overlay (on top of everything)
  drawAdminOverlay(ctx);

  requestAnimationFrame(loop);
}

// ════════════════════════════════════════════════════════════════
//  HEATMAP OVERLAY
// ════════════════════════════════════════════════════════════════
function drawHeatmap(ctx) {
  ctx.save();
  // Draw each cell as a colored rectangle
  const norm = heatMax > 0 ? 1 / heatMax : 1;
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const val = heatGrid[gy * HEAT_MAX_COLS + gx] * norm;
      if (val < 0.01) continue;
      const px = OX + gx * T,
        py = OY + gy * T;
      // Color gradient: green (low) → yellow → red (high)
      let r, g, b;
      if (val < 0.5) {
        const t2 = val * 2;
        r = Math.round(t2 * 255);
        g = 220;
        b = 0;
      } else {
        const t2 = (val - 0.5) * 2;
        r = 255;
        g = Math.round((1 - t2) * 220);
        b = 0;
      }
      ctx.globalAlpha = Math.min(0.55, val * 0.6 + 0.05);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, T, T);
    }
  }
  // Label
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#000000aa";
  ctx.fillRect(OX + 4, OY + 4, 160, 20);
  ctx.fillStyle = "#f7768e";
  ctx.font = "7px 'Press Start 2P',monospace";
  ctx.textAlign = "left";
  ctx.fillText("HEATMAP [H to close]", OX + 8, OY + 16);
  // Legend bar
  const lx = OX + 4,
    ly = OY + 26,
    lw = 80,
    lh = 8;
  const grad = ctx.createLinearGradient(lx, ly, lx + lw, ly);
  grad.addColorStop(0, "rgba(0,220,0,0.8)");
  grad.addColorStop(0.5, "rgba(255,220,0,0.8)");
  grad.addColorStop(1, "rgba(255,0,0,0.8)");
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = grad;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = "#ffffff";
  ctx.font = "4px monospace";
  ctx.fillText("low", lx, ly + lh + 6);
  ctx.textAlign = "right";
  ctx.fillText("high", lx + lw, ly + lh + 6);
  ctx.textAlign = "left";
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
//  PRODUCTIVITY CHART OVERLAY  (P key)
// ════════════════════════════════════════════════════════════════
function drawProductivityChart(ctx) {
  const agents = Object.values(agentStates);
  if (agents.length === 0) return;
  ctx.save();
  const panW = 230,
    rowH = 22,
    headerH = 32,
    footerH = 10;
  const chartH = headerH + agents.length * rowH + footerH;
  const panX = OX + 4,
    panY = OY + 4;
  // Panel background
  ctx.fillStyle = "#0d1226ee";
  fillR(ctx, panX, panY, panW, chartH, "#0d1226ee");
  // Border
  ctx.strokeStyle = "#bb9af750";
  ctx.lineWidth = 1;
  ctx.strokeRect(panX + 0.5, panY + 0.5, panW - 1, chartH - 1);
  // Title
  ctx.fillStyle = "#bb9af7";
  ctx.font = "7px 'Press Start 2P',monospace";
  ctx.textAlign = "left";
  ctx.fillText("PRODUCTIVITY [P]", panX + 8, panY + 18);
  // Divider
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panX + 6, panY + headerH - 4, panW - 12, 1);
  // Column headers
  ctx.fillStyle = "#565f89";
  ctx.font = "6px monospace";
  ctx.fillText("AGENT", panX + 8, panY + headerH - 8);
  ctx.textAlign = "right";
  ctx.fillText("WORK%", panX + panW - 8, panY + headerH - 8);
  ctx.textAlign = "left";
  // Per-agent bars
  const nameW = 68,
    barX = panX + nameW + 10,
    barW = panW - nameW - 22;
  agents.forEach((s, i) => {
    const y = panY + headerH + i * rowH;
    const ratio = s.totalTicks > 2 ? s.workTicks / s.totalTicks : 0;
    const pct = Math.round(ratio * 100);
    const accent = s.palette?.accent || "#c8d3f5";
    // Row bg (alternating)
    if (i % 2 === 0) {
      ctx.fillStyle = "#ffffff06";
      ctx.fillRect(panX + 2, y, panW - 4, rowH);
    }
    // Agent name (truncated)
    const name = (s.slug || s.id || "???")
      .replace(/-/g, " ")
      .slice(0, 9)
      .toUpperCase();
    ctx.fillStyle = accent;
    ctx.font = "6px monospace";
    ctx.textAlign = "left";
    ctx.fillText(name, panX + 8, y + rowH / 2 + 2);
    // Bar track
    ctx.fillStyle = "#1a1c2e";
    ctx.fillRect(barX, y + 5, barW, 12);
    // Work bar (colored by agent accent)
    if (ratio > 0) {
      ctx.fillStyle = accent + "cc";
      ctx.fillRect(barX, y + 5, Math.round(barW * ratio), 12);
      // Shine strip
      ctx.fillStyle = "#ffffff28";
      ctx.fillRect(barX, y + 5, Math.round(barW * ratio), 4);
    }
    // Percentage label inside/after bar
    ctx.fillStyle = pct >= 20 ? "#ffffffcc" : "#565f89";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${pct}%`, barX + barW / 2, y + rowH / 2 + 3);
  });
  ctx.textAlign = "left";
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
//  DAILY TIMELINE OVERLAY  (T key)
// ════════════════════════════════════════════════════════════════
function drawTimeline(ctx) {
  const agents = Object.values(agentStates);
  if (agents.length === 0) return;
  ctx.save();

  const now = Date.now();
  const windowMs = TIMELINE_WINDOW;
  const panW = Math.min(520, CW - OX - 20);
  const rowH = 18;
  const headerH = 36;
  const labelW = 72;
  const barW = panW - labelW - 16;
  const footerH = 20;
  const panH = headerH + agents.length * rowH + footerH;
  const panX = OX + 4;
  const panY = OY + 4;

  // Panel background
  ctx.fillStyle = "#0d1226ee";
  ctx.fillRect(panX, panY, panW, panH);
  ctx.strokeStyle = "#7aa2f750";
  ctx.lineWidth = 1;
  ctx.strokeRect(panX + 0.5, panY + 0.5, panW - 1, panH - 1);

  // Title
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "7px 'Press Start 2P',monospace";
  ctx.textAlign = "left";
  ctx.fillText("TIMELINE [T]", panX + 8, panY + 14);

  // Time axis labels
  ctx.fillStyle = "#565f89";
  ctx.font = "5px monospace";
  const timeLabels = ["-60m", "-45m", "-30m", "-15m", "NOW"];
  const bx = panX + labelW + 8;
  timeLabels.forEach((lbl, i) => {
    const lx = bx + (barW * i) / 4 - (i === 4 ? 10 : 8);
    ctx.fillText(lbl, lx, panY + headerH - 6);
    // Tick mark
    ctx.fillStyle = "#2a2c4e";
    ctx.fillRect(
      bx + (barW * i) / 4,
      panY + headerH - 4,
      1,
      panH - headerH - footerH + 2,
    );
    ctx.fillStyle = "#565f89";
  });

  // Divider
  ctx.fillStyle = "#2a2c4e";
  ctx.fillRect(panX + 6, panY + headerH - 4, panW - 12, 1);

  // Per-agent rows
  agents.forEach((sp, i) => {
    const y = panY + headerH + i * rowH;
    const accent = sp.palette?.accent || "#c8d3f5";
    const name = (sp.slug || sp.id || "???")
      .replace(/-/g, " ")
      .slice(0, 9)
      .toUpperCase();
    const log = timelineLog[sp.id] || [];

    // Row bg (alternating)
    if (i % 2 === 0) {
      ctx.fillStyle = "#ffffff05";
      ctx.fillRect(panX + 2, y, panW - 4, rowH);
    }

    // Agent name
    ctx.fillStyle = accent;
    ctx.font = "6px monospace";
    ctx.textAlign = "left";
    ctx.fillText(name, panX + 6, y + rowH / 2 + 2);

    // Bar background (idle = very dark)
    ctx.fillStyle = "#111220";
    ctx.fillRect(bx, y + 3, barW, rowH - 6);

    // Draw each segment
    for (const seg of log) {
      const segStart = Math.max(seg.start, now - windowMs);
      const segEnd = seg.end !== null ? seg.end : now;
      if (segEnd < now - windowMs || segStart > now) continue;
      if (!seg.working) continue; // only draw working segments; idle stays dark

      const x1 = bx + ((segStart - (now - windowMs)) / windowMs) * barW;
      const x2 = bx + ((segEnd - (now - windowMs)) / windowMs) * barW;
      const w = Math.max(1, x2 - x1);
      ctx.fillStyle = accent + "cc";
      ctx.fillRect(Math.round(x1), y + 3, Math.round(w), rowH - 6);
      // Shine
      ctx.fillStyle = "#ffffff20";
      ctx.fillRect(Math.round(x1), y + 3, Math.round(w), 3);
    }

    // Current status indicator (blinking dot)
    if (sp.isWorking) {
      const blink = Math.sin(Date.now() * 0.006) > 0;
      if (blink) {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(bx + barW + 5, y + rowH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // Bottom time axis — current time
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "5px 'Press Start 2P',monospace";
  ctx.textAlign = "right";
  ctx.fillText(`now ${hh}:${mm}`, panX + panW - 8, panY + panH - 6);
  ctx.textAlign = "left";

  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
//  UI CARDS
// ════════════════════════════════════════════════════════════════
const grid = document.getElementById("grid");

function timeSince(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}с`;
  if (s < 3600) return `${Math.floor(s / 60)}м`;
  return `${Math.floor(s / 3600)}ч`;
}

function renderCard(agent) {
  const {
    id,
    slug,
    status,
    currentToolLabel,
    lastActivity,
    messageCount = 0,
  } = agent;
  let card = document.getElementById(`c-${id}`);
  if (!card) {
    card = document.createElement("div");
    card.id = `c-${id}`;
    grid.appendChild(card);
  }
  const pal = getPalette(slug);
  card.style.setProperty("--ac", pal.accent);
  card.style.setProperty("--ac-glow", pal.accent + "50");
  card.style.setProperty("--ac-badge", pal.accent + "28");
  card.className = `card ${status}`;
  card.innerHTML = `<div class="card-dot"></div><div class="card-name"></div><div class="card-status"><span class="status-label"></span><br><span class="dim">🕐 <span id="t-${id}"></span> · 💬 <span class="msg-count"></span></span></div><div class="scan"></div>`;
  card.querySelector(".card-name").textContent = slug
    .replace(/-/g, " ")
    .toUpperCase();
  const sl = card.querySelector(".status-label");
  if (status === "working" && currentToolLabel) {
    sl.className = "t";
    sl.textContent = currentToolLabel;
  } else if (status === "thinking") {
    sl.className = "th";
    sl.textContent = "думает...";
  } else {
    sl.className = "idle";
    sl.textContent = "idle";
  }
  card.querySelector(`#t-${id}`).textContent = timeSince(lastActivity);
  card.querySelector(".msg-count").textContent = messageCount;
}

function updateMoodMeter() {
  const states = Object.values(agentStates);
  const meterEl = document.getElementById("mood-meter");
  if (!meterEl) return;
  if (states.length === 0) {
    document.getElementById("mm-bar").style.width = "0%";
    document.getElementById("mm-pct").textContent = "0%";
    document.getElementById("mm-emoji").textContent = "😐";
    document.getElementById("mm-level").textContent = "EMPTY";
    document.getElementById("mm-level").style.color = "#565f89";
    document.getElementById("mm-stats").textContent = "— no agents —";
    return;
  }
  let totalRatio = 0,
    working = 0,
    burnedOut = 0;
  for (const sp of states) {
    const ratio = sp.totalTicks > 2 ? sp.workTicks / sp.totalTicks : 0;
    totalRatio += ratio;
    if (sp.isWorking) working++;
    if (sp.burnout >= 3) burnedOut++;
  }
  const avg = totalRatio / states.length;
  const pct = Math.round(avg * 100);
  let emoji, level, color, barColor;
  if (avg >= 0.7) {
    emoji = "🔥";
    level = "ON FIRE";
    color = "#ff9e64";
    barColor = "linear-gradient(90deg,#ff6040,#ff9e64)";
  } else if (avg >= 0.4) {
    emoji = "😊";
    level = "FOCUSED";
    color = "#9ece6a";
    barColor = "linear-gradient(90deg,#7aa2f7,#9ece6a)";
  } else if (avg >= 0.1) {
    emoji = "😐";
    level = "CHILL";
    color = "#bb9af7";
    barColor = "linear-gradient(90deg,#7aa2f7,#bb9af7)";
  } else {
    emoji = "😤";
    level = "TIRED";
    color = "#565f89";
    barColor = "linear-gradient(90deg,#3a3860,#565f89)";
  }
  document.getElementById("mm-bar").style.width = pct + "%";
  document.getElementById("mm-bar").style.background = barColor;
  document.getElementById("mm-pct").textContent = pct + "%";
  document.getElementById("mm-emoji").textContent = emoji;
  document.getElementById("mm-level").textContent = level;
  document.getElementById("mm-level").style.color = color;
  const idle = states.length - working;
  document.getElementById("mm-stats").textContent =
    `${working} working · ${idle} idle${burnedOut > 0 ? " · 🔥 " + burnedOut + " burnout" : ""}`;
}

function updateUI() {
  const list = Object.values(agentsData);
  document.getElementById("agent-count").textContent = `${list.length} agents`;
  for (const a of list) {
    const el = document.getElementById(`t-${a.id}`);
    if (el) el.textContent = timeSince(a.lastActivity);
  }
  updateMoodMeter();
}

// ════════════════════════════════════════════════════════════════
//  PERSONAL TASK BOARD
// ════════════════════════════════════════════════════════════════
let myTasks = [];

function switchTab(tab) {
  const isOffice = tab === "office";
  document.getElementById("tab-office").classList.toggle("active", isOffice);
  document.getElementById("tab-tasks").classList.toggle("active", !isOffice);
  document.getElementById("office").style.display = isOffice ? "block" : "none";
  document.getElementById("grid").style.display = isOffice ? "grid" : "none";
  document.getElementById("task-view").classList.toggle("visible", !isOffice);
  if (!isOffice) renderTasks();
}

function addTask() {
  const input = document.getElementById("task-input");
  const title = input.value.trim();
  if (!title) return;
  const assignee = document.getElementById("task-assignee").value;
  const priority = document.getElementById("task-priority").value;
  fetch("/api/mytasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, assignee, priority }),
  }).then(() => {
    input.value = "";
  });
}

function toggleTask(id) {
  const t = myTasks.find((x) => x.id === id);
  if (!t) return;
  fetch(`/api/mytasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: t.status === "done" ? "todo" : "done" }),
  });
}

function deleteTask(id) {
  fetch(`/api/mytasks/${id}`, { method: "DELETE" });
}

function renderTasks() {
  const current = document.getElementById("tasks-current");
  const done = document.getElementById("tasks-done");
  current.innerHTML = done.innerHTML = "";

  const active = myTasks.filter((t) => t.status !== "done");
  const doneList = myTasks.filter((t) => t.status === "done");

  const ASSIGNEE = { me: "Я", team: "Команда", claude: "Claude" };

  function makeItem(t) {
    const el = document.createElement("div");
    el.className = "task-item" + (t.status === "done" ? " done-item" : "");

    const checkEl = document.createElement("div");
    checkEl.className = "task-check";
    checkEl.textContent = t.status === "done" ? "✓" : "";
    checkEl.onclick = () => toggleTask(t.id);

    const dot = document.createElement("div");
    dot.className = `task-pri-dot ${t.priority}`;

    const titleEl = document.createElement("div");
    titleEl.className = "task-title";
    titleEl.textContent = t.title;

    const tag = document.createElement("div");
    tag.className = "task-assignee-tag";
    tag.textContent = ASSIGNEE[t.assignee] || t.assignee;

    const del = document.createElement("div");
    del.className = "task-del";
    del.textContent = "✕";
    del.onclick = () => deleteTask(t.id);

    el.append(checkEl, dot, titleEl, tag, del);
    return el;
  }

  if (active.length === 0)
    current.innerHTML = '<div class="task-empty">— нет задач —</div>';
  else active.forEach((t) => current.appendChild(makeItem(t)));

  if (doneList.length === 0)
    done.innerHTML = '<div class="task-empty">— нет выполненных —</div>';
  else doneList.forEach((t) => done.appendChild(makeItem(t)));

  document.getElementById("ts-total").textContent = myTasks.length;
  document.getElementById("ts-active").textContent = active.length;
  document.getElementById("ts-done").textContent = doneList.length;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement.id === "task-input")
    addTask();
});

// ════════════════════════════════════════════════════════════════
//  WEBSOCKET
// ════════════════════════════════════════════════════════════════
let wsActive = false;
function connect() {
  if (wsActive) return;
  wsActive = true;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}`);
  const led = document.getElementById("led"),
    lbl = document.getElementById("conn-label");
  ws.onopen = () => {
    wsActive = true;
    led.className = "led";
    lbl.textContent = "online";
  };
  ws.onmessage = ({ data }) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === "init") {
      for (const a of msg.agents) {
        agentsData[a.id] = a;
        renderCard(a);
        recordTimelineEvent(
          a.id,
          a.status === "working" || a.status === "thinking",
        );
      }
      updateUI();
    }
    if (msg.type === "agent_update") {
      agentsData[msg.agent.id] = msg.agent;
      renderCard(msg.agent);
      recordTimelineEvent(
        msg.agent.id,
        msg.agent.status === "working" || msg.agent.status === "thinking",
      );
      updateUI();
    }
    if (msg.type === "mytasks_init" || msg.type === "mytasks_update") {
      myTasks = msg.tasks;
      renderTasks();
    }
    if (msg.type === "agent_remove") {
      if (timelineLog[msg.id]) {
        const _tl = timelineLog[msg.id];
        if (_tl.length > 0 && _tl[_tl.length - 1].end === null)
          _tl[_tl.length - 1].end = Date.now();
      }
      delete agentsData[msg.id];
      document.getElementById(`c-${msg.id}`)?.remove();
      updateUI();
    }
    if (msg.type === "layout_update" && msg.layout) {
      // Another admin moved objects — apply their layout
      if (msg.layout.positions && !adminMode) {
        window._adminPos = Object.assign(
          {},
          BUILTIN_POSITIONS,
          msg.layout.positions,
        );
        localStorage.setItem(
          "admin_positions",
          JSON.stringify(msg.layout.positions),
        );
        if (msg.layout.walls)
          localStorage.setItem("admin_walls", JSON.stringify(msg.layout.walls));
        applyWallPositions();
        syncIdleSpotsToAdmin();
        buildBackground();
        buildObstacleGrid();
      }
    }
    if (msg.type === "public_url") {
      const el = document.getElementById("public-url");
      if (msg.url) {
        el.href = msg.url;
        el.textContent = "🌐 " + msg.url.replace("https://", "");
        el.className = "";
      } else {
        el.href = "#";
        el.textContent = "🔒 local";
        el.className = "loading";
      }
    }
  };
  ws.onclose = () => {
    wsActive = false;
    led.className = "led off";
    lbl.textContent = "polling";
    setTimeout(connect, 2000);
    startPolling();
  };
  ws.onerror = () => ws.close();
}

// ── HTTP polling fallback (when WS unavailable, e.g. on Railway) ──
let pollInterval = null;
function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    if (wsActive) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const data = await res.json();
      if (data.agents) {
        const newIds = new Set(data.agents.map((a) => a.id));
        // Remove agents that are gone
        for (const id of Object.keys(agentsData)) {
          if (!newIds.has(id)) {
            delete agentsData[id];
            document.getElementById(`c-${id}`)?.remove();
          }
        }
        for (const a of data.agents) {
          agentsData[a.id] = a;
          renderCard(a);
        }
      }
      if (data.myTasks) {
        myTasks = data.myTasks;
        renderTasks();
      }
      updateUI();
      const led = document.getElementById("led"),
        lbl = document.getElementById("conn-label");
      led.className = "led";
      lbl.textContent = "polling";
    } catch {}
  }, 2000);
}

// ════════════════════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════════════════════
connect();
startPolling(); // start polling immediately too, WS will take over if available
setInterval(updateUI, 5000);

document.fonts.ready.then(() => {
  generateLayout(1);
  applyCustomPositions();
  applyWallPositions();
  buildAdminObjects(); // init _defaultPositions for click detection
  syncIdleSpotsToAdmin();
  buildBackground();
  buildObstacleGrid();
  requestAnimationFrame((t) => {
    lastTime = t;
    loop(t);
  });
});

// ════════════════════════════════════════════════════════════════
//  ADMIN EDITOR — drag objects to reposition them
//  Press 'E' to toggle, or click the ✏️ button
// ════════════════════════════════════════════════════════════════

let adminMode = false;
let simsMode = false;

// ── Activity Heatmap ─────────────────────────────────────────────
let heatmapVisible = false;
// ── Productivity Chart ────────────────────────────────────────────
let productivityVisible = false;
// ── Daily Timeline ────────────────────────────────────────────────
let timelineVisible = false;
// agentId → [{start: epochMs, end: epochMs|null, working: bool}]
const timelineLog = {};
const TIMELINE_WINDOW = 3600000; // 1 hour in ms

function recordTimelineEvent(id, working) {
  if (!timelineLog[id]) timelineLog[id] = [];
  const log = timelineLog[id];
  const now = Date.now();
  // Close previous segment
  if (log.length > 0 && log[log.length - 1].end === null) {
    if (log[log.length - 1].working === working) return; // no change
    log[log.length - 1].end = now;
  }
  log.push({ start: now, end: null, working });
  // Prune old entries (keep last 2 hours)
  const cutoff = now - 7200000;
  while (log.length > 1 && log[0].end !== null && log[0].end < cutoff)
    log.shift();
}
// Grid accumulates agent presence counts (decays over time)
const HEAT_MAX_COLS = 80,
  HEAT_MAX_ROWS = 120;
const heatGrid = new Float32Array(HEAT_MAX_COLS * HEAT_MAX_ROWS);
let heatMax = 1; // running max for normalization
let simsSelectedAgents = new Set();
let simsHoverSpot = null; // {spot, idx} — IDLE_SPOT under cursor in sims mode
const NEON_COLORS = ["#ff79c6", "#8be9fd", "#50fa7b", "#ffb86c", "#bd93f9"];
let neonSignColorIdx = 0;
const simsArrivalFx = []; // [{x, y, life, maxLife, text}] — arrival celebration effects
let adminObjects = []; // {id, label, tx, ty, w, h} — tile coords
let adminSelected = null;
let adminDragging = false;
let adminDragOff = { x: 0, y: 0 };
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
  adminObjects.push({
    id: "clock",
    label: "🕐 Clock",
    tx: COLS - 1.5,
    ty: Math.max(4, Math.floor(ROWS * 0.2)),
    w: 1.5,
    h: 1.5,
  });
  adminObjects.push({
    id: "cooler",
    label: "💧 Cooler",
    tx: rX + 2.5,
    ty: 2,
    w: 1.5,
    h: 1.5,
  });
  adminObjects.push({
    id: "darts",
    label: "🎯 Darts",
    tx: rX + 1.5,
    ty: 0,
    w: 2,
    h: 1,
  });
  adminObjects.push({
    id: "aquarium",
    label: "🐠 Aquarium",
    tx: rX + 0.3,
    ty: 8,
    w: 2.5,
    h: 2,
  });
  adminObjects.push({
    id: "trophy_cabinet",
    label: "🏆 Trophies",
    tx: rX + 0.3,
    ty: 12,
    w: 2,
    h: 2.5,
  });
  adminObjects.push({
    id: "rubber_duck",
    label: "🦆 Rubber Duck",
    tx: rX + 0.3,
    ty: 10.5,
    w: 2,
    h: 2.5,
  });
  adminObjects.push({
    id: "lava_lamp",
    label: "🫧 Lava Lamp",
    tx: rX + 0.3,
    ty: 4.5,
    w: 1.5,
    h: 2.5,
  });
  if (ACT_ZONE_Y > 0)
    adminObjects.push({
      id: "crystal_ball",
      label: "🔮 Crystal Ball",
      tx: 15,
      ty: ACT_ZONE_Y + 17,
      w: 2,
      h: 2.5,
    });
  adminObjects.push({
    id: "printer",
    label: "🖨 Printer",
    tx: KITCHEN_WALL_COL - 3,
    ty: KITCHEN_START_ROW - 2,
    w: 2,
    h: 1,
  });
  adminObjects.push({
    id: "trashcan",
    label: "🗑 Trash",
    tx: KITCHEN_WALL_COL - 2,
    ty: 3,
    w: 1,
    h: 1,
  });

  // Plants
  IDLE_SPOTS.filter((s) => s.type === "plant").forEach((s, i) => {
    adminObjects.push({
      id: "plant_" + i,
      label: "🌿 Plant",
      tx: s.tx - 0.5,
      ty: s.ty - 0.5,
      w: 1,
      h: 1.5,
    });
  });

  // Conference table
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({
      id: "conf_table",
      label: "🤝 Conference",
      tx: 4,
      ty: ACT_ZONE_Y + 10,
      w: 6,
      h: 3,
    });
  }
  // Bookshelf
  adminObjects.push({
    id: "bookshelf",
    label: "📚 Bookshelf",
    tx: COLS - 5.5,
    ty: ACT_ZONE_Y + 13,
    w: 4.5,
    h: 3.5,
  });

  // Desks
  DESK_DEFS.forEach((d, i) => {
    adminObjects.push({
      id: "desk_" + i,
      label: "🖥 Desk " + (i + 1),
      tx: d.tx,
      ty: d.ty,
      w: 3.5,
      h: 3,
    });
  });

  // Couches
  COUCH_DEFS.forEach((d, i) => {
    adminObjects.push({
      id: "couch_" + i,
      label: "🛋 Couch " + (i + 1),
      tx: d.tx,
      ty: d.ty,
      w: d.w || 3,
      h: 2,
    });
  });

  // Ping pong table
  if (ACT_ZONE_Y > 0) {
    const ppX = Math.min(19, COLS - 8);
    adminObjects.push({
      id: "pingpong",
      label: "🏓 Ping Pong",
      tx: ppX - 2,
      ty: ACT_ZONE_Y + 1,
      w: 6,
      h: 3,
    });
  }

  // TV / Gaming area
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({
      id: "tv",
      label: "📺 TV",
      tx: 10,
      ty: ACT_ZONE_Y + 0.3,
      w: 4,
      h: 3,
    });
  }

  // Gym / Treadmills
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({
      id: "gym",
      label: "🏃 Gym",
      tx: 1,
      ty: ACT_ZONE_Y + 0.5,
      w: 5,
      h: 4,
    });
    adminObjects.push({
      id: "rowing_machine",
      label: "🚣 Rowing",
      tx: 5,
      ty: ACT_ZONE_Y + 4.3,
      w: 2.5,
      h: 1.5,
    });
  }

  // Vending machine
  if (KITCHEN_WALL_COL > 0 && ACT_ZONE_Y > 0) {
    adminObjects.push({
      id: "vending",
      label: "🥤 Vending",
      tx: KITCHEN_WALL_COL + 1,
      ty: ACT_ZONE_Y - 2,
      w: 1.5,
      h: 2.5,
    });
  }

  // Kitchen objects
  if (KITCHEN_WALL_COL > 0) {
    const kitIntX = KITCHEN_WALL_COL + 1;
    adminObjects.push({
      id: "kitchen_table",
      label: "🍽 Kitchen Table",
      tx: kitIntX + 2,
      ty: KITCHEN_START_ROW + 1,
      w: 4,
      h: 3,
    });
    adminObjects.push({
      id: "kitchen_counter",
      label: "🔪 Counter",
      tx: kitIntX,
      ty: KITCHEN_START_ROW,
      w: 9,
      h: 1,
    });
    adminObjects.push({
      id: "fridge",
      label: "🧊 Fridge",
      tx: kitIntX + 8,
      ty: KITCHEN_START_ROW,
      w: 1,
      h: 1.5,
    });
  }

  // Gaming sofa (separate from TV)
  if (ACT_ZONE_Y > 0) {
    adminObjects.push({
      id: "gaming_sofa",
      label: "🛋 Gaming Sofa",
      tx: 11,
      ty: ACT_ZONE_Y + 3.7,
      w: 4,
      h: 1.5,
    });
  }

  // Entertainment objects (recreation / makers lab / cafe zones)
  if (ACT_ZONE_Y > 0) {
    // Zone 1: RECREATION (ACT_ZONE+9)
    adminObjects.push({
      id: "foosball",
      label: "⚽ Foosball",
      tx: 8,
      ty: ACT_ZONE_Y + 9,
      w: 3,
      h: 1.5,
    });
    adminObjects.push({
      id: "basketball",
      label: "🏀 Basketball",
      tx: 12,
      ty: ACT_ZONE_Y + 9,
      w: 2,
      h: 2,
    });
    adminObjects.push({
      id: "arcade",
      label: "🕹 Arcade",
      tx: 16,
      ty: ACT_ZONE_Y + 9,
      w: 2,
      h: 2,
    });
    adminObjects.push({
      id: "dj_console",
      label: "🎧 DJ Console",
      tx: 20,
      ty: ACT_ZONE_Y + 9,
      w: 2.5,
      h: 1.2,
    });
    adminObjects.push({
      id: "jukebox",
      label: "🎵 Jukebox",
      tx: 25,
      ty: ACT_ZONE_Y + 9,
      w: 2,
      h: 2.5,
    });
    adminObjects.push({
      id: "pinball",
      label: "🎱 Pinball",
      tx: 32,
      ty: ACT_ZONE_Y + 9,
      w: 2,
      h: 2.5,
    });
    // Zone 2: MAKERS LAB (ACT_ZONE+14)
    adminObjects.push({
      id: "server_rack",
      label: "🖥 Server Rack",
      tx: 2,
      ty: ACT_ZONE_Y + 14,
      w: 2,
      h: 2.2,
    });
    adminObjects.push({
      id: "printer_3d",
      label: "🖨 3D Printer",
      tx: 7,
      ty: ACT_ZONE_Y + 14,
      w: 2,
      h: 1.8,
    });
    adminObjects.push({
      id: "telescope",
      label: "🔭 Telescope",
      tx: 18,
      ty: ACT_ZONE_Y + 14,
      w: 1,
      h: 2,
    });
    adminObjects.push({
      id: "nap_pod",
      label: "😴 Nap Pod",
      tx: 22,
      ty: ACT_ZONE_Y + 14,
      w: 2.5,
      h: 1.5,
    });
    // Zone 3: CAFE (ACT_ZONE+14)
    adminObjects.push({
      id: "espresso_bar",
      label: "☕ Espresso Bar",
      tx: 13,
      ty: ACT_ZONE_Y + 14,
      w: 3,
      h: 1.5,
    });
  }

  // Corkboard (sprint board on top wall)
  adminObjects.push({
    id: "corkboard",
    label: "📌 Corkboard",
    tx: 10.5,
    ty: 0,
    w: 2.5,
    h: 1.6,
  });
  adminObjects.push({
    id: "neon_sign",
    label: "💡 Neon Sign",
    tx: 3,
    ty: 0,
    w: 3,
    h: 1,
  });
  adminObjects.push({
    id: "whiteboard",
    label: "📝 Whiteboard",
    tx: 17,
    ty: 0,
    w: 3,
    h: 1.6,
  });
  if (ACT_ZONE_Y > 0)
    adminObjects.push({
      id: "photo_booth",
      label: "📸 Photo Booth",
      tx: 16,
      ty: ACT_ZONE_Y + 9,
      w: 2,
      h: 2.5,
    });
  if (ACT_ZONE_Y > 0)
    adminObjects.push({
      id: "zen_garden",
      label: "🪨 Zen Garden",
      tx: 24,
      ty: ACT_ZONE_Y + 23,
      w: 2,
      h: 1.5,
    });
  adminObjects.push({
    id: "terrarium",
    label: "🦎 Terrarium",
    tx: 30,
    ty: 61,
    w: 1.8,
    h: 1.4,
  });
  adminObjects.push({
    id: "newtons_cradle",
    label: "⚖️ Newton's Cradle",
    tx: 33,
    ty: 61,
    w: 1.5,
    h: 1.5,
  });

  // Kanban board
  const rXkb = PER_ROW * STEP_X + 2;
  adminObjects.push({
    id: "kanban",
    label: "📋 Kanban",
    tx: rXkb + 0.2,
    ty: 2.5,
    w: 4.5,
    h: 4,
  });

  // Snapshot default positions (before applying saved overrides)
  if (!window._defaultPositions) {
    window._defaultPositions = {};
    for (const obj of adminObjects) {
      window._defaultPositions[obj.id] = { tx: obj.tx, ty: obj.ty };
    }
  }

  // Apply saved positions
  const saved = JSON.parse(localStorage.getItem("admin_positions") || "{}");
  for (const obj of adminObjects) {
    if (saved[obj.id]) {
      obj.tx = saved[obj.id].tx;
      obj.ty = saved[obj.id].ty;
    }
  }

  // Wall handles for room resizing
  adminWalls = [
    {
      id: "wall_kitchen_x",
      label: "Kitchen Wall \u2194",
      type: "vertical",
      pos: KITCHEN_WALL_COL,
      min: 12,
      max: COLS - 4,
      row1: KITCHEN_START_ROW,
      row2: ROWS - 1,
    },
    {
      id: "wall_kitchen_y",
      label: "Kitchen Top \u2195",
      type: "horizontal",
      pos: KITCHEN_START_ROW,
      min: 8,
      max: ROWS - 6,
      col1: KITCHEN_WALL_COL,
      col2: COLS - 1,
    },
    {
      id: "wall_zone",
      label: "Activity Zone \u2195",
      type: "horizontal",
      pos: ACT_ZONE_Y,
      min: 10,
      max: ROWS - 10,
      col1: 0,
      col2: COLS - 1,
    },
    {
      id: "wall_right",
      label: "Right Wall \u2194",
      type: "vertical",
      pos: COLS,
      min: 20,
      max: 50,
      row1: 0,
      row2: ROWS,
      isOuter: true,
    },
    {
      id: "wall_bottom",
      label: "Bottom Wall \u2195",
      type: "horizontal",
      pos: ROWS,
      min: 30,
      max: 100,
      col1: 0,
      col2: COLS,
      isOuter: true,
    },
  ];
  const savedWalls = JSON.parse(localStorage.getItem("admin_walls") || "{}");
  for (const w of adminWalls) {
    if (savedWalls[w.id] !== undefined) w.pos = savedWalls[w.id];
  }
}

// Apply saved wall positions to game variables
function applyWallPositions() {
  const saved = JSON.parse(localStorage.getItem("admin_walls") || "{}");
  if (saved.wall_kitchen_x !== undefined)
    KITCHEN_WALL_COL = Math.round(saved.wall_kitchen_x);
  if (saved.wall_kitchen_y !== undefined)
    KITCHEN_START_ROW = Math.round(saved.wall_kitchen_y);
  if (saved.wall_zone !== undefined) ACT_ZONE_Y = Math.round(saved.wall_zone);
  if (saved.wall_right !== undefined) {
    COLS = Math.round(saved.wall_right);
    CW = OX + COLS * T + OX;
    const cv = document.getElementById("office");
    if (cv) cv.width = CW;
    bgBuf.width = CW;
  }
  if (saved.wall_bottom !== undefined) {
    ROWS = Math.round(saved.wall_bottom);
    CH = OY + ROWS * T + OY;
    const cv = document.getElementById("office");
    if (cv) cv.height = CH;
    bgBuf.height = CH;
  }
  KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1;
}

// Default layout positions (exported from user's admin editor — canonical layout v3)
const BUILTIN_POSITIONS = {
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
  neon_sign: { tx: 3, ty: 0 },
  corkboard: { tx: 11, ty: 0 },
  whiteboard: { tx: 27.5, ty: 0 },
  kanban: { tx: 22.5, ty: 0 },
  darts: { tx: 6, ty: 0 },
  telescope: { tx: 20, ty: 1.5 },
  clock: { tx: 31.5, ty: 0 },

  // ═══ RIGHT PANEL ═══
  aquarium: { tx: 30.5, ty: 5.5 },
  cooler: { tx: 32, ty: 17.5 },
  printer: { tx: 29.5, ty: 22.5 },
  trashcan: { tx: 30.5, ty: 10.5 },
  lava_lamp: { tx: 30, ty: 18 },
  plant_0: { tx: 1.5, ty: 19.5 },
  plant_1: { tx: 26.5, ty: 22.5 },
  vending: { tx: 32.5, ty: 22 },

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
  jukebox: { tx: 25, ty: 53 },
  pinball: { tx: 21.5, ty: 52 },
  trophy_cabinet: { tx: 24.5, ty: 46 },
  bookshelf: { tx: 26.5, ty: 46 },

  // ═══ GYM & SPORTS ═══
  gym: { tx: 2, ty: 56 },
  basketball: { tx: 28.5, ty: 56 },
  crystal_ball: { tx: 19.5, ty: 57 },

  // ═══ BOTTOM ZONE ═══
  dj_console: { tx: 27, ty: 59.5 },
  rubber_duck: { tx: 28, ty: 61.5 },
  nap_pod: { tx: 27, ty: 62 },
  conf_table: { tx: 12, ty: 62 },
  espresso_bar: { tx: 20, ty: 63 },
  photo_booth: { tx: 16, ty: 53 },
  zen_garden: { tx: 24, ty: 63 },
  terrarium: { tx: 30, ty: 61 },
  newtons_cradle: { tx: 33, ty: 61 },
};

// Apply custom positions to actual game objects
function applyCustomPositions() {
  const saved = JSON.parse(localStorage.getItem("admin_positions") || "{}");
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
    const [newTx, newTy] = getAdminPos(
      spot._objId,
      spot._defObjTx,
      spot._defObjTy,
    );
    spot.tx = newTx + spot._offsetX;
    spot.ty = newTy + spot._offsetY;
  }
  for (let i = 0; i < DESK_SLOTS.length; i++) {
    const [newTx, newTy] = getAdminPos(
      "desk_" + i,
      DESK_DEFS[i].tx,
      DESK_DEFS[i].ty,
    );
    DESK_SLOTS[i].tx = newTx + 0.8;
    DESK_SLOTS[i].ty = newTy + 1.9;
  }
  for (let i = 0; i < COUCH_SLOTS.length; i++) {
    const [newTx, newTy] = getAdminPos(
      "couch_" + i,
      COUCH_DEFS[i].tx,
      COUCH_DEFS[i].ty,
    );
    COUCH_SLOTS[i].tx = newTx + 1.3;
    COUCH_SLOTS[i].ty = newTy + 0.4;
  }
  const ppX = Math.min(19, COLS - 8);
  const [ppNewTx, ppNewTy] = getAdminPos("pingpong", ppX - 2, ACT_ZONE_Y + 1);
  PP_L.tx = ppNewTx + 0.5;
  PP_L.ty = ppNewTy + 1;
  PP_R.tx = ppNewTx + 6;
  PP_R.ty = ppNewTy + 1;
}

// Save positions to localStorage
function saveAdminPositions() {
  const pos = {};
  for (const obj of adminObjects) {
    pos[obj.id] = { tx: obj.tx, ty: obj.ty };
  }
  localStorage.setItem("admin_positions", JSON.stringify(pos));
  // Merge: BUILTIN is base, admin edits override
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS, pos);
  syncIdleSpotsToAdmin();
  for (const [id, sp] of Object.entries(agentStates)) {
    if (sp.isWorking && sp.slotIdx >= 0 && sp.slotIdx < DESK_SLOTS.length) {
      const ds = DESK_SLOTS[sp.slotIdx];
      sp.arrived = false;
      sp.setTarget(ds.tx, ds.ty);
    } else if (
      !sp.isWorking &&
      sp.slotIdx >= 0 &&
      sp.slotIdx < IDLE_SPOTS.length
    ) {
      const spot = IDLE_SPOTS[sp.slotIdx];
      if (spot._objId) {
        sp.arrived = false;
        sp.setTarget(spot.tx, spot.ty);
      }
    }
  }
  // Push layout to server — all connected clients will see the change
  const walls = JSON.parse(localStorage.getItem("admin_walls") || "null");
  fetch("/api/layout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positions: pos, walls }),
  }).catch(() => {});
}

let adminAuthed = false;

function showAdminPasswordDialog() {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;";
  const box = document.createElement("div");
  box.style.cssText =
    "background:#12121e;border:2px solid #3a3860;border-radius:10px;padding:24px 32px;display:flex;flex-direction:column;gap:14px;align-items:center;box-shadow:0 0 40px #0008;min-width:280px;";
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

  const inp = box.querySelector("#admin-pw");
  const err = box.querySelector("#admin-pw-err");
  inp.focus();

  function tryLogin() {
    if (inp.value === "noadmin") {
      adminAuthed = true;
      overlay.remove();
      enterAdminMode();
    } else {
      err.style.display = "block";
      inp.value = "";
      inp.style.borderColor = "#f7768e";
      setTimeout(() => {
        inp.style.borderColor = "#3a3860";
        err.style.display = "none";
      }, 1500);
    }
  }

  box.querySelector("#admin-pw-ok").onclick = tryLogin;
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });
  box.querySelector("#admin-pw-cancel").onclick = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function enterAdminMode() {
  adminMode = true;
  buildAdminObjects();
  canvas.style.cursor = "crosshair";
  adminBtn.textContent = "✏️ EDITING";
  adminBtn.style.background = "#f7768e";
  adminPanel.style.display = "flex";
}

function toggleSimsMode() {
  simsMode = !simsMode;
  simsSelectedAgents = new Set();
  simsHoverSpot = null;
  if (simsMode) {
    simsBtn.textContent = "🎮 PLAYING";
    simsBtn.style.background = "#9ece6a";
    simsBtn.style.color = "#0a0a18";
    const _simsCouchPos =
      COUCH_SLOTS.length > 0
        ? COUCH_SLOTS
        : [
            { tx: 5, ty: 24 },
            { tx: 10, ty: 24 },
          ];
    let _simsCouchIdx = 0;
    for (const sp of Object.values(agentStates)) {
      if (!sp.isWorking) {
        if (sp.slotIdx >= 0 && idleOccupied[sp.slotIdx] === sp.id)
          delete idleOccupied[sp.slotIdx];
        sp.arrived = false;
        sp.activityDur = 0;
        sp.slotIdx = -1;
        sp._simsWaiting = true;
        const _sc = _simsCouchPos[_simsCouchIdx % _simsCouchPos.length];
        _simsCouchIdx++;
        sp.setTarget(_sc.tx, _sc.ty);
      }
    }
  } else {
    simsBtn.textContent = "🎮 SIMS";
    simsBtn.style.background = "#2a2848";
    simsBtn.style.color = "#c8d3f5";
    for (const sp of Object.values(agentStates)) {
      sp._simsWaiting = false;
      sp._simsTarget = null;
      sp._simsArrivalPending = false;
    }
    simsArrivalFx.length = 0;
  }
}

function toggleAdmin() {
  if (adminMode) {
    // Exit admin
    adminMode = false;
    canvas.style.cursor = "default";
    adminBtn.textContent = "✏️ EDIT";
    adminBtn.style.background = "#2a2848";
    adminPanel.style.display = "none";
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
  for (let i = adminObjects.length - 1; i >= 0; i--) {
    const o = adminObjects[i];
    if (tx >= o.tx && tx <= o.tx + o.w && ty >= o.ty && ty <= o.ty + o.h)
      return o;
  }
  return null;
}

// Canvas mouse events for admin mode
canvas.addEventListener("mousedown", (e) => {
  if (!adminMode) return;
  const { tx, ty } = mouseToTile(e);
  // Check walls first (higher priority than objects)
  for (const w of adminWalls) {
    if (w.type === "vertical") {
      if (
        Math.abs(tx - w.pos) < 0.8 &&
        ty >= (w.row1 || 0) &&
        ty <= (w.row2 || ROWS)
      ) {
        adminSelectedWall = w;
        adminDraggingWall = true;
        canvas.style.cursor = "ew-resize";
        return;
      }
    } else {
      if (
        Math.abs(ty - w.pos) < 0.8 &&
        tx >= (w.col1 || 0) &&
        tx <= (w.col2 || COLS)
      ) {
        adminSelectedWall = w;
        adminDraggingWall = true;
        canvas.style.cursor = "ns-resize";
        return;
      }
    }
  }
  const obj = findObjectAt(tx, ty);
  if (obj) {
    adminSelected = obj;
    adminDragging = true;
    adminDragOff = { x: tx - obj.tx, y: ty - obj.ty };
    canvas.style.cursor = "grabbing";
  } else {
    adminSelected = null;
  }
});

canvas.addEventListener("mousemove", (e) => {
  // Sims mode: hover detection for spot tooltips
  if (simsMode && simsSelectedAgents.size > 0) {
    const { tx, ty } = mouseToTile(e);
    simsHoverSpot = null;
    let bestDist = 16; // 4 tile radius squared
    for (let i = 0; i < IDLE_SPOTS.length; i++) {
      const s = IDLE_SPOTS[i];
      const holder = idleOccupied[i];
      if (holder !== undefined && !simsSelectedAgents.has(holder)) continue;
      const dx = tx - s.tx,
        dy = ty - s.ty;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        simsHoverSpot = { spot: s, idx: i };
      }
    }
    canvas.style.cursor = simsHoverSpot ? "pointer" : "crosshair";
  } else if (simsMode) {
    const { tx, ty } = mouseToTile(e);
    simsHoverSpot = null;
    // Check if hovering over an agent
    let overAgent = false;
    for (const sp of Object.values(agentStates)) {
      const dx = tx - sp.tx,
        dy = ty - sp.ty;
      if (dx * dx + dy * dy < 2.5) {
        overAgent = true;
        break;
      }
    }
    canvas.style.cursor = overAgent ? "pointer" : "default";
  }
  if (!adminMode) return;
  const { tx, ty } = mouseToTile(e);
  // Wall dragging
  if (adminDraggingWall && adminSelectedWall) {
    const w = adminSelectedWall;
    if (w.type === "vertical") {
      w.pos = Math.max(w.min, Math.min(w.max, Math.round(tx)));
    } else {
      w.pos = Math.max(w.min, Math.min(w.max, Math.round(ty)));
    }
    // Live-resize canvas when dragging outer walls (no rebuild during drag)
    if (w.id === "wall_right") {
      COLS = Math.round(w.pos);
      CW = OX + COLS * T + OX;
      canvas.width = CW;
      bgBuf.width = CW;
    }
    if (w.id === "wall_bottom") {
      ROWS = Math.round(w.pos);
      CH = OY + ROWS * T + OY;
      canvas.height = CH;
      bgBuf.height = CH;
    }
    return;
  }
  if (adminDragging && adminSelected) {
    adminSelected.tx = Math.round((tx - adminDragOff.x) * 2) / 2; // snap to half-tiles
    adminSelected.ty = Math.round((ty - adminDragOff.y) * 2) / 2;
    // Clamp inside office
    adminSelected.tx = Math.max(
      0,
      Math.min(COLS - adminSelected.w, adminSelected.tx),
    );
    adminSelected.ty = Math.max(
      0,
      Math.min(ROWS - adminSelected.h, adminSelected.ty),
    );
  } else {
    // Wall hover detection
    adminHoverWall = null;
    for (const w of adminWalls) {
      if (
        w.type === "vertical" &&
        Math.abs(tx - w.pos) < 0.8 &&
        ty >= (w.row1 || 0) &&
        ty <= (w.row2 || ROWS)
      ) {
        adminHoverWall = w;
        break;
      }
      if (
        w.type === "horizontal" &&
        Math.abs(ty - w.pos) < 0.8 &&
        tx >= (w.col1 || 0) &&
        tx <= (w.col2 || COLS)
      ) {
        adminHoverWall = w;
        break;
      }
    }
    if (adminHoverWall && !adminDragging) {
      canvas.style.cursor =
        adminHoverWall.type === "vertical" ? "ew-resize" : "ns-resize";
    } else {
      const obj = findObjectAt(tx, ty);
      adminHover = obj;
      canvas.style.cursor = obj ? "grab" : "crosshair";
    }
  }
});

// Use document-level mouseup/mousemove for wall drags (mouse can leave canvas)
document.addEventListener("mousemove", (e) => {
  if (!adminDraggingWall || !adminSelectedWall) return;
  const { tx, ty } = mouseToTile(e);
  const w = adminSelectedWall;
  if (w.type === "vertical") {
    w.pos = Math.max(w.min, Math.min(w.max, Math.round(tx)));
  } else {
    w.pos = Math.max(w.min, Math.min(w.max, Math.round(ty)));
  }
  if (w.id === "wall_right") {
    COLS = Math.round(w.pos);
    CW = OX + COLS * T + OX;
    canvas.width = CW;
    bgBuf.width = CW;
  }
  if (w.id === "wall_bottom") {
    ROWS = Math.round(w.pos);
    CH = OY + ROWS * T + OY;
    canvas.height = CH;
    bgBuf.height = CH;
  }
});

document.addEventListener("mouseup", (e) => {
  if (!adminDraggingWall) return;
  adminDraggingWall = false;
  canvas.style.cursor = "crosshair";
  const wallPos = {};
  for (const w2 of adminWalls) wallPos[w2.id] = w2.pos;
  localStorage.setItem("admin_walls", JSON.stringify(wallPos));
  for (const w2 of adminWalls) {
    if (w2.id === "wall_kitchen_x") KITCHEN_WALL_COL = Math.round(w2.pos);
    if (w2.id === "wall_kitchen_y") {
      KITCHEN_START_ROW = Math.round(w2.pos);
      KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1;
    }
    if (w2.id === "wall_zone") ACT_ZONE_Y = Math.round(w2.pos);
    if (w2.id === "wall_right") {
      COLS = Math.round(w2.pos);
      CW = OX + COLS * T + OX;
      canvas.width = CW;
      bgBuf.width = CW;
    }
    if (w2.id === "wall_bottom") {
      ROWS = Math.round(w2.pos);
      CH = OY + ROWS * T + OY;
      canvas.height = CH;
      bgBuf.height = CH;
    }
  }
  buildBackground();
  buildObstacleGrid();
  if (typeof syncIdleSpotsToAdmin === "function") syncIdleSpotsToAdmin();
});

canvas.addEventListener("mouseup", (e) => {
  if (!adminMode) return;
  if (adminDraggingWall) {
    adminDraggingWall = false;
    canvas.style.cursor = "crosshair";
    // Save wall positions
    const wallPos = {};
    for (const w of adminWalls) wallPos[w.id] = w.pos;
    localStorage.setItem("admin_walls", JSON.stringify(wallPos));
    // Apply to game variables
    for (const w of adminWalls) {
      if (w.id === "wall_kitchen_x") KITCHEN_WALL_COL = Math.round(w.pos);
      if (w.id === "wall_kitchen_y") {
        KITCHEN_START_ROW = Math.round(w.pos);
        KITCHEN_DOOR_ROW = KITCHEN_START_ROW + 1;
      }
      if (w.id === "wall_zone") ACT_ZONE_Y = Math.round(w.pos);
      if (w.id === "wall_right") {
        COLS = Math.round(w.pos);
        CW = OX + COLS * T + OX;
        canvas.width = CW;
        bgBuf.width = CW;
      }
      if (w.id === "wall_bottom") {
        ROWS = Math.round(w.pos);
        CH = OY + ROWS * T + OY;
        canvas.height = CH;
        bgBuf.height = CH;
      }
    }
    // Rebuild everything
    buildBackground();
    buildObstacleGrid();
    if (typeof syncIdleSpotsToAdmin === "function") syncIdleSpotsToAdmin();
    return;
  }
  if (adminDragging) {
    adminDragging = false;
    canvas.style.cursor = "grab";
    saveAdminPositions();
    // Rebuild background with new positions
    buildBackground();
    buildObstacleGrid();
  }
});

// Draw admin overlay (called from main loop when adminMode=true)
function drawAdminOverlay(ctx) {
  if (!adminMode) return;

  // Grid
  ctx.strokeStyle = "#ffffff10";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(OX + c * T, OY);
    ctx.lineTo(OX + c * T, OY + ROWS * T);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(OX, OY + r * T);
    ctx.lineTo(OX + COLS * T, OY + r * T);
    ctx.stroke();
  }

  // Objects
  for (const obj of adminObjects) {
    const x = OX + obj.tx * T,
      y = OY + obj.ty * T;
    const w = obj.w * T,
      h = obj.h * T;
    const isSelected = obj === adminSelected;
    const isHover = obj === adminHover;

    // Bounding box
    ctx.strokeStyle = isSelected
      ? "#f7768e"
      : isHover
        ? "#7aa2f7"
        : "#ffffff40";
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.setLineDash(isSelected ? [] : [4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Label background
    ctx.fillStyle = isSelected ? "#f7768e" : "#1a1a3080";
    const labelW = ctx.measureText(obj.label).width + 8;
    ctx.fillRect(x, y - 14, labelW, 13);
    // Label text
    ctx.fillStyle = "#fff";
    ctx.font = "7px 'Press Start 2P',monospace";
    ctx.fillText(obj.label, x + 4, y - 4);

    // Coordinates
    if (isSelected || isHover) {
      ctx.fillStyle = "#ffffff80";
      ctx.font = "6px monospace";
      ctx.fillText(
        `(${obj.tx.toFixed(1)}, ${obj.ty.toFixed(1)})`,
        x,
        y + h + 10,
      );
    }

    // Drag handles (corners)
    if (isSelected) {
      ctx.fillStyle = "#f7768e";
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].forEach(([cx, cy]) => {
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      });
    }
  }

  // Wall handles
  for (const w of adminWalls) {
    const isHover = w === adminHoverWall;
    const isSelected = w === adminSelectedWall;
    ctx.strokeStyle = isSelected
      ? "#ff4060"
      : isHover
        ? "#40ff60"
        : "#ffffff50";
    ctx.lineWidth = isSelected ? 4 : isHover ? 3 : 2;
    ctx.setLineDash([6, 4]);

    if (w.type === "vertical") {
      const x = OX + w.pos * T;
      const y1 = OY + (w.row1 || 0) * T;
      const y2 = OY + (w.row2 || ROWS) * T;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
      ctx.fillStyle = isSelected ? "#ff4060" : "#40ff60";
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillText(w.label, x, y1 - 6);
      ctx.fillText("\u2194", x, (y1 + y2) / 2);
    } else {
      const y = OY + w.pos * T;
      const x1 = OX + (w.col1 || 0) * T;
      const x2 = OX + (w.col2 || COLS) * T;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.fillStyle = isSelected ? "#ff4060" : "#40ff60";
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      ctx.fillText(w.label, (x1 + x2) / 2, y - 6);
      ctx.fillText("\u2195", (x1 + x2) / 2, y + 4);
    }
    ctx.setLineDash([]);
    ctx.textAlign = "left";
  }

  // Coord display at cursor
  if (adminHover || adminDragging || adminDraggingWall) {
    // info bar at bottom of canvas
    ctx.fillStyle = "#000000a0";
    ctx.fillRect(OX, OY + ROWS * T - 20, COLS * T, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "7px 'Press Start 2P',monospace";
    const info =
      adminDraggingWall && adminSelectedWall
        ? `Moving: ${adminSelectedWall.label} → pos ${adminSelectedWall.pos}`
        : adminSelected && adminDragging
          ? `Moving: ${adminSelected.label} → (${adminSelected.tx.toFixed(1)}, ${adminSelected.ty.toFixed(1)})`
          : adminHoverWall
            ? `${adminHoverWall.label} — drag to resize`
            : adminHover
              ? `${adminHover.label} at (${adminHover.tx.toFixed(1)}, ${adminHover.ty.toFixed(1)}) — click & drag to move`
              : "";
    ctx.fillText(info, OX + 8, OY + ROWS * T - 6);
  }
}

// ════════════════════════════════════════════════════════════════
//  CLICK ANIMATIONS — interactive object feedback
// ════════════════════════════════════════════════════════════════
let clickAnims = [];

const CLICK_OBJ_MAP = {
  kitchen_counter: "coffee",
  fridge: "fridge",
  aquarium: "aquarium",
  vending: "vending",
  printer: "printer",
  trashcan: "trash",
  darts: "darts",
  tv: "tv",
  pingpong: "pingpong",
  clock: "clock",
  espresso_bar: "espresso",
  arcade: "arcade",
  dj_console: "dj",
  server_rack: "server",
  printer_3d: "printer3d",
  foosball: "foosball",
  basketball: "basketball",
  telescope: "telescope",
  nap_pod: "nap_pod",
  corkboard: "corkboard",
  trophy_cabinet: "trophy_cabinet",
  lava_lamp: "lava_lamp",
  jukebox: "jukebox",
  pinball: "pinball",
  crystal_ball: "crystal_ball",
  neon_sign: "neon_sign",
  whiteboard: "whiteboard",
  kitchen_table: "kitchen_table",
  bookshelf: "bookshelf",
  conf_table: "conf_table",
  gaming_sofa: "gaming_sofa",
  gym: "gym",
  rowing_machine: "rowing_machine",
  photo_booth: "photo_booth",
  zen_garden: "zen_garden",
  terrarium: "terrarium",
  newtons_cradle: "newtons_cradle",
  gumball_machine: "gumball_machine",
};

// Dynamic: desks and couches
for (let i = 0; i < 30; i++) CLICK_OBJ_MAP["desk_" + i] = "desk";
for (let i = 0; i < 30; i++) CLICK_OBJ_MAP["couch_" + i] = "couch";

function findClickableAt(tx, ty) {
  const saved = window._adminPos || {};
  const defs = window._defaultPositions || {};
  const checks = [
    { id: "kitchen_counter", w: 9, h: 1 },
    { id: "fridge", w: 1, h: 1.5 },
    { id: "aquarium", w: 2.5, h: 2 },
    { id: "vending", w: 1.5, h: 2.5 },
    { id: "printer", w: 2, h: 1 },
    { id: "trashcan", w: 1, h: 1 },
    { id: "darts", w: 2, h: 1 },
    { id: "tv", w: 4, h: 3 },
    { id: "pingpong", w: 6, h: 3 },
    { id: "clock", w: 1.5, h: 1.5 },
    { id: "espresso_bar", w: 3, h: 1.5 },
    { id: "arcade", w: 2, h: 2 },
    { id: "dj_console", w: 2.5, h: 1.2 },
    { id: "server_rack", w: 2, h: 2.2 },
    { id: "printer_3d", w: 2, h: 1.8 },
    { id: "foosball", w: 3, h: 1.5 },
    { id: "basketball", w: 2, h: 2 },
    { id: "telescope", w: 1, h: 2 },
    { id: "nap_pod", w: 2.5, h: 1.5 },
    { id: "corkboard", w: 2.5, h: 1.6 },
    { id: "neon_sign", w: 3, h: 1 },
    { id: "whiteboard", w: 3, h: 1.6 },
    { id: "trophy_cabinet", w: 2, h: 2.5 },
    { id: "lava_lamp", w: 1.5, h: 2.5 },
    { id: "jukebox", w: 2, h: 2.5 },
    { id: "crystal_ball", w: 2, h: 2.5 },
    { id: "kitchen_table", w: 4, h: 3 },
    { id: "bookshelf", w: 4.5, h: 3.5 },
    { id: "conf_table", w: 6, h: 3 },
    { id: "gaming_sofa", w: 4, h: 1.5 },
    { id: "gym", w: 5, h: 4 },
    { id: "rowing_machine", w: 2.5, h: 1.5 },
    { id: "photo_booth", w: 2, h: 2.5 },
    { id: "zen_garden", w: 2, h: 1.5 },
    { id: "terrarium", w: 1.8, h: 1.4 },
    { id: "newtons_cradle", w: 1.5, h: 1.5 },
    { id: "gumball_machine", w: 1.5, h: 2 },
  ];
  // Add desks and couches dynamically
  for (let i = 0; i < DESK_DEFS.length; i++)
    checks.push({ id: "desk_" + i, w: 3.5, h: 3 });
  for (let i = 0; i < COUCH_DEFS.length; i++)
    checks.push({ id: "couch_" + i, w: COUCH_DEFS[i].w || 3, h: 2 });
  for (const c of checks) {
    const s = saved[c.id];
    const d = defs[c.id];
    if (!s && !d) continue;
    const ox = s ? s.tx : d.tx;
    const oy = s ? s.ty : d.ty;
    if (tx >= ox && tx <= ox + c.w && ty >= oy && ty <= oy + c.h) {
      return {
        id: c.id,
        type: CLICK_OBJ_MAP[c.id],
        cx: OX + (ox + c.w / 2) * T,
        cy: OY + (oy + c.h / 2) * T,
      };
    }
  }
  return null;
}

canvas.addEventListener("click", (e) => {
  // Sims mode: click agent to select, click spot to send there
  if (simsMode) {
    const { tx, ty } = mouseToTile(e);

    // Check if clicked on an agent
    let clickedAgentId = null;
    for (const [id, sp] of Object.entries(agentStates)) {
      const dx = tx - sp.tx,
        dy = ty - sp.ty;
      if (dx * dx + dy * dy < 2.5) {
        clickedAgentId = id;
        break;
      }
    }

    if (clickedAgentId) {
      // Toggle agent in/out of multi-selection set
      if (simsSelectedAgents.has(clickedAgentId)) {
        simsSelectedAgents.delete(clickedAgentId);
      } else {
        simsSelectedAgents.add(clickedAgentId);
      }
      return;
    }

    // No agent clicked — send all selected agents to spots near clicked location
    if (simsSelectedAgents.size > 0) {
      // Collect available spots within 4 tiles of click, sorted by distance
      const available = [];
      for (let i = 0; i < IDLE_SPOTS.length; i++) {
        const s = IDLE_SPOTS[i];
        const holder = idleOccupied[i];
        if (holder !== undefined && !simsSelectedAgents.has(holder)) continue;
        const dx = tx - s.tx,
          dy = ty - s.ty;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16) available.push({ spot: s, idx: i, d2 });
      }
      available.sort((a, b) => a.d2 - b.d2);
      let spotPtr = 0;
      for (const agentId of simsSelectedAgents) {
        const sp = agentStates[agentId];
        if (!sp) continue;
        const asgn = available[spotPtr];
        if (asgn) {
          // If agent is currently doing an activity, queue the next one instead of interrupting
          if (
            sp.arrived &&
            sp.activityDur > 3 &&
            !sp._simsWaiting &&
            !sp.isWorking
          ) {
            // Release previous queued slot reservation if any
            if (sp._queuedActivity !== null) {
              const prevQ = sp._queuedActivity;
              if (idleOccupied[prevQ.slotIdx] === "__queued_" + sp.id) {
                delete idleOccupied[prevQ.slotIdx];
              }
            }
            sp._queuedActivity = {
              slotIdx: asgn.idx,
              tx: asgn.spot.tx,
              ty: asgn.spot.ty,
              activityAnim: asgn.spot.anim,
            };
            if (idleOccupied[asgn.idx] === undefined)
              idleOccupied[asgn.idx] = "__queued_" + sp.id;
          } else {
            sp._simsWaiting = false;
            sp.arrived = false;
            sp.activityDur = 30 + Math.random() * 30;
            if (sp.slotIdx >= 0 && idleOccupied[sp.slotIdx] === sp.id)
              delete idleOccupied[sp.slotIdx];
            sp.slotIdx = asgn.idx;
            idleOccupied[asgn.idx] = sp.id;
            sp.activityAnim = asgn.spot.anim;
            sp._simsArrivalPending = true;
            sp.setTarget(asgn.spot.tx, asgn.spot.ty);
          }
          spotPtr++;
        } else {
          // No spot nearby — wander near clicked tile (staggered)
          sp._simsWaiting = false;
          sp.arrived = false;
          sp.activityDur = 10 + Math.random() * 10;
          sp._simsArrivalPending = true;
          sp.setTarget(
            Math.max(1, Math.min(tx + (Math.random() - 0.5) * 2, COLS - 2)),
            Math.max(1, Math.min(ty + (Math.random() - 0.5) * 2, ROWS - 2)),
          );
        }
      }
      simsSelectedAgents = new Set();
      return;
    }
    return;
  }

  if (adminMode) return;
  const { tx, ty } = mouseToTile(e);

  // Check if clicked on cat
  if (cat) {
    const catDist = Math.sqrt(
      (tx - cat.tx) * (tx - cat.tx) + (ty - cat.ty) * (ty - cat.ty),
    );
    if (catDist < 1.5) {
      // Cat reacts to click!
      if (cat.state === "sleeping" || cat.state === "napping") {
        // Wake up startled
        cat.state = "scared";
        cat.stateTimer = 2;
        cat.scaredTimer = 2;
      } else if (cat.state === "sitting" || cat.state === "grooming") {
        // Start purring (happy)
        cat.state = "purring";
        cat.stateTimer = 8;
        cat.purrHearts = [];
      } else if (cat.state === "walking" || cat.state === "waddling") {
        // Start playing
        cat.state = "playing";
        cat.stateTimer = 6;
        cat.playAngle = 0;
      } else {
        // Default: honk-like meow — zoomies!
        cat.state = "zoomies";
        cat.stateTimer = 4;
        cat.zoomieTimer = 0;
        cat.zoomieTrails = [];
      }
      // Click animation: hearts/sparkles at cat position
      clickAnims.push({
        id: "_cat_" + Date.now(),
        type: "cat_pet",
        cx: OX + cat.tx * T + T / 2,
        cy: OY + cat.ty * T + T / 2,
        startTick: globalTick,
      });
      return;
    }
  }

  // Check if clicked on goose
  if (typeof goose !== "undefined" && goose) {
    const gooseDist = Math.sqrt(
      (tx - goose.tx) * (tx - goose.tx) + (ty - goose.ty) * (ty - goose.ty),
    );
    if (gooseDist < 1.5) {
      goose.state = "honking";
      goose.stateTimer = 3;
      clickAnims.push({
        id: "_goose_" + Date.now(),
        type: "goose_honk",
        cx: OX + goose.tx * T + T / 2,
        cy: OY + goose.ty * T + T / 2,
        startTick: globalTick,
      });
      return;
    }
  }

  const hit = findClickableAt(tx, ty);
  if (!hit) return;
  if (hit.type === "pingpong") {
    launchPingPongGame();
    blip(660, 0.1, "square", 0.04);
    return;
  }
  if (hit.type === "arcade") {
    launchSnakeGame();
    blip(440, 0.1, "square", 0.04);
    return;
  }
  if (hit.type === "darts") {
    launchDartsGame();
    blip(550, 0.12, "square", 0.04);
    return;
  }
  if (clickAnims.some((a) => a.id === hit.id)) return;
  clickAnims.push({
    id: hit.id,
    x: hit.cx,
    y: hit.cy,
    startTick: globalTick,
    type: hit.type,
    particles: initClickParticles(hit.type, hit.cx, hit.cy),
  });
  if (hit.type === "neon_sign")
    neonSignColorIdx = (neonSignColorIdx + 1) % NEON_COLORS.length;
  blip(520, 0.04, "square", 0.02);
});

function initClickParticles(type, cx, cy) {
  const p = [];
  switch (type) {
    case "coffee":
      for (let i = 0; i < 6; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: cy - 4,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.5 - Math.random() * 0.8,
          size: 2 + Math.random() * 2,
          col: i % 2 ? "#ffffff" : "#aabbcc",
        });
      break;
    case "fridge":
      for (let i = 0; i < 5; i++)
        p.push({
          x: cx + 8 + Math.random() * 6,
          y: cy - 6 + Math.random() * 14,
          vx: 0.3 + Math.random() * 0.4,
          vy: (Math.random() - 0.5) * 0.6,
          size: 2 + Math.random() * 2,
          col: i % 2 ? "#c0e8ff" : "#ffffff",
        });
      break;
    case "aquarium":
      for (let i = 0; i < 4; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy - 8,
          vx: (Math.random() - 0.5) * 2,
          vy: -0.3 - Math.random() * 0.5,
          size: 2,
          col: "#ffffff",
        });
      break;
    case "vending":
      p.push({
        x: cx,
        y: cy - 10,
        vx: 0,
        vy: 0.6,
        size: 6,
        col: ["#f7768e", "#9ece6a", "#7aa2f7", "#e0af68"][
          Math.floor(Math.random() * 4)
        ],
      });
      break;
    case "printer":
      p.push({ x: cx, y: cy, vx: 0, vy: -0.5, size: 0, col: "#ffffff" });
      break;
    case "trash":
      p.push({ x: cx, y: cy - 10, vx: 0, vy: -1.2, size: 0, col: "#888" });
      p.push({
        x: cx + 3,
        y: cy - 6,
        vx: 1.5,
        vy: -0.8,
        size: 2,
        col: "#556622",
      });
      break;
    case "darts":
      p.push({ x: cx, y: cy + 30, vx: 0, vy: -2, size: 0, col: "#f7768e" });
      break;
    case "tv":
      break;
    case "pingpong":
      p.push({ x: cx, y: cy + 10, vx: 1.5, vy: -2, size: 3, col: "#ffffff" });
      break;
    case "clock":
      break;
    case "espresso":
      for (let i = 0; i < 5; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: cy - 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.6 - Math.random() * 0.6,
          size: 2 + Math.random() * 2,
          col: i % 2 ? "#ffffff" : "#d4a574",
        });
      break;
    case "arcade":
      break;
    case "dj":
      break;
    case "server":
      break;
    case "printer3d":
      break;
    case "foosball":
      p.push({
        x: cx,
        y: cy,
        vx: 2 + Math.random() * 2,
        vy: -1.5 - Math.random(),
        size: 3,
        col: "#ffffff",
      });
      break;
    case "basketball":
      p.push({ x: cx, y: cy + 10, vx: 0, vy: -2.5, size: 4, col: "#e88030" });
      break;
    case "telescope":
      for (let i = 0; i < 6; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy - 10 - Math.random() * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -0.3 - Math.random() * 0.5,
          size: 1 + Math.random() * 2,
          col: ["#ffee80", "#ffffff", "#80c0ff", "#ff8080"][i % 4],
        });
      break;
    case "kitchen_table":
      break;
    case "bookshelf":
      p.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy - 10,
        vx: 0.3,
        vy: 0.5,
        size: 0,
        col: ["#c04040", "#4040c0", "#40a040", "#c0a040"][
          Math.floor(Math.random() * 4)
        ],
      });
      break;
    case "conf_table":
      for (let i = 0; i < 5; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy - 4,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 1.5,
          size: 0,
          col: "#ffffff",
        });
      break;
    case "gaming_sofa":
      break;
    case "desk":
      // Monitor flickers + keyboard sparks
      p.push({ x: cx - 5, y: cy - 12, vx: 0, vy: 0, size: 0, col: "#7aa2f7" });
      for (let i = 0; i < 3; i++)
        p.push({
          x: cx - 8 + i * 6,
          y: cy + 4,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random(),
          size: 1,
          col: "#9ece6a",
        });
      break;
    case "couch":
      // Cushion poof + dust
      for (let i = 0; i < 4; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random(),
          size: 2 + Math.random() * 2,
          col: ["#4a3880", "#604ca0", "#3a2868", "#5a4890"][i],
        });
      break;
    case "gym":
      // Sweat drops + energy burst
      for (let i = 0; i < 5; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 30,
          y: cy - 10 - Math.random() * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 2,
          size: 1.5,
          col: ["#88ccff", "#ffcc40", "#ff6040", "#88ccff", "#ffcc40"][i],
        });
      break;
    case "rowing_machine":
      // Splashing water droplets + sweat
      for (let i = 0; i < 8; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -1.5 - Math.random() * 2,
          size: 2 + Math.random() * 2,
          col: ["#5ab8f7", "#88ccff", "#c0e8ff", "#ffffff", "#40a0e0"][i % 5],
        });
      break;
    case "corkboard":
      // Sticky notes flutter off
      for (let i = 0; i < 6; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -1.5 - Math.random() * 2,
          size: 6 + Math.random() * 4,
          col: [
            "#f7e468",
            "#f7a8c8",
            "#a8d8f7",
            "#b8f7a8",
            "#f7c8a8",
            "#d8a8f7",
          ][i],
        });
      break;
    case "whiteboard":
      // Chalk dust + marker caps burst
      for (let i = 0; i < 10; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 35,
          y: cy + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 2.2,
          vy: -0.8 - Math.random() * 2,
          size: 2 + Math.random() * 4,
          col: [
            "#ffffff",
            "#aaccff",
            "#ffccaa",
            "#aaffcc",
            "#ffaacc",
            "#ffffff",
            "#e0e0f8",
          ][Math.floor(Math.random() * 7)],
        });
      break;
    case "neon_sign":
      {
        const nc = NEON_COLORS[(neonSignColorIdx + 1) % NEON_COLORS.length];
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          p.push({
            x: cx + Math.cos(angle) * 10,
            y: cy + Math.sin(angle) * 5,
            vx: Math.cos(angle) * (0.4 + Math.random() * 1.2),
            vy: Math.sin(angle) * (0.4 + Math.random() * 1.2) - 0.8,
            size: 2 + Math.random() * 2,
            col: nc,
          });
        }
      }
      break;
    case "lava_lamp":
      for (let i = 0; i < 8; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: cy - 5,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -1.2 - Math.random() * 1.5,
          size: 3 + Math.random() * 4,
          col: ["#ff6030", "#ff8040", "#ffaa60"][i % 3],
        });
      break;
    case "rubber_duck":
      // Lightbulb idea sparks
      for (let i = 0; i < 8; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 24,
          y: cy + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -1.5 - Math.random() * 2.5,
          size: 2 + Math.random() * 3,
          col: [
            "#f7e468",
            "#ffe080",
            "#fff4a0",
            "#ffcc20",
            "#f7d060",
            "#ffffff",
            "#ffd700",
          ][Math.floor(Math.random() * 7)],
        });
      break;
    case "terrarium":
      // Little gecko footprints scatter
      for (let i = 0; i < 6; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 1.5,
          size: 2 + Math.random() * 2,
          col: ["#70c840", "#9ece6a", "#58a030", "#b0f060"][i % 4],
        });
      break;
    case "newtons_cradle":
      for (let i = 0; i < 5; i++)
        p.push({
          x: cx + (i - 2) * 8,
          y: cy - 4,
          vx: (i - 2) * 0.4,
          vy: -1.2 - Math.abs(i - 2) * 0.3,
          size: 3,
          col: "#b0b0c0",
        });
      break;
    case "gumball_machine": {
      const GCOLS = [
        "#f7768e",
        "#9ece6a",
        "#e0af68",
        "#7aa2f7",
        "#bb9af7",
        "#ff9e64",
      ];
      for (let i = 0; i < 8; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: cy - 10,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -2.5 - Math.random() * 2,
          size: 4 + Math.random() * 2,
          col: GCOLS[Math.floor(Math.random() * GCOLS.length)],
        });
      break;
    }
    case "jukebox":
      // Music notes burst
      for (let i = 0; i < 10; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy - 5 - Math.random() * 10,
          vx: (Math.random() - 0.5) * 2.2,
          vy: -1.8 - Math.random() * 2,
          size: 3 + Math.random() * 3,
          col: [
            "#ff9030",
            "#ffb040",
            "#f7768e",
            "#9ece6a",
            "#7aa2f7",
            "#e0af68",
            "#ffcc60",
          ][i % 7],
        });
      break;
    case "crystal_ball":
      // Stars + sparkles burst outward
      for (let i = 0; i < 12; i++)
        p.push({
          x: cx + (Math.random() - 0.5) * 16,
          y: cy + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -1.5 - Math.random() * 2.5,
          size: 2 + Math.random() * 3,
          col: [
            "#c080ff",
            "#8040ff",
            "#e0c0ff",
            "#ffffff",
            "#ff80ff",
            "#80c0ff",
            "#40ffff",
          ][i % 7],
        });
      break;
    case "zen_garden":
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        p.push({
          x: cx + Math.cos(ang) * 10,
          y: cy + Math.sin(ang) * 5,
          vx: Math.cos(ang) * (0.3 + Math.random() * 0.8),
          vy: Math.sin(ang) * (0.3 + Math.random() * 0.8) - 0.5,
          size: 2 + Math.random() * 2,
          col: ["#e8dfc0", "#c8b898", "#d4c8a0", "#b8a880"][i % 4],
        });
      }
      break;
    case "photo_booth":
      // Camera flash burst + polaroid cards flying out
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        p.push({
          x: cx + Math.cos(ang) * 8,
          y: cy + Math.sin(ang) * 5,
          vx: Math.cos(ang) * (0.5 + Math.random() * 1.5),
          vy: Math.sin(ang) * (0.5 + Math.random() * 1.5) - 1.5,
          size: 5 + Math.random() * 4,
          col: [
            "#ffffff",
            "#ffe8d0",
            "#ffd4a0",
            "#ffffd0",
            "#d0f0ff",
            "#ffd0e8",
          ][i % 6],
        });
      }
      break;
  }
  return p;
}

function drawClickAnims(ctx, tick) {
  clickAnims = clickAnims.filter((a) => {
    const age = tick - a.startTick;
    if (age > 80) return false;
    const t = age / 80;
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;

    switch (a.type) {
      case "coffee": {
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.01;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        if (t < 0.6) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(a.x - 4, a.y + 6, 8, 6);
          ctx.fillStyle = "#8a6a3a";
          ctx.fillRect(a.x - 3, a.y + 4, 6, 3);
        }
        break;
      }
      case "fridge": {
        const doorW = 10 * Math.min(1, t * 3);
        ctx.fillStyle = "#d0d8e0";
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillRect(a.x + 4, a.y - 12, doorW, 18);
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        break;
      }
      case "aquarium": {
        ctx.globalAlpha = alpha * (1 - t);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const sx = a.x - 10 + i * 10;
          const spread = t * 8;
          ctx.beginPath();
          ctx.arc(sx, a.y - 10, spread, Math.PI, 0);
          ctx.stroke();
        }
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "vending": {
        const vp = a.particles[0];
        if (t < 0.5) {
          vp.y += vp.vy * 2;
        }
        ctx.fillStyle = vp.col;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(vp.x) - 3, Math.round(vp.y), 6, 8);
        ctx.fillStyle = "#ffffff40";
        ctx.fillRect(Math.round(vp.x) - 1, Math.round(vp.y) + 1, 2, 6);
        if (t > 0.35 && t < 0.8) {
          ctx.globalAlpha = alpha * (t < 0.55 ? 1 : 1 - (t - 0.55) / 0.25);
          ctx.fillStyle = "#e0af68";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.fillText("CLUNK", a.x - 16, a.y - 18);
        }
        break;
      }
      case "printer": {
        const paperY = a.y + 4 - t * 20;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha;
        ctx.fillRect(a.x - 5, paperY, 10, 12);
        ctx.fillStyle = "#888";
        for (let i = 0; i < 3; i++)
          ctx.fillRect(a.x - 3, paperY + 2 + i * 3, 6, 1);
        ctx.fillStyle = tick % 8 < 4 ? "#9ece6a" : "#2a4020";
        ctx.fillRect(a.x + 8, a.y - 2, 3, 3);
        break;
      }
      case "trash": {
        const lidP = a.particles[0];
        if (t < 0.3) {
          lidP.y += lidP.vy;
          lidP.vy += 0.08;
        } else if (t < 0.5) {
          lidP.vy = 0.6;
          lidP.y += lidP.vy;
        }
        ctx.fillStyle = "#667";
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(a.x) - 6, Math.round(lidP.y), 12, 3);
        const flyP = a.particles[1];
        if (flyP) {
          flyP.x += flyP.vx + Math.sin(tick * 0.5) * 0.8;
          flyP.y += flyP.vy + Math.cos(tick * 0.7) * 0.5;
          ctx.fillStyle = "#334";
          ctx.fillRect(Math.round(flyP.x), Math.round(flyP.y), 2, 2);
          ctx.fillStyle = "#aab8";
          ctx.fillRect(Math.round(flyP.x) - 1, Math.round(flyP.y) - 1, 1, 1);
          ctx.fillRect(Math.round(flyP.x) + 2, Math.round(flyP.y) - 1, 1, 1);
        }
        break;
      }
      case "darts": {
        const dp = a.particles[0];
        if (t < 0.4) {
          dp.y += dp.vy * 2;
        }
        ctx.fillStyle = dp.col;
        ctx.globalAlpha = alpha;
        const dy = Math.round(Math.max(a.y - 6, dp.y));
        ctx.fillRect(a.x - 1, dy, 2, 8);
        ctx.fillStyle = "#ccc";
        ctx.fillRect(a.x - 1, dy - 2, 2, 2);
        if (t > 0.35 && t < 0.65) {
          const shake = Math.sin(tick * 2) * 2;
          ctx.fillStyle = "#e0af68";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.fillText("thunk", a.x - 14 + shake, a.y - 16);
        }
        break;
      }
      case "tv": {
        const w = 28,
          h = 18;
        if (t < 0.15) {
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 1 - t / 0.15;
          ctx.fillRect(a.x - w / 2, a.y - h / 2 - 4, w, h);
        } else if (t < 0.3) {
          ctx.globalAlpha = alpha * 0.8;
          for (let i = 0; i < 30; i++) {
            const v = Math.floor(Math.random() * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(
              a.x - w / 2 + Math.random() * w,
              a.y - h / 2 - 4 + Math.random() * h,
              2,
              2,
            );
          }
        } else if (t < 0.7) {
          const colors = [
            "#f7768e",
            "#7aa2f7",
            "#9ece6a",
            "#bb9af7",
            "#e0af68",
          ];
          ctx.fillStyle = colors[tick % colors.length];
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillRect(a.x - w / 2, a.y - h / 2 - 4, w, h);
        }
        break;
      }
      case "pingpong": {
        const bp = a.particles[0];
        if (t < 0.5) {
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.vy += 0.15;
          if (bp.y > a.y + 10) {
            bp.vy = -Math.abs(bp.vy) * 0.6;
          }
        }
        ctx.fillStyle = bp.col;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(Math.round(bp.x), Math.round(bp.y), bp.size, 0, Math.PI * 2);
        ctx.fill();
        if (t > 0.15 && t < 0.55) {
          ctx.fillStyle = "#e0af68";
          ctx.font = "8px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (t < 0.35 ? 1 : 1 - (t - 0.35) / 0.2);
          ctx.fillText("POP", a.x - 10, a.y - 18);
        }
        break;
      }
      case "clock": {
        ctx.globalAlpha = alpha;
        const ccx = a.x,
          ccy = a.y;
        const r = 10;
        const angle1 = t * Math.PI * 12;
        ctx.strokeStyle = "#c8d3f5";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(angle1) * r, ccy + Math.sin(angle1) * r);
        ctx.stroke();
        const angle2 = t * Math.PI * 4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(
          ccx + Math.cos(angle2) * r * 0.6,
          ccy + Math.sin(angle2) * r * 0.6,
        );
        ctx.stroke();
        if (t > 0.3 && t < 0.7) {
          ctx.fillStyle = "#e0af68";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (t < 0.5 ? 1 : 1 - (t - 0.5) / 0.2);
          ctx.fillText("BONG", ccx - 12, ccy - 16);
        }
        break;
      }
      case "cat_pet": {
        // Hearts rising from cat
        ctx.globalAlpha = alpha;
        for (let h = 0; h < 4; h++) {
          const hx = a.cx + Math.sin(t * 6 + h * 1.5) * 12;
          const hy = a.cy - 10 - t * 40 - h * 8;
          const hs = 4 + Math.sin(t * 4 + h) * 1.5;
          ctx.fillStyle = ["#ff6080", "#ff80a0", "#ff4060", "#ff90b0"][h];
          ctx.font = Math.round(hs + 6) + "px serif";
          ctx.fillText("♥", hx, hy);
        }
        // "purr~" text
        if (t < 0.6) {
          ctx.fillStyle = "#ffb0c0";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (1 - t / 0.6);
          ctx.fillText("purr~", a.cx - 14, a.cy - 30 - t * 20);
        }
        break;
      }
      case "goose_honk": {
        // HONK! text big and bold
        ctx.globalAlpha = alpha;
        const scale = 1 + Math.sin(t * 20) * 0.15; // vibrate
        ctx.save();
        ctx.translate(a.cx, a.cy - 25 - t * 15);
        ctx.scale(scale, scale);
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 10px 'Press Start 2P',monospace";
        ctx.textAlign = "center";
        ctx.fillText("HONK!", 0, 0);
        ctx.textAlign = "left";
        ctx.restore();
        // Feathers flying
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = "#ffffff";
          const fx = a.cx + Math.sin(t * 8 + f * 2) * 20;
          const fy = a.cy - t * 30 - f * 10;
          ctx.fillRect(fx, fy, 3, 2);
        }
        break;
      }
      case "espresso": {
        // Steam burst
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.01;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        // Coffee cup sliding
        if (t < 0.6) {
          const slideX = a.x - 14 + t * 46;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#f0e8d0";
          ctx.fillRect(slideX, a.y + 2, 7, 6);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(slideX + 1, a.y + 1, 5, 3);
          ctx.fillStyle = "#d0c8b0";
          ctx.fillRect(slideX + 7, a.y + 4, 3, 3);
        }
        break;
      }
      case "arcade": {
        // Screen flash
        const w = 16,
          h = 20;
        if (t < 0.2) {
          ctx.fillStyle = ["#ff4040", "#40ff40", "#4040ff", "#ffff40"][
            tick % 4
          ];
          ctx.globalAlpha = alpha * (1 - t / 0.2) * 0.8;
          ctx.fillRect(a.x - w / 2, a.y - h / 2 - 6, w, h);
        } else if (t < 0.5) {
          ctx.globalAlpha = alpha * 0.6;
          const colors = ["#f7768e", "#7aa2f7", "#9ece6a", "#bb9af7"];
          ctx.fillStyle = colors[tick % colors.length];
          ctx.fillRect(a.x - w / 2, a.y - h / 2 - 6, w, h);
        }
        // Joystick wiggle
        const jw = Math.sin(tick * 0.8) * 4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#808090";
        ctx.fillRect(a.x - 1 + jw, a.y + 10, 2, 8);
        ctx.fillStyle = "#c04040";
        ctx.beginPath();
        ctx.arc(a.x + jw, a.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        // INSERT COIN text
        if (t > 0.25 && t < 0.75) {
          ctx.fillStyle = "#e0af68";
          ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (tick % 20 < 10 ? 1 : 0.3);
          ctx.textAlign = "center";
          ctx.fillText("INSERT COIN", a.x, a.y - h / 2 - 10);
          ctx.textAlign = "left";
        }
        break;
      }
      case "dj": {
        // Vinyl scratch wave lines
        ctx.strokeStyle = "#bb9af7";
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
        ctx.strokeStyle = "#606080";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x - 10, a.y + 4, 10, spinAngle, spinAngle + Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          a.x + 10,
          a.y + 4,
          10,
          spinAngle + Math.PI,
          spinAngle + Math.PI * 2.5,
        );
        ctx.stroke();
        break;
      }
      case "server": {
        // LEDs blink rapidly
        ctx.globalAlpha = alpha;
        for (let li = 0; li < 6; li++) {
          const lx = a.x - 6 + (li % 2) * 12;
          const ly = a.y - 14 + Math.floor(li / 2) * 8;
          ctx.fillStyle =
            (tick + li) % 3 === 0
              ? "#9ece6a"
              : (tick + li) % 3 === 1
                ? "#f7768e"
                : "#7aa2f7";
          ctx.fillRect(lx, ly, 3, 3);
        }
        // Spark flash
        if (t < 0.3) {
          ctx.fillStyle = "#ffff80";
          ctx.globalAlpha = alpha * (1 - t / 0.3);
          const sx = a.x + Math.sin(tick) * 8;
          const sy = a.y - 4 + Math.cos(tick * 1.3) * 6;
          ctx.fillRect(sx - 1, sy - 4, 2, 8);
          ctx.fillRect(sx - 4, sy - 1, 8, 2);
        }
        // REBOOT text
        if (t > 0.2 && t < 0.7) {
          ctx.globalAlpha = alpha * (tick % 12 < 6 ? 1 : 0.2);
          ctx.fillStyle = "#f7768e";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("REBOOT", a.x, a.y - 22);
          ctx.textAlign = "left";
        }
        break;
      }
      case "printer3d": {
        // Nozzle moves
        ctx.globalAlpha = alpha;
        const nozzleX = a.x - 8 + Math.sin(tick * 0.5) * 16;
        ctx.fillStyle = "#808090";
        ctx.fillRect(nozzleX - 2, a.y - 10, 4, 6);
        // Layer builds up
        const layers = Math.min(Math.floor(t * 8), 6);
        for (let li = 0; li < layers; li++) {
          ctx.fillStyle = li % 2 === 0 ? "#9ece6a" : "#7aa2f7";
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillRect(a.x - 6, a.y + 4 - li * 3, 12, 2);
        }
        break;
      }
      case "foosball": {
        // Rod spins
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#c0c0c0";
        ctx.lineWidth = 2;
        const rodY = a.y + Math.sin(tick * 0.6) * 6;
        ctx.beginPath();
        ctx.moveTo(a.x - 20, rodY);
        ctx.lineTo(a.x + 20, rodY);
        ctx.stroke();
        // Players on rod
        for (let pi = -1; pi <= 1; pi++) {
          const rot = Math.sin(tick * 0.8 + pi) * Math.PI * 0.5;
          ctx.fillStyle = "#e04040";
          ctx.fillRect(
            a.x + pi * 12 - 3,
            rodY - 4 + Math.abs(rot) * 2,
            6,
            8 - Math.abs(rot) * 2,
          );
        }
        // Ball bounces
        const bp = a.particles[0];
        if (t < 0.6) {
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.vy += 0.1;
          if (bp.y > a.y + 8) {
            bp.vy = -Math.abs(bp.vy) * 0.7;
          }
        }
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(Math.round(bp.x), Math.round(bp.y), bp.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "basketball": {
        // Ball bounces
        const bbp = a.particles[0];
        if (t < 0.5) {
          bbp.y += bbp.vy;
          bbp.vy += 0.15;
          if (bbp.y > a.y + 10) {
            bbp.vy = -Math.abs(bbp.vy) * 0.65;
          }
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bbp.col;
        ctx.beginPath();
        ctx.arc(Math.round(a.x), Math.round(bbp.y), bbp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c06020";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(a.x), Math.round(bbp.y), bbp.size, 0, Math.PI * 2);
        ctx.stroke();
        // Rim shakes
        if (t > 0.3 && t < 0.6) {
          const shake = Math.sin(tick * 3) * 3;
          ctx.strokeStyle = "#e06020";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(a.x + shake, a.y - 10, 8, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "telescope": {
        // Star burst
        ctx.globalAlpha = alpha;
        for (const p of a.particles) {
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          const sz = p.size * (1 + t);
          ctx.fillRect(Math.round(p.x) - sz / 2, Math.round(p.y), sz, sz);
          // Cross sparkle
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - sz, 2, sz * 3);
          ctx.fillRect(Math.round(p.x) - sz, Math.round(p.y), sz * 2, 2);
        }
        // WOW text
        if (t > 0.15 && t < 0.6) {
          ctx.globalAlpha = alpha * (t < 0.4 ? 1 : 1 - (t - 0.4) / 0.2);
          ctx.fillStyle = "#ffee80";
          ctx.font = "8px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("WOW", a.x, a.y - 28);
          ctx.textAlign = "left";
        }
        break;
      }
      case "kitchen_table": {
        // Plates rattle
        ctx.globalAlpha = alpha;
        for (let pi = 0; pi < 3; pi++) {
          const px = a.x - 12 + pi * 12;
          const rattle = Math.sin(tick * 2 + pi * 2) * 2;
          ctx.fillStyle = "#e0e0e0";
          ctx.beginPath();
          ctx.ellipse(px + rattle, a.y + rattle * 0.5, 5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#b0b0b0";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(px + rattle, a.y + rattle * 0.5, 5, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (t > 0.2 && t < 0.6) {
          ctx.fillStyle = "#a0a0a0";
          ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillText("clatter", a.x - 16, a.y - 12);
        }
        break;
      }
      case "bookshelf": {
        // Book falls out
        ctx.globalAlpha = alpha;
        const bp2 = a.particles[0];
        if (bp2) {
          if (t < 0.5) {
            bp2.y += bp2.vy * 2;
            bp2.vy += 0.05;
            bp2.x += bp2.vx;
          }
          ctx.fillStyle = bp2.col;
          ctx.save();
          ctx.translate(Math.round(bp2.x), Math.round(bp2.y));
          ctx.rotate(t * 3);
          ctx.fillRect(-4, -6, 8, 12);
          ctx.fillStyle = "#ffffff40";
          ctx.fillRect(-2, -4, 4, 8);
          ctx.restore();
        }
        break;
      }
      case "conf_table": {
        // Papers scatter
        ctx.globalAlpha = alpha;
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.03;
          ctx.save();
          ctx.translate(Math.round(p.x), Math.round(p.y));
          ctx.rotate(t * 4 * (p.vx > 0 ? 1 : -1));
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = alpha * (1 - t * 0.5);
          ctx.fillRect(-4, -5, 8, 10);
          ctx.fillStyle = "#888";
          for (let li = 0; li < 3; li++) ctx.fillRect(-2, -3 + li * 3, 4, 1);
          ctx.restore();
        }
        break;
      }
      case "gaming_sofa": {
        ctx.globalAlpha = alpha;
        const bounce = Math.abs(Math.sin(tick * 0.5)) * 6;
        const squish = Math.sin(tick * 0.5) * 2;
        ctx.fillStyle = "#4a3858";
        ctx.fillRect(a.x - 10, a.y - bounce, 20 + squish, 10 - squish * 0.5);
        if (t > 0.2 && t < 0.5) {
          ctx.fillStyle = "#a0a0c0";
          ctx.font = "5px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.6;
          ctx.textAlign = "center";
          ctx.fillText("boing", a.x, a.y - 16);
          ctx.textAlign = "left";
        }
        break;
      }
      case "desk": {
        ctx.globalAlpha = alpha;
        // Monitor screen flicker
        const flick = Math.sin(tick * 0.8) > 0;
        ctx.fillStyle = flick ? "#7aa2f780" : "#4060a080";
        ctx.fillRect(a.x - 12, a.y - 18, 24, 14);
        // Screen glitch lines
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = "#ffffff40";
          ctx.fillRect(
            a.x - 10,
            a.y - 16 + i * 5 + Math.sin(tick * 0.3 + i) * 2,
            20,
            1,
          );
        }
        // Keyboard sparks
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t);
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (t > 0.1 && t < 0.4) {
          ctx.fillStyle = "#9ece6a";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * 0.8;
          ctx.textAlign = "center";
          ctx.fillText("TAP TAP", a.x, a.y + 16);
          ctx.textAlign = "left";
        }
        break;
      }
      case "couch": {
        ctx.globalAlpha = alpha;
        // Cushion poof particles
        for (const p of a.particles) {
          p.x += p.vx * 0.95;
          p.y += p.vy;
          p.vy += 0.04;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        // Poof text
        if (t < 0.4) {
          ctx.globalAlpha = alpha * (1 - t / 0.4);
          ctx.fillStyle = "#c0b0d0";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("POOF", a.x, a.y - 20 - t * 15);
          ctx.textAlign = "left";
        }
        break;
      }
      case "gym": {
        ctx.globalAlpha = alpha;
        // Energy burst particles
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        // PUMP IT text
        if (t > 0.1 && t < 0.5) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#ff6040";
          ctx.font = "bold 8px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          const shake = Math.sin(tick * 0.6) * 2;
          ctx.fillText("PUMP IT!", a.x + shake, a.y - 25 - t * 10);
          ctx.textAlign = "left";
        }
        break;
      }
      case "corkboard": {
        // Sticky notes flutter off board
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04; // gravity
          p.vx *= 0.98;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          ctx.fillStyle = p.col;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * Math.PI * (p.vx > 0 ? 1 : -1));
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
        if (t < 0.4) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#f7e468";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("SPRINT!", a.x, a.y - 28 - t * 12);
          ctx.textAlign = "left";
        }
        break;
      }
      case "whiteboard": {
        // Chalk dust drifts off
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.015;
          p.vx *= 0.97;
          ctx.globalAlpha = alpha * (1 - t * 0.75);
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        if (t < 0.45) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#ffffff";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("✓ IDEA!", a.x, a.y - 22 - t * 14);
          ctx.textAlign = "left";
        }
        break;
      }
      case "neon_sign": {
        // Neon spark burst + color change text
        const ncol = NEON_COLORS[neonSignColorIdx];
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillStyle = p.col;
          ctx.shadowColor = p.col;
          ctx.shadowBlur = 8;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          ctx.shadowBlur = 0;
        }
        if (t < 0.5) {
          ctx.globalAlpha = alpha * (1 - t * 1.5);
          ctx.fillStyle = ncol;
          ctx.shadowColor = ncol;
          ctx.shadowBlur = 10;
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("✨ VIBE!", a.x, a.y - 26 - t * 12);
          ctx.textAlign = "left";
          ctx.shadowBlur = 0;
        }
        break;
      }
      case "lava_lamp": {
        // Blobs float up when tapped
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.04;
          p.vx *= 0.97;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.ellipse(
            Math.round(p.x),
            Math.round(p.y),
            p.size,
            p.size * 0.8,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        if (t < 0.5) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#ff8040";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("✨ ZEN", a.x, a.y - 25 - t * 14);
          ctx.textAlign = "left";
        }
        break;
      }
      case "terrarium": {
        // Gecko particles bounce up
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        // "HI!" text pop
        if (t < 0.55) {
          ctx.globalAlpha = alpha * (1 - t * 1.5);
          ctx.fillStyle = "#9ece6a";
          ctx.font = "bold 10px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("HI! 🦎", a.x, a.y - 18 - t * 16);
          ctx.textAlign = "left";
        }
        break;
      }
      case "newtons_cradle": {
        // Balls flying outward
        ctx.globalAlpha = alpha;
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t > 0.15 && t < 0.55) {
          ctx.fillStyle = "#c8c8d8";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.globalAlpha = alpha * (t < 0.35 ? 1 : 1 - (t - 0.35) / 0.2);
          ctx.textAlign = "center";
          ctx.fillText("clack!", a.x, a.y - 20);
          ctx.textAlign = "left";
        }
        break;
      }
      case "gumball_machine": {
        // Colorful gumballs arc out
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12;
          p.vx *= 0.97;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t < 0.5) {
          ctx.globalAlpha = alpha * (1 - t * 1.8);
          ctx.fillStyle = "#e0af68";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("25¢", a.x, a.y - 22 - t * 12);
          ctx.textAlign = "left";
        }
        break;
      }
      case "rubber_duck": {
        // Lightbulb / idea sparks
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.03;
          p.vx *= 0.96;
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t < 0.5) {
          ctx.globalAlpha = alpha * (1 - t * 1.5);
          ctx.fillStyle = "#f7e468";
          ctx.font = "bold 9px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          const pulse = 1 + Math.sin(t * 15) * 0.08;
          ctx.save();
          ctx.scale(pulse, pulse);
          ctx.fillText("💡 AHA!", a.x / pulse, (a.y - 30 - t * 15) / pulse);
          ctx.restore();
        }
        break;
      }
      case "jukebox": {
        // Floating music notes
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.02;
          p.vx *= 0.98;
          ctx.globalAlpha = alpha * (1 - t * 0.6);
          ctx.fillStyle = p.col;
          ctx.font = `${p.size + 3}px serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            ["♪", "♫", "♩", "♬"][Math.round(p.x + p.y) % 4],
            Math.round(p.x),
            Math.round(p.y),
          );
        }
        if (t < 0.55) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#ffb040";
          ctx.font = "7px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("♪ JAMMIN!", a.x, a.y - 28 - t * 12);
          ctx.textAlign = "left";
        }
        break;
      }
      case "crystal_ball": {
        // Stars spiral outward
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.03;
          p.vx *= 0.97;
          ctx.globalAlpha = alpha * (1 - t * 0.65);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(
            Math.round(p.x),
            Math.round(p.y),
            p.size * 0.8,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        // Fortune text
        const fortunes = ["DESTINY!", "FORETOLD!", "INCOMING!", "GREATNESS!"];
        const fortune = fortunes[Math.floor(a.startTick / 60) % 4];
        if (t < 0.5) {
          ctx.globalAlpha = alpha * (1 - t * 1.5);
          ctx.fillStyle = "#e0b0ff";
          ctx.font = "6px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("🔮 " + fortune, a.x, a.y - 30 - t * 14);
          ctx.textAlign = "left";
        }
        break;
      }
      case "zen_garden": {
        // Ripple rings radiating outward
        const rings = 3;
        for (let ri = 0; ri < rings; ri++) {
          const rDelay = ri * 0.25;
          if (t < rDelay) continue;
          const rt = Math.min((t - rDelay) / 0.5, 1);
          const rr = rt * 28;
          ctx.globalAlpha = alpha * (1 - rt) * 0.6;
          ctx.strokeStyle = "#c8b898";
          ctx.lineWidth = 1.5 - rt;
          ctx.beginPath();
          ctx.ellipse(a.x, a.y + 4, rr, rr * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          ctx.globalAlpha = alpha * (1 - t * 0.8);
          ctx.fillStyle = p.col;
          ctx.fillRect(
            Math.round(p.x - p.size / 2),
            Math.round(p.y - p.size / 2),
            p.size,
            p.size,
          );
        }
        if (t > 0.15 && t < 0.65) {
          ctx.globalAlpha = alpha * Math.min(1, 1 - (t - 0.15) / 0.5);
          ctx.fillStyle = "#9ece6a";
          ctx.font = "8px 'Press Start 2P',monospace";
          ctx.textAlign = "center";
          ctx.fillText("CALM", a.x, a.y - 18);
          ctx.textAlign = "left";
        }
        break;
      }
      case "photo_booth": {
        // White flash expanding ring
        const flashR = t * 40;
        ctx.globalAlpha = alpha * Math.max(0, 1 - t * 2) * 0.8;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4 - t * 3;
        ctx.beginPath();
        ctx.arc(a.x, a.y - 5, flashR, 0, Math.PI * 2);
        ctx.stroke();
        // Camera emoji
        if (t < 0.45) {
          ctx.globalAlpha = alpha;
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("📸", a.x, a.y + 4);
          ctx.textAlign = "left";
        }
        // Polaroid cards flying out
        for (const p of a.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          ctx.globalAlpha = alpha * (1 - t * 0.5);
          ctx.fillStyle = p.col;
          const pw = p.size,
            ph = p.size * 1.3;
          ctx.fillRect(
            Math.round(p.x - pw / 2),
            Math.round(p.y - ph / 2),
            pw,
            ph,
          );
          ctx.fillStyle = "#55555580";
          ctx.fillRect(
            Math.round(p.x - pw / 2 + 1),
            Math.round(p.y - ph / 2 + 1),
            pw - 2,
            ph - 4,
          );
        }
        break;
      }
    }
    ctx.restore();
    return true;
  });
}

// Add admin button to header
const adminBtn = document.createElement("button");
adminBtn.textContent = "✏️ EDIT";
adminBtn.style.cssText =
  "background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:4px 10px;font-family:inherit;font-size:7px;cursor:pointer;margin-left:8px;border-radius:4px;";
adminBtn.onclick = toggleAdmin;
document.querySelector("header .view-tabs").appendChild(adminBtn);

const simsBtn = document.createElement("button");
simsBtn.textContent = "🎮 SIMS";
simsBtn.style.cssText =
  "background:#2a2848;color:#c8d3f5;border:1px solid #3a3860;padding:4px 10px;font-family:inherit;font-size:7px;cursor:pointer;margin-left:4px;border-radius:4px;";
simsBtn.onclick = toggleSimsMode;
document.querySelector("header .view-tabs").appendChild(simsBtn);

// Admin info panel
const adminPanel = document.createElement("div");
adminPanel.id = "admin-panel";
adminPanel.style.cssText =
  "display:none;position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#1a1a30e0;border:1px solid #3a3860;border-radius:8px;padding:8px 16px;gap:8px;align-items:center;z-index:100;font-size:7px;color:#c8d3f5;";
adminPanel.innerHTML = `
  <span>🖱 Drag objects to move</span>
  <button id="admin-start-pos" style="background:#283040;color:#7aa2f7;border:1px solid #7aa2f740;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">🏠 Start Position</button>
  <button id="admin-reset" style="background:#3a2020;color:#f7768e;border:1px solid #f7768e40;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">Reset All</button>
  <button id="admin-export" style="background:#203a20;color:#9ece6a;border:1px solid #9ece6a40;padding:3px 8px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;">Export JSON</button>
`;
document.body.appendChild(adminPanel);

document.getElementById("admin-start-pos").onclick = () => {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;";
  const box = document.createElement("div");
  box.style.cssText =
    "background:#12121e;border:2px solid #3a3860;border-radius:10px;padding:24px 32px;display:flex;flex-direction:column;gap:14px;align-items:center;box-shadow:0 0 40px #0008;min-width:280px;";
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

  box.querySelector("#sp-no").onclick = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  box.querySelector("#sp-yes").onclick = () => {
    overlay.remove();
    // Reset objects to BUILTIN_POSITIONS
    localStorage.setItem("admin_positions", JSON.stringify(BUILTIN_POSITIONS));
    localStorage.removeItem("admin_walls");
    window._adminPos = Object.assign({}, BUILTIN_POSITIONS);
    // Reset walls to default sizes
    COLS = 35;
    CW = OX + COLS * T + OX;
    canvas.width = CW;
    bgBuf.width = CW;
    generateLayout(Math.max(12, Object.keys(agentsData).length));
    applyCustomPositions();
    buildAdminObjects();
    syncIdleSpotsToAdmin();
    buildBackground();
    buildObstacleGrid();
  };
};

document.getElementById("admin-reset").onclick = () => {
  localStorage.removeItem("admin_positions");
  localStorage.removeItem("admin_walls");
  window._adminPos = Object.assign({}, BUILTIN_POSITIONS);
  // Force canvas resize to fit all objects
  ROWS = Math.max(ROWS, 45);
  CH = OY + ROWS * T + OY;
  canvas.height = CH;
  bgBuf.height = CH;
  applyWallPositions();
  generateLayout(Math.max(12, Object.keys(agentsData).length));
  applyCustomPositions();
  buildAdminObjects();
  syncIdleSpotsToAdmin();
  buildBackground();
  buildObstacleGrid();
};

document.getElementById("admin-export").onclick = () => {
  const pos = {};
  for (const obj of adminObjects) pos[obj.id] = { tx: obj.tx, ty: obj.ty };
  const json = JSON.stringify(pos, null, 2);
  navigator.clipboard
    .writeText(json)
    .then(() => alert("Copied to clipboard!"))
    .catch(() => {
      prompt("Copy this JSON:", json);
    });
};

// Keyboard shortcut: E to toggle admin, H to toggle heatmap, P to toggle productivity chart, T to toggle timeline
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.key === "e" && !e.ctrlKey && !e.metaKey) toggleAdmin();
  if (e.key === "h" || e.key === "H") heatmapVisible = !heatmapVisible;
  if (e.key === "p" || e.key === "P")
    productivityVisible = !productivityVisible;
  if (e.key === "t" || e.key === "T") timelineVisible = !timelineVisible;
  if (e.key === "Escape" && simsMode && simsSelectedAgents.size > 0) {
    simsSelectedAgents = new Set();
  }
});

// ════════════════════════════════════════════════════════════════
//  EXPOSE GLOBALS for inline onclick handlers in HTML
// ════════════════════════════════════════════════════════════════
window.switchTab = switchTab;
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
