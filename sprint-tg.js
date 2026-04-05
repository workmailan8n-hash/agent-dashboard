// Send sprint report to Telegram in Ukrainian
// Reads task description from argument OR last-sprint.log
// Usage: node sprint-tg.js "Short summary in Ukrainian"

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;

if (!TG_TOKEN || !TG_CHAT) {
  console.error('Missing TG_TOKEN or TG_CHAT in .env');
  process.exit(1);
}

// Get task description: from argument, or parse last-sprint.log
let task = process.argv[2];

if (!task) {
  try {
    const log = fs.readFileSync(path.join(__dirname, 'last-sprint.log'), 'utf8');
    const tasks = [];
    const re = /\*\*Task \d+\s*[—–-]\s*(.+?)\*\*/g;
    let m;
    while ((m = re.exec(log)) !== null) tasks.push(m[1].trim());
    if (tasks.length > 0) task = tasks.join('\n✅ ');
  } catch (e) {}
}

if (!task) task = 'Спринт завершено (деталі у last-sprint.log)';

// Get last commit message
let lastCommit = '';
try {
  const { execSync } = require('child_process');
  lastCommit = execSync('git log -1 --format="%s" 2>/dev/null', { cwd: __dirname, encoding: 'utf8' }).trim();
  if (lastCommit) lastCommit = `\n\n💾 Коміт: <code>${lastCommit}</code>`;
} catch (e) {}

// Get public URL from server health endpoint
function getPublicUrl() {
  return new Promise((resolve) => {
    http.get('http://localhost:3737/api/health', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const h = JSON.parse(d);
          resolve(h.publicUrl || null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const pubUrl = await getPublicUrl();
  const linkLine = pubUrl
    ? `\n\n🔗 <a href="${pubUrl}">Переглянути онлайн</a>`
    : '';

  const msg = {
    chat_id: TG_CHAT,
    text: `🏗 <b>Звіт спринту — Agent Dashboard</b>\n\n✅ ${task}${lastCommit}${linkLine}\n\nПідтвердити зміни?`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Підтвердити', callback_data: 'approve' },
        { text: '❌ Відхилити', callback_data: 'reject' }
      ]]
    }
  };

  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });
  const r = await res.json();
  console.log(r.ok ? 'Sent!' : 'Failed:', r.description || JSON.stringify(r));
})();
