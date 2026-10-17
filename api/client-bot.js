const { crypto, admin, db, tg, host } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await admin(req))) return res.status(401).json({ error: "Ruxsat yo'q" });
  const b = req.body || {};
  const cur = await db('client_bot?id=eq.1&select=bot_token,bot_username');
  const row = cur.data && cur.data[0];
  if (b.action === 'status') {
    const c = await db('client_chats?select=chat_id&limit=5000');
    return res.json({ connected: !!row, username: row ? row.bot_username : null, users: (c.data || []).length });
  }
  if (b.action === 'disconnect') {
    if (row) { await tg(row.bot_token, 'deleteWebhook'); await db('client_bot?id=eq.1', { method: 'DELETE' }); }
    return res.json({ ok: true });
  }
  if (b.action === 'connect') {
    const token = String(b.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token kiriting' });
    const me = await tg(token, 'getMe');
    if (!me.ok) return res.status(400).json({ error: "Bot token noto'g'ri" });
    const used = await db('barbershop_secrets?bot_token=eq.' + encodeURIComponent(token) + '&select=barbershop_id');
    if (used.data && used.data.length) return res.status(400).json({ error: 'Bu bot sartaroshxonaga ulangan, boshqa bot kerak' });
    if (row && row.bot_token !== token) await tg(row.bot_token, 'deleteWebhook');
    const secret = crypto.randomBytes(24).toString('hex'), h = host(req);
    const up = await db('client_bot?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: 1, bot_token: token, webhook_secret: secret, bot_username: me.result.username }) });
    if (!up.ok) return res.status(500).json({ error: "Bazaga yozib bo'lmadi (05 SQL ishga tushirilganmi?)" });
    const w = await tg(token, 'setWebhook', { url: `https://${h}/api/client-hook`, secret_token: secret });
    await tg(token, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Kirish', web_app: { url: `https://${h}/client/` } } });
    if (!w.ok) return res.status(500).json({ error: "Botni ulab bo'lmadi" });
    return res.json({ ok: true });
  }
  res.status(400).json({ error: "Noto'g'ri so'rov" });
};
