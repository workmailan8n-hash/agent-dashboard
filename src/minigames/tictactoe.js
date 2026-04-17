// ════════════════════════════════════════════════════════════════
//  TIC-TAC-TOE MINIGAME — 3x3 vs. perfect minimax CPU.
//  Score = win streak (resets on loss).
// ════════════════════════════════════════════════════════════════

export function launchTicTacToeGame() {
  let board = Array(9).fill('');
  let turn = 'X'; // player X, CPU O
  let winner = null;
  let streak = 0;
  let saved = 0;
  let rafId = null;

  function reset(loserStarts) {
    board = Array(9).fill('');
    turn = loserStarts ? 'O' : 'X';
    winner = null;
    if (turn === 'O') setTimeout(cpuTurn, 300);
  }

  function checkWin(b, who) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    return lines.some((l) => l.every((i) => b[i] === who));
  }

  function isDraw(b) {
    return b.every((c) => c);
  }

  function minimax(b, who, depth) {
    if (checkWin(b, 'O')) return 10 - depth;
    if (checkWin(b, 'X')) return depth - 10;
    if (isDraw(b)) return 0;
    let best = who === 'O' ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = who;
      const v = minimax(b, who === 'O' ? 'X' : 'O', depth + 1);
      b[i] = '';
      if (who === 'O') best = Math.max(best, v);
      else best = Math.min(best, v);
    }
    return best;
  }

  function bestMove() {
    let best = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = 'O';
      const v = minimax(board, 'X', 0);
      board[i] = '';
      if (v > best) {
        best = v;
        move = i;
      }
    }
    return move;
  }

  function saveScore() {
    if (streak > saved && window.saveGameScore) {
      saved = streak;
      window.saveGameScore('tictactoe', streak);
    }
  }

  function cpuTurn() {
    if (winner) return;
    const m = bestMove();
    if (m < 0) return;
    board[m] = 'O';
    if (checkWin(board, 'O')) {
      winner = 'O';
      streak = 0;
      msgEl.textContent = 'CPU WINS — STREAK RESET';
      msgEl.style.color = '#f7768e';
      return;
    }
    if (isDraw(board)) {
      winner = 'D';
      msgEl.textContent = 'DRAW';
      msgEl.style.color = '#e0af68';
      return;
    }
    turn = 'X';
    msgEl.textContent = 'YOUR TURN';
    msgEl.style.color = '#e0af68';
  }

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '⊘ TIC-TAC-TOE';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 320,
    GH = 320;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;cursor:pointer;background:#1a1a24;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  msgEl.textContent = 'YOU = X — CLICK A SQUARE';
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
  instr.textContent = 'CPU IS PERFECT — AIM FOR DRAWS + STREAK';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  const CELL = 88;
  const BX = (GW - CELL * 3) / 2;
  const BY = (GH - CELL * 3) / 2;

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.tictactoe || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function render() {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, GW, GH);
    ctx.strokeStyle = '#a9b1d6';
    ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(BX + i * CELL, BY);
      ctx.lineTo(BX + i * CELL, BY + 3 * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(BX, BY + i * CELL);
      ctx.lineTo(BX + 3 * CELL, BY + i * CELL);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const x = BX + c * CELL + CELL / 2;
      const y = BY + r * CELL + CELL / 2;
      const v = board[i];
      if (v === 'X') {
        ctx.strokeStyle = '#f7768e';
        ctx.beginPath();
        ctx.moveTo(x - 24, y - 24);
        ctx.lineTo(x + 24, y + 24);
        ctx.moveTo(x + 24, y - 24);
        ctx.lineTo(x - 24, y + 24);
        ctx.stroke();
      } else if (v === 'O') {
        ctx.strokeStyle = '#7dcfff';
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#a9b1d6';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('STREAK: ' + streak, 10, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 10, 4);
    rafId = requestAnimationFrame(render);
  }

  gc.addEventListener('click', (ev) => {
    if (winner || turn !== 'X') return;
    const rect = gc.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (GW / rect.width);
    const py = (ev.clientY - rect.top) * (GH / rect.height);
    const c = Math.floor((px - BX) / CELL);
    const r = Math.floor((py - BY) / CELL);
    if (r < 0 || r > 2 || c < 0 || c > 2) return;
    const idx = r * 3 + c;
    if (board[idx]) return;
    board[idx] = 'X';
    if (checkWin(board, 'X')) {
      winner = 'X';
      streak++;
      msgEl.textContent = 'YOU WIN — STREAK ' + streak;
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
    turn = 'O';
    setTimeout(cpuTurn, 300);
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
  resetBtn.addEventListener('click', () => reset(winner === 'X'));
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  render();
}
