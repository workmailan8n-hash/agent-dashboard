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

// argv[2] — sentinel: --default (читать last-sprint.log), --finalize-failed,
// --finalize-error, --pipeline (короткий ping), либо произвольный текст.
// Cyrillic через cmd.exe argv бьётся, поэтому НЕ передаём украинский из bat.
const mode = process.argv[2] || "--default";
const tag = process.argv[3] || "";
const branch = process.argv[4] || "";
const prNumber = process.argv[5] || "";
const prUrl = process.argv[6] || "";

function extractTasksFromLog() {
  try {
    const logText = fs.readFileSync(
      path.join(__dirname, "last-sprint.log"),
      "utf8",
    );
    // Файл — JSON-вывод от `claude --output-format json`. Нужен .result.
    let body = logText;
    try {
      const j = JSON.parse(logText);
      if (j && typeof j.result === "string") body = j.result;
    } catch {}
    const tasks = [];
    const re = /\*\*Task\s*\d+\s*[—–\-:]\s*(.+?)\*\*/g;
    let m;
    while ((m = re.exec(body)) !== null) tasks.push(m[1].trim());
    return tasks;
  } catch {
    return [];
  }
}

let taskText;
if (mode === "--finalize-failed") {
  taskText = "Спринт завершено (помилка фіналізації, див. err log)";
} else if (mode === "--finalize-error") {
  taskText = "Спринт завершено (помилка відкриття PR, див. err log)";
} else if (mode === "--pipeline") {
  taskText = `pipeline completed (${tag || ""})`;
} else if (mode === "--default") {
  const tasks = extractTasksFromLog();
  taskText =
    tasks.length > 0
      ? tasks.join("\n✅ ")
      : "Спринт завершено (деталі у last-sprint.log)";
} else {
  taskText = mode;
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

// Wait for Railway preview URL to appear in the store. Without a preview link
// the report has no value, so we'd rather skip than spam TG with placeholders.
async function waitForPreview(timeoutMs = 8 * 60 * 1000, intervalMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = getPreviewUrl();
    if (url) return url;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

(async () => {
  // For the main sprint report we REQUIRE a preview link. Poll until Railway
  // webhook populates the store; if it never does — silently skip the report.
  // Pipeline ping / fallback modes don't need a link and send immediately.
  let previewUrl = getPreviewUrl();
  if (mode === "--default" && !previewUrl) {
    console.log("[sprint-tg] waiting for Railway preview URL...");
    previewUrl = await waitForPreview();
    if (!previewUrl) {
      console.log("[sprint-tg] preview never arrived — skipping TG report");
      process.exit(0);
    }
  }
  const previewLine = previewUrl
    ? `\n\n🔗 <a href="${previewUrl}">Переглянути прев'ю спринту</a>`
    : "";
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
