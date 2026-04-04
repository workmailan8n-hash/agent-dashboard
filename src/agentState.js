// ════════════════════════════════════════════════════════════════
//  AGENT STATE
// ════════════════════════════════════════════════════════════════
import { OX, OY, T } from './constants.js';
import { COLS, ROWS } from './layout.js';
import { clamp } from './math.js';
import { blip, sndState } from './audio.js';
import { getPalette } from './palettes.js';
import { getRole } from './palettes.js';
import { ANIM } from './animConfig.js';
import { PS } from './particles.js';
import {
  DESK_DEFS, DESK_SLOTS, COUCH_DEFS, COUCH_SLOTS,
  IDLE_SPOTS, GROUP_PAIRS,
  astar,
} from './layout.js';
import { idleOccupied, simsMode } from './state.js';
import { CHAR_DRAW, WALK_DIR_FN, drawWalkS, drawWalking } from './drawChars.js';
import { drawThoughtBubble, drawSpeechBubble, drawLabel, SPEECH_PHRASES } from './bubbles.js';

// ════════════════════════════════════════════════════════════════
//  AGENT STATE  (dt-based lerp, full state machine)
// ════════════════════════════════════════════════════════════════
const TOOLS_MAP = {
  Bash:'⚡bash', Read:'📖read', Write:'✍write', Edit:'✏edit',
  Grep:'🔍grep', Glob:'📂glob', WebFetch:'🌐fetch',
  WebSearch:'🔎web', Agent:'🤖spawn', TodoWrite:'📋todo',
};

class AgentState {
  constructor(id, slug) {
    this.id   = id;
    this.slug = slug;
    // Spawn on a random couch in the lounge (then walk to activity)
    const couchPositions = COUCH_SLOTS.length > 0 ? COUCH_SLOTS : [{tx: 5, ty: 24}, {tx: 10, ty: 24}];
    const spawnCouch = couchPositions[Math.floor(Math.random() * couchPositions.length)];
    this.tx = spawnCouch.tx + (Math.random() - 0.5) * 0.5;
    this.ty = spawnCouch.ty + (Math.random() - 0.5) * 0.5;
    this.targetTx = this.tx; this.targetTy = this.ty;
    this.palette  = getPalette(slug);
    // state machine
    this.state      = 'sitting_couch';  // start sitting on couch
    this._spawnSitTimer = 2 + Math.random() * 3; // sit for 2-5 seconds before moving
    this._simsWaiting = false;
    this._simsTarget = null;
    this.nextState  = null;   // queued after non-loop anim finishes
    this.animTime   = 0;      // accumulated seconds in current state
    this.animT      = 0;      // normalized [0..1]
    // logic
    this.isWorking  = false;
    this.slotIdx    = -1;
    this.arrived    = false;
    this.idleTimer  = 0;
    this.walkTimer  = 0;  // how long trying to reach idle slot
    this.isCleaning = false; // true while assigned to clean cat mess
    this._cleanTimer = 0;
    this.thought    = '';
    this.burnout    = 0;  // 0-4: fresh, tired, drained, burnout, crispy
    this._wasWorking = false; // track working transition for burnout
    // celebrating
    this.celebrating      = false;
    this.celebrateTimer   = 0;
    // label spring
    this.labelScale = 0; this.labelVel = 0;
    // spawn flash (scale-in)
    this.spawnScale = 0; this.spawnAlpha = 1; this.spawnBurst = true;
    // stable prefs
    let h=0; for (const c of id) h=(h*31+c.charCodeAt(0))|0;
    // 4 кардинально разных поведения на диване
    const cs = Math.abs(h)%4;
    this.couchIdleState = ['sleeping','drinking_beer','phone','stretching'][cs];
    // Persistent personality trait — introvert prefers solo/desk spots, extrovert prefers social spots
    this.trait = Math.abs(h)%3===0 ? 'extrovert' : 'introvert'; // ~33% extrovert, ~67% introvert
    this.activityAnim = null;
    this.activityDur  = 0;
    this.flip        = Math.abs(h)%3===1; // зеркалит позу на диване
    this.prevStatus  = '';
    this.prevTool    = '';  // track tool completion
    this.waypoints   = [];  // A* path waypoints
    this.facing      = 'S'; // direction: N,NE,E,SE,S,SW,W,NW,IDLE
    // mood tracking
    this.workTicks   = 0;   // accumulated seconds in working state
    this.totalTicks  = 0;   // total accumulated seconds alive
    this._moodEmoji  = '';  // cached mood emoji
    // speech bubbles
    this.speechBubble    = '';  // current speech text
    this.speechBubbleLife = 0; // countdown seconds (>0 = visible)
    this._speechCooldown  = 5 + Math.random() * 8; // speech bubbles appear faster
    // wave / nod when passing other agents
    this.waveEmoji       = '';  // '👋' or '🙂' shown briefly above head
    this.waveTimer       = 0;   // countdown seconds (>0 = visible)
    this._greetCooldown  = {};  // agentId → remaining cooldown seconds
    // high-five when both working at nearby desks
    this.highFiveTimer   = 0;   // countdown seconds (>0 = visible)
    this._highFiveCooldown = {}; // agentId → remaining cooldown seconds
    this._departingDesk = false; // true while playing standing_up before leaving desk
  }

  get depth() { return this.ty + this.tx * 0.001; }
  get sx()    { return OX + this.tx * T + T/2; }
  get sy()    { return OY + this.ty * T + T/2; }

  setAnim(state, next=null) {
    if (this.state === state) return;
    this.state = state; this.nextState = next;
    this.animTime = 0; this.animT = 0;
  }

  // Set movement target and compute pathfinding waypoints
  setTarget(tx, ty) {
    if (Math.abs(this.targetTx - tx) < 0.01 && Math.abs(this.targetTy - ty) < 0.01) return;
    this.targetTx = tx; this.targetTy = ty;
    this.waypoints = astar(this.tx, this.ty, tx, ty) || [];
  }

  _updateFacing(dtx, dty) {
    const ax = Math.abs(dtx), ay = Math.abs(dty);
    if (ax < 0.01 && ay < 0.01) { this.facing = 'IDLE'; return; }
    const angle = Math.atan2(dty, dtx); // radians, 0=E, PI/2=S
    // 8 sectors of 45 degrees each
    const sector = Math.round(angle / (Math.PI / 4));
    const DIR8 = ['E','SE','S','SW','W','NW','N','NE'];
    this.facing = DIR8[((sector % 8) + 8) % 8];
  }

  moveToward(dt, speed=3.5) {
    // Follow A* waypoints first
    while (this.waypoints.length > 0) {
      const wp = this.waypoints[0];
      const dtx = wp.tx - this.tx, dty = wp.ty - this.ty;
      const dist = Math.sqrt(dtx*dtx + dty*dty);
      if (dist < 0.18) { this.waypoints.shift(); continue; }
      const step = Math.min(speed * dt, dist);
      this.tx += (dtx/dist)*step; this.ty += (dty/dist)*step;
      this._updateFacing(dtx, dty);
      return false;
    }
    // Direct movement to final target
    const dtx=this.targetTx-this.tx, dty=this.targetTy-this.ty;
    const dist=Math.sqrt(dtx*dtx+dty*dty);
    if (dist < 0.04) { this.tx=this.targetTx; this.ty=this.targetTy; this.facing='IDLE'; return true; }
    const step=Math.min(speed*dt, dist);
    this.tx += (dtx/dist)*step; this.ty += (dty/dist)*step;
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
    const lf = (1 - this.labelScale)*180 - this.labelVel*16;
    this.labelVel += lf*dt;
    this.labelScale = clamp(this.labelScale + this.labelVel*dt, 0, 1.25);

    // ── Detect task completion → celebrate ────────────────────────
    const working = agentData.status==='working' || agentData.status==='thinking';
    if (this.prevStatus && this.isWorking && !working && !this.celebrating) {
      this.celebrating = true;
      this.celebrateTimer = ANIM.celebrating.frames / ANIM.celebrating.fps;
      PS.confetti(this.sx, this.sy);
      sndState();
    }
    // ── Detect tool completion → small confetti burst ─────────────
    const curTool = agentData.currentTool || '';
    if (this.prevTool && !curTool && working) {
      PS.confetti(this.sx, this.sy - 16);
      blip(880, .06, 'square', .03);
      setTimeout(() => blip(1100, .05, 'square', .02), 80);
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
    this._moodEmoji = ratio >= 0.7 ? '🔥' : ratio >= 0.4 ? '😊' : ratio >= 0.1 ? '😐' : '😤';
    // ── Speech bubble timer ───────────────────────────────────────
    if (this.speechBubbleLife > 0) {
      this.speechBubbleLife -= dt;
      if (this.speechBubbleLife <= 0) { this.speechBubble = ''; this.speechBubbleLife = 0; }
    }
    if (this._speechCooldown > 0) {
      this._speechCooldown -= dt;
    } else if (this.speechBubbleLife <= 0 && this.totalTicks > 6) {
      // pick a pool based on current state
      let pool;
      if (this.state === 'typing_furious') pool = SPEECH_PHRASES.furious;
      else if (working) pool = SPEECH_PHRASES.working;
      else if (this.state === 'thinking') pool = SPEECH_PHRASES.thinking;
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
      this.state = 'sitting_couch';
      if (this._spawnSitTimer <= 0) {
        this.state = 'walking';
        this._spawnSitTimer = 0;
      }
      return; // don't do anything else while spawning
    }

    // ── Sims mode: wait on couch until user gives command ─────────
    if (simsMode && this._simsWaiting && !this.isWorking) {
      if (this.state !== 'sitting_couch' && this.arrived) {
        this.state = 'sitting_couch';
      }
      return;
    }

    // ── Stand-up transition: agent rises from chair before walking ──
    if (this._departingDesk) {
      if (this.animT >= 0.99) {
        // Animation done — now actually leave the desk
        this._departingDesk = false;
        this.isWorking = false; this.slotIdx = -1; this.arrived = false;
        this.activityAnim = null; this.activityDur = 0;
      }
      return; // freeze slot logic while standing up
    }

    if (working !== this.isWorking) {
      // Agent stopped working while seated at desk → play standing_up first
      const deskStates = ['typing_normal','typing_furious','thinking','drinking_desk','spinning_chair','desk_yawn','desk_nap','doodling'];
      if (this.isWorking && this.arrived && deskStates.includes(this.state)) {
        this._departingDesk = true;
        this.setAnim('standing_up');
        return;
      }
      // Release idle slot when transitioning away from idle
      if (!this.isWorking && this.slotIdx >= 0 && idleOccupied[this.slotIdx] === this.id) {
        delete idleOccupied[this.slotIdx];
      }
      this.isWorking = working; this.slotIdx = -1; this.arrived = false;
      this.activityAnim = null; this.activityDur = 0;
    }
    if (working) {
      if (this.slotIdx === -1) {
        for (let i=0;i<DESK_SLOTS.length;i++) { if(!deskSet.has(i)){this.slotIdx=i;deskSet.add(i);break;} }
        if (this.slotIdx===-1) this.slotIdx=deskSet.size%DESK_SLOTS.length;
      }
      const slot=DESK_SLOTS[Math.min(this.slotIdx,DESK_SLOTS.length-1)];
      this.setTarget(slot.tx, slot.ty);
    } else {
      // Pick activity if none or expired
      if (this.slotIdx===-1 || this.activityDur<=0) {
        // Release current slot before picking new
        if (this.slotIdx >= 0 && idleOccupied[this.slotIdx] === this.id) {
          delete idleOccupied[this.slotIdx];
        }
        this.slotIdx = -1;

        // Build list of available slots (not held by any other agent)
        const avail=[];
        for(let i=0;i<IDLE_SPOTS.length;i++){
          const holder=idleOccupied[i];
          if(holder !== undefined && holder !== this.id && !String(holder).startsWith('__reserved_')) continue; // taken by another (reserved = claimable)
          const sp=IDLE_SPOTS[i];
          // Trait-based weight multiplier: extroverts love social, introverts love solo
          const isGroup = sp.type==='group' || sp.type==='gaming';
          const traitMult = isGroup
            ? (this.trait==='extrovert' ? 3.5 : 0.12)
            : (this.trait==='introvert' ? 2.2 : 1.0);
          if(sp.type==='group'){
            const pair=GROUP_PAIRS[sp.groupId];
            const otherIdx=pair[0]===i?pair[1]:pair[0];
            const otherHolder=idleOccupied[otherIdx];
            // Group: only join if partner already occupied by someone else
            if(otherHolder !== undefined && otherHolder !== this.id) {
              avail.push({i,w:sp.w*traitMult});
            }
            // Skip if partner is free — we don't go alone
          } else {
            avail.push({i,w:sp.w*traitMult});
          }
        }
        // If no solo slots available, try to INITIATE a group pair
        // by finding a group where BOTH slots are free, and reserve both
        if (avail.length < 3) {
          for (const [gid, pair] of Object.entries(GROUP_PAIRS)) {
            const [a, b] = pair;
            if (idleOccupied[a] === undefined && idleOccupied[b] === undefined) {
              // Reserve the partner slot as 'waiting' so next agent picks it
              idleOccupied[b] = '__reserved_' + gid;
              const groupInitMult = this.trait==='extrovert' ? 5.0 : 0.2;
              avail.push({i: a, w: IDLE_SPOTS[a].w * 2 * groupInitMult}); // boost weight, scaled by trait
              break; // only one group initiation per tick
            }
          }
        }
        if(avail.length>0){
          const totalW=avail.reduce((s,a)=>s+a.w,0);
          let r=Math.random()*totalW;
          for(const a of avail){ r-=a.w; if(r<=0){this.slotIdx=a.i;break;} }
          if(this.slotIdx===-1) this.slotIdx=avail[avail.length-1].i;
        } else {
          this.slotIdx=Math.floor(Math.random()*Math.max(1,IDLE_SPOTS.length));
        }
        idleOccupied[this.slotIdx] = this.id;  // claim slot
        const sp=IDLE_SPOTS[this.slotIdx];
        this.activityAnim = sp.anim;
        this.activityDur = 10 + Math.random()*20;  // 10–30 seconds
        this.arrived=false; this.walkTimer=0;
      }
      const sp=IDLE_SPOTS[Math.min(this.slotIdx,IDLE_SPOTS.length-1)];
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
      if (this.state !== 'celebrating') this.setAnim('celebrating');
      this.moveToward(dt, 2);
      this.thought = '🎉';
      return;
    }

    // ── Movement / state machine ──────────────────────────────────
    if (!this.arrived) {
      if (this.state !== 'walking') this.setAnim('walking');
      const walkSpeed = this.burnout >= 3 ? 2.5 : 3.5;
      if (this.moveToward(dt, walkSpeed)) {
        this.arrived = true; this.idleTimer = 0; this.walkTimer = 0;
        if (working) this.setAnim('sitting_down','typing_normal');
        else         this.setAnim(this.activityAnim || this.couchIdleState);
      } else if (!working) {
        // Timeout: give up on this slot after 5s and pick another
        this.walkTimer += dt;
        if (this.walkTimer > 6) {
          if (this.slotIdx >= 0 && idleOccupied[this.slotIdx] === this.id)
            delete idleOccupied[this.slotIdx];
          this.slotIdx = -1; this.activityDur = 0; this.walkTimer = 0;
        }
      }
    } else {
      this.idleTimer += dt;
      if (working) {
        const furious = agentData.currentTool==='Bash'||agentData.currentTool==='Write'||agentData.currentTool==='Edit';
        const wantBase = agentData.status==='thinking' ? 'thinking'
                       : furious ? 'typing_furious' : 'typing_normal';
        const notBusy = this.state!=='sitting_down'&&this.state!=='drinking_desk'&&this.state!=='spinning_chair';
        if (notBusy && this.state!==wantBase) this.setAnim(wantBase);
        // Idle variety: coffee every ~30s
        if (this.idleTimer > 30 && this.state==='typing_normal') {
          this.setAnim('drinking_desk','typing_normal'); this.idleTimer=0;
        }
        // Idle variety: yawn+stretch if tired (~45s after last break, burnout >= 1)
        if (this.idleTimer > 45 && this.burnout >= 1 && this.state==='typing_normal') {
          this.setAnim('desk_yawn','typing_normal'); this.idleTimer=0;
        }
        // Idle variety: spin every ~60s
        if (this.idleTimer > 60 && this.state==='typing_normal') {
          this.setAnim('spinning_chair','typing_normal'); this.idleTimer=0;
        }
        if (this.state==='typing_furious') PS.sweat(this.sx+10, this.sy-10);
        if (this.state==='typing_normal'||this.state==='thinking') PS.smoke(this.sx+18, this.sy-14);
      } else {
        this.activityDur -= dt;
        const want = this.activityAnim || this.couchIdleState;
        if (this.state!==want && this.state!=='sitting_couch') this.setAnim(want);
        // Particles by activity
        if (this.state==='sleeping'||this.state==='desk_nap') PS.zzz(this.sx+12, this.sy-16);
        if (this.state==='drinking_beer') PS.foam(this.sx-4, this.sy-18);
        if (this.state==='at_coffee'||this.state==='eating') PS.smoke(this.sx+8, this.sy-14);
        if (this.state==='headphones'||this.state==='air_guitar') {
          if(Math.random()<0.02) PS.emit(this.sx+8,this.sy-18,1,{vx:(Math.random()-0.5)*20,vy:-30,spread:4,gravity:-5,life:1,size:4,color:this.palette.accent});
        }
      }
    }

    // ── Thought content ───────────────────────────────────────────
    this.thought = (agentData.currentTool && working)
      ? (TOOLS_MAP[agentData.currentTool] ?? agentData.currentTool.toLowerCase())
      : agentData.status==='thinking' ? '...' : '';
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
    const onCouch = this.state==='sleeping'||this.state==='drinking_beer'||this.state==='stretching'||this.state==='sitting_couch';
    if (this.flip && onCouch) {
      ctx.translate(this.sx, this.sy);
      ctx.scale(-1, 1);
      ctx.translate(-this.sx, -this.sy);
    }
    const AGENT_SCALE = 1.15;
    ctx.translate(this.sx, this.sy);
    ctx.scale(AGENT_SCALE, AGENT_SCALE);
    ctx.translate(-this.sx, -this.sy);
    const fn = this.state === 'walking'
      ? (WALK_DIR_FN[this.facing] ?? drawWalkS)
      : (CHAR_DRAW[this.state] ?? drawWalking);
    fn(ctx, this.sx, this.sy, this.palette, this.animT);
    ctx.restore();
  }

  drawOverlay(ctx, tick) {
    drawLabel(ctx, this.sx, this.sy, getRole(this.lastAgentData || {slug: this.slug}), this.labelScale, this.burnout, this.trait);
    const showThought = this.thought &&
      (this.state==='typing_normal'||this.state==='typing_furious'||this.state==='thinking');
    if (showThought) drawThoughtBubble(ctx, this.sx, this.sy-8, this.thought, tick);
    // ── Speech bubble ─────────────────────────────────────────────
    if (this.speechBubble && this.speechBubbleLife > 0 && !showThought) {
      const fadeIn  = clamp(1 - (this.speechBubbleLife - (this.speechBubbleLife > 3.5 ? this.speechBubbleLife - 0.4 : 0)) / 0.4, 0, 1);
      const fadeOut = clamp(this.speechBubbleLife / 0.6, 0, 1);
      const alpha   = Math.min(fadeIn, fadeOut) * this.labelScale;
      drawSpeechBubble(ctx, this.sx, this.sy, this.speechBubble, alpha);
    }
    // ── Mood emoji above head ─────────────────────────────────────
    if (this._moodEmoji && this.totalTicks > 2 && this.labelScale > 0.1) {
      const bob = Math.sin(tick * 0.06 + this.sx) * 2;
      ctx.save();
      ctx.globalAlpha = clamp((this.totalTicks - 2) / 2, 0, 1) * this.labelScale;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._moodEmoji, this.sx, this.sy - 44 + bob);
      ctx.restore();
    }
    // ── Wave / nod emoji (shown when passing another agent) ───────
    if (this.waveTimer > 0 && this.labelScale > 0.1) {
      const fadeAlpha = clamp(this.waveTimer / 0.5, 0, 1) * this.labelScale;
      const waveOff   = Math.sin(this.waveTimer * 18) * 4; // wiggle
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.waveEmoji, this.sx + 14, this.sy - 50 + waveOff);
      ctx.restore();
    }
    // ── High-five emoji (shown when both at desk working nearby) ──
    if (this.highFiveTimer > 0 && this.labelScale > 0.1) {
      const progress  = 1 - this.highFiveTimer / 2.2; // 0→1 over lifetime
      const fadeAlpha = clamp(this.highFiveTimer / 0.5, 0, 1) * this.labelScale;
      const riseOff   = -progress * 14; // float upward as it fades
      const scale     = 1 + Math.sin(progress * Math.PI) * 0.4; // pop then shrink
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.font = `${Math.round(14 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤝', this.sx, this.sy - 56 + riseOff);
      ctx.restore();
    }
  }
}


export { TOOLS_MAP, AgentState };
