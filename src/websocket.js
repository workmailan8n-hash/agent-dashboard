// ════════════════════════════════════════════════════════════════
//  WEBSOCKET
// ════════════════════════════════════════════════════════════════
import { agentsData, agentStates, adminMode } from './state.js';
import { renderCard, updateUI } from './ui.js';
import { buildBackground } from './background.js';
import { buildObstacleGrid } from './layout.js';
import { syncIdleSpotsToAdmin, applyWallPositions } from './admin.js';
import { BUILTIN_POSITIONS, applyCustomPositions } from './adminPos.js';

// ════════════════════════════════════════════════════════════════
//  WEBSOCKET
// ════════════════════════════════════════════════════════════════
let wsActive = false;
function connect() {
  if (wsActive) return;
  wsActive = true;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}`);
  const led = document.getElementById('led'),
    lbl = document.getElementById('conn-label');
  ws.onopen = () => {
    wsActive = true;
    led.className = 'led';
    lbl.textContent = 'online';
  };
  ws.onmessage = ({ data }) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === 'init') {
      for (const a of msg.agents) {
        agentsData[a.id] = a;
        renderCard(a);
      }
      updateUI();
    }
    if (msg.type === 'agent_update') {
      agentsData[msg.agent.id] = msg.agent;
      renderCard(msg.agent);
      updateUI();
    }
    if (msg.type === 'agent_remove') {
      delete agentsData[msg.id];
      document.getElementById(`c-${msg.id}`)?.remove();
      updateUI();
    }
    if (msg.type === 'layout_update' && msg.layout) {
      // Another admin moved objects — apply their layout
      if (msg.layout.positions && !adminMode) {
        window._adminPos = Object.assign({}, BUILTIN_POSITIONS, msg.layout.positions);
        localStorage.setItem('admin_positions', JSON.stringify(msg.layout.positions));
        if (msg.layout.walls) localStorage.setItem('admin_walls', JSON.stringify(msg.layout.walls));
        applyWallPositions();
        syncIdleSpotsToAdmin();
        buildBackground();
        buildObstacleGrid();
      }
    }
    if (msg.type === 'public_url') {
      if (typeof window.updateTunnelStatus === 'function') window.updateTunnelStatus(msg.url);
    }
  };
  ws.onclose = () => {
    wsActive = false;
    led.className = 'led off';
    lbl.textContent = 'polling';
    setTimeout(connect, 2000);
    startPolling();
  };
  ws.onerror = () => ws.close();
}

// ── HTTP polling fallback (when WS unavailable, e.g. on Railway) ──
let pollInterval = null;
function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    if (wsActive) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.agents) {
        const newIds = new Set(data.agents.map((a) => a.id));
        // Remove agents that are gone
        for (const id of Object.keys(agentsData)) {
          if (!newIds.has(id)) {
            delete agentsData[id];
            document.getElementById(`c-${id}`)?.remove();
          }
        }
        for (const a of data.agents) {
          agentsData[a.id] = a;
          renderCard(a);
        }
      }
      updateUI();
      const led = document.getElementById('led'),
        lbl = document.getElementById('conn-label');
      led.className = 'led';
      lbl.textContent = 'polling';
    } catch {}
  }, 2000);
}

export { connect, startPolling };
