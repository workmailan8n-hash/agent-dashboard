// ════════════════════════════════════════════════════════════════
//  THOUGHT BUBBLE, SPEECH BUBBLE & NAME LABEL
// ════════════════════════════════════════════════════════════════
import { clamp } from './math.js';

// ════════════════════════════════════════════════════════════════
//  THOUGHT BUBBLE & NAME LABEL
// ════════════════════════════════════════════════════════════════
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}
function drawThoughtBubble(ctx, cx, cy, text, tick) {
  if (!text) return;
  ctx.font = "bold 8px 'Press Start 2P', monospace";
  const tw = ctx.measureText(text).width;
  const bw = tw + 20, bh = 20;
  const bx = cx - bw/2 + 4, by = cy - 90;
  const wob = Math.sin(tick * 0.06) * 1.5;
  [[cx+2,cy-24,2.5],[cx+9,cy-50+wob,3.5],[cx+16,cy-68+wob,4]].forEach(([x,y,r]) => {
    ctx.fillStyle = 'rgba(187,154,247,0.9)';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(6,8,20,0.97)';
  ctx.strokeStyle = '#bb9af7'; ctx.lineWidth = 2;
  rrect(ctx, bx, by, bw, bh, 5);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, bx+10, by+14);

}
// Speech bubble — classic talk bubble with a tail, distinct from thought bubble
const SPEECH_PHRASES = {
  working:  ["shipping!", "git push!", "almost!", "nice code!", "tests pass!", "lgtm!", "one more fix", "let's go!", "prod ready?", "refactor time"],
  furious:  ["SHIP IT!", "no sleep!", "prod is down!", "debug mode", "stack trace...", "WHY?!", "it compiled!", "send it!", "rip logs", "deploy!"],
  thinking: ["bug found!", "wait...", "i see it", "oh no", "hmm...", "uh oh", "classic", "interesting", "hold on", "analyzing"],
  idle:     ["need coffee...", "brb...", "lunch?", "anyone here?", "bored.jpg", "slack me", "tea time", "nap soon", ":zzz:", "hey!"],
};
function drawSpeechBubble(ctx, cx, cy, text, alpha) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 7px 'Press Start 2P', monospace";
  const tw = ctx.measureText(text).width;
  const pad = 9, bw = tw + pad*2, bh = 18;
  const bx = cx - bw/2 + 8, by = cy - 78;
  // bubble body
  ctx.fillStyle = 'rgba(6,8,20,0.96)';
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, by, bw, bh, 4);
  ctx.fill(); ctx.stroke();
  // tail (triangle pointing down-left toward agent head)
  const tx_ = bx + 10, tailY = by + bh;
  ctx.fillStyle = 'rgba(6,8,20,0.96)';
  ctx.beginPath(); ctx.moveTo(tx_-4, tailY); ctx.lineTo(tx_+4, tailY); ctx.lineTo(cx, cy-55); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7aa2f7'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tx_-4, tailY-1); ctx.lineTo(cx, cy-56); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx_+4, tailY-1); ctx.lineTo(cx, cy-56); ctx.stroke();
  // text
  ctx.fillStyle = '#c8d3f5';
  ctx.fillText(text, bx + pad, by + 12);
  ctx.restore();
}

function drawLabel(ctx, cx, cy, name, scale, burnout, trait) {
  if (scale < 0.05) return;
  const BURNOUT_ICONS = ['','😴','😰','🥵','💀'];
  const icon = (burnout >= 1 && burnout <= 4) ? BURNOUT_ICONS[burnout] : '';
  const traitDot = trait === 'extrovert' ? '📣' : (trait === 'introvert' ? '🔇' : '');
  ctx.font = "bold 8px 'Press Start 2P', monospace";
  const tw = ctx.measureText(name).width;
  const extraW = (icon ? 12 : 0) + (traitDot ? 12 : 0);
  const bw = tw + 14 + extraW, bh = 14, bx = cx - bw/2, by = cy + 22;
  ctx.save();
  ctx.translate(cx, by + bh/2); ctx.scale(scale, scale); ctx.translate(-cx, -(by + bh/2));
  ctx.fillStyle = 'rgba(3,4,14,0.97)';
  rrect(ctx, bx, by, bw, bh, 3); ctx.fill();
  ctx.strokeStyle = trait === 'extrovert' ? '#f7768e44' : (trait === 'introvert' ? '#7aa2f744' : '#5060a0');
  ctx.lineWidth = 1.5;
  rrect(ctx, bx, by, bw, bh, 3); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, bx+7, by+10);
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

export { rrect, drawThoughtBubble, drawSpeechBubble, drawLabel, SPEECH_PHRASES };
