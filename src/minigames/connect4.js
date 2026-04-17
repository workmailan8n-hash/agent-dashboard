// ════════════════════════════════════════════════════════════════
//  CONNECT 4 MINIGAME — 7x6 vs. CPU.
//  CPU: 1-ply block immediate 3-in-row else random.
//  Score = wins this session.
// ════════════════════════════════════════════════════════════════

const COLS = 7;
const ROWS = 6;

export function launchConnect4Game() {
  let board;
  let turn = 'P'; // P=player, C=cpu
  let winner = null;
  let wins = 0;
  let saved = 0;
  let rafId = null;

  function reset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    turn = 'P';
    winner = null;
  }
  reset();

  function drop(col, who) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) {
        board[r][col] = who;
        return r;
      }
    }
    return -1;
  }

  function wouldWin(b, col, who) {
    let r = -1;
    for (let rr = ROWS - 1; rr >= 0; rr--) {
      if (!b[rr][col]) {
        r = rr;
        break;
      }
    }
    if (r < 0) return false;
    b[r][col] = who;
    const win = checkWin(b, r, col, who);
    b[r][col] = '';
    return win;
  }

  function checkWin(b, r, c, who) {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let k = 1; k < 4; k++) {
        const nr = r + dr * k,
          nc = c + dc * k;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== who) break;
        count++;
      }
      for (let k = 1; k < 4; k++) {
        const nr = r - dr * k,
          nc = c - dc * k;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== who) break;
        count++;
      }
      if (count >= 4) return true;
    }
    return false;
  }

  function isDraw(b) {
    return b[0].every((v) => v);
  }

  function cpuMove() {
    // Find winning move
    for (let c = 0; c < COLS; c++) if (wouldWin(board, c, 'C')) return c;
    // Block player
    for (let c = 0; c < COLS; c++) if (wouldWin(board, c, 'P')) return c;
    // Random valid
    const valid = [];
    for (let c = 0; c < COLS; c++) if (!board[0][c]) valid.push(c);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  function saveScore() {
    if (wins > saved && window.saveGameScore) {
      saved = wins;
      window.saveGameScore('connect4', wins);
    }
  }

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '🔴 CONNECT 4';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 420,
    GH = 380;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;cursor:pointer;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  msgEl.textContent = 'YOUR TURN — CLICK A COLUMN';
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
  instr.textContent = 'PLAYER = RED, CPU = YELLOW — ESC: exit';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  const CELL = 48;
  const BX = (GW - CELL * COLS) / 2;
  const BY = 30;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.connect4 || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function render() {
    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#3060c0';
    ctx.fillRect(BX, BY, CELL * COLS, CELL * ROWS);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BX + c * CELL + CELL / 2;
        const y = BY + r * CELL + CELL / 2;
        const v = board[r][c];
        ctx.fillStyle = v === 'P' ? '#d03030' : v === 'C' ? '#e0c030' : '#14141e';
        ctx.beginPath();
        ctx.arc(x, y, CELL / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#a9b1d6';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('WINS: ' + wins, 10, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 10, 4);
    rafId = requestAnimationFrame(render);
  }

  gc.addEventListener('click', (ev) => {
    if (winner || turn !== 'P') return;
    const rect = gc.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (GW / rect.width);
    const col = Math.floor((px - BX) / CELL);
    if (col < 0 || col >= COLS || board[0][col]) return;
    const r = drop(col, 'P');
    if (r < 0) return;
    if (checkWin(board, r, col, 'P')) {
      winner = 'P';
      wins++;
      msgEl.textContent = 'YOU WIN!';
      msgEl.style.color = '#9ece6a';
      saveScore();
      return;
    }
    if (isDraw(board)) {
      winner = 'D';
      msgEl.textContent = 'DRAW';
      msgEl.style.color = '#e0af68';
      return;
    }
    turn = 'C';
    msgEl.textContent = 'CPU THINKING...';
    msgEl.style.color = '#ffbb44';
    setTimeout(() => {
      const cc = cpuMove();
      if (cc === undefined || cc < 0) return;
      const cr = drop(cc, 'C');
      if (cr < 0) return;
      if (checkWin(board, cr, cc, 'C')) {
        winner = 'C';
        msgEl.textContent = 'CPU WINS';
        msgEl.style.color = '#f7768e';
      } else if (isDraw(board)) {
        winner = 'D';
        msgEl.textContent = 'DRAW';
        msgEl.style.color = '#e0af68';
      } else {
        turn = 'P';
        msgEl.textContent = 'YOUR TURN';
        msgEl.style.color = '#e0af68';
      }
    }, 400);
  });

  function close() {
    saveScore();
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
