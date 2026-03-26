#!/usr/bin/env node
// Syncs local agent-dashboard state to a remote server (Railway/Vercel)
// Usage: node sync-to-cloud.js https://your-app.up.railway.app [SYNC_KEY]

const REMOTE_URL = process.argv[2] || process.env.REMOTE_URL;
const SYNC_KEY = process.argv[3] || process.env.SYNC_KEY || '';
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:3737';
const INTERVAL = parseInt(process.env.SYNC_INTERVAL) || 2000;

if (!REMOTE_URL) {
  console.error('Usage: node sync-to-cloud.js <REMOTE_URL> [SYNC_KEY]');
  console.error('  e.g. node sync-to-cloud.js https://agent-dashboard-production-a178.up.railway.app');
  process.exit(1);
}

console.log(`🔄 Syncing ${LOCAL_URL} → ${REMOTE_URL} every ${INTERVAL}ms`);

async function sync() {
  try {
    // Fetch state from local server
    const res = await fetch(`${LOCAL_URL}/api/state`);
    if (!res.ok) return;
    const state = await res.json();

    // Push to remote
    const pushRes = await fetch(`${REMOTE_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Key': SYNC_KEY },
      body: JSON.stringify(state)
    });

    const agentCount = state.agents?.length || 0;
    const taskCount = state.myTasks?.length || 0;
    if (pushRes.ok) {
      process.stdout.write(`\r✅ Synced: ${agentCount} agents, ${taskCount} tasks`);
    } else {
      process.stdout.write(`\r❌ Push failed: ${pushRes.status}`);
    }
  } catch (e) {
    process.stdout.write(`\r⚠️  ${e.message.substring(0, 60)}`);
  }
}

setInterval(sync, INTERVAL);
sync(); // first sync immediately
