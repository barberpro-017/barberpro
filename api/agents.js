const { admin, db, hashPw, ADMIN_CODE } = require('./_lib');
const bad = (res, c, m) => res.status(c).json({ error: m }), UUID = /^[0-9a-f-]{36}$/;
const LOGIN = /^[a-z0-9._-]{3,32}$/, CODE = /^[A-Za-z0-9._-]{4,32}$/;
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await admin(req))) return bad(res, 401, "Ruxsat yo'q");
  const b = req.body || {};
  if (b.action === 'list') {
    const [a, s] = await Promise.all([db('agents?select=id,login,agent_code,created_at&order=created_at.asc'), db('barbershops?agent_id=not.is.null&select=id,name,address,agent_id,created_at,sub_until')]);
    const shops = s.data || [], by = Object.fromEntries(shops.map(x => [x.id, x.agent_id]));
    const p = shops.length ? await db(`payments?barbershop_id=in.(${shops.map(x => x.id).join(',')})&select=barbershop_id,amount,plan,paid_at&limit=5000`) : { data: [] };
    return res.json({ agents: a.data || [], shops, pay: (p.data || []).map(x => ({ agent_id: by[x.barbershop_id], shop: x.barbershop_id, amount: x.amount, plan: x.plan, paid_at: x.paid_at })) });
  }
  if (b.action === 'delete') {
    if (!UUID.test(String(b.id || ''))) return bad(res, 400, "Noto'g'ri id");
    await db('agents?id=eq.' + b.id, { method: 'DELETE' });
    return res.json({ ok: true });
  }
  const login = String(b.login || '').trim().toLowerCase(), code = String(b.code || '').trim();
  if (!LOGIN.test(login)) return bad(res, 400, "Login 3-32 belgi: kichik harf, raqam, nuqta, chiziq");
  if (!CODE.test(code) || code === ADMIN_CODE) return bad(res, 400, "Agent code kamida 4 belgi bo'lsin va band bo'lmasin");
  if (b.action === 'create') {
    if (String(b.password || '').length < 6) return bad(res, 400, "Parol kamida 6 belgi bo'lsin");
    const r = await db('agents', { method: 'POST', body: JSON.stringify({ login, password_hash: hashPw(b.password), agent_code: code }) });
    return r.ok ? res.json({ ok: true }) : bad(res, r.status === 409 ? 409 : 500, r.status === 409 ? 'Bu login yoki agent code band' : "Saqlab bo'lmadi");
  }
  if (b.action === 'update') {
    if (!UUID.test(String(b.id || ''))) return bad(res, 400, "Noto'g'ri id");
    const patch = { login, agent_code: code };
    if (b.password) { if (String(b.password).length < 6) return bad(res, 400, "Parol kamida 6 belgi bo'lsin"); patch.password_hash = hashPw(b.password); }
    const r = await db('agents?id=eq.' + b.id, { method: 'PATCH', body: JSON.stringify(patch) });
    if (r.ok) await db('barbershops?agent_id=eq.' + b.id, { method: 'PATCH', body: JSON.stringify({ agent_code: code }) });
    return r.ok ? res.json({ ok: true }) : bad(res, r.status === 409 ? 409 : 500, r.status === 409 ? 'Bu login yoki agent code band' : "Saqlab bo'lmadi");
  }
  bad(res, 400, "Noto'g'ri so'rov");
};
