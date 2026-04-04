// ════════════════════════════════════════════════════════════════
//  UI CARDS
// ════════════════════════════════════════════════════════════════
import { getPalette } from './palettes.js';
import { agentsData } from './state.js';

// ════════════════════════════════════════════════════════════════
//  UI CARDS
// ════════════════════════════════════════════════════════════════
const grid = document.getElementById('grid');

function timeSince(ts) {
  const s=Math.floor((Date.now()-new Date(ts))/1000);
  if (s<60) return `${s}с`; if (s<3600) return `${Math.floor(s/60)}м`;
  return `${Math.floor(s/3600)}ч`;
}

function renderCard(agent) {
  const {id,slug,status,currentToolLabel,lastActivity,messageCount=0} = agent;
  let card=document.getElementById(`c-${id}`);
  if (!card) { card=document.createElement('div'); card.id=`c-${id}`; grid.appendChild(card); }
  const pal = getPalette(slug);
  card.style.setProperty('--ac', pal.accent);
  card.style.setProperty('--ac-glow', pal.accent + '50');
  card.style.setProperty('--ac-badge', pal.accent + '28');
  card.className=`card ${status}`;
  card.innerHTML=`<div class="card-dot"></div><div class="card-name"></div><div class="card-status"><span class="status-label"></span><br><span class="dim">🕐 <span id="t-${id}"></span> · 💬 <span class="msg-count"></span></span></div><div class="scan"></div>`;
  card.querySelector('.card-name').textContent=slug.replace(/-/g,' ').toUpperCase();
  const sl=card.querySelector('.status-label');
  if (status==='working' && currentToolLabel) { sl.className='t'; sl.textContent=currentToolLabel; }
  else if (status==='thinking') { sl.className='th'; sl.textContent='думает...'; }
  else { sl.className='idle'; sl.textContent='idle'; }
  card.querySelector(`#t-${id}`).textContent=timeSince(lastActivity);
  card.querySelector('.msg-count').textContent=messageCount;
}

function updateUI() {
  const list=Object.values(agentsData);
  document.getElementById('agent-count').textContent=`${list.length} agents`;
  for (const a of list) {
    const el=document.getElementById(`t-${a.id}`);
    if (el) el.textContent=timeSince(a.lastActivity);
  }
}


export { renderCard, updateUI, timeSince };
