const { crypto, db, sweep, verifyInit } = require('./_lib');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, UUID = /^[0-9a-f-]{36}$/;
const sign = p => crypto.createHmac('sha256', KEY).update(p).digest('base64url');
const mk = (id, u) => { const p = Buffer.from(JSON.stringify({ id, u, exp: Date.now() + 12 * 3600e3 })).toString('base64url'); return p + '.' + sign(p); };
const ver = t => {
  const [p, s] = String(t || '').split('.'); if (!p || !s) return null;
  const e = sign(p); if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url')); return o.exp > Date.now() ? o : null; } catch (x) { return null; }
};
const TABLES = { services: 1, queue: 1, transactions: 1 };
const bad = (res, c, m) => res.status(c).json({ error: m });
async function botToken(id) { const r = await db('barbershop_secrets?barbershop_id=eq.' + id + '&select=bot_token'); return r.data && r.data[0] && r.data[0].bot_token; }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.action === 'login') {
    // Faqat shu sartaroshxonaning O'Z boti ichidan (imzolangan Telegram ma'lumoti) va faqat shu sartaroshxona login-paroli bilan kirish mumkin
    const sid = String(b.shop || '');
    if (!UUID.test(sid)) return bad(res, 400, "Sartaroshxona botingiz orqali kiring");
    const bt = await botToken(sid), user = bt && verifyInit(String(b.initData || ''), bt);
    if (!user) return bad(res, 401, "Faqat o'zingizning sartaroshxona botingiz orqali kiring");
    const fk = `login_fails?barbershop_id=eq.${sid}&tg_id=eq.${user.id}`;
    const f = await db(fk + '&select=fails,locked_until'), fr = f.data && f.data[0];
    if (fr && fr.locked_until && new Date(fr.locked_until) > new Date())
      return bad(res, 429, `Juda ko'p urinish. ${Math.ceil((new Date(fr.locked_until) - Date.now()) / 60000)} daqiqadan so'ng urinib ko'ring`);
    const r = await db(`barbershops?id=eq.${sid}&select=login,password_hash`), s = r.data && r.data[0];
    const [salt, h] = String((s && s.password_hash) || ':').split(':');
    const x = crypto.scryptSync(String(b.password || ''), salt || 'x', 64);
    const okPw = !!(s && h && crypto.timingSafeEqual(x, Buffer.from(h, 'hex')));
    const okLg = !!(s && String(b.login || '').trim().toLowerCase() === String(s.login || '').toLowerCase());
    if (!okPw || !okLg) {
      const fails = ((fr && fr.fails) || 0) + 1;
      await db('login_fails?on_conflict=barbershop_id,tg_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ barbershop_id: sid, tg_id: user.id, fails: fails >= 5 ? 0 : fails, locked_until: fails >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null }) });
      return bad(res, 401, "Login yoki parol noto'g'ri");
    }
    if (fr) await db(fk, { method: 'DELETE' });
    return res.json({ token: mk(sid, user.id) });
  }
  const t = ver(b.token);
  if (!t) return bad(res, 401, 'Qayta kiring');
  const id = t.id, bt = await botToken(id), user = bt && verifyInit(String(b.initData || ''), bt);
  if (!user || user.id !== t.u) return bad(res, 401, 'Qayta kiring');
  if (b.action === 'shop') {
    const r = await db('barbershops?id=eq.' + id + '&select=name,barber_name,address,sub_until,is_open');
    return res.json({ shop: r.data && r.data[0] });
  }
  if (b.action === 'setopen') {
    await db('barbershops?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ is_open: !!b.value }) });
    return res.json({ ok: true });
  }
  if (b.action === 'products') {
    const r = await db('products?select=id,name,price,image_url&order=created_at.desc');
    return res.json({ products: r.data || [] });
  }
  if (b.action === 'orders') {
    const r = await db(`orders?barbershop_id=eq.${id}&select=id,items,total,status,delivery_at,created_at&order=created_at.desc&limit=30`);
    return res.json({ orders: r.data || [] });
  }
  if (b.action === 'order') {
    const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
    if (!items.length) return bad(res, 400, "Savat bo'sh");
    const ids = [...new Set(items.map(i => String(i.id)))];
    if (ids.some(x => !UUID.test(x))) return bad(res, 400, "Noto'g'ri mahsulot");
    const open = await db(`orders?barbershop_id=eq.${id}&status=eq.yangi&select=id`);
    if (open.data && open.data.length >= 10) return bad(res, 429, "Kutilayotgan buyurtmalar ko'p, admin javobini kuting");
    const pr = await db(`products?id=in.(${ids.join(',')})&select=id,name,price`), P = Object.fromEntries((pr.data || []).map(x => [x.id, x]));
    const lines = {}; let total = 0;
    for (const it of items) {
      const q = Math.floor(Number(it.qty)), p = P[String(it.id)];
      if (!p || !(q >= 1 && q <= 999)) return bad(res, 400, "Mahsulot yoki miqdor noto'g'ri");
      lines[p.id] = lines[p.id] || { id: p.id, name: p.name, price: Number(p.price), qty: 0 };
      lines[p.id].qty += q; total += Number(p.price) * q;
    }
    const ins = await db('orders', { method: 'POST', body: JSON.stringify({ barbershop_id: id, items: Object.values(lines), total }) });
    return ins.ok ? res.json({ ok: true }) : bad(res, 500, "Buyurtmani yuborib bo'lmadi");
  }
  if (b.action === 'ocancel') {
    const oid = String(b.order || '');
    if (!UUID.test(oid)) return bad(res, 400, "Noto'g'ri id");
    await db(`orders?id=eq.${oid}&barbershop_id=eq.${id}&status=eq.yangi`, { method: 'PATCH', body: JSON.stringify({ status: 'bekor' }) });
    return res.json({ ok: true });
  }
  if (!TABLES[b.table]) return bad(res, 400, "Noto'g'ri so'rov");
  const tb = b.table, uid = String(b.id || '');
  const clean = o => { const r = { ...(o || {}) }; delete r.id; delete r.barbershop_id; delete r.created_at; return r; };
  if (b.action === 'list') {
    if (tb === 'queue') await sweep(id);
    const r = await db(`${tb}?barbershop_id=eq.${id}&select=*&order=created_at.desc&limit=500`);
    return res.json({ rows: r.data || [] });
  }
  if (b.action === 'add') {
    const r = await db(tb, { method: 'POST', body: JSON.stringify({ ...clean(b.row), barbershop_id: id }) });
    return r.ok ? res.json({ row: r.data[0] }) : bad(res, 400, "Saqlab bo'lmadi");
  }
  if (!UUID.test(uid)) return bad(res, 400, "Noto'g'ri id");
  if (b.action === 'update') {
    const r = await db(`${tb}?id=eq.${uid}&barbershop_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(clean(b.row)) });
    return r.ok ? res.json({ ok: true }) : bad(res, 400, "Saqlab bo'lmadi");
  }
  if (b.action === 'delete') {
    await db(`${tb}?id=eq.${uid}&barbershop_id=eq.${id}`, { method: 'DELETE' });
    return res.json({ ok: true });
  }
  bad(res, 400, "Noto'g'ri so'rov");
};
