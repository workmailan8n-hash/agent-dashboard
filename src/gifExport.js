// ════════════════════════════════════════════════════════════════
//  GIF EXPORT — pure JS animated GIF encoder, no external deps.
//  Captures 5 seconds of the office canvas at 10 fps, encodes
//  a looping GIF89a, and triggers a browser download.
// ════════════════════════════════════════════════════════════════

const SCALE = 0.4; // output is 40% of source canvas size
const FPS = 10;
const DURATION_MS = 5000;
const FRAME_COUNT = FPS * (DURATION_MS / 1000); // 50 frames
const DELAY_CENTIS = Math.round(100 / FPS); // 10 cs = 100 ms

// ─── Color quantization (popularity algorithm) ───────────────────────

function buildPalette(imgData) {
  const { data } = imgData;
  const freq = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const n = Math.min(sorted.length, 256);
  const palette = new Uint8Array(768); // 256 * 3 bytes
  const colorMap = new Map(); // rgb24 key → palette index
  for (let i = 0; i < n; i++) {
    const k = sorted[i][0];
    palette[i * 3] = (k >> 16) & 0xff;
    palette[i * 3 + 1] = (k >> 8) & 0xff;
    palette[i * 3 + 2] = k & 0xff;
    colorMap.set(k, i);
  }
  return { palette, colorMap };
}

function quantize(imgData, palette, colorMap) {
  const { data, width, height } = imgData;
  const pixels = new Uint8Array(width * height);
  const n = palette.length / 3;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4],
      g = data[i * 4 + 1],
      b = data[i * 4 + 2];
    const key = (r << 16) | (g << 8) | b;
    let idx = colorMap.get(key);
    if (idx === undefined) {
      // nearest-neighbour search (result is cached in colorMap)
      let best = 0,
        bestDist = Infinity;
      for (let j = 0; j < n; j++) {
        const dr = r - palette[j * 3];
        const dg = g - palette[j * 3 + 1];
        const db = b - palette[j * 3 + 2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) {
          bestDist = d;
          best = j;
        }
      }
      colorMap.set(key, best);
      idx = best;
    }
    pixels[i] = idx;
  }
  return pixels;
}

// ─── LZW encoder (GIF89a specification) ─────────────────────────────

function lzwEncode(pixels, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const out = [];
  let bitBuf = 0,
    bitLen = 0;

  function emit(code, size) {
    bitBuf |= code << bitLen;
    bitLen += size;
    while (bitLen >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>>= 8;
      bitLen -= 8;
    }
  }

  const table = new Map();
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;

  emit(clearCode, codeSize);

  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const suffix = pixels[i];
    const key = prefix * 256 + suffix;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      emit(prefix, codeSize);
      if (nextCode <= 4095) {
        table.set(key, nextCode++);
        if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        // table full — reset
        emit(clearCode, codeSize);
        table.clear();
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
      }
      prefix = suffix;
    }
  }
  emit(prefix, codeSize);
  emit(eoiCode, codeSize);
  if (bitLen > 0) out.push(bitBuf & 0xff);
  return out;
}

// ─── GIF binary assembly ─────────────────────────────────────────────

function toSubBlocks(bytes) {
  const result = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const end = Math.min(i + 255, bytes.length);
    result.push(end - i);
    for (let j = i; j < end; j++) result.push(bytes[j]);
  }
  result.push(0); // block terminator
  return result;
}

function buildFrameBytes(pixels, w, h, delay) {
  const minCodeSize = 8;
  const lzwBytes = lzwEncode(pixels, minCodeSize);
  const blocks = toSubBlocks(lzwBytes);

  // Graphic Control Extension
  const gce = [
    0x21,
    0xf9,
    0x04,
    0x00,
    delay & 0xff,
    (delay >> 8) & 0xff,
    0x00,
    0x00,
  ];

  // Image Descriptor
  const imgDesc = [
    0x2c,
    0,
    0,
    0,
    0,
    w & 0xff,
    (w >> 8) & 0xff,
    h & 0xff,
    (h >> 8) & 0xff,
    0x00,
  ];

  return [...gce, ...imgDesc, minCodeSize, ...blocks];
}

function buildGif(encodedFrames, w, h, delay, palette) {
  const header = [71, 73, 70, 56, 57, 97]; // "GIF89a"

  const lsd = [
    w & 0xff,
    (w >> 8) & 0xff,
    h & 0xff,
    (h >> 8) & 0xff,
    0xf7, // GCT present, 8-bit colour resolution, size=7 (256 entries)
    0x00, // background colour index
    0x00, // pixel aspect ratio
  ];

  const gct = Array.from(palette); // 768 bytes (256 × RGB)

  // Netscape Application Extension — loop infinitely
  const netscape = [
    0x21,
    0xff,
    0x0b,
    78,
    69,
    84,
    83,
    67,
    65,
    80,
    69,
    50,
    46,
    48, // "NETSCAPE2.0"
    0x03,
    0x01,
    0x00,
    0x00,
    0x00,
  ];

  const parts = [
    new Uint8Array(header),
    new Uint8Array(lsd),
    new Uint8Array(gct),
    new Uint8Array(netscape),
    ...encodedFrames.map((f) => new Uint8Array(f)),
    new Uint8Array([0x3b]), // GIF trailer
  ];

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ─── Async encoding (yields to event loop between frames) ────────────

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

async function encodeAndDownload(
  rawFrames,
  w,
  h,
  overlay,
  statusEl,
  barEl,
  cancelObj,
) {
  statusEl.textContent = "Building palette…";
  await tick();
  if (cancelObj.cancelled) return;

  const { palette, colorMap } = buildPalette(rawFrames[0]);

  const encodedFrames = [];
  for (let i = 0; i < rawFrames.length; i++) {
    if (cancelObj.cancelled) return;
    await tick();
    const pixels = quantize(rawFrames[i], palette, colorMap);
    const frameBytes = buildFrameBytes(pixels, w, h, DELAY_CENTIS);
    encodedFrames.push(frameBytes);
    barEl.style.width = `${50 + ((i + 1) / rawFrames.length) * 45}%`;
    statusEl.textContent = `Encoding ${i + 1}/${rawFrames.length}…`;
  }

  if (cancelObj.cancelled) return;
  statusEl.textContent = "Assembling GIF…";
  await tick();

  const gifBytes = buildGif(encodedFrames, w, h, DELAY_CENTIS, palette);

  barEl.style.width = "100%";
  const mb = (gifBytes.length / 1024 / 1024).toFixed(1);
  statusEl.textContent = `Done! ${mb} MB — downloading…`;
  await tick();

  const blob = new Blob([gifBytes], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `agent-office-${new Date().toISOString().slice(0, 10)}.gif`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  setTimeout(() => overlay.remove(), 2000);
}

// ─── Public entry point ──────────────────────────────────────────────

export function startGifExport(sourceCanvas) {
  // ── Modal ──────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.9);display:flex;" +
    "align-items:center;justify-content:center;z-index:9000;";

  const box = document.createElement("div");
  box.style.cssText =
    "background:#12121e;border:2px solid #7aa2f7;border-radius:10px;" +
    "padding:24px 32px;display:flex;flex-direction:column;gap:14px;" +
    "align-items:center;min-width:300px;font-family:'Press Start 2P',monospace;";

  const title = document.createElement("div");
  title.style.cssText = "color:#7aa2f7;font-size:10px;";
  title.textContent = "🎞 EXPORT GIF";

  const statusEl = document.createElement("div");
  statusEl.style.cssText =
    "color:#c8d3f5;font-size:7px;text-align:center;line-height:2;";
  statusEl.textContent = "Capturing 5 second loop…";

  const barOuter = document.createElement("div");
  barOuter.style.cssText =
    "width:220px;height:12px;background:#1a1a30;border:1px solid #3a3860;" +
    "border-radius:4px;overflow:hidden;";
  const barEl = document.createElement("div");
  barEl.style.cssText =
    "height:100%;width:0%;background:#7aa2f7;transition:width 0.15s;";
  barOuter.appendChild(barEl);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "CANCEL";
  cancelBtn.style.cssText =
    "background:#2a2848;color:#f7768e;border:1px solid #f7768e40;" +
    "padding:5px 14px;font-family:'Press Start 2P',monospace;" +
    "font-size:7px;cursor:pointer;border-radius:4px;margin-top:4px;";

  const cancelObj = { cancelled: false };
  cancelBtn.onclick = () => {
    cancelObj.cancelled = true;
    overlay.remove();
  };

  box.append(title, statusEl, barOuter, cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // ── Frame capture ──────────────────────────────────────────────
  const sw = Math.round(sourceCanvas.width * SCALE);
  const sh = Math.round(sourceCanvas.height * SCALE);
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = sw;
  tmpCanvas.height = sh;
  const tmpCtx = tmpCanvas.getContext("2d");

  const rawFrames = [];
  let captured = 0;

  const iv = setInterval(() => {
    if (cancelObj.cancelled) {
      clearInterval(iv);
      return;
    }
    tmpCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
    rawFrames.push(tmpCtx.getImageData(0, 0, sw, sh));
    captured++;
    barEl.style.width = `${(captured / FRAME_COUNT) * 50}%`;
    statusEl.textContent = `Capturing frame ${captured}/${FRAME_COUNT}…`;
    if (captured >= FRAME_COUNT) {
      clearInterval(iv);
      encodeAndDownload(rawFrames, sw, sh, overlay, statusEl, barEl, cancelObj);
    }
  }, 1000 / FPS);
}
