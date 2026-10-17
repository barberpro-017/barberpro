const { db, tg, host } = require('./_lib');
module.exports = async (req, res) => {
  const s = await db('client_bot?id=eq.1&select=bot_token,webhook_secret');
  const row = s.data && s.data[0];
  if (!row || req.headers['x-telegram-bot-api-secret-token'] !== row.webhook_secret) return res.status(403).end();
  const m = req.body && req.body.message;
  if (m && m.chat) {
    const name = (m.from && m.from.first_name) || '';
    await db('client_chats?on_conflict=chat_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ chat_id: m.chat.id, first_name: name }) });
    await tg(row.bot_token, 'sendMessage', { chat_id: m.chat.id, text: `👋 Xush kelibsiz, ${name || "aziz mijoz"}!\n\nYaqin atrofdagi sartaroshlarga onlayn navbat oling.`, reply_markup: { inline_keyboard: [[{ text: '💈 Kirish', web_app: { url: `https://${host(req)}/client/` } }]] } });
  }
  res.status(200).json({ ok: true });
};
