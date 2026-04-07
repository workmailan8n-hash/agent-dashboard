// ════════════════════════════════════════════════════════════════
//  CAT & GOOSE
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from "./constants.js";
import { COLS, ROWS, KITCHEN_DOOR_ROW } from "./layout.js";
import { clamp } from "./math.js";
import { PS } from "./particles.js";
import { DESK_DEFS, IDLE_SPOTS, CAT_BOWLS } from "./layout.js";
import { agentStates } from "./state.js";
import S from "./state.js";

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
//  PIZZA DELIVERY NPC
// ════════════════════════════════════════════════════════════════
class PizzaDelivery {
  constructor() {
    this.state = "idle";
    this.tx = 0;
    this.ty = 0;
    this.sx = 0;
    this.sy = 0;
    this._lastDay = -1;
    this._enterTimer = 0;
    this._deliverTimer = 0;
    this._speed = 3.5; // tiles/sec
  }

  _screenPos() {
    this.sx = OX + this.tx * T;
    this.sy = OY + this.ty * T;
  }

  _moveTo(targetTx, targetTy, dt) {
    const dx = targetTx - this.tx;
    const dy = targetTy - this.ty;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this._speed * dt;
    if (dist <= step) {
      this.tx = targetTx;
      this.ty = targetTy;
      this._screenPos();
      return true;
    }
    this.tx += (dx / dist) * step;
    this.ty += (dy / dist) * step;
    this._screenPos();
    return false;
  }

  update(dt, tick) {
    const doorAnim = S.doorAnim;
    const entryTx = COLS - 0.5;
    const entryTy = KITCHEN_DOOR_ROW + 1.5;
    const spotTx = COLS * 0.4;
    const spotTy = ROWS * 0.5;

    if (this.state === "idle") {
      const now = new Date();
      const today = now.getDate();
      if (
        now.getHours() === 12 &&
        now.getMinutes() === 0 &&
        this._lastDay !== today
      ) {
        this._lastDay = today;
        this.tx = entryTx;
        this.ty = entryTy;
        this._screenPos();
        this.state = "entering";
        doorAnim.target = 1;
        doorAnim.timer = 1.5;
        this._enterTimer = 0;
      }
    } else if (this.state === "entering") {
      this._enterTimer += dt;
      if (this._enterTimer >= 0.5) {
        this.state = "walking_to_spot";
      }
    } else if (this.state === "walking_to_spot") {
      const arrived = this._moveTo(spotTx, spotTy, dt);
      if (arrived) {
        this.state = "delivering";
        this._deliverTimer = 0;
      }
    } else if (this.state === "delivering") {
      this._deliverTimer += dt;
      if (this._deliverTimer >= 4) {
        this.state = "leaving";
        doorAnim.target = 1;
        doorAnim.timer = 1.5;
      }
    } else if (this.state === "leaving") {
      const arrived = this._moveTo(entryTx, entryTy, dt);
      if (arrived) {
        this.state = "done";
        doorAnim.target = 0;
        doorAnim.timer = 0;
      }
    } else if (this.state === "done") {
      this.state = "idle";
    }
  }

  draw(ctx, tick) {
    if (this.state === "idle") return;

    ctx.save();

    const cx = this.sx;
    const cy = this.sy;
    const bob = Math.sin(tick * 0.18) * 2;
    const isLeaving = this.state === "leaving";
    const isDelivering = this.state === "delivering";

    // Flip when leaving (facing right toward door)
    if (isLeaving) {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
    }

    const by = cy + bob;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (walk animation)
    const legSwing = isDelivering ? 0 : Math.sin(tick * 0.18) * 5;
    ctx.fillStyle = "#3a3a5a";
    ctx.fillRect((cx - 5) | 0, (by + 8) | 0, 4, (8 + legSwing * 0.3) | 0);
    ctx.fillRect((cx + 1) | 0, (by + 8) | 0, 4, (8 - legSwing * 0.3) | 0);

    // Body — red uniform jacket
    ctx.fillStyle = "#cc2200";
    ctx.fillRect((cx - 8) | 0, (by - 4) | 0, 16, 14);
    // Jacket stripe
    ctx.fillStyle = "#ff4422";
    ctx.fillRect((cx - 1) | 0, (by - 4) | 0, 2, 14);

    // Arm — left side (wave when delivering)
    if (isDelivering) {
      const waveAngle = Math.sin(tick * 0.12) * 0.6;
      ctx.save();
      ctx.translate(cx - 8, by + 2);
      ctx.rotate(-waveAngle - 0.8);
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(-2, 0, 4, 9);
      ctx.restore();
    } else {
      ctx.fillStyle = "#cc2200";
      ctx.fillRect((cx - 12) | 0, (by - 2) | 0, 4, 9);
    }
    // Arm — right side
    ctx.fillStyle = "#cc2200";
    ctx.fillRect((cx + 8) | 0, (by - 2) | 0, 4, 9);

    // Skin — hands
    ctx.fillStyle = "#f5c5a0";
    ctx.fillRect((cx - 13) | 0, (by + 6) | 0, 4, 3);
    ctx.fillRect((cx + 9) | 0, (by + 6) | 0, 4, 3);

    // Head — skin tone
    ctx.fillStyle = "#f5c5a0";
    ctx.beginPath();
    ctx.ellipse(cx, by - 10, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#2a1808";
    ctx.fillRect((cx - 3) | 0, (by - 11) | 0, 2, 2);
    ctx.fillRect((cx + 1) | 0, (by - 11) | 0, 2, 2);

    // Smile
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, by - 8, 3, 0, Math.PI);
    ctx.stroke();

    // Cap — red triangle + brim
    ctx.fillStyle = "#cc2200";
    ctx.beginPath();
    ctx.moveTo(cx - 7, by - 17);
    ctx.lineTo(cx, by - 26);
    ctx.lineTo(cx + 7, by - 17);
    ctx.closePath();
    ctx.fill();
    // Cap brim
    ctx.fillStyle = "#aa1800";
    ctx.fillRect((cx - 8) | 0, (by - 18) | 0, 16, 3);
    // Cap button top
    ctx.fillStyle = "#ff6644";
    ctx.beginPath();
    ctx.arc(cx, by - 26, 2, 0, Math.PI * 2);
    ctx.fill();

    // Pizza box
    if (isDelivering) {
      // Box set down on floor
      const bx = cx - 10;
      const bboxY = cy + 12;
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(bx | 0, bboxY | 0, 20, 12);
      ctx.fillStyle = "#a07040";
      ctx.fillRect((bx + 1) | 0, (bboxY + 1) | 0, 18, 10);
      ctx.fillStyle = "#cc3300";
      ctx.beginPath();
      ctx.arc(bx + 10, bboxY + 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx + 8, bboxY + 5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 12, bboxY + 7, 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Box held at waist height
      const bx = cx - 14;
      const bboxY = by + 1;
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(bx | 0, bboxY | 0, 20, 12);
      ctx.fillStyle = "#a07040";
      ctx.fillRect((bx + 1) | 0, (bboxY + 1) | 0, 18, 10);
      ctx.fillStyle = "#cc3300";
      ctx.beginPath();
      ctx.arc(bx + 10, bboxY + 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx + 8, bboxY + 5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 12, bboxY + 7, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speech bubble when delivering
    if (isDelivering) {
      const bubX = cx;
      const bubY = by - 42;
      ctx.fillStyle = "#fffde0";
      ctx.strokeStyle = "#c0a000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bubX - 28, bubY - 10, 56, 16, 4);
      ctx.fill();
      ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(bubX - 4, bubY + 6);
      ctx.lineTo(bubX, bubY + 13);
      ctx.lineTo(bubX + 6, bubY + 6);
      ctx.fillStyle = "#fffde0";
      ctx.fill();
      ctx.strokeStyle = "#c0a000";
      ctx.stroke();
      // Text
      ctx.fillStyle = "#664400";
      ctx.font = "5px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("PIZZA!", bubX, bubY + 3);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }
}

const pizzaDelivery = new PizzaDelivery();

export {
  drawCat,
  CatState,
  cat,
  GooseState,
  goose,
  drawGoose,
  bowlRefills,
  pizzaDelivery,
};
