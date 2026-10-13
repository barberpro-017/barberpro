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
module.exports = { crypto, admin, db, tg, host };
