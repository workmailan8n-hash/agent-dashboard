// ════════════════════════════════════════════════════════════════
//  PERSONAL TASK BOARD
// ════════════════════════════════════════════════════════════════
import { myTasks, setMyTasks } from './state.js';

// ════════════════════════════════════════════════════════════════
//  PERSONAL TASK BOARD
// ════════════════════════════════════════════════════════════════
let myTasks = [];

function switchTab(tab) {
  const isOffice = tab === 'office';
  document.getElementById('tab-office').classList.toggle('active', isOffice);
  document.getElementById('tab-tasks').classList.toggle('active', !isOffice);
  document.getElementById('office').style.display = isOffice ? 'block' : 'none';
  document.getElementById('grid').style.display = isOffice ? 'grid' : 'none';
  document.getElementById('task-view').classList.toggle('visible', !isOffice);
  if (!isOffice) renderTasks();
}

function addTask() {
  const input = document.getElementById('task-input');
  const title = input.value.trim();
  if (!title) return;
  const assignee = document.getElementById('task-assignee').value;
  const priority = document.getElementById('task-priority').value;
  fetch('/api/mytasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, assignee, priority })
  }).then(() => { input.value = ''; });
}

function toggleTask(id) {
  const t = myTasks.find(x => x.id === id);
  if (!t) return;
  fetch(`/api/mytasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: t.status === 'done' ? 'todo' : 'done' })
  });
}

function deleteTask(id) {
  fetch(`/api/mytasks/${id}`, { method: 'DELETE' });
}

function renderTasks() {
  const current = document.getElementById('tasks-current');
  const done    = document.getElementById('tasks-done');
  current.innerHTML = done.innerHTML = '';

  const active = myTasks.filter(t => t.status !== 'done');
  const doneList = myTasks.filter(t => t.status === 'done');

  const ASSIGNEE = { me: 'Я', team: 'Команда', claude: 'Claude' };

  function makeItem(t) {
    const el = document.createElement('div');
    el.className = 'task-item' + (t.status === 'done' ? ' done-item' : '');

    const checkEl = document.createElement('div');
    checkEl.className = 'task-check';
    checkEl.textContent = t.status === 'done' ? '✓' : '';
    checkEl.onclick = () => toggleTask(t.id);

    const dot = document.createElement('div');
    dot.className = `task-pri-dot ${t.priority}`;

    const titleEl = document.createElement('div');
    titleEl.className = 'task-title';
    titleEl.textContent = t.title;

    const tag = document.createElement('div');
    tag.className = 'task-assignee-tag';
    tag.textContent = ASSIGNEE[t.assignee] || t.assignee;

    const del = document.createElement('div');
    del.className = 'task-del';
    del.textContent = '✕';
    del.onclick = () => deleteTask(t.id);

    el.append(checkEl, dot, titleEl, tag, del);
    return el;
  }

  if (active.length === 0) current.innerHTML = '<div class="task-empty">— нет задач —</div>';
  else active.forEach(t => current.appendChild(makeItem(t)));

  if (doneList.length === 0) done.innerHTML = '<div class="task-empty">— нет выполненных —</div>';
  else doneList.forEach(t => done.appendChild(makeItem(t)));

  document.getElementById('ts-total').textContent  = myTasks.length;
  document.getElementById('ts-active').textContent = active.length;
  document.getElementById('ts-done').textContent   = doneList.length;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'task-input') addTask();
});


export { switchTab, addTask, toggleTask, deleteTask, renderTasks };
