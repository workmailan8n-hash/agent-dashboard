const log = require('../logger');

function handlePostSync(req, res, agents, agentTasks, getMyTasks, broadcast, setMyTasks) {
  let body = '', size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const key = req.headers['x-sync-key'] || '';
      if (process.env.SYNC_KEY && key !== process.env.SYNC_KEY) {
        res.writeHead(403); res.end('forbidden'); return;
      }
      if (data.agents) {
        const incomingIds = new Set();
        for (const a of data.agents) {
          incomingIds.add(a.id);
          agents[a.id] = a;
        }
        for (const id of Object.keys(agents)) {
          if (!incomingIds.has(id)) delete agents[id];
        }
      }
      if (data.tasks) Object.assign(agentTasks, data.tasks);
      if (data.myTasks) setMyTasks(data.myTasks);
      broadcast({ type: 'init', agents: Object.values(agents) });
      broadcast({ type: 'tasks_init', tasks: agentTasks });
      broadcast({ type: 'mytasks_init', tasks: getMyTasks() });
      res.writeHead(200); res.end('ok');
    } catch (e) { log.warn(e.message); res.writeHead(400); res.end('bad'); }
  });
}

function handleGetState(req, res, agents, agentTasks, getMyTasks) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ agents: Object.values(agents), tasks: agentTasks, myTasks: getMyTasks() }));
}

module.exports = { handlePostSync, handleGetState };
