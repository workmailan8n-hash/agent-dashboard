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
            ? "\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E!"
            : action === "skip"
              ? "\u23ED \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E"
              : "\u274C \u0412\u0456\u0434\u043A\u043E\u0447\u0435\u043D\u043E";
        tgFetch(TG_TOKEN, "answerCallbackQuery", {
          callback_query_id: cb.id,
          text: ackText,
        });

        // Run git action if any, then post status.
        let result = { ok: true };
        if (action === "approve" || action === "revert") {
          if (!tag) {
            result = { ok: false, error: "no tag in callback_data" };
          } else {
            result = dispatchSprintAction(action, tag);
          }
        }

        // Compose final status line.
        let statusLine;
        if (action === "approve") {
          statusLine = result.ok
            ? `\n\n\u2705 \u041F\u0406\u0414\u0422\u0412\u0415\u0420\u0414\u0416\u0415\u041D\u041E (${result.strategy || ""}) \u2192 master`
            : `\n\n\u26A0\uFE0F \u041F\u041E\u041C\u0418\u041B\u041A\u0410: ${result.error}`;
        } else if (action === "revert") {
          statusLine = result.ok
            ? `\n\n\u274C \u0412\u0406\u0414\u041A\u041E\u0427\u0415\u041D\u041E (${tag}) \u2192 sprint-staging`
            : `\n\n\u26A0\uFE0F \u041F\u041E\u041C\u0418\u041B\u041A\u0410: ${result.error}`;
        } else if (action === "skip") {
          statusLine = `\n\n\u23ED \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E (\u043F\u0440\u0435\u0432\u044C\u044E \u0437\u0430\u043B\u0438\u0448\u0430\u0454\u0442\u044C\u0441\u044F)`;
        } else {
          statusLine = `\n\n(${action})`;
        }

        tgFetch(TG_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: msgId,
          text: origText + statusLine,
        });
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
