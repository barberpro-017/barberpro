const { admin, db, tg } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await admin(req))) return res.status(401).json({ error: "Ruxsat yo'q" });
  const id = String((req.body || {}).id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: "Noto'g'ri id" });
  const s = await db('barbershop_secrets?barbershop_id=eq.' + id + '&select=bot_token');
  if (s.data && s.data[0]) await tg(s.data[0].bot_token, 'deleteWebhook');
  await db('barbershops?id=eq.' + id, { method: 'DELETE' });
  res.json({ ok: true });
};
