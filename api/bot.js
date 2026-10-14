const { db, tg, host } = require('./_lib');
module.exports = async (req, res) => {
  const id = String(req.query.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).end();
  const s = await db('barbershop_secrets?barbershop_id=eq.' + id + '&select=bot_token,webhook_secret');
  const row = s.data && s.data[0];
  if (!row || req.headers['x-telegram-bot-api-secret-token'] !== row.webhook_secret) return res.status(403).end();
  const m = req.body && req.body.message;
  if (m && m.chat) await db('bot_chats?on_conflict=barbershop_id,chat_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ barbershop_id: id, chat_id: m.chat.id }) });
  if (m && m.text && m.text.startsWith('/start')) {
    await tg(row.bot_token, 'sendMessage', { chat_id: m.chat.id, text: "💈 Xush kelibsiz!\nBoshqaruv panelini ochish uchun tugmani bosing.", reply_markup: { inline_keyboard: [[{ text: '💈 Ochish', web_app: { url: `https://${host(req)}/barber/` } }]] } });
  }
  res.status(200).json({ ok: true });
};
