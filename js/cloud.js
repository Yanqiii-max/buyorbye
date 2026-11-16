/* 钱来 — 联网版数据层（Supabase）
   没有填 config.js 时什么都不做，网站按本地演示版运行。
   填了之后，接管 store.js 里和“人、钱、买卖、上架、举报、管理”有关的函数；
   页面拿到的 S.s 结构和本地版一样，所以界面代码基本不用分两套。 */
(function () {
  const QL = window.QL, S = QL.store, C = QL.CONFIG || {};
  const WEEK = S.WEEK;
  const NB = { MOMO: 'momo', ASHU: 'ashu', LUCAS: 'lucas' }; // 演示邻居的串门码

  /* ---------- 两种模式都有的：串门码 ---------- */
  S.cloud = false;
  S.canUndo = () => true;
  S.myCode = function () {
    const s = S.s;
    if (!s.code) { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; s.code = Array.from({ length: 6 }, () => a[(Math.random() * a.length) | 0]).join(''); S.save(); }
    return s.code;
  };
  function demoRoom(code) { const id = NB[code]; return id ? S.neighborRoom(id) : null; }
  S.roomByCode = async function (code) {
    code = String(code || '').trim().toUpperCase();
    return demoRoom(code) || (code === S.myCode() ? { self: true } : null);
  };

  if (!C.url || !C.key || !window.supabase) return;

  /* ================= 联网版 ================= */
  S.cloud = true;
  const sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  QL.sb = sb;
  const seedMap = {}; QL.SEED.products.forEach((p) => (seedMap[p.id] = p));
  let me = null, off = {}, offLoaded = false, others = {}, remoteFeed = [], queue = [], lastPid = null, lastKind = null, feedAt = 0;
  const SEG0 = () => [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];

  /* 把数据库里的错误变成网页能认的代号 */
  const CODES = ['insufficient', 'sold', 'gone', 'banned', 'already', 'own', 'setup', 'wait', 'late', 'used', 'listed', 'limit', 'imgs', 'auth', 'weekly', 'name', 'title'];
  function err(e) {
    const m = String((e && (e.message || e.error_description)) || e || '');
    const x = new Error(m);
    x.code = CODES.find((c) => m.includes(c)) || (/rate|too many|seconds/i.test(m) ? 'rate' : /token|otp|expired|invalid/i.test(m) ? 'otp' : 'net');
    return x;
  }
  async function rpc(fn, args) { const { data, error } = await sb.rpc(fn, args || {}); if (error) throw err(error); return data; }
  /* 数据库里存图片路径，网页里用完整地址 */
  const PUB = '/storage/v1/object/public/uploads/';
  const pubURL = (path) => (path ? sb.storage.from('uploads').getPublicUrl(path).data.publicUrl : null);
  const toPath = (u) => { if (!u) return null; const i = u.indexOf(PUB); return i >= 0 ? decodeURIComponent(u.slice(i + PUB.length)) : u; };
  const ins1 = (r) => (Array.isArray(r.insights) ? r.insights[0] : r.insights) || null;
  function mapProd(r) {
    const i = ins1(r), old = others[r.id];
    const p = old || {};
    Object.assign(p, {
      id: r.id, remote: true, owner: r.owner, mine: !!(me && r.owner === me.id), kind: r.kind, cat: r.cat, price: +r.price, target: +r.target || 0,
      title: r.title, desc: r.descr || '', frame: !!r.frame, img: (r.imgs || []).map(pubURL), sticker: pubURL(r.sticker), art: r.art || null, pic: r.pic || null, sid: r.sid || null,
      bg: r.bg || '#F3EEE6', rh: +r.rh || S.RH[r.cat], ref: +r.ref || 0, seller: r.seller || '', t: Date.parse(r.created_at), fromInv: r.from_inv || null,
      active: r.active, sold: r.sold, removed: r.removed, v: r.v, b: r.b,
    });
    p.stats = { v: r.v, b: r.b, cant: i ? i.cant : 0, wtps: i ? (i.wtps || []).map(Number) : [], seg: i ? i.seg : SEG0() };
    p.hist = i ? (i.hist || []).map((h) => ({ price: +h.price, v: h.v, b: h.b, t: Date.parse(h.t) })) : [];
    return (others[r.id] = p);
  }
  async function fetchMissing(ids) {
    const need = Array.from(new Set(ids)).filter((id) => id && !seedMap[id] && !others[id]);
    if (!need.length) return;
    const { data } = await sb.from('products').select('*').in('id', need);
    (data || []).forEach(mapProd);
  }

  /* ---------- 读数据 ---------- */
  async function loadPublic() {
    const [o, l] = await Promise.all([
      sb.from('products').select('id,v,b,sold,removed,active').is('owner', null),
      sb.from('products').select('*').not('owner', 'is', null).eq('active', true).eq('removed', false).eq('sold', false).order('created_at', { ascending: false }).limit(300),
    ]);
    if (!o.error) { off = {}; (o.data || []).forEach((r) => (off[r.id] = r)); offLoaded = (o.data || []).length > 0; }
    if (!l.error) remoteFeed = (l.data || []).map(mapProd);
    feedAt = Date.now();
  }
  function blankUser(s) {
    Object.assign(s, { user: null, w: { bal: 0, weekly: 0, last: 0, chg: 0, led: [] }, dec: {}, inv: [], lst: [], bump: {}, sold: {}, skew: 0 });
    s.mod = { removed: {}, reports: [], banned: {} };
  }
  async function loadMe(user) {
    me = { id: user.id, email: user.email };
    let pr = (await sb.from('profiles').select('*').eq('id', me.id).maybeSingle()).data;
    if (!pr) { await rpc('claim_pay'); pr = (await sb.from('profiles').select('*').eq('id', me.id).maybeSingle()).data; }
    const [dec, inv, led, mine, adm] = await Promise.all([
      sb.from('decisions').select('pid,d,price,wtp,t').eq('user_id', me.id),
      sb.from('inventory').select('*').eq('user_id', me.id).order('t'),
      sb.from('ledger').select('*').eq('user_id', me.id).order('t', { ascending: false }).limit(80),
      sb.from('products').select('*, insights(*)').eq('owner', me.id).order('created_at', { ascending: false }),
      sb.rpc('am_i_admin'),
    ]);
    const s = S.s;
    blankUser(s);
    s.user = { email: me.email, name: pr.name, char: pr.ch, t: Date.parse(pr.created_at), code: pr.room_code };
    s.w = { bal: +pr.bal, weekly: +pr.weekly, last: Date.parse(pr.last_pay) || 0, chg: Date.parse(pr.weekly_changed) || 0, led: (led.data || []).map((e) => ({ t: Date.parse(e.t), k: e.k, a: +e.a, pid: e.pid })) };
    s.set.theme = pr.theme;
    (dec.data || []).forEach((d) => (s.dec[d.pid] = { d: d.d, t: Date.parse(d.t), price: +d.price, wtp: d.wtp == null ? undefined : +d.wtp }));
    s.inv = (inv.data || []).map((i) => ({ id: i.id, pid: i.pid, t: Date.parse(i.t), paid: +i.paid, slot: i.slot, sample: i.sample, listed: i.listed }));
    s.lst = (mine.data || []).map(mapProd);
    if (pr.banned) s.mod.banned.me = 1;
    S.isAdmin = !!adm.data;
    await fetchMissing(s.inv.map((i) => i.pid).concat(Object.keys(s.dec), s.w.led.map((e) => e.pid)));
    S.save();
  }

  /* ---------- 商品与刷卡 ---------- */
  const offOf = (id) => off[id] || { v: 0, b: 0 };
  S.product = (id) => seedMap[id] || others[id] || null;
  S.stats = function (id) {
    const p = S.product(id); if (!p) return null;
    let v, b;
    if (p.remote) { v = p.v; b = p.b; } else { const o = offOf(id); v = p.base.v + o.v; b = p.base.b + o.b; }
    const intent = b * p.price, target = p.target || 0;
    return { v, b, intent, target, pct: target ? intent / target : 0, rate: v ? b / v : 0 };
  };
  S.feed = function () {
    const s = S.s, front = [], users = [], official = [];
    const take = (p, arr) => {
      if (s.hide[p.id]) return;
      const d = s.dec[p.id];
      if (!d) arr.push(p); else if (d.d === 'wish' && s.w.bal >= p.price) front.push(p);
    };
    remoteFeed.forEach((p) => { if (p.active && !p.sold && !p.removed && !(me && p.owner === me.id)) take(p, users); });
    QL.SEED.products.forEach((p) => {
      const o = off[p.id];
      if (offLoaded && (!o || o.removed || o.sold || o.active === false)) return;
      take(p, official);
    });
    // 用户上架的新东西和官方商品交替出现，保证新东西有曝光
    const out = front.slice();
    while (users.length || official.length) { if (users.length) out.push(users.shift()); if (official.length) out.push(official.shift()); }
    if (Date.now() - feedAt > 90e3) loadPublic().catch(() => { });
    return out;
  };
  S.decide = async function (id, kind) {
    const p = S.product(id), before = S.stats(id);
    const data = await rpc('decide', { _pid: id, _kind: kind });
    const s = S.s, t = Date.now();
    lastPid = id; lastKind = kind;
    if (p.remote) { p.v = data.v; p.b = data.b; if (p.stats) { p.stats.v = data.v; p.stats.b = data.b; } }
    else off[id] = Object.assign({}, offOf(id), { v: data.v, b: data.b });
    let inv = null;
    if (kind === 'buy') {
      s.w.bal = +data.bal; s.w.led.unshift({ t, k: 'buy', a: -p.price, pid: id });
      inv = { id: data.inv, pid: id, t, paid: p.price, slot: data.slot }; s.inv.push(inv);
      if (p.kind === 'used') { if (p.remote) { p.sold = true; p.active = false; } else off[id] = Object.assign({}, offOf(id), { sold: true }); }
    }
    s.dec[id] = { d: kind, t, price: p.price };
    S.save();
    const after = S.stats(id);
    return { p, kind, before, after, inv, reached: p.target > 0 && after.intent >= p.target, tipped: p.target > 0 && before.intent < p.target && after.intent >= p.target };
  };
  S.canUndo = (r) => !(r && r.kind === 'buy' && r.p.kind === 'used');
  const localRestore = S.restore.bind(S);
  S.restore = function (j) {
    localRestore(j);
    const id = lastPid, k = lastKind; lastPid = null;
    if (!id) return;
    const p = S.product(id);
    if (k === 'buy' && p) { if (p.remote) { p.b = Math.max(0, p.b - 1); if (p.stats) p.stats.b = p.b; } else { const o = offOf(id); off[id] = Object.assign({}, o, { b: Math.max(0, o.b - 1) }); } }
    rpc('undo_decision', { _pid: id }).catch((e) => { QL.ui && QL.ui.toast(QL.i18n.t('err_' + e.code)); reloadMe(); });
  };
  S.setWtp = function (id, base) { if (S.s.dec[id]) { S.s.dec[id].wtp = base; S.save(); } rpc('set_wtp', { _pid: id, _amt: Math.round(base * 100) / 100 }).catch(() => { }); };
  S.redoByes = function () { const s = S.s; Object.keys(s.dec).forEach((k) => { if (s.dec[k].d === 'bye') delete s.dec[k]; }); S.save(); rpc('redo_byes').catch(() => { }); };
  S.report = function (pid, reason) { S.s.hide[pid] = 1; S.save(); return rpc('report_item', { _pid: pid, _reason: reason }); };

  /* ---------- 账号与钱包 ---------- */
  S.authed = () => !!(S.s.user && S.s.w.weekly > 0);
  S.myCode = () => (S.s.user && S.s.user.code) || '';
  S.sendCode = async function (email) {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw err(error);
  };
  S.verifyCode = async function (email, code) {
    const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw err(error);
    await Promise.all([loadMe(data.user), loadPublic().catch(() => { })]);
    return { isNew: !(S.s.w.weekly > 0) };
  };
  S.signOut = async function () { await sb.auth.signOut(); me = null; S.isAdmin = false; blankUser(S.s); S.save(); await loadPublic().catch(() => { }); };
  S.setup = async function (name, ch, weekly) { await rpc('setup', { _name: name, _ch: ch, _weekly: Math.round(weekly * 100) / 100 }); await loadMe({ id: me.id, email: me.email }); };
  S.setChar = function (ch) { if (!S.s.user) return; S.s.user.char = ch; S.save(); sb.from('profiles').update({ ch }).eq('id', me.id).then(() => { }); };
  S.setName = function (name) { if (!S.s.user) return; S.s.user.name = name; S.save(); sb.from('profiles').update({ name }).eq('id', me.id).then(() => { }); };
  const localTheme = S.setTheme.bind(S);
  S.setTheme = function (th) { localTheme(th); if (me) sb.from('profiles').update({ theme: th }).eq('id', me.id).then(() => { }); };
  S.setWeekly = async function (base) { await rpc('set_weekly', { _weekly: Math.round(base * 100) / 100 }); S.s.w.weekly = base; S.s.w.chg = Date.now(); S.save(); };
  S.checkCredit = async function () {
    if (!me || !(S.s.w.weekly > 0)) return null;
    const r = await rpc('claim_pay');
    if (!r || !r.n) return null;
    const w = S.s.w; w.bal += +r.amount; w.last += r.n * WEEK; w.led.unshift({ t: Date.now(), k: 'credit', a: +r.amount }); S.save();
    return { n: r.n, amount: +r.amount };
  };
  S.fastForward = () => { };

  /* ---------- 上架 ---------- */
  async function upload(u) {
    if (!u) return null;
    if (!/^data:/.test(u)) return toPath(u);   // 转卖别人上传过的图：沿用原来的文件
    const blob = await (await fetch(u)).blob();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const rid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
    const path = `${me.id}/${rid}.${ext}`;
    const { error } = await sb.storage.from('uploads').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' });
    if (error) throw err(error);
    return path;
  }
  S.addListing = async function (d) {
    if (!me) throw err('auth');
    const imgs = []; for (const u of d.imgs || []) imgs.push(await upload(u));
    const sticker = await upload(d.sticker);
    const row = await rpc('publish', { d: { kind: d.kind, cat: d.cat, price: d.price, target: d.target || 0, title: d.title, desc: d.desc || '', frame: !!d.frame, imgs, sticker, art: d.art || null, pic: d.pic || null, sid: d.sid || null, bg: d.bg || null, rh: d.rh || null, ref: d.ref || 0, from_inv: d.fromInv || null } });
    const l = mapProd(row);
    S.s.lst.unshift(l);
    if (l.fromInv) { const it = S.s.inv.find((x) => x.id === l.fromInv); if (it) it.listed = l.id; }
    S.save(); return l;
  };
  S.reprice = async function (id, price) {
    await rpc('reprice', { _pid: id, _price: Math.round(price * 100) / 100 });
    const l = S.product(id); if (!l) return;
    l.hist.unshift({ price: l.price, v: l.v, b: l.b, t: Date.now() });
    l.price = price; l.v = l.b = 0; l.stats = { v: 0, b: 0, cant: 0, wtps: [], seg: SEG0() };
  };
  S.takeDown = async function (id) {
    await rpc('take_down', { _pid: id });
    const l = S.product(id); if (!l) return; l.active = false;
    S.s.inv.forEach((it) => { if (it.listed === id) it.listed = null; }); S.save();
  };
  S.placeSample = async function (id) {
    const r = await rpc('place_sample', { _pid: id });
    const it = { id: r.id, pid: id, t: Date.now(), paid: 0, slot: r.slot, sample: true };
    S.s.inv.push(it); S.save(); return it;
  };

  /* ---------- 定时同步：我的上架数据、闲置卖出、余额 ---------- */
  async function reloadMe() { if (me) { try { await loadMe({ id: me.id, email: me.email }); } catch (e) { } } }
  async function poll() {
    if (!me || document.hidden) return;
    const before = {}; S.s.lst.forEach((l) => (before[l.id] = l.sold));
    const { data, error } = await sb.from('products').select('*, insights(*)').eq('owner', me.id).order('created_at', { ascending: false });
    if (error) return;
    const sold = [];
    S.s.lst = (data || []).map((r) => { const l = mapProd(r); if (l.sold && before[l.id] === false) sold.push(l); return l; });
    if (sold.length) { await reloadMe(); sold.forEach((l) => queue.push({ type: 'sold', l })); }
    else { const pr = (await sb.from('profiles').select('bal').eq('id', me.id).maybeSingle()).data; if (pr) S.s.w.bal = +pr.bal; }
    S.save();
  }
  setInterval(() => poll().catch(() => { }), 15000);
  S.simTick = () => queue.splice(0);

  /* ---------- 串门 ---------- */
  S.roomByCode = async function (code) {
    code = String(code || '').trim().toUpperCase();
    const d = demoRoom(code); if (d) return d;
    if (S.s.user && code === S.s.user.code) return { self: true };
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return null;
    const r = await rpc('room_by_code', { _code: code });
    if (!r) return null;
    await fetchMissing(r.items.map((i) => i.pid));
    return { me: false, code: r.code, name: r.name, char: r.ch, theme: r.theme, items: r.items.filter((i) => S.product(i.pid)).map((i) => ({ id: i.id, pid: i.pid, slot: i.slot })) };
  };

  /* ---------- 管理后台 ---------- */
  S.adminLoad = async function () {
    const [u, l, o, r] = await Promise.all([
      rpc('admin_users'),
      sb.from('products').select('*, insights(*)').not('owner', 'is', null).order('created_at', { ascending: false }).limit(2000),
      sb.from('products').select('id,v,b,sold,removed,active').is('owner', null),
      sb.from('reports').select('*').order('t', { ascending: false }).limit(1000),
    ]);
    if (l.error || o.error || r.error) throw err(l.error || o.error || r.error);
    (o.data || []).forEach((x) => (off[x.id] = x));
    const users = (u || []).map((x) => ({ id: x.id, name: x.name || '（还没起名）', email: x.email, t: Date.parse(x.created_at), weekly: +x.weekly, bought: x.bought, listed: x.listed, char: x.ch, demo: false, banned: x.banned, code: x.code }));
    const names = {}; users.forEach((x) => (names[x.id] = x.name));
    const listings = (l.data || []).map(mapProd);
    const removed = {}; listings.forEach((p) => { if (p.removed) removed[p.id] = 1; }); (o.data || []).forEach((x) => { if (x.removed) removed[x.id] = 1; });
    return {
      users, removed, products: listings.concat(QL.SEED.products),
      reports: (r.data || []).map((x) => ({ id: x.id, pid: x.pid, reason: x.reason, t: Date.parse(x.t), by: names[x.by_user] || '', st: x.st })),
    };
  };
  S.adminAct = {
    remove: (pid) => rpc('admin_remove', { _pid: pid }),
    restore: (pid) => rpc('admin_restore', { _pid: pid }),
    dismiss: (id) => rpc('admin_dismiss', { _id: id }),
    ban: (uid, on) => rpc('admin_ban', { _uid: uid, _on: on }),
  };

  /* ---------- 启动 ---------- */
  const localInit = S.init.bind(S);
  S.init = async function () {
    await localInit();
    blankUser(S.s); S.s.hide = S.s.hide || {};
    try { await loadPublic(); } catch (e) { }
    try { const { data } = await sb.auth.getSession(); if (data && data.session) await loadMe(data.session.user); } catch (e) { console.warn(e); }
  };
})();
