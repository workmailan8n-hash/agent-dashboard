// Send sprint report to Telegram in Ukrainian.
// Usage: node sprint-tg.js "<summary>" [tag] [branch] [prNumber] [prUrl]
// The tag/branch/prNumber come from sprint-finalize.js JSON output.

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;

if (!TG_TOKEN || !TG_CHAT) {
  console.error("Missing TG_TOKEN or TG_CHAT in .env");
  process.exit(1);
}

const task = process.argv[2] || "Спринт завершено (деталі у last-sprint.log)";
const tag = process.argv[3] || "";
const branch = process.argv[4] || "";
const prNumber = process.argv[5] || "";
const prUrl = process.argv[6] || "";

// Fallback: extract task list from last-sprint.log if argv[2] is the default.
let taskText = task;
if (taskText.startsWith("Спринт завершено")) {
  try {
    const logText = fs.readFileSync(
      path.join(__dirname, "last-sprint.log"),
      "utf8",
    );
    const tasks = [];
    const re = /\*\*Task \d+\s*[—–-]\s*(.+?)\*\*/g;
    let m;
    while ((m = re.exec(logText)) !== null) tasks.push(m[1].trim());
    if (tasks.length > 0) taskText = tasks.join("\n✅ ");
  } catch {}
}

// Pull preview URL from the sprint-preview store (populated by /railway-webhook).
function getPreviewUrl() {
  try {
    const store = JSON.parse(
      fs.readFileSync(path.join(__dirname, ".sprint-preview.json"), "utf8"),
    );
    if (branch && store[`branch:${branch}`]?.url) {
      return store[`branch:${branch}`].url;
    }
    if (prNumber && store[`pr:${prNumber}`]?.url) {
      return store[`pr:${prNumber}`].url;
    }
    if (store.latest?.url) return store.latest.url;
  } catch {}
  return null;
}

// Last commit subject, trimmed.
let lastCommit = "";
try {
  const { execSync } = require("child_process");
  lastCommit = execSync('git log -1 --format="%s"', {
    cwd: __dirname,
    encoding: "utf8",
  }).trim();
  if (lastCommit) lastCommit = `\n\n💾 Коміт: <code>${lastCommit}</code>`;
} catch {}

(async () => {
  const previewUrl = getPreviewUrl();
  const previewLine = previewUrl
    ? `\n\n🔗 <a href="${previewUrl}">Переглянути прев'ю спринту</a>`
    : "\n\n⏳ Прев'ю ще не готове (Railway піднімає середовище)";
  const prLine = prUrl ? `\n📋 <a href="${prUrl}">PR #${prNumber}</a>` : "";
  const tagLine = tag ? `\n🏷 <code>${tag}</code>` : "";

  // Buttons carry the tag so the webhook handler knows which sprint to act on.
  const buttons = tag
    ? [
        [
          { text: "✅ Підтвердити", callback_data: `approve:${tag}` },
          { text: "⏭ Пропустити", callback_data: `skip:${tag}` },
        ],
        [{ text: "❌ Відкотити", callback_data: `revert:${tag}` }],
      ]
    : [
        [
          { text: "✅ Підтвердити", callback_data: "approve" },
          { text: "❌ Відхилити", callback_data: "reject" },
        ],
      ];

  const msg = {
    chat_id: TG_CHAT,
    text:
      `🏗 <b>Звіт спринту — Agent Dashboard</b>\n\n` +
      `✅ ${taskText}` +
      lastCommit +
      tagLine +
      previewLine +
      prLine +
      `\n\nПідтвердити зміни?`,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: { inline_keyboard: buttons },
  };

  const res = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    },
  );
  const r = await res.json();
  console.log(r.ok ? "Sent!" : "Failed:", r.description || JSON.stringify(r));
})();
