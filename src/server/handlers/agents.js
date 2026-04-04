function handleGetAgents(req, res, agents) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(Object.values(agents)));
}

module.exports = { handleGetAgents };
