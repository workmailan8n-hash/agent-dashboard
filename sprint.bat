@echo off
cd /d C:\AI\agent-dashboard
npx claude -p "You are autonomous dev for Agent Dashboard. WorkDir: C:\AI\agent-dashboard. 1) Read ROADMAP.md find next unchecked [ ] task. 2) Implement in public/index.html. 3) Test: node -e with new Function. 4) git add -A, commit, push origin master. 5) Mark [x] in ROADMAP.md, commit+push. 6) Run: node sprint-tg.js 'task description here'. Rules: 1 task only, dont remove objects, dont change password noadmin." --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Agent" --model sonnet > C:\AI\agent-dashboard\last-sprint.log 2>&1
