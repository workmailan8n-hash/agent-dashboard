// ════════════════════════════════════════════════════════════════
//  SPRITE CACHE — offscreen canvas cache for animated objects
//  Re-renders each object at most once per BUCKET ticks (~10 fps),
//  then blits with ctx.drawImage — far cheaper than procedural draw.
// ════════════════════════════════════════════════════════════════

const BUCKET = 6; // re-render every N ticks (≈10 Hz at 60 fps)
const MAX_ENTRIES = 32; // hard cap; oldest evicted when exceeded

// Map<name, { canvas: OffscreenCanvas|HTMLCanvasElement, bucket: number }>
const _cache = new Map();

// Per-object canvas dimensions and draw-origin offsets.
// padX/padY shift the draw origin so objects that render *above* their
// (x,y) anchor still land within the offscreen canvas bounds.
const SPRITE_CONFIGS = {
  hammock: { w: 76, h: 52, padX: 4, padY: 34 },
  jukebox: { w: 34, h: 62, padX: 4, padY: 6 },
  pinball: { w: 34, h: 62, padX: 4, padY: 6 },
  rubber_duck: { w: 44, h: 62, padX: 4, padY: 4 },
  lava_lamp: { w: 34, h: 80, padX: 4, padY: 4 },
  crystal_ball: { w: 40, h: 68, padX: 4, padY: 4 },
  zen_garden: { w: 76, h: 72, padX: 4, padY: 4 },
  terrarium: { w: 64, h: 64, padX: 4, padY: 4 },
  newtons_cradle: { w: 56, h: 56, padX: 4, padY: 4 },
  gumball: { w: 56, h: 68, padX: 4, padY: 4 },
  record_player: { w: 56, h: 60, padX: 4, padY: 4 },
  popcorn_machine: { w: 40, h: 64, padX: 4, padY: 8 },
};

/**
 * Draw an object using a per-tick-bucket offscreen canvas cache.
 * Falls back to direct drawFn call if no config exists for `name`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string}   name   - key into SPRITE_CONFIGS
 * @param {number}   x      - destination x (same as you'd pass to drawFn)
 * @param {number}   y      - destination y
 * @param {number}   tick   - globalTick
 * @param {Function} drawFn - (ctx, x, y, tick) → void
 */
export function drawObjectCached(ctx, name, x, y, tick, drawFn) {
  const cfg = SPRITE_CONFIGS[name];
  if (!cfg) {
    drawFn(ctx, x, y, tick);
    return;
  }

  const bucket = Math.floor(tick / BUCKET);
  let entry = _cache.get(name);

  if (!entry || entry.bucket !== bucket) {
    // Evict LRU-ish when cap reached
    if (!entry && _cache.size >= MAX_ENTRIES) {
      _cache.delete(_cache.keys().next().value);
    }

    // Reuse existing canvas element if we already have one, just repaint
    let offscreen;
    if (entry) {
      offscreen = entry.canvas;
    } else {
      try {
        offscreen = new OffscreenCanvas(cfg.w, cfg.h);
      } catch {
        offscreen = document.createElement("canvas");
        offscreen.width = cfg.w;
        offscreen.height = cfg.h;
      }
    }

    const octx = offscreen.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, cfg.w, cfg.h);
    drawFn(octx, cfg.padX, cfg.padY, tick);

    _cache.set(name, { canvas: offscreen, bucket });
    entry = _cache.get(name);
  }

  ctx.drawImage(entry.canvas, x - cfg.padX, y - cfg.padY);
}

/** Clear the entire cache (e.g. on layout change). */
export function clearSpriteCache() {
  _cache.clear();
}
