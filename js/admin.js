/* 钱来 — 管理后台
   本地演示版：读写这台设备浏览器里的数据。联网版：管理员邮箱登录后，看所有人的数据（权限由数据库检查）。 */
(function () {
  const QL = window.QL, S = QL.store, G = QL.gfx;
  const L = (o) => QL.i18n.L(o);
  const $ = (q, el) => (el || document).querySelector(q);
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CAT = { wall: '墙上', table: '桌上', floor: '地上', shelf: '书架', wear: '衣柜' };
  const REASON = { illegal: '违法违禁', porn: '色情低俗', ip: '盗图或侵权', fake: '虚假信息', other: '其他' };
  const date = (t) => (t ? new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  let tab = 'home', filter = 'all', q = '', D = null;

  /* 数据来源：本地版直接读浏览器里的数据，联网版向服务器要 */
  function localData() {
    const s = S.s, users = [];
    if (s.user) users.push({ id: 'me', name: s.user.name, email: s.user.email, t: s.user.t, weekly: s.w.weekly, bought: s.inv.filter((i) => !i.sample).length, listed: s.lst.length, char: s.user.char, demo: false, banned: !!s.mod.banned.me });
    return { users, products: s.lst.concat(QL.SEED.products), reports: s.mod.reports, removed: s.mod.removed };
  }
  function withDemo(d) {
    QL.SEED.neighbors.forEach((n) => d.users.push({ id: n.id, name: L(n.name), email: '（演示邻居，没有邮箱）', t: 0, weekly: 0, bought: n.items.length, listed: 0, char: n.char, demo: true, code: n.code }));
    return d;
  }
  function load() {
    if (!S.cloud) { D = withDemo(localData()); return Promise.resolve(); }
    return S.adminLoad().then((d) => { D = withDemo(d); });
  }
  function act(kind, arg, on) {
    if (!S.cloud) {
      S.reload(); // 先读最新的，避免盖掉网站那边刚存的东西
      if (kind === 'remove') S.adminRemove(arg); else if (kind === 'restore') S.adminRestore(arg); else if (kind === 'dismiss') S.adminDismiss(arg);
      else S.setBan(arg, on);
      return load();
    }
    return S.adminAct[kind](arg, on).then(load);
  }

  const thumb = (p) => `<div class="thumb ${p.art || p.pic ? '' : 'photo'}" style="background:${p.bg || '#F3EEE6'}" data-view="${p.id}"><img src="${G.cardURL(p)}" alt=""></div>`;
  const all = () => D.products;
  const removed = (p) => !!D.removed[p.id];
  const openReports = () => D.reports.filter((r) => r.st === 'open');
  const reportedIds = () => { const m = {}; openReports().forEach((r) => (m[r.pid] = 1)); return m; };
  const users = () => D.users;

  function renderTabs() {
    const n = openReports().length;
    $('#tabs').innerHTML = [['home', '概览'], ['products', '商品'], ['users', '用户'], ['reports', '举报']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}${k === 'reports' && n ? `<b>${n}</b>` : ''}</button>`).join('');
  }
  function productRow(p) {
    const st = S.stats(p.id), off = removed(p), rep = reportedIds()[p.id];
    const own = p.mine || p.owner, status = off ? '<span class="tag bad">已下架</span>' : own && p.sold ? '<span class="tag ok">已卖出</span>' : own && !p.active ? '<span class="tag">卖家自己下架</span>' : rep ? '<span class="tag gold">被举报</span>' : '<span class="tag ok">展示中</span>';
    return `<div class="row p-row ${off ? 'off' : ''}">${thumb(p)}
      <div><div class="t">${esc(L(p.title))}</div><div class="s"><span class="m">${S.fmt(p.price)} · ${esc(L(p.seller))} · </span>${p.kind === 'used' ? '闲置' : '新品测价'} · ${CAT[p.cat]} · 曝光 ${st.v.toLocaleString('en-US')} · 想买 ${st.b.toLocaleString('en-US')}</div></div>
      <div class="num c3">${S.fmt(p.price)}</div>
      <div class="c4"><div class="t" style="font-weight:600">${esc(L(p.seller))}</div><div class="s">${own ? '用户上传 · ' + date(p.t) : '内置演示商品'}</div></div>
      <div class="c5">${status}</div>
      <div>${off ? `<button class="act" data-restore="${p.id}">恢复</button>` : `<button class="act del" data-remove="${p.id}">下架</button>`}</div></div>`;
  }
  function viewHome() {
    const us = users(), mine = all().filter((p) => p.mine || p.owner);
    return `<div class="stats">
        <div class="stat"><b>${us.filter((u) => !u.demo).length}</b><small>注册用户</small></div>
        <div class="stat"><b>${all().length}</b><small>商品总数（其中用户上传 ${mine.length}）</small></div>
        <div class="stat"><b>${openReports().length}</b><small>待处理举报</small></div>
        <div class="stat"><b>${Object.keys(D.removed).length}</b><small>已下架</small></div>
      </div>
      <h3>最近上传的商品</h3>
      <div class="tbl">${mine.length ? mine.slice(0, 6).map(productRow).join('') : '<div class="empty">还没有人上传商品</div>'}</div>
      ${S.cloud ? '' : `<h3>说明</h3>
      <ul class="todo">
        <li><b>这是本地演示版的后台。</b>网站接上服务器（填好 js/config.js）之后，这里会列出所有人的注册信息和上传的商品，并且要用管理员邮箱登录才能进。</li>
      </ul>`}`;
  }
  function viewProducts() {
    const rep = reportedIds(), k = q.trim().toLowerCase();
    let list = all().filter((p) => (filter === 'user' ? p.mine : filter === 'reported' ? rep[p.id] : filter === 'removed' ? removed(p) : true));
    if (k) list = list.filter((p) => (L(p.title) + ' ' + L(p.seller) + ' ' + (p.title.en || '')).toLowerCase().includes(k));
    const chips = [['all', '全部'], ['user', '用户上传'], ['reported', '被举报'], ['removed', '已下架']];
    return `<div class="bar">${chips.map(([c, v]) => `<button class="chip ${filter === c ? 'on' : ''}" data-f="${c}">${v}</button>`).join('')}<input class="search" id="q" placeholder="搜索商品名或卖家" value="${esc(q)}"></div>
      <div class="tbl"><div class="row head p-row"><div></div><div>商品</div><div class="c3">价格</div><div class="c4">卖家 / 来源</div><div class="c5">状态</div><div>操作</div></div>
      ${list.length ? list.map(productRow).join('') : '<div class="empty">没有符合条件的商品</div>'}</div>`;
  }
  function viewUsers() {
    const us = users();
    return `<div class="tbl" style="margin-top:20px"><div class="row head u-row"><div></div><div>昵称</div><div class="c3">邮箱</div><div class="c4">注册时间</div><div class="c5">每周预算</div><div class="c6">买入</div><div class="c7">上架</div><div>操作</div></div>
      ${us.map((u) => { const ban = u.banned; return `<div class="row u-row ${ban ? 'off' : ''}"><canvas class="av" data-av="${u.id}" width="16" height="18"></canvas>
        <div><div class="t">${esc(u.name)} ${u.demo ? '<span class="tag">演示</span>' : ''} ${ban ? '<span class="tag bad">已停用</span>' : ''}</div><div class="s m">${esc(u.email)}${u.t ? ' · 注册于 ' + date(u.t) : ''}${u.demo ? '' : ' · 每周预算 ' + S.fmt(u.weekly)}</div></div>
        <div class="s c3" style="margin:0">${esc(u.email)}</div><div class="s c4" style="margin:0">${date(u.t)}</div><div class="num c5">${u.demo ? '—' : S.fmt(u.weekly)}</div><div class="num c6">${u.bought}</div><div class="num c7">${u.listed}</div>
        <div>${u.demo ? '' : `<button class="act ${ban ? '' : 'del'}" data-ban="${u.id}">${ban ? '恢复' : '停用'}</button>`}</div></div>`; }).join('')}</div>
      ${us.some((u) => !u.demo) ? '' : `<div class="note" style="background:var(--soft);color:var(--ink2)">${S.cloud ? '还没有人注册。' : '这台设备上还没有人注册。在网站里登录之后，这里会出现你的账号。'}</div>`}`;
  }
  function viewReports() {
    const rs = D.reports;
    if (!rs.length) return '<div class="tbl" style="margin-top:20px"><div class="empty">还没有举报。用户在商品详情里点「举报这件商品」后，会出现在这里。</div></div>';
    return `<div class="tbl" style="margin-top:20px"><div class="row head r-row"><div></div><div>商品</div><div class="c3">原因</div><div class="c4">举报人</div><div class="c5">时间</div><div class="c6">处理</div></div>
      ${rs.map((r) => { const p = S.product(r.pid); if (!p) return ''; const done = r.st !== 'open';
        return `<div class="row r-row ${done ? 'off' : ''}">${thumb(p)}<div><div class="t">${esc(L(p.title))}</div><div class="s">${esc(L(p.seller))} · ${S.fmt(p.price)}</div></div>
          <div class="c3"><span class="tag gold">${REASON[r.reason] || r.reason}</span></div><div class="s c4" style="margin:0">${esc(r.by || '游客')}</div><div class="s c5" style="margin:0">${date(r.t)}</div>
          <div class="c6">${done ? `<span class="tag ${r.st === 'removed' ? 'bad' : ''}">${r.st === 'removed' ? '已下架商品' : '已忽略'}</span>` : `<button class="act del" data-remove="${p.id}">下架商品</button> <button class="act" data-dismiss="${r.id}">忽略</button>`}</div></div>`; }).join('')}</div>`;
  }
  function render() {
    renderTabs();
    $('#view').innerHTML = tab === 'home' ? viewHome() : tab === 'products' ? viewProducts() : tab === 'users' ? viewUsers() : viewReports();
    document.querySelectorAll('[data-av]').forEach((c) => { const u = users().find((x) => x.id === c.dataset.av); if (u) G.avatar(c, u.char); });
    const inp = $('#q'); if (inp) inp.oninput = () => { q = inp.value; const pos = inp.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); };
  }
  function preview(id) {
    const p = S.product(id); if (!p) return;
    const more = !p.art && !p.pic && p.img && p.img.length > 1 ? `<div style="display:flex;gap:8px;margin-top:8px;overflow:auto">${p.img.slice(1).map((k) => `<img src="${S.img(k)}" style="width:84px;height:84px;object-fit:cover;border-radius:12px">`).join('')}</div>` : '';
    $('#modal').innerHTML = `<div class="modal"><div><div class="hero ${p.art || p.pic ? '' : 'photo'}" style="background:${p.bg || '#F3EEE6'}"><img src="${G.cardURL(p)}" alt=""${p.art || p.pic ? '' : ' onload="QL.gfx.edge(this)"'}></div>${more}
      <h2>${esc(L(p.title))}</h2><div class="num" style="font-size:22px;margin-top:4px">${S.fmt(p.price)}</div><p>${esc(L(p.desc)) || '（没有填写介绍）'}</p>
      <p>卖家：${esc(L(p.seller))}　位置：${CAT[p.cat]}　${p.mine || p.owner ? '上传于 ' + date(p.t) : '内置演示商品'}</p>
      <div class="btns">${removed(p) ? `<button class="act" data-restore="${p.id}">恢复</button>` : `<button class="act del" data-remove="${p.id}">下架</button>`}<button class="act" data-close="1">关闭</button></div></div></div>`;
  }
  document.addEventListener('click', (e) => {
    const b = (k) => e.target.closest('[data-' + k + ']');
    let x;
    if ((x = b('t'))) { tab = x.dataset.t; render(); return; }
    if ((x = b('f'))) { filter = x.dataset.f; render(); return; }
    if ((x = b('view'))) { preview(x.dataset.view); return; }
    if (b('close') || e.target.classList.contains('modal')) { $('#modal').innerHTML = ''; return; }
    let p;
    if ((x = b('remove'))) { if (!confirm('确定下架这件商品？所有人都会看不到它。')) return; p = act('remove', x.dataset.remove); }
    else if ((x = b('restore'))) p = act('restore', x.dataset.restore);
    else if ((x = b('dismiss'))) p = act('dismiss', S.cloud ? +x.dataset.dismiss : x.dataset.dismiss);
    else if ((x = b('ban'))) { const u = users().find((y) => y.id === x.dataset.ban); if (!u || u.demo) return alert('演示邻居不能停用'); if (!u.banned && !confirm(`确定停用「${u.name}」？TA 的商品会全部下架，也不能再买卖。`)) return; p = act('ban', u.id, !u.banned); }
    else if (b('refresh')) p = load();
    else if (b('out')) { S.signOut().then(() => location.reload()); return; }
    else return;
    $('#modal').innerHTML = '';
    p.then(render, (er) => alert('没成功：' + (er && er.message)));
  });
  window.addEventListener('storage', (e) => { if (!S.cloud && S.reloadIf(e)) load().then(render); });

  /* ---------- 联网版：管理员登录 ---------- */
  function gate(msg) {
    $('#tabs').innerHTML = '';
    $('#view').innerHTML = `<div class="tbl" style="margin-top:20px;padding:22px;max-width:420px">
      <h3 style="margin:0 0 12px;color:var(--ink)">管理员登录</h3>${msg ? `<p class="s" style="white-space:normal;margin-bottom:12px;color:var(--bad)">${msg}</p>` : ''}
      <form id="lg"><input class="search" id="lg-email" type="email" placeholder="管理员邮箱" style="width:100%;margin-bottom:10px" required>
      <div id="lg-code-row" hidden><input class="search" id="lg-code" inputmode="numeric" placeholder="邮件里的 6 位验证码" style="width:100%;margin-bottom:10px"></div>
      <button class="act del" style="width:100%;height:42px" id="lg-go">发送验证码</button></form></div>`;
    let sent = false;
    $('#lg').onsubmit = (e) => {
      e.preventDefault(); const em = $('#lg-email').value.trim(), go = $('#lg-go'); go.disabled = true;
      const p = sent ? S.verifyCode(em, $('#lg-code').value.replace(/\D/g, '')) : S.sendCode(em);
      p.then(() => {
        go.disabled = false;
        if (!sent) { sent = true; $('#lg-code-row').hidden = false; go.textContent = '登录'; $('#lg-code').focus(); return; }
        start();
      }, (er) => { go.disabled = false; alert('没成功：' + (er && er.message)); });
    };
  }
  function start() {
    if (S.cloud) {
      $('#mode-note').innerHTML = '联网版后台：下架、停用对所有人立刻生效。' + (S.s.user ? ` 当前登录：${esc(S.s.user.email)}　<a href="#" data-out="1">退出</a>　<a href="#" data-refresh="1">刷新数据</a>` : '');
      if (!S.s.user) return gate();
      if (!S.isAdmin) return gate(`「${esc(S.s.user.email)}」不是管理员邮箱。管理员名单在 Supabase 的 admins 表里。`);
    }
    load().then(render, (er) => { $('#view').innerHTML = `<div class="empty">读取失败：${esc(er && er.message)}</div>`; });
  }
  S.init().then(start);
})();
