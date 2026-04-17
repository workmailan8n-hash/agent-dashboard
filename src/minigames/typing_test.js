// ════════════════════════════════════════════════════════════════
//  TYPING TEST MINIGAME — WPM race.
//  Score = WPM (integer). Save on completion or exit.
// ════════════════════════════════════════════════════════════════

const SENTENCES = [
  'the quick brown fox jumps over the lazy dog and then runs through the forest at dawn while birds sing in the trees above',
  'pixel art is the craft of making pictures tile by tile with a limited palette and a steady hand remembering every small choice',
  'coffee is a universal language spoken by tired developers who are trying their best to ship the feature before the deadline',
  'a great office simulator needs agents who walk and talk and sit on couches and drink water and sometimes nap under a warm light',
  'sprint planning is simple if the team writes clear tasks and keeps the scope small enough to finish within a single work week',
];

export function launchTypingTestGame() {
  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  let startTime = null;
  let finished = false;
  let saved = false;
  let wpm = 0;
  let rafId = null;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '⌨ TYPING TEST';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 640,
    GH = 220;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.style.cssText =
    'margin-top:12px;width:520px;padding:8px;background:#14141e;color:#e0af68;border:1px solid #3a3860;font-family:inherit;font-size:7px;letter-spacing:1px;outline:none;';
  overlay.appendChild(input);

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  msgEl.textContent = 'TYPE THE TEXT ABOVE';
  overlay.appendChild(msgEl);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
  overlay.appendChild(btnRow);
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ EXIT';
  closeBtn.style.cssText =
    'background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;';
  btnRow.appendChild(closeBtn);

  const instr = document.createElement('div');
  instr.style.cssText = 'color:#a9b1d630;font-size:5px;margin-top:8px;letter-spacing:1px;';
  instr.textContent = 'TYPE THE FULL SENTENCE — ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);
  setTimeout(() => input.focus(), 50);

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.typing_test || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function saveOnce() {
    if (saved) return;
    saved = true;
    if (window.saveGameScore && wpm > 0) window.saveGameScore('typing_test', wpm);
  }

  function wrapText(t, maxChars) {
    const words = t.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > maxChars) {
        lines.push(cur);
        cur = w;
      } else {
        cur = cur ? cur + ' ' + w : w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function render() {
    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, GW, GH);
    const typed = input.value;
    const lines = wrapText(sentence, 60);
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textBaseline = 'top';
    let idx = 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      let x = 20;
      const y = 20 + li * 24;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (idx < typed.length) {
          ctx.fillStyle = typed[idx] === ch ? '#9ece6a' : '#f7768e';
        } else if (idx === typed.length) {
          ctx.fillStyle = '#e0af68';
          ctx.fillRect(x - 1, y - 2, 10, 14);
          ctx.fillStyle = '#0a0a14';
        } else {
          ctx.fillStyle = '#a9b1d6';
        }
        ctx.fillText(ch, x, y);
        x += 10;
        idx++;
      }
      if (li < lines.length - 1) idx++; // account for space between wrapped lines
    }
    ctx.fillStyle = '#a9b1d6';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('WPM: ' + wpm, 20, GH - 18);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 20, GH - 18);
    ctx.textAlign = 'left';
    rafId = requestAnimationFrame(render);
  }

  input.addEventListener('input', () => {
    if (!startTime && input.value.length) startTime = Date.now();
    if (startTime && !finished) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const typedChars = input.value.length;
      wpm = elapsed > 0 ? Math.round(typedChars / 5 / elapsed) : 0;
    }
    if (input.value === sentence && !finished) {
      finished = true;
      msgEl.textContent = 'DONE! WPM: ' + wpm;
      msgEl.style.color = '#9ece6a';
      saveOnce();
    }
  });

  function close() {
    saveOnce();
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  render();
}
