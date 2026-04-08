const log = require("../logger");
const sprintGit = require("../sprint-git");

function tgFetch(token, method, payload) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function dispatchSprintAction(action, tag) {
  if (action === "approve") return sprintGit.approveSprint(tag);
  if (action === "revert") return sprintGit.revertSprint(tag);
  if (action === "skip") return { ok: true, skipped: true };
  return { ok: false, error: `unknown action ${action}` };
}

function handleTgWebhook(req, res, TG_TOKEN, TG_CHAT, lastTgFeedback) {
  let body = "",
    size = 0;
  req.on("data", (d) => {
    size += d.length;
    if (size > 1e6) {
      res.writeHead(413);
      res.end('{"error":"Payload too large"}');
      req.destroy();
      return;
    }
    body += d;
  });
  req.on("end", () => {
    try {
      const update = JSON.parse(body);

      if (update.callback_query) {
        const cb = update.callback_query;
        const chatId = cb.message?.chat?.id || TG_CHAT;
        const msgId = cb.message?.message_id;
        const origText = cb.message?.text || "";
        const rawData = String(cb.data || "");

        // New-style callback: "approve:<tag>" | "skip:<tag>" | "revert:<tag>"
        // Legacy: "approve" | "reject"
        let action = rawData,
          tag = null;
        if (rawData.includes(":")) {
          const [a, ...rest] = rawData.split(":");
          action = a;
          tag = rest.join(":");
        }
        if (action === "reject") action = "revert"; // legacy alias

        lastTgFeedback.action = action;
        lastTgFeedback.text = null;
        lastTgFeedback.timestamp = Date.now();

        // Acknowledge the button press immediately.
        const ackText =
          action === "approve"
            ? "✅ Підтверджено!"
            : action === "skip"
              ? "⏭ Пропущено"
              : "❌ Відкочено";
        tgFetch(TG_TOKEN, "answerCallbackQuery", {
          callback_query_id: cb.id,
          text: ackText,
        });

        // Run async git action, then update TG message with result.
        (async () => {
          let result = { ok: true };
          if (action === "approve" || action === "revert") {
            if (!tag) {
              result = { ok: false, error: "no tag in callback_data" };
            } else {
              result = await dispatchSprintAction(action, tag);
            }
          }

          let statusLine;
          if (action === "approve") {
            statusLine = result.ok
              ? `\n\n✅ ПІДТВЕРДЖЕНО (${result.strategy || "squash"}) → master`
              : `\n\n⚠️ ПОМИЛКА: ${result.error}`;
          } else if (action === "revert") {
            statusLine = result.ok
              ? `\n\n❌ ВІДКОЧЕНО (${tag}) → PR закрито`
              : `\n\n⚠️ ПОМИЛКА: ${result.error}`;
          } else if (action === "skip") {
            statusLine = `\n\n⏭ Пропущено (прев'ю залишається)`;
          } else {
            statusLine = `\n\n(${action})`;
          }

          tgFetch(TG_TOKEN, "editMessageText", {
            chat_id: chatId,
            message_id: msgId,
            text: origText + statusLine,
          });
        })().catch((e) =>
          log.warn("[telegram] async callback error: " + e.message),
        );
      } else if (update.message?.text) {
        lastTgFeedback.action = "comment";
        lastTgFeedback.text = update.message.text;
        lastTgFeedback.timestamp = Date.now();
        tgFetch(TG_TOKEN, "sendMessage", {
          chat_id: update.message.chat.id,
          text: "\u{1F4DD} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E! \u0411\u0443\u0434\u0435 \u0432\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u0432 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u043E\u043C\u0443 \u0441\u043F\u0440\u0438\u043D\u0442\u0456.",
        });
      }
    } catch (e) {
      log.warn(e.message);
    }
    res.writeHead(200);
    res.end("ok");
  });
}

function handleGetTgFeedback(req, res, lastTgFeedback) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(lastTgFeedback));
}

module.exports = { handleTgWebhook, handleGetTgFeedback };
