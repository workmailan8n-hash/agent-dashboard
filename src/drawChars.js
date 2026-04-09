// ════════════════════════════════════════════════════════════════
//  CHARACTER DRAW FUNCTIONS + NEW FEATURE DRAW FUNCTIONS
// ════════════════════════════════════════════════════════════════
import { ease } from "./math.js";
import { OX, OY, T, SCREEN_C } from "./constants.js";
import { COLS, ROWS } from "./layout.js";
import { PS } from "./particles.js";
import * as state from "./state.js";
import { getAdminPos } from "./adminPos.js";
import {
  PER_ROW,
  STEP_X,
  PP_L,
  PP_R,
  ppBall,
  IDLE_SPOTS,
  KITCHEN_WALL_COL,
  KITCHEN_START_ROW,
} from "./layout.js";

function ts(tx, ty) {
  return [OX + tx * T, OY + ty * T];
}

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
    const _WTX = [1, 33];
    for (let w = 0; w < _WTX.length; w++) {
      for (let j = 0; j < 3; j++) {
        const wx = OX + _WTX[w] * T + 4;
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
  for (const m of dustMotes) {
    m.y += m.speed;
    m.x = m.wx + (T - 12) / 2 + Math.sin(tick * 0.02 + m.phase) * 6;
    if (m.y > OY + 5 + T - 10) {
      m.y = OY + 6;
      m.x = m.wx + Math.random() * (T - 12);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.wx, OY + 5, T - 8, T - 10);
    ctx.clip();
    ctx.globalAlpha = 0.25 + Math.sin(tick * 0.03 + m.phase) * 0.15;
    ctx.fillStyle = "#ffe8a0";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Fireflies outside windows at night ──
let fireflies = [];
function drawFireflies(ctx, tick) {
  const tod = getTimeOfDay();
  if (tod.state !== "night") {
    return;
  }
  if (fireflies.length === 0) {
    const _WTX = [1, 33];
    for (let w = 0; w < _WTX.length; w++) {
      for (let j = 0; j < 2; j++) {
        const wx = OX + _WTX[w] * T + 4;
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.wx, OY + 5, T - 8, T - 10);
    ctx.clip();
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
    ctx.restore();
  }
}

// ── Dart animation — darts fly toward board when agent is at darts spot ──
let dartAnims = []; // {startTime, angle, progress}
function drawDartAnimation(ctx, tick) {
  const rX = PER_ROW * STEP_X + 2;
  // Check if any agent is at the darts spot
  const dartPlayer = Object.values(state.agentStates).find(
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

// ── climbing_stairs — agent climbs up staircase ──────────────────
function drawClimbingStairs(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const step = Math.floor(t * 4) % 4; // 0-3 stair steps
  const legL = step < 2 ? Math.sin(ph * 2) * 6 : -Math.sin(ph * 2) * 6;
  const legR = -legL;
  const bob = Math.abs(Math.sin(ph * 2)) * 2;
  const lean = -3; // lean forward (climbing)
  const rise = Math.sin(ph * 2) * 2; // slight upward motion
  shd(ctx, cx, cy + 16, 7, 2);
  // legs (one raised, one stepping)
  px(ctx, cx - 4 + lean, cy + 5 + legL, 4, 8, pal.pants);
  px(ctx, cx + 1 + lean, cy + 5 + legR, 4, 8, pal.pants);
  px(ctx, cx - 5 + lean, cy + 12 + legL, 5, 3, "#1a1a2a");
  px(ctx, cx + 1 + lean, cy + 12 + legR, 5, 3, "#1a1a2a");
  // body leaning forward
  px(ctx, cx - 5 + lean, cy - 3 - bob, 11, 9, pal.shirt);
  // arms — one gripping handrail
  px(ctx, cx + 6 + lean, cy - 5 - bob, 4, 9, pal.skin);
  px(ctx, cx - 10 + lean, cy - 2 - bob, 5, 7, pal.skin);
  // hand on rail
  px(ctx, cx + 9 + lean, cy - 6 - bob, 4, 3, pal.skin);
  drawHeadFront(ctx, cx + lean, cy - 12 - bob, pal, false);
}

// ── writing_whiteboard — agent stands and writes on board ────────
function drawWritingWhiteboard(ctx, cx, cy, pal, t) {
  const ph = t * Math.PI * 2;
  const armUp = Math.sin(ph * 1.5) * 8; // arm moves up/down writing
  const headTilt = Math.sin(ph * 0.5) * 2;
  shd(ctx, cx, cy + 16);
  // standing legs (feet apart slightly)
  px(ctx, cx - 4, cy + 5, 4, 9, pal.pants);
  px(ctx, cx + 1, cy + 5, 4, 9, pal.pants);
  px(ctx, cx - 5, cy + 13, 5, 3, "#1a1a2a");
  px(ctx, cx + 1, cy + 13, 5, 3, "#1a1a2a");
  // body upright
  px(ctx, cx - 5, cy - 2, 11, 8, pal.shirt);
  // right arm raised writing on board
  px(ctx, cx + 5, cy - 6 - armUp * 0.5, 4, 7 + Math.abs(armUp) * 0.3, pal.skin);
  px(ctx, cx + 8, cy - 8 - armUp, 3, 4, pal.skin); // hand
  // marker in hand (tiny pixel)
  ctx.fillStyle = "#f7768e";
  ctx.fillRect((cx + 10) | 0, (cy - 9 - armUp) | 0, 3, 1);
  // left arm at side
  px(ctx, cx - 9, cy - 1, 4, 8, pal.skin);
  // head facing board (back-ish)
  drawHeadBack(ctx, cx + headTilt, cy - 12, pal);
  // writing effect: small mark appears on board
  if (Math.random() < 0.04)
    PS.emit(cx + 14, cy - 10 - armUp, 1, {
      vx: 0,
      vy: 0,
      spread: 1,
      gravity: 0,
      life: 0.6,
      size: 2,
      color: "#7aa2f7",
    });
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
  playing_foosball: drawPlayingFoosball,
  using_telescope: drawUsingTelescope,
  climbing_stairs: drawClimbingStairs,
  writing_whiteboard: drawWritingWhiteboard,
};

// ════════════════════════════════════════════════════════════════
//  NEW FEATURE DRAW FUNCTIONS
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  NEW FEATURE DRAW FUNCTIONS
// ════════════════════════════════════════════════════════════════

// ── Kanban board — shows myTasks on the office wall ──────────────
// Positioned on the right wall of the main office, ABOVE the kitchen partition
function drawKanban(ctx) {
  if (!state.myTasks || KITCHEN_WALL_COL === 0) return;
  // Position: right entertainment zone, below darts and above aquarium
  const rX = PER_ROW * STEP_X + 2;
  const [_kbTx, _kbTy] = getAdminPos("kanban", rX + 0.2, 2.5);
  const bx = OX + _kbTx * T;
  const by = OY + _kbTy * T;
  const bw = Math.min((COLS - 1 - _kbTx - 0.3) * T, T * 6);
  const bh = T * 3;

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
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("KANBAN", bx + bw / 2, by + 16);

  // Divider line
  ctx.fillStyle = "#a08050";
  ctx.fillRect(bx + 4, by + 20, bw - 8, 2);

  // Two columns
  const colW = (bw - 12) / 2;
  const col1x = bx + 5,
    col2x = bx + 7 + colW;
  const colY = by + 26;

  // Column headers
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e0af68";
  ctx.fillText("TODO", col1x + 2, colY + 2);
  ctx.fillStyle = "#9ece6a";
  ctx.fillText("DONE", col2x + 2, colY + 2);
  ctx.fillStyle = "#a08050";
  ctx.fillRect(bx + colW + 6, by + 20, 2, bh - 24); // column divider

  // Task cards
  const todo = state.myTasks.filter((t) => t.status === "todo").slice(0, 6);
  const done = state.myTasks.filter((t) => t.status === "done").slice(0, 6);
  const cardH = 16,
    gap = 3;

  todo.forEach((task, i) => {
    const cy2 = colY + 8 + i * (cardH + gap);
    if (cy2 + cardH > by + bh - 4) return;
    ctx.fillStyle = "#e0af6830";
    ctx.fillRect(col1x, cy2, colW - 2, cardH);
    ctx.fillStyle = "#e0af68";
    ctx.fillRect(col1x, cy2, 3, cardH); // priority bar
    ctx.fillStyle = "#3d2a0a";
    ctx.font = "8px monospace";
    const maxChars = Math.floor((colW - 14) / 5);
    const label = task.title.substring(0, maxChars);
    ctx.fillText(label, col1x + 6, cy2 + 11);
  });

  done.forEach((task, i) => {
    const cy2 = colY + 8 + i * (cardH + gap);
    if (cy2 + cardH > by + bh - 4) return;
    ctx.fillStyle = "#9ece6a20";
    ctx.fillRect(col2x, cy2, colW - 2, cardH);
    ctx.fillStyle = "#9ece6a";
    ctx.fillRect(col2x, cy2, 3, cardH);
    ctx.fillStyle = "#3d2a0a80";
    ctx.font = "8px monospace";
    const maxChars = Math.floor((colW - 14) / 5);
    const label = task.title.substring(0, maxChars);
    ctx.fillText(label, col2x + 6, cy2 + 11);
    // Strikethrough line
    ctx.fillStyle = "#3d2a0a50";
    ctx.fillRect(col2x + 6, cy2 + 8, Math.min(label.length * 5, colW - 14), 1);
  });

  if (state.myTasks.length === 0) {
    ctx.fillStyle = "#a08050";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("no tasks yet", bx + bw / 2, colY + 14);
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

  const _WINDOW_TX = [1, 33];
  for (let i = 0; i < _WINDOW_TX.length; i++) {
    const wx = OX + _WINDOW_TX[i] * T + 4,
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

export {
  px,
  shd,
  drawHeadFront,
  drawHeadBack,
  drawHeadSide,
  drawHeadFront34,
  drawHeadBack34,
  drawWalkS,
  drawWalking,
  drawWalkN,
  drawWalkE,
  drawWalkW,
  drawWalkSE,
  drawWalkSW,
  drawWalkNE,
  drawWalkNW,
  drawWalkIdle,
  WALK_DIR_FN,
  CHAR_DRAW,
  drawSittingDown,
  drawTypingNormal,
  drawTypingFurious,
  drawThinking,
  drawDrinkingDesk,
  drawSpinningChair,
  drawCelebrating,
  drawPhone,
  drawStretching,
  drawSleeping,
  drawDrinkingBeer,
  drawAtCoffee,
  drawAtFridge,
  drawEating,
  drawWindowGaze,
  drawHeadphones,
  drawAirGuitar,
  drawYoga,
  drawReading,
  drawDeskNap,
  drawDeskYawn,
  drawDoodling,
  drawPlantCare,
  drawChattingL,
  drawChattingR,
  drawArguingL,
  drawArguingR,
  drawGossipingL,
  drawGossipingR,
  drawGaming,
  drawTreadmill,
  drawBenchPress,
  drawBoxing,
  drawCycling,
  drawLiftingWeights,
  drawPingPongL,
  drawPingPongR,
  drawPingPongBall,
  drawAquariumFish,
  aquariumFish,
  drawDustMotes,
  drawFireflies,
  drawDartAnimation,
  dartAnims,
  drawSmokingBeer,
  drawPettingCat,
  drawCleaning,
  drawStandingUp,
  drawPlayingArcade,
  drawDrinkingEspresso,
  drawDJing,
  drawFixingServer,
  drawWatching3DPrint,
  drawShootingBasket,
  drawPlayingFoosball,
  drawUsingTelescope,
  drawKanban,
  getTimeOfDay,
  getDailyWeather,
  drawDynamicWindows,
  drawOfficeLighting,
  drawWallClock,
  drawTrashCan,
};
