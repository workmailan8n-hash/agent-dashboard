const log = require('../logger');

function handleGetTasks(req, res, agentTasks) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(agentTasks));
}

function handleGetMyTasks(req, res, myTasks) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(myTasks));
}

function handlePostMyTask(req, res, myTasks, saveTasks, broadcast) {
  let body = '', size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on('end', () => {
    try {
      const t = JSON.parse(body);
      const task = {
        id: Date.now().toString(),
        title: t.title || '',
        assignee: t.assignee || 'me',
        priority: t.priority || 'medium',
        status: 'todo',
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      myTasks.unshift(task);
      saveTasks();
      broadcast({ type: 'mytasks_update', tasks: myTasks });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } catch (e) { log.warn(e.message); res.writeHead(400); res.end('bad'); }
  });
}

function handlePatchMyTask(req, res, myTasks, saveTasks, broadcast, taskId) {
  let body = '', size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on('end', () => {
    try {
      const patch = JSON.parse(body);
      const task = myTasks.find(t => t.id === taskId);
      if (!task) { res.writeHead(404); res.end('not found'); return; }
      Object.assign(task, patch);
      if (patch.status === 'done' && !task.completedAt) task.completedAt = new Date().toISOString();
      if (patch.status === 'todo') task.completedAt = null;
      saveTasks();
      broadcast({ type: 'mytasks_update', tasks: myTasks });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } catch (e) { log.warn(e.message); res.writeHead(400); res.end('bad'); }
  });
}

function handleDeleteMyTask(req, res, myTasks, saveTasks, broadcast, taskId) {
  const idx = myTasks.findIndex(t => t.id === taskId);
  if (idx !== -1) myTasks.splice(idx, 1);
  saveTasks();
  broadcast({ type: 'mytasks_update', tasks: myTasks });
  res.writeHead(200); res.end('ok');
}

module.exports = { handleGetTasks, handleGetMyTasks, handlePostMyTask, handlePatchMyTask, handleDeleteMyTask };
