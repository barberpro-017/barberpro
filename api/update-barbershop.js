const { crypto, admin, db, tg, host } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await admin(req))) return res.status(401).json({ error: "Ruxsat yo'q" });
  const b = req.body || {}, id = String(b.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: "Noto'g'ri id" });
  for (const k of ['login', 'barber', 'name', 'phone', 'address'])
    if (!b[k] || !String(b[k]).trim()) return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  const patch = { name: b.name, address: String(b.address).trim().replace(/\s+/g, ' '), phone: b.phone, barber_name: b.barber, login: String(b.login).trim().toLowerCase() };
  if (b.password) {
    if (String(b.password).length < 6) return res.status(400).json({ error: "Parol kamida 6 belgi bo'lsin" });
    const salt = crypto.randomBytes(16).toString('hex');
    patch.password_hash = salt + ':' + crypto.scryptSync(String(b.password), salt, 64).toString('hex');
  }
  const newTok = b.token && String(b.token).trim() ? String(b.token).trim() : null;
  if (newTok) {
    const me = await tg(newTok, 'getMe');
    if (!me.ok) return res.status(400).json({ error: "Bot token noto'g'ri" });
    patch.bot_username = me.result.username;
  }
  const up = await db('barbershops?id=eq.' + id, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!up.ok) return res.status(400).json({ error: up.status === 409 ? 'Bu login yoki bot allaqachon mavjud' : "Saqlab bo'lmadi" });
  if (newTok) {
    const old = await db('barbershop_secrets?barbershop_id=eq.' + id + '&select=bot_token');
    if (old.data && old.data[0]) await tg(old.data[0].bot_token, 'deleteWebhook');
    const secret = crypto.randomBytes(24).toString('hex'), h = host(req);
    await db('barbershop_secrets?barbershop_id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ bot_token: newTok, webhook_secret: secret }) });
    const w = await tg(newTok, 'setWebhook', { url: `https://${h}/api/bot?id=${id}`, secret_token: secret });
    await tg(newTok, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ochish', web_app: { url: `https://${h}/barber/` } } });
    await db('bot_chats?barbershop_id=eq.' + id, { method: 'DELETE' });
    if (!w.ok) return res.status(500).json({ error: "Yangi botni ulab bo'lmadi" });
  }
  res.json({ ok: true });
};
