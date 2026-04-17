// ════════════════════════════════════════════════════════════════
//  MINESWEEPER MINIGAME — 8x8 grid, 10 mines.
//  Score = 100 - time_sec on win (min 0). Save on win or exit.
// ════════════════════════════════════════════════════════════════

const SIZE = 8;
const MINES = 10;

export function launchMinesweeperGame() {
  let grid, revealed, flagged;
  let mineCount = 0;
  let startTime = 0;
  let state = 'play'; // play | win | lose
  let saved = false;
  let rafId = null;

  function reset() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    revealed = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    flagged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    mineCount = 0;
    while (mineCount < MINES) {
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (grid[r][c] !== -1) {
        grid[r][c] = -1;
        mineCount++;
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === -1) continue;
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr,
              nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === -1) n++;
          }
        grid[r][c] = n;
      }
    }
    startTime = Date.now();
    state = 'play';
    saved = false;
  }
  reset();

  function reveal(r, c) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (grid[r][c] === -1) {
      state = 'lose';
      for (let rr = 0; rr < SIZE; rr++)
        for (let cc = 0; cc < SIZE; cc++) if (grid[rr][cc] === -1) revealed[rr][cc] = true;
      return;
    }
    if (grid[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if (dr || dc) reveal(r + dr, c + dc);
    }
    checkWin();
  }

  function checkWin() {
    let hidden = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!revealed[r][c]) hidden++;
    if (hidden === MINES) {
      state = 'win';
      saveOnce();
    }
  }

  function saveOnce() {
    if (saved) return;
    saved = true;
    const elapsed = (Date.now() - startTime) / 1000;
    const score = state === 'win' ? Math.max(0, Math.round(100 - elapsed)) : 0;
    if (window.saveGameScore && score > 0) window.saveGameScore('minesweeper', score);
  }

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '💣 MINESWEEPER';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 320,
    GH = 320;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;cursor:pointer;';
  overlay.appendChild(gc);
  gc.addEventListener('contextmenu', (e) => e.preventDefault());
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  overlay.appendChild(msgEl);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
  overlay.appendChild(btnRow);
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↻ NEW';
  resetBtn.style.cssText =
    'background:#e0af68;color:#0a0a18;border:none;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;';
  btnRow.appendChild(resetBtn);
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ EXIT';
  closeBtn.style.cssText =
    'background:#2a2848;color:#f7768e;border:1px solid #f7768e50;padding:7px 14px;font-family:inherit;font-size:6px;cursor:pointer;border-radius:3px;';
  btnRow.appendChild(closeBtn);

  const instr = document.createElement('div');
  instr.style.cssText = 'color:#a9b1d630;font-size:5px;margin-top:8px;letter-spacing:1px;';
  instr.textContent = 'LEFT: REVEAL  RIGHT: FLAG  ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  const CELL = 32;
  const BX = (GW - CELL * SIZE) / 2;
  const BY = (GH - CELL * SIZE) / 2;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.minesweeper || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  const NUM_COL = [
    '#a9b1d6',
    '#7dcfff',
    '#9ece6a',
    '#ffbb44',
    '#f7768e',
    '#bb9af7',
    '#e0af68',
    '#ff4060',
    '#ffffff',
  ];

  function render() {
    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, GW, GH);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = BX + c * CELL,
          y = BY + r * CELL;
        if (revealed[r][c]) {
          ctx.fillStyle = grid[r][c] === -1 ? '#a03030' : '#2a2a38';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#0a0a14';
          ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
          if (grid[r][c] === -1) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + CELL / 2, y + CELL / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (grid[r][c] > 0) {
            ctx.fillStyle = NUM_COL[grid[r][c]];
            ctx.font = "bold 14px 'Press Start 2P', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(grid[r][c]), x + CELL / 2, y + CELL / 2);
          }
        } else {
          ctx.fillStyle = '#5a5a70';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.fillStyle = '#7a7a90';
          ctx.fillRect(x, y, CELL, 3);
          ctx.fillRect(x, y, 3, CELL);
          ctx.fillStyle = '#3a3a50';
          ctx.fillRect(x, y + CELL - 3, CELL, 3);
          ctx.fillRect(x + CELL - 3, y, 3, CELL);
          if (flagged[r][c]) {
            ctx.fillStyle = '#f7768e';
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 8);
            ctx.lineTo(x + 22, y + 14);
            ctx.lineTo(x + 8, y + 18);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
    ctx.fillStyle = '#a9b1d6';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const elapsed = state === 'play' ? Math.floor((Date.now() - startTime) / 1000) : 0;
    ctx.fillText('TIME: ' + elapsed, 8, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 8, 4);
    if (state === 'win') {
      msgEl.textContent =
        'CLEAR! +' + Math.max(0, Math.round(100 - (Date.now() - startTime) / 1000));
      msgEl.style.color = '#9ece6a';
    } else if (state === 'lose') {
      msgEl.textContent = 'BOOM! TRY AGAIN';
      msgEl.style.color = '#f7768e';
    } else {
      msgEl.textContent = 'FIND ALL SAFE SQUARES';
      msgEl.style.color = '#e0af68';
    }
    rafId = requestAnimationFrame(render);
  }

  function onClick(ev) {
    if (state !== 'play') return;
    const rect = gc.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (GW / rect.width);
    const py = (ev.clientY - rect.top) * (GH / rect.height);
    const c = Math.floor((px - BX) / CELL);
    const r = Math.floor((py - BY) / CELL);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (ev.button === 2) {
      if (!revealed[r][c]) flagged[r][c] = !flagged[r][c];
    } else {
      reveal(r, c);
    }
  }

  gc.addEventListener('mousedown', onClick);

  function close() {
    saveOnce();
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  resetBtn.addEventListener('click', reset);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  render();
}
