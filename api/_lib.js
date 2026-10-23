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
function verifyInit(initData, token, maxAge = 86400) {
  const p = new URLSearchParams(initData), hash = p.get('hash');
  if (!hash) return null; p.delete('hash');
  const str = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + '=' + v).join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const h = crypto.createHmac('sha256', key).update(str).digest('hex');
  if (h.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > maxAge) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
const ADMIN_CODE = process.env.ADMIN_AGENT_CODE || 'zdrrgb12';
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const asign = p => crypto.createHmac('sha256', SK).update('agent:' + p).digest('base64url');
const mkAgent = id => { const p = Buffer.from(JSON.stringify({ a: id, exp: Date.now() + 12 * 3600e3 })).toString('base64url'); return p + '.' + asign(p); };
function verAgent(t) {
  const [p, s] = String(t || '').split('.'); if (!p || !s) return null;
  if (!eq(asign(p), s)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url')); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
}
// Admin (Supabase JWT, 3 qism) yoki agent (o'z tokeni, 2 qism). Agent hech qachon admin huquqini olmaydi.
async function who(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  if (t.split('.').length === 2) {
    const o = verAgent(t); if (!o || !/^[0-9a-f-]{36}$/.test(String(o.a))) return null;
    const r = await db('agents?id=eq.' + o.a + '&select=id,login,agent_code');
    return r.data && r.data[0] ? { role: 'agent', agent: r.data[0] } : null;
  }
  return (await admin(req)) ? { role: 'admin' } : null;
}
function hashPw(pw) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex'); }
function checkPw(pw, stored) {
  const [salt, h] = String(stored || ':').split(':'), x = crypto.scryptSync(String(pw), salt || 'x', 64);
  return !!h && h.length === x.length * 2 && crypto.timingSafeEqual(x, Buffer.from(h, 'hex'));
}
module.exports = { crypto, admin, db, tg, host, sweep, verifyInit, dayStartISO, ADMIN_CODE, eq, mkAgent, who, hashPw, checkPw };
