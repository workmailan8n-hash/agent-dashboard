// monitor.js — Agent Dashboard health monitor
// Usage: node monitor.js
// Env:   MONITOR_URL=http://localhost:3737

const http = require('http');
const https = require('https');

const BASE_URL = process.env.MONITOR_URL || 'http://localhost:3737';
const INTERVAL_MS = 30_000;
const FAIL_THRESHOLD = 3;

let failures = 0;
let checkCount = 0;

function ts() {
  return new Date().toISOString();
}

function ping(cb) {
  const start = Date.now();
  const url = BASE_URL + '/api/health';
  const lib = url.startsWith('https') ? https : http;

  const req = lib.get(url, { timeout: 8000 }, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      const elapsed = Date.now() - start;
      try {
        const data = JSON.parse(body);
        cb(null, res.statusCode, elapsed, data);
      } catch (e) {
        cb(null, res.statusCode, elapsed, null);
      }
    });
  });

  req.on('timeout', () => { req.destroy(new Error('timeout')); });
  req.on('error', (err) => cb(err, null, Date.now() - start, null));
}

function check() {
  checkCount++;
  ping((err, status, ms, data) => {
    if (err || status !== 200) {
      failures++;
      const reason = err ? err.message : `HTTP ${status}`;
      console.log(`[${ts()}] [FAIL #${failures}] ${reason} (${ms}ms)`);

      if (failures >= FAIL_THRESHOLD) {
        console.log(`[${ts()}] *** ALERT: health check failed ${failures} times in a row — service may be down ***`);
      }
      return;
    }

    failures = 0;
    const uptime = data?.uptime != null ? `uptime=${Math.floor(data.uptime)}s` : '';
    const agents  = data?.agents   != null ? `agents=${data.agents}`   : '';
    const ws      = data?.wsClients != null ? `ws=${data.wsClients}`   : '';
    const tasks   = data?.tasks    != null ? `tasks=${data.tasks}`    : '';
    const mem     = data?.memMB    != null ? `mem=${data.memMB}MB`    : '';
    const extras  = [uptime, agents, ws, tasks, mem].filter(Boolean).join(' ');
    console.log(`[${ts()}] [OK] ${ms}ms  ${extras}`);
  });
}

console.log(`[${ts()}] Monitor started — target: ${BASE_URL} — interval: ${INTERVAL_MS / 1000}s`);
check();
setInterval(check, INTERVAL_MS);
