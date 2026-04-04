// ════════════════════════════════════════════════════════════════
//  PARTICLE SYSTEM
// ════════════════════════════════════════════════════════════════
import { clamp } from './math.js';

export class Particle {
  constructor(x, y, o = {}) {
    this.x  = x; this.y = y;
    this.vx = (o.vx ?? 0) + (Math.random() - .5) * (o.spread ?? 60);
    this.vy = (o.vy ?? -80) + (Math.random() - .5) * (o.spread ?? 40);
    this.life = o.life ?? 0.8;
    this.maxLife = this.life;
    this.size = (o.size ?? 3) + Math.random() * 2;
    this.color = o.color ?? '#ffffff';
    this.gravity = o.gravity ?? 120;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpd = (Math.random() - .5) * 5;
    this.square = o.square ?? false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    this.rot += this.rotSpd * dt;
  }
  get alive() { return this.life > 0; }
  get alpha()  { return clamp(this.life / this.maxLife, 0, 1); }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    if (this.square) ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
    else { ctx.beginPath(); ctx.arc(0, 0, this.size/2, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() { this.ps = []; }
  update(dt) { this.ps = this.ps.filter(p => { p.update(dt); return p.alive; }); }
  draw(ctx)   { for (const p of this.ps) p.draw(ctx); }
  emit(x, y, n, o) { for (let i = 0; i < n; i++) this.ps.push(new Particle(x, y, o)); }

  burst(x, y, color) {
    const cols = [color, '#ffffff', color];
    for (let i = 0; i < 14; i++) {
      this.ps.push(new Particle(x, y, {
        vx: Math.cos(i/14*Math.PI*2) * (60+Math.random()*60),
        vy: Math.sin(i/14*Math.PI*2) * (60+Math.random()*60),
        spread: 0, gravity: 80, life: .7+Math.random()*.3,
        size: 2+Math.random()*3, color: cols[i%3], square: i%2===0,
      }));
    }
  }

  confetti(x, y) {
    const cols = ['#7aa2f7','#9ece6a','#f7768e','#e0af68','#bb9af7','#2ac3de','#ff9e64'];
    for (let i = 0; i < 22; i++) {
      this.ps.push(new Particle(x, y, {
        vx: (Math.random()-.5)*220, vy: -160-Math.random()*100,
        spread:0, gravity:320, life:1+Math.random()*.6,
        size:3+Math.random()*4, color:cols[i%cols.length], square:Math.random()>.4,
      }));
    }
  }

  smoke(x, y) {
    if (Math.random() < .10) {
      this.ps.push(new Particle(x, y, {
        vx:(Math.random()-.5)*14, vy:-28, spread:6,
        gravity:-8, life:1.6, size:5+Math.random()*9, color:'#c0b8d8',
      }));
    }
  }

  foam(x, y) {
    if (Math.random() < .14) {
      this.ps.push(new Particle(x, y, {
        vx:(Math.random()-.5)*10, vy:-35, spread:4,
        gravity:-4, life:.8, size:2+Math.random()*3, color:'#f0e840',
      }));
    }
  }

  zzz(x, y) {
    if (Math.random() < .04) {
      this.ps.push(new Particle(x, y, {
        vx:10+Math.random()*10, vy:-22-Math.random()*14, spread:2,
        gravity:-1, life:1.4, size:4+Math.random()*5, color:'#a9b1d6', square:true,
      }));
    }
  }

  sweat(x, y) {
    if (Math.random() < .18) {
      this.ps.push(new Particle(x, y, {
        vx:(Math.random()-.5)*18, vy:12+Math.random()*20, spread:4,
        gravity:60, life:.4, size:2, color:'#4080c0',
      }));
    }
  }

  puff(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.ps.push(new Particle(x, y, {
        vx:(Math.random()-.5)*80, vy:-40-Math.random()*60,
        spread:0, gravity:50, life:.5, size:3+Math.random()*4, color,
      }));
    }
  }
}
export const PS = new ParticleSystem();
