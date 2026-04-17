// ════════════════════════════════════════════════════════════════
//  2048 MINIGAME — classic 4x4 shift puzzle.
//  Score = max tile reached. Save on exit or game-over.
// ════════════════════════════════════════════════════════════════

const SIZE = 4;
const TILE_COLORS = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

export function launch_2048Game() {
  let grid = newGrid();
  let maxTile = 0;
  let score = 0;
  let gameOver = false;
  let saved = false;
  let rafId = null;

  function newGrid() {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandom(g);
    addRandom(g);
    return g;
  }

  function addRandom(g) {
    const empty = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!g[r][c]) empty.push([r, c]);
    if (!empty.length) return false;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    g[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function rotateCW(g) {
    const n = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) n[c][SIZE - 1 - r] = g[r][c];
    return n;
  }

  function slideLeft(g) {
    let changed = false;
    for (let r = 0; r < SIZE; r++) {
      const row = g[r].filter((v) => v);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
          row[i] *= 2;
          score += row[i];
          if (row[i] > maxTile) maxTile = row[i];
          row.splice(i + 1, 1);
        }
      }
      while (row.length < SIZE) row.push(0);
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] !== row[c]) changed = true;
        g[r][c] = row[c];
      }
    }
    return changed;
  }

  function move(dir) {
    if (gameOver) return;
    let g = grid;
    for (let i = 0; i < dir; i++) g = rotateCW(g);
    const ch = slideLeft(g);
    for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g);
    if (ch) {
      grid = g;
      addRandom(grid);
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) if (grid[r][c] > maxTile) maxTile = grid[r][c];
      if (!hasMoves()) {
        gameOver = true;
        saveOnce();
      }
    }
  }

  function hasMoves() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) return true;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE - 1; c++) if (grid[r][c] === grid[r][c + 1]) return true;
    for (let c = 0; c < SIZE; c++)
      for (let r = 0; r < SIZE - 1; r++) if (grid[r][c] === grid[r + 1][c]) return true;
    return false;
  }

  function saveOnce() {
    if (saved) return;
    saved = true;
    if (window.saveGameScore) window.saveGameScore('_2048', maxTile);
  }

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '🔢 2048';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 320,
    GH = 320;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;';
  overlay.appendChild(gc);
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
  instr.textContent = 'ARROWS / WASD — ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  const CELL = 64;
  const PAD = 8;
  const BX = (GW - (CELL * SIZE + PAD * (SIZE + 1))) / 2;
  const BY = (GH - (CELL * SIZE + PAD * (SIZE + 1))) / 2;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb._2048 || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function render() {
    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(BX, BY, CELL * SIZE + PAD * (SIZE + 1), CELL * SIZE + PAD * (SIZE + 1));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = BX + PAD + c * (CELL + PAD);
        const y = BY + PAD + r * (CELL + PAD);
        const v = grid[r][c];
        ctx.fillStyle = v ? TILE_COLORS[v] || '#3c3a32' : '#cdc1b4';
        ctx.fillRect(x, y, CELL, CELL);
        if (v) {
          ctx.fillStyle = v <= 4 ? '#776e65' : '#ffffff';
          const fs = v < 100 ? 18 : v < 1000 ? 14 : 11;
          ctx.font = `bold ${fs}px 'Press Start 2P', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(v), x + CELL / 2, y + CELL / 2);
        }
      }
    }
    ctx.fillStyle = '#a9b1d6';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MAX: ' + maxTile, 8, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 8, 4);
    if (gameOver) {
      msgEl.textContent = 'GAME OVER — MAX ' + maxTile;
      msgEl.style.color = '#f7768e';
    } else {
      msgEl.textContent = 'SCORE: ' + score;
      msgEl.style.color = '#e0af68';
    }
    rafId = requestAnimationFrame(render);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      saveOnce();
      close();
      return;
    }
    let dir = -1;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 0;
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 2;
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 3;
    if (dir >= 0) {
      e.preventDefault();
      move(dir);
    }
  }

  function close() {
    cancelAnimationFrame(rafId);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  resetBtn.addEventListener('click', () => {
    saveOnce();
    grid = newGrid();
    maxTile = 0;
    score = 0;
    gameOver = false;
    saved = false;
  });
  closeBtn.addEventListener('click', () => {
    saveOnce();
    close();
  });
  document.addEventListener('keydown', onKey);

  render();
}
