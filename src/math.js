// ════════════════════════════════════════════════════════════════
//  MATH & EASING
// ════════════════════════════════════════════════════════════════
export const lerp  = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const ease = {
  inOut:   t => t < .5 ? 2*t*t : -1 + (4 - 2*t)*t,
  outBack: t => { const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); },
  spring:  t => 1 - Math.exp(-8*t) * Math.cos(14*t),
};
