// Helper to send sprint report to Telegram in Ukrainian
// Usage: node sprint-tg.js "Task description here"

const task = process.argv[2] || 'Невідоме завдання';

const msg = {
  chat_id: 397649588,
  text: `🏗 <b>Звіт спринту</b>\n\n✅ ${task}\n\n🔗 <a href="https://agent-dashboard-production-a178.up.railway.app">Переглянути</a>\n\nПідтвердити зміни?`,
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [[
      {text: '✅ Підтвердити', callback_data: 'approve'},
      {text: '❌ Відхилити', callback_data: 'reject'}
    ]]
  }
};

fetch('https://api.telegram.org/bot8667690491:AAGUQheu2egg3ozI-ZpNsr3V_Fl7NKIFQKE/sendMessage', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(msg)
}).then(r => r.json()).then(r => console.log(r.ok ? 'Sent!' : 'Failed:', r.description || ''));
