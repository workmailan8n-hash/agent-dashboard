const log = require('./logger');

function requireAuth(req, res) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    if (!requireAuth._warned) { log.warn('ADMIN_TOKEN not set — auth disabled'); requireAuth._warned = true; }
    return true;
  }
  if (req.headers['x-admin-token'] === token) return true;
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return false;
}

module.exports = { requireAuth };
