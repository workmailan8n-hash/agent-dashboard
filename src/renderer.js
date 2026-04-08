// ════════════════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from "./constants.js";
import { COLS, ROWS, CW, CH } from "./layout.js";
import { lerp, clamp } from "./math.js";
import { sndSpawn, sndRemove, blip } from "./audio.js";
import { getPalette, getRole } from "./palettes.js";
import { ANIM } from "./animConfig.js";
import { PS } from "./particles.js";
import { getAdminPos } from "./adminPos.js";
import {
  DESK_DEFS,
  DESK_SLOTS,
  COUCH_DEFS,
  COUCH_SLOTS,
  IDLE_SPOTS,
  GROUP_PAIRS,
  CAT_BOWLS,
  KITCHEN_WALL_COL,
  KITCHEN_START_ROW,
  KITCHEN_DOOR_ROW,
  PER_ROW,
  STEP_X,
  ACT_ZONE_Y,
  PP_L,
  PP_R,
  ppBall,
  generateLayout,
  buildObstacleGrid,
} from "./layout.js";
import {
  agentsData,
  agentStates,
  idleOccupied,
  doorAnim,
  globalTick,
  lastTime,
  startTime,
  myTasks,
  setGlobalTick,
  setLastTime,
  adminMode,
  simsMode,
  simsSelectedAgent,
  setSimsSelectedAgent,
  printerActive,
  trashLevel,
  trashAgentId,
  setPrinterActive,
  setTrashLevel,
  setTrashAgentId,
  clickAnims,
} from "./state.js";
import { AgentState, TOOLS_MAP } from "./agentState.js";
import {
  bgBuf,
  ts,
  buildBackground,
  drawEntranceDoor,
  drawCatBowls,
} from "./background.js";
import { drawDynamicEffects } from "./effects.js";
import {
  drawKanban,
  drawDynamicWindows,
  drawDustMotes,
  drawFireflies,
  drawWallClock,
  drawTrashCan,
  drawOfficeLighting,
  drawPingPongBall,
  drawDartAnimation,
  drawAquariumFish,
} from "./drawChars.js";
import {
  cat,
  goose,
  bowlRefills,
  pizzaDelivery,
  cleaningCrew,
  randomVisitor,
} from "./creatures.js";
import { renderCard, updateUI } from "./ui.js";
import {
  drawAdminOverlay,
  syncIdleSpotsToAdmin,
  buildAdminObjects,
} from "./admin.js";
import { drawClickAnims } from "./clickAnims.js";

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
  pizzaDelivery.update(dt, globalTick);
  cleaningCrew.update(dt, globalTick);
  randomVisitor.update(dt, globalTick);

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

  // ── Draw ─────────────────────────────────────────────────────
  ctx.clearRect(0, 0, CW, canvas.height);
  ctx.drawImage(bgBuf, 0, 0);
  drawEntranceDoor(ctx);
  drawLeftPanel(ctx, globalTick);
  drawRightPanel(ctx, globalTick);
  drawDynamicEffects(ctx, globalTick);
  drawAquariumFish(ctx, globalTick); // before agents so fish stay behind

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
  pizzaDelivery.draw(ctx, globalTick);
  cleaningCrew.draw(ctx, globalTick);
  randomVisitor.draw(ctx, globalTick);
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
    if (simsSelectedAgent && agentStates[simsSelectedAgent]) {
      const sp = agentStates[simsSelectedAgent];
      ctx.save();
      ctx.strokeStyle = "#9ece6a";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#9ece6a";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(sp.sx, sp.sy + 16, 14, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
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
      }
    }
    // Selected agent — show "click object to send" hint
    if (simsSelectedAgent && agentStates[simsSelectedAgent]) {
      ctx.save();
      ctx.fillStyle = "#9ece6a";
      ctx.font = "7px 'Press Start 2P',monospace";
      ctx.textAlign = "center";
      const sp2 = agentStates[simsSelectedAgent];
      ctx.fillText("CLICK OBJECT", sp2.sx, sp2.sy - 50);
      ctx.restore();
    }
  }

  // Admin editor overlay (on top of everything)
  drawAdminOverlay(ctx);

  requestAnimationFrame(loop);
}

export { canvas, ctx, loop, drawLeftPanel, drawRightPanel };
