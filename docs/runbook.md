# Agent Dashboard — Runbook

## Deploy

**Prod (master):** `git push origin master` → Railway auto-deploys

**Preview (PR):** Railway opens preview env automatically. TG report arrives with ✅/⏭/❌ buttons (via `sprint-tg.js`).

## Restart local server

```bash
cd c:/AI/agent-dashboard
node server.js       # port 3737
```

## Restart sync daemon

```bash
node sync-to-cloud.js https://agent-dashboard-production-a178.up.railway.app
```
Or Windows Scheduled Task `DashboardSync_autostart` runs this on login.

## Sprint flow

Manual:
```bash
cd /c/AI/agent-dashboard
TS=$(date '+%Y-%m-%d_%H-%M')
git fetch origin && git checkout sprint-staging && git pull --ff-only
# agent runs via sprint.bat
node sprint-finalize.js  # tag + branch + PR
node sprint-tg.js "..."  # TG report
```

See `project_sprint_preview_flow.md` in memory for full details.

## Rollback

1. Approve button failed? Approve locally:
   ```bash
   node -e "require('dotenv').config(); require('./src/server/sprint-git').approveSprint('<tag>').then(console.log)"
   ```
2. Production broken? Revert the PR in GitHub, push — Railway auto-redeploys.

## Debug

- Server logs: `server.log` in project root
- Sprint agent logs: `sprint-logs/sprint_<ts>.json` and `.err`
- TG feedback endpoint: `/api/tg-feedback` on prod URL
- Preview URL timing: Railway takes ~2 min to build — "⏳ ще не готове" is normal

## Incidents

No formal on-call. If prod down:
1. Check Railway dashboard
2. Check `server.log` via Railway UI
3. If sync is broken: restart sync daemon locally
