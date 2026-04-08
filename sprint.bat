@echo off
cd /d C:\AI\agent-dashboard

REM Ensure dashboard is up before sprint (agent will curl /api/tg-feedback)
curl -s -o nul -m 2 http://localhost:3737/api/health
if errorlevel 1 (
  echo [sprint.bat] dashboard not running, starting in background...
  start "Agent Dashboard" /min cmd /c "node server.js"
  REM give it a few seconds to bind to port
  timeout /t 6 /nobreak > nul
)

REM Switch to sprint-staging branch BEFORE the agent runs so all commits land there.
REM Staging accumulates progress across sprints; nothing is pushed to master until you approve in Telegram.
git fetch origin
git checkout sprint-staging 2>nul || git checkout -b sprint-staging origin/master
git pull --ff-only origin sprint-staging 2>nul

REM Timestamped log file (rotated, no overwriting)
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "ts=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%"
if not exist "C:\AI\agent-dashboard\sprint-logs" mkdir "C:\AI\agent-dashboard\sprint-logs"
set "logfile=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.json"
set "errlog=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.err"

npx claude -p "You are autonomous dev for Agent Dashboard v2. WorkDir: C:\AI\agent-dashboard. Current git branch: sprint-staging (DO NOT checkout any other branch, DO NOT push, DO NOT call sprint-tg.js — the outer sprint.bat handles push + telegram reporting after you finish). Architecture: Vite + ES modules (src/*.js), CSS tokens (src/styles/), server handlers (src/server/handlers/). Build: 'npm run build'. Entry: src/main.js imports src/app.js. FIRST: check if the user left feedback from the last sprint by running: curl -s https://agent-dashboard-production-a178.up.railway.app/api/tg-feedback — if action is 'reject' or 'comment' with text, address that feedback BEFORE doing new tasks. If action is 'approve' or 'skip' or null, proceed normally. TWO TASKS per sprint: 1) Read ROADMAP.md find next unchecked [ ] task, implement it in the correct module under src/. 2) Add a MINIGAME to one existing interactive office object that doesn't have one yet — each object an agent interacts with should launch its own unique small minigame (e.g. piano = simple rhythm/tile-tap, coffee machine = timing bar, whiteboard = memory match, plant = click-to-water sequence, arcade = snake-like, etc). Pick ONE object per sprint, implement a self-contained minigame module under src/minigames/<object>.js, wire it to trigger when an agent interacts with that object, render in a modal/overlay with pixel-art style matching the dashboard. Keep each minigame tiny (~100-200 lines), no external deps. Track which objects already have minigames to avoid duplicates. BEFORE committing: run 'npm run build' to verify Vite build passes, then run tests with 'npx playwright test --config=playwright.config.ts tests/e2e/feature-check.spec.ts' — if tests fail, fix the code. Steps: implement, build, test, fix if needed, git add relevant files (NOT .env), commit with descriptive message. STOP after the commit — do NOT push, do NOT run sprint-tg.js, do NOT checkout other branches. Mark [x] in ROADMAP before committing. Rules: dont remove objects, dont change password noadmin, dont modify .env, secrets come from process.env." --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Agent" --model sonnet --output-format json > "%logfile%" 2> "%errlog%"

REM Track usage (cost / tokens) into sprint-usage.csv
node C:\AI\agent-dashboard\sprint-track.js "%logfile%" >> "%errlog%" 2>&1

REM Keep a copy of the most recent log for quick access
copy /Y "%logfile%" "C:\AI\agent-dashboard\last-sprint.log" > nul

REM Finalize sprint: create tag + snapshot branch sprint/<ts>, push, open PR on GitHub.
REM Captures JSON { tag, branch, prNumber, prUrl } into sprint-finalize.out
node C:\AI\agent-dashboard\sprint-finalize.js > "C:\AI\agent-dashboard\sprint-logs\finalize_%ts%.json" 2>> "%errlog%"
if errorlevel 1 (
  echo [sprint.bat] sprint-finalize failed, sending TG report without preview link
  node C:\AI\agent-dashboard\sprint-tg.js "Спринт завершено (помилка фіналізації, див. err log)"
  goto :eof
)

REM Extract fields from finalize JSON via a tiny inline Node script.
for /f "usebackq delims=" %%L in (`node -e "const j=JSON.parse(require('fs').readFileSync('C:/AI/agent-dashboard/sprint-logs/finalize_%ts%.json','utf8'));if(j.skip){console.log('SKIP');}else if(!j.ok){console.log('ERR');}else{console.log(j.tag+'|'+j.branch+'|'+(j.prNumber||'')+'|'+(j.prUrl||''));}"`) do set "FINAL=%%L"

if "%FINAL%"=="SKIP" (
  echo [sprint.bat] no new commits on sprint-staging, skipping TG report
  goto :eof
)
if "%FINAL%"=="ERR" (
  echo [sprint.bat] finalize returned error, sending fallback TG report
  node C:\AI\agent-dashboard\sprint-tg.js "Спринт завершено (помилка відкриття PR, див. err log)"
  goto :eof
)

for /f "tokens=1,2,3,4 delims=|" %%a in ("%FINAL%") do (
  set "TAG=%%a"
  set "BRANCH=%%b"
  set "PRNUM=%%c"
  set "PRURL=%%d"
)

REM Give Railway ~90s to spin up the PR preview env and fire the webhook.
echo [sprint.bat] waiting 90s for Railway preview env...
timeout /t 90 /nobreak > nul

node C:\AI\agent-dashboard\sprint-tg.js "Спринт завершено (деталі у last-sprint.log)" "%TAG%" "%BRANCH%" "%PRNUM%" "%PRURL%"
