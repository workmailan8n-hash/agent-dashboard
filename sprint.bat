@echo off
cd /d C:\AI\agent-dashboard

REM Ensure dashboard is up before sprint (agent will curl /api/tg-feedback)
curl -s -o nul -m 2 http://localhost:3737/api/health
if errorlevel 1 (
  echo [sprint.bat] dashboard not running, starting in background...
  start "Agent Dashboard" /min cmd /c "node server.js"
  REM give it a few seconds to bind to port + open serveo tunnel
  timeout /t 6 /nobreak > nul
)

REM Timestamped log file (rotated, no overwriting)
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "ts=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%"
if not exist "C:\AI\agent-dashboard\sprint-logs" mkdir "C:\AI\agent-dashboard\sprint-logs"
set "logfile=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.json"
set "errlog=C:\AI\agent-dashboard\sprint-logs\sprint_%ts%.err"

npx claude -p "You are autonomous dev for Agent Dashboard v2. WorkDir: C:\AI\agent-dashboard. Architecture: Vite + ES modules (src/*.js), CSS tokens (src/styles/), server handlers (src/server/handlers/). Build: 'npm run build'. Entry: src/main.js imports src/app.js. FIRST: check if the user left feedback from the last sprint by running: curl -s http://localhost:3737/api/tg-feedback — if action is 'reject' or 'comment' with text, address that feedback BEFORE doing new tasks. If action is 'approve' or null, proceed normally. TWO TASKS per sprint: 1) Read ROADMAP.md find next unchecked [ ] task, implement it in the correct module under src/. 2) Add 1 NEW interactive office object (add to src/app.js). BEFORE committing: run 'npm run build' to verify Vite build passes, then run tests with 'npx playwright test --config=playwright.config.ts tests/e2e/feature-check.spec.ts' — if tests fail, fix the code. Steps: implement, build, test, fix if needed, git add relevant files (NOT .env), commit with descriptive message, push. AFTER push: send Telegram report by running: node sprint-tg.js \"Short summary of BOTH tasks you completed in Ukrainian\". IMPORTANT: you MUST pass a string argument describing what you did — for example: node sprint-tg.js \"1) Додано налаштування звуку 2) Новий об'єкт: піаніно\". Then mark [x] in ROADMAP. Rules: dont remove objects, dont change password noadmin, dont modify .env, secrets come from process.env. Telegram messages MUST be in Ukrainian." --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Agent" --model sonnet --output-format json > "%logfile%" 2> "%errlog%"

REM Track usage (cost / tokens) into sprint-usage.csv
node C:\AI\agent-dashboard\sprint-track.js "%logfile%" >> "%errlog%" 2>&1

REM Keep a copy of the most recent log for quick access
copy /Y "%logfile%" "C:\AI\agent-dashboard\last-sprint.log" > nul
