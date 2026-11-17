/* 钱来 — 数据层（本地演示版：存在浏览器里；上线时把这一层换成后台接口即可）
   所有金额内部都用人民币元存，显示时换算成用户选的货币。 */
(function () {
  const QL = window.QL;
  const KEY = 'qianlai_v1', WEEK = 7 * 864e5;
  const CUR = {
    CNY: { sym: '¥', rate: 1, dec: 0, label: '人民币 CNY ¥' },
    USD: { sym: '$', rate: 0.14, dec: 2, label: 'US Dollar USD $' },
    EUR: { sym: '€', rate: 0.13, dec: 2, label: 'Euro EUR €' },
    GBP: { sym: '£', rate: 0.11, dec: 2, label: 'Pound GBP £' },
    JPY: { sym: 'JP¥', rate: 21.5, dec: 0, label: '日本円 JPY' },
    KRW: { sym: '₩', rate: 192, dec: 0, label: '원 KRW ₩' },
    HKD: { sym: 'HK$', rate: 1.09, dec: 2, label: '港幣 HKD HK$' },
  };
  const SLOTS = { wall: 7, table: 8, floor: 8, shelf: 8, wear: 8 };
  const SEG_MAX = [200, 500, 1000, 3000, Infinity];
  const SEG_RANGE = [[60, 200], [200, 500], [500, 1000], [1000, 3000], [3000, 12000]];
  const SEG_W = [0.22, 0.3, 0.25, 0.16, 0.07];
  const REF = { wall: 320, table: 240, floor: 900, shelf: 230, wear: 420 };
  const RH = { wall: 1.3, table: 0.9, floor: 2.0, shelf: 0.9, wear: 1.2 };

  let s = null, idb = null;
  const imgs = {}, seedMap = {};
  QL.SEED.products.forEach((p) => (seedMap[p.id] = p));

  function autoCur() {
    const l = (navigator.language || 'zh-CN').toLowerCase();
    if (l.startsWith('zh-hk')) return 'HKD';
    if (l.startsWith('zh')) return 'CNY';
    if (l.startsWith('ja')) return 'JPY';
    if (l.startsWith('ko')) return 'KRW';
    if (l === 'en-gb') return 'GBP';
    if (/^(de|fr|es|it|nl|pt-pt|fi|el|ga)/.test(l)) return 'EUR';
    return 'USD';
  }
  function fresh() {
    return { v: 1, user: null, set: { lang: QL.i18n.auto(), cur: autoCur(), theme: 'cream' }, w: { bal: 0, weekly: 0, last: 0, chg: 0, led: [] }, dec: {}, inv: [], lst: [], bump: {}, sold: {}, seq: 1, skew: 0, hide: {}, mod: { removed: {}, reports: [], banned: {} }, comments: [] };
  }
  const now = () => Date.now() + (s ? s.skew : 0);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }

  /* ---------- 图片（IndexedDB） ---------- */
  function openDB() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('qianlai', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('img');
        r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
  }
  function loadImgs() {
    return new Promise((res) => {
      if (!idb) return res();
      try {
        const rq = idb.transaction('img').objectStore('img').openCursor();
        rq.onsuccess = () => { const c = rq.result; if (c) { imgs[c.key] = c.value; c.continue(); } else res(); };
        rq.onerror = () => res();
      } catch (e) { res(); }
    });
  }
  function putImg(url) {
    const k = 'm' + (s.seq++); imgs[k] = url;
    try { if (idb) idb.transaction('img', 'readwrite').objectStore('img').put(url, k); } catch (e) { }
    return k;
  }

  /* ---------- 钱 ---------- */
  const cur = () => CUR[s.set.cur] || CUR.CNY;
  function num(base) {
    const c = cur(); let v = base * c.rate;
    const digits = (c.dec === 0 || Math.abs(v) >= 1000 || Math.abs(v - Math.round(v)) < 0.005) ? 0 : 2;
    v = digits ? Math.round(v * 100) / 100 : Math.round(v);
    return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  const fmt = (base) => (base < 0 ? '−' : '') + cur().sym + num(Math.abs(base));
  const toBase = (v) => v / cur().rate;
  const fromBase = (b) => { const v = b * cur().rate; return cur().dec === 0 ? Math.round(v) : Math.round(v * 100) / 100; };
  function compact(base) {
    const v = base * cur().rate;
    if (v >= 1000) return (Math.round(v / 100) / 10) + 'k';
    return String(v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));
  }
  function segLabel(i) {
    const sym = cur().sym;
    if (i === 0) return '<' + sym + compact(SEG_MAX[0]);
    if (i === 4) return sym + compact(SEG_MAX[3]) + '+';
    return compact(SEG_MAX[i - 1]) + '–' + compact(SEG_MAX[i]);
  }
  function dur(ms) {
    const t = QL.i18n.t; ms = Math.max(0, ms);
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.max(1, Math.round((ms % 36e5) / 6e4));
    if (d >= 1) return h ? t('dur_dh', { d, h }) : t('dur_d', { n: d });
    if (h >= 1) return t('dur_h', { n: h });
    return t('dur_m', { n: m });
  }

  /* ---------- 账号与钱包 ---------- */
  function login(email, name) {
    s.user = { email, name, char: (s.user && s.user.char) || { gender: 'f', outfit: 0, hair: 1, skin: 0 }, t: now() };
    save();
  }
  function setChar(ch) { if (s.user) { s.user.char = ch; save(); } }
  function setWeekly(base, first) {
    const t = now();
    if (first) { s.w.weekly = base; s.w.bal += base; s.w.last = t; s.w.chg = t; s.w.led.unshift({ t, k: 'first', a: base }); }
    else { s.w.weekly = base; s.w.chg = t; }
    save();
  }
  const canChange = () => now() - s.w.chg >= WEEK;
  function checkCredit() {
    if (!s.user || !s.w.weekly) return null;
    let n = 0;
    while (now() - s.w.last >= WEEK && n < 60) { s.w.last += WEEK; s.w.bal += s.w.weekly; s.w.led.unshift({ t: s.w.last, k: 'credit', a: s.w.weekly }); n++; }
    if (!n) return null;
    save(); return { n, amount: n * s.w.weekly };
  }

  /* ---------- 商品 ---------- */
  const product = (id) => seedMap[id] || s.lst.find((l) => l.id === id) || null;
  function stats(id) {
    const p = product(id); if (!p) return null;
    let v, b;
    if (p.mine) { v = p.stats.v; b = p.stats.b; } else { const bm = s.bump[id] || { v: 0, b: 0 }; v = p.base.v + bm.v; b = p.base.b + bm.b; }
    const intent = b * p.price, target = p.target || 0;
    return { v, b, intent, target, pct: target ? intent / target : 0, rate: v ? b / v : 0 };
  }
  function feed() {
    const front = [], rest = [];
    QL.SEED.products.forEach((p) => {
      const d = s.dec[p.id];
      if ((p.kind === 'used' && s.sold[p.id]) || s.mod.removed[p.id] || s.hide[p.id]) return;
      if (!d) rest.push(p);
      else if (d.d === 'wish' && s.w.bal >= p.price) front.push(p);
    });
    return front.concat(rest);
  }
  function freeSlot(cat) {
    const used = {};
    s.inv.forEach((i) => { const p = product(i.pid); if (p && p.cat === cat && i.slot >= 0) used[i.slot] = 1; });
    for (let k = 0; k < SLOTS[cat]; k++) if (!used[k]) return k;
    return -1;
  }
  function decide(id, kind) {
    const p = product(id), t = now(), before = stats(id);
    const bm = s.bump[id] || (s.bump[id] = { v: 0, b: 0 });
    if (!s.dec[id]) bm.v++;
    let inv = null;
    if (kind === 'buy') {
      s.w.bal -= p.price; s.w.led.unshift({ t, k: 'buy', a: -p.price, pid: id });
      bm.b++;
      inv = { id: 'i' + (s.seq++), pid: id, t, paid: p.price, slot: freeSlot(p.cat) };
      s.inv.push(inv);
      if (p.kind === 'used') s.sold[id] = 1;
    }
    s.dec[id] = { d: kind, t, price: p.price };
    const after = stats(id);
    save();
    return { p, kind, before, after, inv, reached: p.target > 0 && after.intent >= p.target, tipped: p.target > 0 && before.intent < p.target && after.intent >= p.target };
  }
  function setWtp(id, base) { if (s.dec[id]) { s.dec[id].wtp = base; save(); } }
  function redoByes() { Object.keys(s.dec).forEach((k) => { if (s.dec[k].d === 'bye') delete s.dec[k]; }); save(); }
  const wishes = () => Object.keys(s.dec).filter((k) => s.dec[k].d === 'wish').map(product).filter(Boolean);

  /* ---------- 房间 ---------- */
  function removeInv(id) {
    const i = s.inv.findIndex((x) => x.id === id); if (i < 0) return;
    const p = product(s.inv[i].pid); s.inv.splice(i, 1);
    if (p) s.inv.filter((x) => x.slot < 0 && (product(x.pid) || {}).cat === p.cat).sort((a, b) => a.t - b.t).forEach((x) => { const k = freeSlot(p.cat); if (k >= 0) x.slot = k; });
  }
  const defChar = { gender: 'f', outfit: 0, hair: 1, skin: 0 };
  function roomState() {
    return { me: true, name: s.user ? s.user.name : '', char: s.user ? s.user.char : defChar, theme: s.set.theme, items: s.inv.map((i) => ({ id: i.id, pid: i.pid, slot: i.slot })) };
  }
  function neighborRoom(id) {
    const n = QL.SEED.neighbors.find((x) => x.id === id), cnt = {};
    const items = n.items.map((pid, k) => { const p = seedMap[pid], c = (cnt[p.cat] = (cnt[p.cat] || 0)); cnt[p.cat]++; return { id: 'n' + k, pid, slot: c < SLOTS[p.cat] ? c : -1 }; });
    return { me: false, nid: id, name: QL.i18n.L(n.name), char: n.char, theme: n.theme, items };
  }
  const invValue = () => s.inv.reduce((a, i) => a + (i.paid || 0), 0);

  /* ---------- 我的上架 ---------- */
  function addListing(d) {
    const l = {
      id: 'L' + (s.seq++), mine: true, kind: d.kind, title: d.title, desc: d.desc || '', price: d.price, cat: d.cat, frame: !!d.frame, target: d.kind === 'new' ? (d.target || 0) : 0,
      art: d.art || null, pic: d.pic || null, sid: d.sid || null, img: (d.imgs || []).map(putImg), sticker: d.sticker ? putImg(d.sticker) : null, bg: d.bg || '#F3EEE6', rh: d.rh || RH[d.cat],
      seller: s.user ? s.user.name : '', t: now(), simT: now(), appeal: 0.75 + Math.random() * 0.75, ref: d.ref || 0,
      stats: { v: 0, b: 0, cant: 0, wtps: [], seg: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] }, hist: [], fromInv: d.fromInv || null, active: true, sold: false,
    };
    s.lst.unshift(l);
    if (l.fromInv) { const it = s.inv.find((x) => x.id === l.fromInv); if (it) it.listed = l.id; }
    save(); return l;
  }
  function reprice(id, price) {
    const l = product(id); if (!l || !l.mine) return;
    l.hist.unshift({ price: l.price, v: l.stats.v, b: l.stats.b, t: now() });
    l.price = price; l.simT = now();
    l.stats = { v: 0, b: 0, cant: 0, wtps: [], seg: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] };
    save();
  }
  function takeDown(id) {
    const l = product(id); if (!l || !l.mine) return;
    l.active = false;
    if (l.fromInv) { const it = s.inv.find((x) => x.id === l.fromInv); if (it) it.listed = null; }
    save();
  }
  function placeSample(id) {
    const l = product(id); if (!l) return null;
    const it = { id: 'i' + (s.seq++), pid: id, t: now(), paid: 0, slot: freeSlot(l.cat), sample: true };
    s.inv.push(it); save(); return it;
  }
  /* ---------- 举报与管理（本地演示版：只作用于这台设备的数据） ---------- */
  function migrate() { s.comments = s.comments || []; s.hide = s.hide || {}; s.mod = s.mod || {}; s.mod.removed = s.mod.removed || {}; s.mod.reports = s.mod.reports || []; s.mod.banned = s.mod.banned || {}; }
  function report(pid, reason) { s.mod.reports.unshift({ id: 'r' + (s.seq++), pid, reason, t: now(), by: s.user ? s.user.name : '', st: 'open' }); s.hide[pid] = 1; save(); }
  function adminRemove(pid, why) {
    s.mod.removed[pid] = { t: now(), why: why || '' };
    const l = s.lst.find((x) => x.id === pid);
    if (l) { l.active = false; l.removed = true; if (l.fromInv) { const it = s.inv.find((x) => x.id === l.fromInv); if (it) it.listed = null; } }
    s.mod.reports.forEach((r) => { if (r.pid === pid && r.st === 'open') r.st = 'removed'; });
    save();
  }
  function adminRestore(pid) { delete s.mod.removed[pid]; const l = s.lst.find((x) => x.id === pid); if (l) { l.removed = false; if (!l.sold) { l.active = true; l.simT = now(); } } save(); }
  function adminDismiss(rid) { const r = s.mod.reports.find((x) => x.id === rid); if (r) r.st = 'dismissed'; save(); }
  function setBan(uid, on) { if (on) s.mod.banned[uid] = now(); else delete s.mod.banned[uid]; save(); }
  /* ---------- 评论 ---------- */
  function demoComments(pid) {
    const nb = {}; QL.SEED.neighbors.forEach((n) => (nb[n.id] = n));
    return (QL.SEED.comments || []).map((c, i) => ({ c, i })).filter((x) => x.c.pid === pid && seedMap[pid]).map(({ c, i }) => {
      const n = nb[c.who] || {}; return { id: 'demo' + i, pid, name: QL.i18n.L(n.name), ch: n.char, d: c.d, body: QL.i18n.L(c.body), t: Date.now() - c.h * 36e5, demo: true };
    });
  }
  const demoCount = (pid) => (QL.SEED.comments || []).filter((c) => c.pid === pid && seedMap[pid]).length;
  function comments(pid) {
    const mine = s.comments.filter((c) => c.pid === pid && !c.removed).map((c) => Object.assign({}, c, { mine: true }));
    return Promise.resolve(mine.concat(demoComments(pid)).sort((a, b) => b.t - a.t));
  }
  function addComment(pid, body) {
    body = String(body || '').trim(); if (!body || body.length > 300) return Promise.reject(Object.assign(new Error('body'), { code: 'body' }));
    const p = product(pid), d = p && p.mine ? 'seller' : (s.dec[pid] && s.dec[pid].d) || null;
    const c = { id: 'c' + (s.seq++), pid, name: s.user ? s.user.name : '', ch: s.user ? s.user.char : null, d, body, t: now() };
    s.comments.push(c); save(); return Promise.resolve(Object.assign({ mine: true }, c));
  }
  function deleteComment(id) { const c = s.comments.find((x) => x.id === id); if (c) { c.removed = true; s.mod.reports.forEach((r) => { if (r.cid === id && r.st === 'open') r.st = 'removed'; }); save(); } return Promise.resolve(); }
  function reportComment(id, reason, pid) { s.mod.reports.unshift({ id: 'r' + (s.seq++), pid, cid: id, reason, t: now(), by: s.user ? s.user.name : '', st: 'open' }); save(); return Promise.resolve(); }
  const commentCount = (pid) => demoCount(pid) + s.comments.filter((c) => c.pid === pid && !c.removed).length;
  const nice = (x) => (x < 20 ? Math.max(1, Math.round(x)) : x < 100 ? Math.round(x / 5) * 5 : x < 1000 ? Math.round(x / 10) * 10 : Math.round(x / 100) * 100);
  const gauss = () => { let a = 0; for (let i = 0; i < 6; i++) a += Math.random(); return (a - 3) / 0.707; };
  function shopper(l) {
    const u = Math.random(); let seg = 0, acc = 0;
    for (; seg < 4; seg++) { acc += SEG_W[seg]; if (u < acc) break; }
    const R = SEG_RANGE[seg], budget = R[0] + Math.random() * (R[1] - R[0]);
    const ref = l.ref ? l.ref * 0.75 : REF[l.cat];
    const wtp = ref * l.appeal * Math.exp(gauss() * 0.75) * Math.pow(budget / 600, 0.4);
    if (wtp >= l.price) return l.price <= budget * (0.5 + Math.random() * 5) ? { seg, buy: true } : { seg, cant: true };
    return { seg, wtp: Math.random() < 0.4 ? nice(wtp) : 0 };
  }
  /* 模拟顾客看我的上架；顺便让演示商品的数字慢慢涨 */
  function simTick() {
    const t = now(), ev = [];
    s.lst.forEach((l) => {
      if (!l.active || l.sold || l.stats.v >= 900) return;
      let n = Math.floor((t - l.simT) / 3500); if (n <= 0) return;
      n = Math.min(n, 30); l.simT = t;
      for (let i = 0; i < n; i++) {
        const r = shopper(l); l.stats.v++; l.stats.seg[r.seg][0]++;
        if (r.buy && !(l.kind === 'used' && l.stats.v < 7)) {
          l.stats.b++; l.stats.seg[r.seg][1]++;
          if (l.kind === 'used') {
            l.sold = true; l.soldT = t; s.w.bal += l.price; s.w.led.unshift({ t, k: 'sale', a: l.price, pid: l.id });
            if (l.fromInv) removeInv(l.fromInv);
            ev.push({ type: 'sold', l }); break;
          }
        } else { if (r.cant) l.stats.cant++; if (r.wtp) l.stats.wtps.push(r.wtp); }
      }
    });
    if (Math.random() < 0.5) {
      const ps = QL.SEED.products.filter((p) => p.kind === 'new'), p = ps[(Math.random() * ps.length) | 0];
      const bm = s.bump[p.id] || (s.bump[p.id] = { v: 0, b: 0 }), k = 1 + ((Math.random() * 3) | 0);
      bm.v += k; if (Math.random() < (p.base.b / p.base.v) * k && !(p.id === 'beanie' && !s.dec.beanie)) bm.b++;
    }
    save(); return ev;
  }
  /* 换个价格大概会怎样（用留下的心理价估，偏保守） */
  function curve(l) {
    const st = l.stats, rows = [];
    if (!st.v) return rows;
    [0.85, 0.7, 0.5].forEach((k) => {
      const p = nice(l.price * k); if (p >= l.price) return;
      const extra = st.wtps.filter((w) => w >= p).length;
      rows.push({ price: p, pct: Math.round((st.b + st.cant * 0.5 + extra) / st.v * 100) });
    });
    return rows;
  }
  const median = (a) => { if (!a.length) return 0; const b = a.slice().sort((m, n) => m - n); return b[b.length >> 1]; };

  QL.store = {
    WEEK, CUR, SLOTS, RH,
    get s() { return s; },
    init() {
      try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
      if (!s || s.v !== 1) s = fresh();
      migrate();
      QL.i18n.set(s.set.lang);
      return openDB().then((db) => { idb = db; return loadImgs(); });
    },
    save, now, img: (k) => (k ? (/^(https?:|data:|img\/)/.test(k) ? k : imgs[k]) : ''), putImg,
    sym: () => cur().sym, num, fmt, toBase, fromBase, segLabel, dur,
    authed: () => !!(s.user && s.w.weekly), login, setChar, setWeekly, canChange,
    changeWait: () => s.w.chg + WEEK - now(), nextCredit: () => s.w.last + WEEK - now(), checkCredit,
    product, stats, feed, decide, setWtp, redoByes, wishes,
    snapshot: () => JSON.stringify(s), restore(j) { s = JSON.parse(j); save(); },
    report, adminRemove, adminRestore, adminDismiss, setBan,
    comments, addComment, deleteComment, reportComment, commentCount, demoComments, demoCount,
    /* 另一个标签页（比如管理后台）改了数据时，重新读一遍 */
    reload() { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && x.v === 1) { s = x; migrate(); QL.i18n.set(s.set.lang); } } catch (e) { } },
    reloadIf(e) { if (e.key !== KEY || !e.newValue) return false; this.reload(); return true; },
    roomState, neighborRoom, invValue, removeInv(id) { removeInv(id); save(); },
    addListing, reprice, takeDown, placeSample, simTick, curve, median,
    setLang(l) { s.set.lang = l; QL.i18n.set(l); save(); }, setCur(c) { s.set.cur = c; save(); }, setTheme(t) { s.set.theme = t; save(); },
    fastForward() { s.skew += WEEK; save(); },
    resetAll() {
      try { localStorage.removeItem(KEY); if (idb) idb.transaction('img', 'readwrite').objectStore('img').clear(); } catch (e) { }
      Object.keys(imgs).forEach((k) => delete imgs[k]); s = fresh(); migrate(); QL.i18n.set(s.set.lang);
    },
  };
})();
