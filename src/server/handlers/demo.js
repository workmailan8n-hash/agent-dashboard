const log = require('../logger');

function handlePostDemo(req, res, agents, broadcast) {
  let body = "", size = 0;
  req.on("data", d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on("end", () => {
    try {
      const a = JSON.parse(body);
      if (!agents[a.id]) {
        agents[a.id] = { id: a.id, slug: a.slug, cwd: "C:\\AI", version: "demo",
          status: "idle", currentTool: null, currentToolLabel: null,
          lastActivity: new Date().toISOString(), messageCount: 0,
          toolHistory: [], startedAt: new Date().toISOString(),
          isSubagent: false, agentType: null };
      }
      Object.assign(agents[a.id], a, { lastActivity: new Date().toISOString() });
      broadcast({ type: "agent_update", agent: { ...agents[a.id] } });
      res.writeHead(200); res.end("ok");
    } catch (e) { log.warn(e.message); res.writeHead(400); res.end("bad"); }
  });
}

function handleDeleteDemo(req, res, agents, broadcast, demoId) {
  delete agents[demoId];
  broadcast({ type: "agent_remove", id: demoId });
  res.writeHead(200); res.end("ok");
}

module.exports = { handlePostDemo, handleDeleteDemo };
