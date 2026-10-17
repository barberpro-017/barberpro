const { crypto, db, sweep } = require('./_lib');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sign = p => crypto.createHmac('sha256', KEY).update(p).digest('base64url');
const mk = id => { const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + 30 * 864e5 })).toString('base64url'); return p + '.' + sign(p); };
const ver = t => { const [p, s] = String(t || '').split('.'); if (!p || !s || sign(p) !== s) return null; try { const o = JSON.parse(Buffer.from(p, 'base64url')); return o.exp > Date.now() ? o.id : null; } catch (e) { return null; } };
const TABLES = { services: 1, queue: 1, transactions: 1 };
const bad = (res, c, m) => res.status(c).json({ error: m });
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.action === 'login') {
    const r = await db('barbershops?login=eq.' + encodeURIComponent(String(b.login || '').trim().toLowerCase()) + '&select=id,password_hash');
    const s = r.data && r.data[0];
    const [salt, h] = String((s && s.password_hash) || ':').split(':');
    const x = crypto.scryptSync(String(b.password || ''), salt || 'x', 64);
    if (!s || !h || !crypto.timingSafeEqual(x, Buffer.from(h, 'hex'))) return bad(res, 401, "Login yoki parol noto'g'ri");
    return res.json({ token: mk(s.id) });
  }
  const id = ver(b.token);
  if (!id) return bad(res, 401, 'Qayta kiring');
  if (b.action === 'shop') {
    const r = await db('barbershops?id=eq.' + id + '&select=name,barber_name,address,sub_until,is_open');
    return res.json({ shop: r.data && r.data[0] });
  }
  if (b.action === 'setopen') {
    await db('barbershops?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ is_open: !!b.value }) });
    return res.json({ ok: true });
  }
  if (!TABLES[b.table]) return bad(res, 400, "Noto'g'ri so'rov");
  const t = b.table, uid = String(b.id || '');
  const clean = o => { const r = { ...(o || {}) }; delete r.id; delete r.barbershop_id; delete r.created_at; return r; };
  if (b.action === 'list') {
    if (t === 'queue') await sweep(id);
    const r = await db(`${t}?barbershop_id=eq.${id}&select=*&order=created_at.desc&limit=500`);
    return res.json({ rows: r.data || [] });
  }
  if (b.action === 'add') {
    const r = await db(t, { method: 'POST', body: JSON.stringify({ ...clean(b.row), barbershop_id: id }) });
    return r.ok ? res.json({ row: r.data[0] }) : bad(res, 400, 'Saqlab bo\'lmadi');
  }
  if (!/^[0-9a-f-]{36}$/.test(uid)) return bad(res, 400, "Noto'g'ri id");
  if (b.action === 'update') {
    const r = await db(`${t}?id=eq.${uid}&barbershop_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(clean(b.row)) });
    return r.ok ? res.json({ ok: true }) : bad(res, 400, 'Saqlab bo\'lmadi');
  }
  if (b.action === 'delete') {
    await db(`${t}?id=eq.${uid}&barbershop_id=eq.${id}`, { method: 'DELETE' });
    return res.json({ ok: true });
  }
  bad(res, 400, "Noto'g'ri so'rov");
};
