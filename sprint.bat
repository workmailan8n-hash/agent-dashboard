@echo off
cd /d C:\AI\agent-dashboard
npx claude -p "Read ROADMAP.md, find NEXT unchecked task. Implement in public/index.html. Test syntax. Git commit+push. Railway deploy. Mark [x] in ROADMAP. Send TG report in Ukrainian with buttons. Check /api/tg-feedback first for user comments." --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Agent" --model sonnet > C:\AI\agent-dashboard\last-sprint.log 2>&1
