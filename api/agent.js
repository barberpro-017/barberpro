const { db, who, mkAgent, checkPw } = require('./_lib');
const enc = encodeURIComponent, bad = (res, c, m) => res.status(c).json({ error: m });
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.action === 'login') {
    const login = String(b.login || '').trim().toLowerCase().slice(0, 64), gen = "Login yoki parol noto'g'ri";
    if (!login) return bad(res, 401, gen);
    const r = await db('agents?login=eq.' + enc(login) + '&select=id,password_hash,agent_code'), a = r.data && r.data[0];
    const fk = 'agent_login_fails?login=eq.' + enc(login);
    let fr = null;
    if (a) {
      const f = await db(fk + '&select=fails,locked_until'); fr = f.data && f.data[0];
      if (fr && fr.locked_until && new Date(fr.locked_until) > new Date())
        return bad(res, 429, `Juda ko'p urinish. ${Math.ceil((new Date(fr.locked_until) - Date.now()) / 60000)} daqiqadan so'ng urinib ko'ring`);
    }
    const ok = checkPw(String(b.password || ''), a && a.password_hash);
    if (!a || !ok) {
      if (a) {
        const fails = ((fr && fr.fails) || 0) + 1;
        await db('agent_login_fails?on_conflict=login', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ login, fails: fails >= 5 ? 0 : fails, locked_until: fails >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null }) });
      }
      return bad(res, 401, gen);
    }
    if (fr) await db(fk, { method: 'DELETE' });
    return res.json({ token: mkAgent(a.id), login, code: a.agent_code });
  }
  const w = await who(req);
  if (!w || w.role !== 'agent') return bad(res, 401, 'Qayta kiring');
  const aid = w.agent.id;
  const sh = await db(`barbershops?agent_id=eq.${aid}&select=id,name,address,phone,barber_name,login,bot_username,sub_until,created_at&order=created_at.desc`);
  const shops = sh.data || [], ids = shops.map(x => x.id).join(',');
  if (b.action === 'shops') return res.json({ shops });
  if (b.action === 'payments') {
    const p = ids ? await db(`payments?barbershop_id=in.(${ids})&select=*&order=paid_at.desc&limit=500`) : { data: [] };
    return res.json({ shops, pays: p.data || [] });
  }
  if (b.action === 'analytics') {
    if (!ids) return res.json({ shops, queue: [], tx: [], payments: [] });
    const [q, t, p] = await Promise.all([
      db(`queue?barbershop_id=in.(${ids})&select=barbershop_id,service_name,price,status,at&limit=5000`),
      db(`transactions?barbershop_id=in.(${ids})&select=barbershop_id,type,amount,created_at&limit=5000`),
      db(`payments?barbershop_id=in.(${ids})&select=amount,plan,paid_at&limit=5000`)]);
    return res.json({ shops, queue: q.data || [], tx: t.data || [], payments: p.data || [] });
  }
  if (b.action === 'store') {
    const [pr, o] = await Promise.all([db('products?select=id,name,price,image_url,category,description&order=created_at.desc'),
      ids ? db(`orders?barbershop_id=in.(${ids})&select=id,barbershop_id,items,total,status,delivery_at,created_at,note&order=created_at.desc&limit=300`) : { data: [] }]);
    return res.json({ shops: shops.map(x => ({ id: x.id, name: x.name, address: x.address })), orders: o.data || [], products: pr.data || [] });
  }
  bad(res, 400, "Noto'g'ri so'rov");
};
