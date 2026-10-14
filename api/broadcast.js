const { admin, db, tg } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await admin(req))) return res.status(401).json({ error: "Ruxsat yo'q" });
  const text = String((req.body || {}).text || '').trim().slice(0, 4000);
  if (!text) return res.status(400).json({ error: "Xabar bo'sh" });
  const [c, s] = await Promise.all([db('bot_chats?select=barbershop_id,chat_id&limit=5000'), db('barbershop_secrets?select=barbershop_id,bot_token')]);
  const tok = {}; (s.data || []).forEach(x => tok[x.barbershop_id] = x.bot_token);
  const list = (c.data || []).filter(x => tok[x.barbershop_id]);
  let sent = 0, failed = 0;
  for (let i = 0; i < list.length; i += 20)
    await Promise.all(list.slice(i, i + 20).map(async x => { const r = await tg(tok[x.barbershop_id], 'sendMessage', { chat_id: x.chat_id, text }); r.ok ? sent++ : failed++; }));
  res.json({ sent, failed, shops: new Set(list.map(x => x.barbershop_id)).size, total: Object.keys(tok).length });
};
