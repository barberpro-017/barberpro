const { crypto, db, tg, sweep, dayStartISO } = require('./_lib');
const UUID = /^[0-9a-f-]{36}$/;
function verify(initData, token) {
  const p = new URLSearchParams(initData), hash = p.get('hash');
  if (!hash) return null; p.delete('hash');
  const str = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + '=' + v).join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const h = crypto.createHmac('sha256', key).update(str).digest('hex');
  if (h.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 3 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
const bad = (res, c, m) => res.status(c).json({ error: m });
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  const cb = await db('client_bot?id=eq.1&select=bot_token');
  const token = cb.data && cb.data[0] && cb.data[0].bot_token;
  if (!token) return bad(res, 503, 'Xizmat hozircha ishlamayapti');
  const user = verify(String(b.initData || ''), token);
  if (!user) return bad(res, 401, 'Iltimos, ilovani Telegram bot orqali qayta oching');
  if (b.action === 'shops') {
    await sweep();
    const d = new Date(Date.now() + 5 * 3600e3);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 5 * 3600e3).toISOString();
    const [s, q] = await Promise.all([
      db('barbershops?select=id,name,address,barber_name,phone,sub_until,is_open&order=name'),
      db('queue?status=in.(kutilmoqda,jarayonda)&at=gte.' + encodeURIComponent(start) + '&select=barbershop_id,duration_min')]);
    const today = new Date().toISOString().slice(0, 10), Q = q.data || [];
    const shops = (s.data || []).filter(x => !x.sub_until || x.sub_until >= today).map(x => {
      const w = Q.filter(y => y.barbershop_id === x.id);
      return { id: x.id, name: x.name, region: x.address, barber: x.barber_name, phone: x.phone, open: !!x.is_open, count: w.length, minutes: w.reduce((a, y) => a + (y.duration_min || 30), 0) };
    });
    return res.json({ shops });
  }
  if (b.action === 'orders') {
    await sweep();
    const start = dayStartISO();
    const mine = await db(`queue?client_tg_id=eq.${user.id}&at=gte.${encodeURIComponent(start)}&select=id,barbershop_id,service_name,price,duration_min,at,rank_at,status,note,delayed&order=at.asc&limit=30`);
    const M = mine.data || [];
    if (!M.length) return res.json({ orders: [] });
    const list = '(' + [...new Set(M.map(x => x.barbershop_id))].join(',') + ')';
    const [sh, wq] = await Promise.all([
      db(`barbershops?id=in.${list}&select=id,name,barber_name,phone,is_open`),
      db(`queue?barbershop_id=in.${list}&status=in.(kutilmoqda,jarayonda)&at=gte.${encodeURIComponent(start)}&select=id,barbershop_id,at,rank_at,duration_min`)]);
    const S = Object.fromEntries((sh.data || []).map(x => [x.id, x])), W = wq.data || [], key = x => new Date(x.rank_at || x.at).getTime(), now = Date.now();
    const orders = M.map(o => {
      const sp = S[o.barbershop_id] || {};
      let ahead = null, minutes = null;
      if (['sorov', 'kutilmoqda', 'jarayonda'].includes(o.status)) {
        const k = o.status === 'sorov' ? new Date(o.at).getTime() : key(o);
        const before = W.filter(x => x.barbershop_id === o.barbershop_id && x.id !== o.id && key(x) < k);
        ahead = before.length;
        minutes = Math.max(before.reduce((a, x) => a + (x.duration_min || 30), 0), Math.ceil((new Date(o.at).getTime() - now) / 60000), 0);
      }
      return { id: o.id, shop: sp.name || '', barber: sp.barber_name || '', phone: sp.phone || '', service: o.service_name, price: o.price, duration: o.duration_min || 30, at: o.at, status: o.status, note: o.note, delayed: o.delayed, ahead, minutes };
    });
    return res.json({ orders });
  }
  if (b.action === 'cancel') {
    const oid = String(b.order || '');
    if (!UUID.test(oid)) return bad(res, 400, "Noto'g'ri so'rov");
    await db(`queue?id=eq.${oid}&client_tg_id=eq.${user.id}&status=in.(sorov,kutilmoqda)`, { method: 'PATCH', body: JSON.stringify({ status: 'bekor' }) });
    return res.json({ ok: true });
  }
  const id = String(b.id || '');
  if (!UUID.test(id)) return bad(res, 400, "Noto'g'ri so'rov");
  if (b.action === 'shop') {
    const r = await db(`services?barbershop_id=eq.${id}&select=id,name,price,duration_min&order=created_at`);
    return res.json({ services: r.data || [] });
  }
  if (b.action === 'book') {
    const sid = String(b.service || '');
    if (!UUID.test(sid)) return bad(res, 400, 'Xizmatni tanlang');
    const phone = String(b.phone || '').trim();
    if (phone && !/^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(phone)) return bad(res, 400, "Telefon raqami noto'g'ri");
    const tm = String(b.time || '');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(tm)) return bad(res, 400, 'Soatni belgilang');
    const tz = new Date(Date.now() + 5 * 3600e3), atMs = Date.UTC(tz.getUTCFullYear(), tz.getUTCMonth(), tz.getUTCDate(), +tm.slice(0, 2) - 5, +tm.slice(3));
    if (atMs < Date.now() - 60000) return bad(res, 400, "Bu vaqt o'tib ketgan, keyinroq soat tanlang");
    const sh = await db('barbershops?id=eq.' + id + '&select=is_open,sub_until'), shp = sh.data && sh.data[0];
    if (!shp) return bad(res, 404, 'Sartaroshxona topilmadi');
    if (!shp.is_open) return bad(res, 400, 'Sartaroshxona hozir yopiq');
    const sv = await db(`services?id=eq.${sid}&barbershop_id=eq.${id}&select=name,price,duration_min`);
    const svc = sv.data && sv.data[0];
    if (!svc) return bad(res, 404, 'Xizmat topilmadi');
    const open = await db(`queue?barbershop_id=eq.${id}&client_tg_id=eq.${user.id}&status=in.(sorov,kutilmoqda,jarayonda)&select=id`);
    if (open.data && open.data.length >= 2) return bad(res, 429, "Sizda bu sartaroshxonada faol navbat bor");
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Mijoz', note = String(b.note || '').trim().slice(0, 300);
    const ins = await db('queue', { method: 'POST', body: JSON.stringify({ barbershop_id: id, client_name: name, phone: phone || null, service_name: svc.name, price: svc.price, duration_min: svc.duration_min, note: note || null, status: 'sorov', source: 'client', client_tg_id: user.id, at: new Date(atMs).toISOString() }) });
    if (!ins.ok) return bad(res, 500, "So'rovni yuborib bo'lmadi");
    const [sec, ch] = await Promise.all([db('barbershop_secrets?barbershop_id=eq.' + id + '&select=bot_token'), db('bot_chats?barbershop_id=eq.' + id + '&select=chat_id')]);
    const bt = sec.data && sec.data[0] && sec.data[0].bot_token;
    if (bt) {
      const text = `🆕 Yangi navbat so'rovi\n👤 ${name}\n✂️ ${svc.name} · ${Number(svc.price).toLocaleString('ru-RU')} so'm · ${svc.duration_min} daqiqa\n🕒 Keladi: ${tm}${note ? '\n💬 ' + note : ''}\n\nPanelda "Navbatlar" bo'limini oching.`;
      await Promise.all((ch.data || []).map(c => tg(bt, 'sendMessage', { chat_id: c.chat_id, text })));
    }
    return res.json({ ok: true });
  }
  bad(res, 400, "Noto'g'ri so'rov");
};
