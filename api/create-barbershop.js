const { crypto, db, tg, host, who, ADMIN_CODE, eq } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const actor = await who(req);
  if (!actor) return res.status(401).json({ error: "Ruxsat yo'q" });
  const b = req.body || {};
  for (const k of ['token', 'login', 'password', 'barber', 'name', 'phone', 'address'])
    if (!b[k] || !String(b[k]).trim()) return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  if (String(b.password).length < 6) return res.status(400).json({ error: "Parol kamida 6 belgi bo'lsin" });
  if (actor.role === 'agent' && !eq(String(b.agentCode || '').trim(), actor.agent.agent_code)) return res.status(400).json({ error: "Agent code noto'g'ri" });
  const ag = actor.role === 'agent' ? { agent_id: actor.agent.id, agent_code: actor.agent.agent_code } : { agent_code: ADMIN_CODE };
  const token = String(b.token).trim();
  const me = await tg(token, 'getMe');
  if (!me.ok) return res.status(400).json({ error: "Bot token noto'g'ri" });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = salt + ':' + crypto.scryptSync(String(b.password), salt, 64).toString('hex');
  const ins = await db('barbershops', { method: 'POST', body: JSON.stringify({ name: b.name, address: String(b.address).trim().replace(/\s+/g, ' '), phone: b.phone, barber_name: b.barber, login: b.login, password_hash: hash, bot_username: me.result.username, ...ag }) });
  if (!ins.ok) return res.status(400).json({ error: ins.status === 409 ? 'Bu login yoki bot allaqachon mavjud' : 'Bazaga yozib bo\'lmadi' });
  const shop = ins.data[0], secret = crypto.randomBytes(24).toString('hex'), h = host(req);
  const sec = await db('barbershop_secrets', { method: 'POST', body: JSON.stringify({ barbershop_id: shop.id, bot_token: token, webhook_secret: secret }) });
  const w = sec.ok ? await tg(token, 'setWebhook', { url: `https://${h}/api/bot?id=${shop.id}`, secret_token: secret }) : { ok: false };
  if (!w.ok) { await db('barbershops?id=eq.' + shop.id, { method: 'DELETE' }); return res.status(500).json({ error: "Botni ulab bo'lmadi" }); }
  await tg(token, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ochish', web_app: { url: `https://${h}/barber/?s=${shop.id}` } } });
  res.json({ ok: true, id: shop.id });
};
