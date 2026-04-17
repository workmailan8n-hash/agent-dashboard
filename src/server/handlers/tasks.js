function handleGetTasks(req, res, agentTasks) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(agentTasks));
}

module.exports = { handleGetTasks };
