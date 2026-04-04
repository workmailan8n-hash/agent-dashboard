const log = require('../logger');

function handleGetLayout(req, res, sharedLayout) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(sharedLayout));
}

function handlePostLayout(req, res, sharedLayout, broadcast) {
  let body = '', size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (data.positions) sharedLayout.positions = data.positions;
      if (data.walls) sharedLayout.walls = data.walls;
      broadcast({ type: 'layout_update', layout: sharedLayout });
      res.writeHead(200); res.end('ok');
    } catch (e) { log.warn(e.message); res.writeHead(400); res.end('bad'); }
  });
}

module.exports = { handleGetLayout, handlePostLayout };
