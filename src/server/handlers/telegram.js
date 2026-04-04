const log = require('../logger');

function handleTgWebhook(req, res, TG_TOKEN, TG_CHAT, lastTgFeedback) {
  let body = '', size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 1e6) { res.writeHead(413); res.end('{"error":"Payload too large"}'); req.destroy(); return; }
    body += d;
  });
  req.on('end', () => {
    try {
      const update = JSON.parse(body);
      if (update.callback_query) {
        const cb = update.callback_query;
        const isApprove = cb.data === 'approve';
        lastTgFeedback.action = cb.data;
        lastTgFeedback.text = null;
        lastTgFeedback.timestamp = Date.now();
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ callback_query_id: cb.id, text: isApprove ? '\u2705 \u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E!' : '\u274C \u0412\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E!' })
        });
        const msgId = cb.message?.message_id;
        const chatId = cb.message?.chat?.id || TG_CHAT;
        const origText = cb.message?.text || '';
        const statusText = isApprove
          ? origText + '\n\n\u2705 \u041F\u0406\u0414\u0422\u0412\u0415\u0420\u0414\u0416\u0415\u041D\u041E'
          : origText + '\n\n\u274C \u0412\u0406\u0414\u0425\u0418\u041B\u0415\u041D\u041E';
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: chatId, message_id: msgId, text: statusText })
        });
        const confirmText = isApprove
          ? '\u2705 \u0414\u044F\u043A\u0443\u044E! \u0417\u043C\u0456\u043D\u0438 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043E. \u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0441\u043F\u0440\u0438\u043D\u0442 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u044C \u0440\u043E\u0431\u043E\u0442\u0443.'
          : '\u274C \u0417\u043C\u0456\u043D\u0438 \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E. \u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0441\u043F\u0440\u0438\u043D\u0442 \u0432\u0456\u0434\u043A\u043E\u0442\u0438\u0442\u044C \u0437\u043C\u0456\u043D\u0438.';
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: chatId, text: confirmText })
        });
      } else if (update.message?.text) {
        lastTgFeedback.action = 'comment';
        lastTgFeedback.text = update.message.text;
        lastTgFeedback.timestamp = Date.now();
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: update.message.chat.id, text: '\u{1F4DD} \u041A\u043E\u043C\u0435\u043D\u0442\u0430\u0440 \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E! \u0411\u0443\u0434\u0435 \u0432\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u0432 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u043E\u043C\u0443 \u0441\u043F\u0440\u0438\u043D\u0442\u0456.' })
        });
      }
    } catch (e) { log.warn(e.message); }
    res.writeHead(200); res.end('ok');
  });
}

function handleGetTgFeedback(req, res, lastTgFeedback) {
  res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(lastTgFeedback));
}

module.exports = { handleTgWebhook, handleGetTgFeedback };
