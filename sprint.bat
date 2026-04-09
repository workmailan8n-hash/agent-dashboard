@echo off
setlocal enableextensions
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
call git fetch origin
call git checkout sprint-staging 2>nul || call git checkout -b sprint-staging origin/master
call git pull --ff-only origin sprint-staging 2>nul

REM Timestamped log file (rotated, no overwriting)
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "ts=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%"
if not exist "C:\AI\agent-dashboard\sprint-logs" mkdir "C:\AI\agent-dashboard\sprint-logs"
set "logfile=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.json"
set "errlog=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.err"

echo [STEP] pre-claude %date% %time% >> "%errlog%"

REM Use `call` so cmd treats npx.cmd as a subroutine and returns control to this bat file.
REM Without `call`, npx.cmd replaces the current batch context and sprint.bat terminates after npx exits.
call npx claude -p "You are autonomous dev for Agent Dashboard v2. WorkDir: C:\AI\agent-dashboard. Current git branch: sprint-staging (DO NOT checkout any other branch, DO NOT push, DO NOT call sprint-tg.js — the outer sprint.bat handles push + telegram reporting after you finish). Architecture: Vite + ES modules (src/*.js), CSS tokens (src/styles/), server handlers (src/server/handlers/). Build: 'npm run build'. Entry: src/main.js imports src/app.js. FIRST: check if the user left feedback from the last sprint by running: curl -s https://agent-dashboard-production-a178.up.railway.app/api/tg-feedback — if action is 'reject' or 'comment' with text, address that feedback BEFORE doing new tasks. If action is 'approve' or 'skip' or null, proceed normally. TWO TASKS per sprint: 1) Read ROADMAP.md find next unchecked [ ] task, implement it in the correct module under src/. 2) Add a MINIGAME to one existing interactive office object that doesn't have one yet — each object an agent interacts with should launch its own unique small minigame (e.g. piano = simple rhythm/tile-tap, coffee machine = timing bar, whiteboard = memory match, plant = click-to-water sequence, arcade = snake-like, etc). Pick ONE object per sprint, implement a self-contained minigame module under src/minigames/<object>.js, wire it to trigger when an agent interacts with that object, render in a modal/overlay with pixel-art style matching the dashboard. Keep each minigame tiny (~100-200 lines), no external deps. Track which objects already have minigames to avoid duplicates. BEFORE committing: run 'npm run build' to verify Vite build passes, then run tests with 'npx playwright test --config=playwright.config.ts tests/e2e/feature-check.spec.ts' — if tests fail, fix the code. Steps: implement, build, test, fix if needed, git add relevant files (NOT .env), commit with descriptive message. STOP after the commit — do NOT push, do NOT run sprint-tg.js, do NOT checkout other branches. Mark [x] in ROADMAP before committing. Rules: dont remove objects, dont change password noadmin, dont modify .env, secrets come from process.env." --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Agent" --model sonnet --output-format json > "%logfile%" 2> "%errlog%"

echo [STEP] post-claude exit=%errorlevel% %date% %time% >> "%errlog%"

REM Track usage (cost / tokens) into sprint-usage.csv
echo [STEP] sprint-track >> "%errlog%"
call node C:\AI\agent-dashboard\sprint-track.js "%logfile%" >> "%errlog%" 2>&1

REM Keep a copy of the most recent log for quick access
echo [STEP] copy last-sprint.log >> "%errlog%"
copy /Y "%logfile%" "C:\AI\agent-dashboard\last-sprint.log" > nul

REM Finalize sprint: create tag + snapshot branch sprint/<ts>, push, open PR on GitHub.
REM Captures JSON { tag, branch, prNumber, prUrl } into sprint-finalize.out
echo [STEP] sprint-finalize >> "%errlog%"
call node C:\AI\agent-dashboard\sprint-finalize.js > "C:\AI\agent-dashboard\sprint-logs\finalize_%ts%.json" 2>> "%errlog%"
if errorlevel 1 (
  echo [STEP] finalize-FAILED >> "%errlog%"
  echo [sprint.bat] sprint-finalize failed, sending TG report without preview link
  call node C:\AI\agent-dashboard\sprint-tg.js --finalize-failed
  goto :ping
)

REM Extract fields from finalize JSON via a tiny inline Node script.
echo [STEP] parse-finalize >> "%errlog%"
for /f "usebackq delims=" %%L in (`node -e "const j=JSON.parse(require('fs').readFileSync('C:/AI/agent-dashboard/sprint-logs/finalize_%ts%.json','utf8'));if(j.skip){console.log('SKIP');}else if(!j.ok){console.log('ERR');}else{console.log(j.tag+'|'+j.branch+'|'+(j.prNumber||'')+'|'+(j.prUrl||''));}"`) do set "FINAL=%%L"

if "%FINAL%"=="SKIP" (
  echo [STEP] finalize-SKIP >> "%errlog%"
  echo [sprint.bat] no new commits on sprint-staging, skipping TG report
  goto :ping
)
if "%FINAL%"=="ERR" (
  echo [STEP] finalize-ERR >> "%errlog%"
  echo [sprint.bat] finalize returned error, sending fallback TG report
  call node C:\AI\agent-dashboard\sprint-tg.js --finalize-error
  goto :ping
)

for /f "tokens=1,2,3,4 delims=|" %%a in ("%FINAL%") do (
  set "TAG=%%a"
  set "BRANCH=%%b"
  set "PRNUM=%%c"
  set "PRURL=%%d"
)

REM sprint-tg.js --default polls .sprint-preview.json up to 8 min.
REM If Railway preview never arrives, the script skips the TG report.
echo [STEP] sprint-tg main (with preview wait) >> "%errlog%"
call node C:\AI\agent-dashboard\sprint-tg.js --default "%TAG%" "%BRANCH%" "%PRNUM%" "%PRURL%"

:ping
echo [STEP] control-ping %date% %time% >> "%errlog%"
call node C:\AI\agent-dashboard\sprint-tg.js --pipeline "%ts%"
echo [STEP] done >> "%errlog%"
endlocal
exit /b 0
