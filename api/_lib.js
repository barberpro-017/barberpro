const crypto = require('crypto');
const SB = process.env.SUPABASE_URL, SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function admin(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  const r = await fetch(SB + '/auth/v1/user', { headers: { apikey: SK, Authorization: 'Bearer ' + t } });
  return r.ok ? r.json() : null;
}
async function db(path, opt = {}) {
  const r = await fetch(SB + '/rest/v1/' + path, { ...opt, headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) } });
  const t = await r.text();
  let data = null; try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
  return { ok: r.ok, status: r.status, data };
}
const tg = (token, m, body) => fetch(`https://api.telegram.org/bot${token}/${m}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(r => r.json()).catch(() => ({ ok: false }));
const host = req => req.headers['x-forwarded-host'] || req.headers.host;
const GRACE_MIN = 10, enc = encodeURIComponent;
function dayStartISO() { const d = new Date(Date.now() + 5 * 3600e3); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 5 * 3600e3).toISOString(); }
// Belgilangan vaqtda kelmagan mijoz navbatda 1 ta pastga tushadi (bir marta)
async function sweep(shopId) {
  const start = dayStartISO(), lim = new Date(Date.now() - GRACE_MIN * 60000).toISOString();
  let p = `queue?status=eq.kutilmoqda&source=eq.client&delayed=eq.0&at=gte.${enc(start)}&at=lt.${enc(lim)}&select=id,barbershop_id,client_tg_id&order=at.asc`;
  if (shopId) p += '&barbershop_id=eq.' + shopId;
  const late = await db(p);
  if (!late.ok || !Array.isArray(late.data) || !late.data.length) return;
  const cb = await db('client_bot?id=eq.1&select=bot_token'), ct = cb.data && cb.data[0] && cb.data[0].bot_token, cache = {};
  const key = x => new Date(x.rank_at || x.at).getTime();
  for (const L of late.data) {
    const sid = L.barbershop_id;
    if (!cache[sid]) { const r = await db(`queue?barbershop_id=eq.${sid}&status=eq.kutilmoqda&at=gte.${enc(start)}&select=id,at,rank_at`); cache[sid] = r.data || []; }
    const list = cache[sid].sort((a, b) => key(a) - key(b)), i = list.findIndex(x => x.id === L.id);
    if (i < 0 || i === list.length - 1) continue;
    const N = list[i + 1], lk = new Date(key(list[i])).toISOString(), nk = new Date(key(N)).toISOString();
    await Promise.all([db('queue?id=eq.' + L.id, { method: 'PATCH', body: JSON.stringify({ rank_at: nk, delayed: 1 }) }), db('queue?id=eq.' + N.id, { method: 'PATCH', body: JSON.stringify({ rank_at: lk }) })]);
    list[i].rank_at = nk; N.rank_at = lk;
    if (ct && L.client_tg_id) await tg(ct, 'sendMessage', { chat_id: L.client_tg_id, text: "⏰ Siz belgilangan vaqtda kelmadingiz, shuning uchun navbatingiz 1 ta pastga tushdi." });
  }
}
module.exports = { crypto, admin, db, tg, host, sweep };
