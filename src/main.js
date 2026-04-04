// ════════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT — Vite module
// ════════════════════════════════════════════════════════════════
import './styles/tokens.css';
import './styles/base.css';
import './styles/header.css';
import './styles/canvas.css';
import './styles/cards.css';
import './styles/tabs.css';
import './styles/tasks.css';
import './styles/connection.css';
import './styles/admin.css';
import './styles/settings.css';
import './styles/loading.css';
import './styles/mobile.css';
import './app.js';

// ════════════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ════════════════════════════════════════════════════════════════
(function initSettings() {
  const DEFAULTS = { sound: true, particles: true, animations: true };
  let settings;
  try {
    settings = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('agent_settings')));
  } catch { settings = Object.assign({}, DEFAULTS); }
  window.__settings = settings;

  const panel    = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  const btnOpen  = document.getElementById('btn-settings');
  const btnClose = document.getElementById('settings-close');

  // apply saved state to toggles
  panel.querySelectorAll('.toggle').forEach(t => {
    const key = t.dataset.key;
    if (settings[key] === false) t.classList.remove('on');
  });

  function open()  { panel.classList.add('open'); backdrop.classList.add('open'); }
  function close() { panel.classList.remove('open'); backdrop.classList.remove('open'); }

  btnOpen.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  btnClose.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  panel.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => {
      t.classList.toggle('on');
      const key = t.dataset.key;
      settings[key] = t.classList.contains('on');
      localStorage.setItem('agent_settings', JSON.stringify(settings));
    });
  });
})();

// ════════════════════════════════════════════════════════════════
//  LOADING SCREEN
// ════════════════════════════════════════════════════════════════
(function initLoading() {
  const screen = document.getElementById('loading-screen');
  const bar    = document.getElementById('loading-bar');
  if (!screen || !bar) return;

  let dismissed = false;
  function dismiss() {
    if (dismissed) return; dismissed = true;
    bar.style.width = '100%';
    setTimeout(() => { screen.classList.add('hidden'); }, 400);
  }

  // pseudo-progress
  setTimeout(() => { bar.style.width = '25%'; }, 500);
  setTimeout(() => { bar.style.width = '60%'; }, 2000);
  setTimeout(() => { bar.style.width = '88%'; }, 4500);

  // fallback: hide after 5s regardless
  setTimeout(dismiss, 5000);

  // hook into WebSocket init message
  const origParse = JSON.parse;
  const _parse = function(text) {
    const obj = origParse.call(JSON, text);
    if (obj && obj.type === 'init') dismiss();
    return obj;
  };
  JSON.parse = _parse;
})();
