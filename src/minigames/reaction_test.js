// ════════════════════════════════════════════════════════════════
//  REACTION TEST MINIGAME — click as fast as possible when green.
//  3 rounds, take best. Score = 1000 - reaction_ms (min 0).
// ════════════════════════════════════════════════════════════════

export function launchReactionTestGame() {
  let state = 'idle'; // idle | waiting | ready | done
  let waitTimer = null;
  let readyAt = 0;
  let rounds = [];
  let bestThisSession = 0;
  let rafId = null;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(5,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;font-family:'Press Start 2P',monospace;";
  const title = document.createElement('div');
  title.style.cssText =
    'color:#e0af68;font-size:11px;margin-bottom:12px;text-shadow:0 0 14px #e0af68aa;letter-spacing:2px;';
  title.textContent = '⚡ REACTION TEST';
  overlay.appendChild(title);

  const gc = document.createElement('canvas');
  const GW = 420,
    GH = 280;
  gc.width = GW;
  gc.height = GH;
  gc.style.cssText =
    'border:2px solid #3a3860;border-radius:4px;display:block;image-rendering:pixelated;cursor:pointer;';
  overlay.appendChild(gc);
  const ctx = gc.getContext('2d');

  const msgEl = document.createElement('div');
  msgEl.style.cssText =
    'color:#e0af68;font-size:7px;margin-top:10px;height:14px;letter-spacing:1px;';
  msgEl.textContent = 'CLICK TO START — ROUND 1 OF 3';
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
  instr.textContent = 'WAIT FOR GREEN — CLICK TOO EARLY = FAIL';
  overlay.appendChild(instr);

  document.body.appendChild(overlay);

  function getBestScore() {
    try {
      const lb = JSON.parse(localStorage.getItem('game_leaderboard') || '{}');
      return (lb.reaction_test || [])[0]?.score ?? 0;
    } catch {
      return 0;
    }
  }

  function saveScore() {
    if (!rounds.length) return;
    const bestMs = Math.min(...rounds);
    const score = Math.max(0, 1000 - bestMs);
    bestThisSession = score;
    if (window.saveGameScore) window.saveGameScore('reaction_test', score);
  }

  function render() {
    let bg;
    if (state === 'idle') bg = '#14141e';
    else if (state === 'waiting') bg = '#a03030';
    else if (state === 'ready') bg = '#30a060';
    else bg = '#2a2a4a';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#ffffff';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let txt = '';
    if (state === 'idle') txt = 'CLICK TO START';
    else if (state === 'waiting') txt = 'WAIT...';
    else if (state === 'ready') txt = 'CLICK!';
    else if (state === 'done') txt = 'BEST: ' + Math.min(...rounds) + ' MS';
    ctx.fillText(txt, GW / 2, GH / 2 - 10);
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillText(
      'ROUND ' + Math.min(rounds.length + (state === 'done' ? 0 : 1), 3) + ' / 3',
      GW / 2,
      GH / 2 + 20
    );
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a9b1d6';
    ctx.fillText('ROUNDS: ' + rounds.map((r) => r + 'ms').join(' '), 10, GH - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a9b1d640';
    ctx.fillText('BEST: ' + getBestScore(), GW - 10, GH - 10);
    rafId = requestAnimationFrame(render);
  }

  function startRound() {
    state = 'waiting';
    const delay = 1000 + Math.random() * 3000;
    waitTimer = setTimeout(() => {
      state = 'ready';
      readyAt = Date.now();
    }, delay);
  }

  function onClick() {
    if (state === 'idle') {
      rounds = [];
      startRound();
      msgEl.textContent = 'WAIT FOR GREEN...';
      msgEl.style.color = '#ffbb44';
    } else if (state === 'waiting') {
      clearTimeout(waitTimer);
      state = 'done';
      msgEl.textContent = 'TOO EARLY! RESTART';
      msgEl.style.color = '#f7768e';
      rounds = [];
      setTimeout(() => {
        state = 'idle';
        msgEl.textContent = 'CLICK TO START — ROUND 1 OF 3';
        msgEl.style.color = '#e0af68';
      }, 1500);
    } else if (state === 'ready') {
      const reactMs = Date.now() - readyAt;
      rounds.push(reactMs);
      if (rounds.length >= 3) {
        state = 'done';
        const bestMs = Math.min(...rounds);
        msgEl.textContent = 'BEST: ' + bestMs + 'MS — SCORE ' + Math.max(0, 1000 - bestMs);
        msgEl.style.color = '#9ece6a';
        saveScore();
        setTimeout(() => {
          state = 'idle';
          msgEl.textContent = 'CLICK TO START — ROUND 1 OF 3';
          msgEl.style.color = '#e0af68';
        }, 2500);
      } else {
        msgEl.textContent = reactMs + 'MS — ROUND ' + (rounds.length + 1) + ' NEXT';
        msgEl.style.color = '#9ece6a';
        startRound();
      }
    } else if (state === 'done') {
      state = 'idle';
    }
  }

  gc.addEventListener('click', onClick);

  function close() {
    if (rounds.length) saveScore();
    clearTimeout(waitTimer);
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
