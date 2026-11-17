/* 钱来 — 房间页的界面：顶部信息、物品详情、我的东西、串门、换风格 */
(function () {
  const QL = window.QL, S = QL.store, G = QL.gfx, ui = QL.ui;
  const { $, esc, t, L } = ui;
  const RU = (QL.roomui = {});
  let visiting = null, mounted = false, hintT = 0;
  const view = () => visiting || S.roomState();   // visiting：正在串门的那个房间（演示邻居或按串门码找到的人）

  function hud() {
    const st = view(), n = st.items.length, own = $('#owner');
    own.innerHTML = `<canvas class="px" width="16" height="18"></canvas><div><b>${visiting ? t('r_whose', { name: esc(st.name) }) : t('r_mine')}</b><small>${visiting ? t('nb_items', { n }) + (visiting.code ? ' · ' + esc(visiting.code) : '') : S.s.user ? t('r_count', { n, x: S.fmt(S.invValue()) }) : t('s_guest')}</small></div>`;
    G.avatar($('canvas', own), st.char);
    $('#hud-btns').innerHTML = visiting
      ? `<button class="hbtn dark" data-a="home">${t('r_home')}</button><button class="hbtn" data-a="visit">${t('r_visit')}</button>`
      : `<button class="hbtn" data-a="visit">${t('r_visit')}</button><button class="hbtn" data-a="theme">${t('r_theme')}</button>`;
    const tray = $('#btn-tray'); tray.hidden = !!visiting; tray.innerHTML = `${t('r_tray')}<b>${n}</b>`;
  }
  function hint(msg, ms) { const el = $('#room-hint'); el.textContent = msg; el.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => el.classList.remove('on'), ms || 3800); }

  RU.enter = function () {
    if (!mounted) {
      mounted = QL.room.mount($('#room-cv'));
      if (!mounted) { hud(); hint('3D is not available on this device', 6000); return; }
      QL.room.onItem = showItem; QL.room.onBox = openStorage;
    }
    visiting = null; QL.room.load(view()); QL.room.start(); hud();
    hint(!S.s.user ? t('r_guest') : S.s.inv.length ? t('r_hint_walk') : t('r_hint_empty'));
  };
  RU.leave = function () { QL.room.stop(); $('#room-hint').classList.remove('on'); };
  RU.reload = function () { if (!mounted) return; QL.room.load(view()); hud(); };

  function showItem(it) {
    const p = S.product(it.pid); if (!p) return;
    if (visiting) {
      const st = view(), can = !S.s.dec[p.id] && !(p.kind === 'used' && S.s.sold[p.id]);
      const sh = ui.sheet({ title: '', html: `${ui.picHTML(p, 'hero')}<div class="d-title">${esc(L(p.title))}</div><div class="d-price">${S.fmt(p.price)}</div><p class="hint">${t('it_theirs', { name: esc(st.name), x: S.fmt(p.price) })}</p><p class="d-desc">${esc(L(p.desc))}</p>${can ? `<div class="btnrow"><button class="b1" id="it-go">${t('it_goto')}</button></div>` : ''}${ui.commentsHTML(p)}` });
      ui.bindComments(sh.body, p);
      const go = $('#it-go', sh.body); if (go) go.onclick = () => { sh.close(); QL.app.showFirst(p.id); };
      return;
    }
    const inv = S.s.inv.find((x) => x.id === it.id); if (!inv) return;
    const st = S.stats(p.id), listed = inv.listed ? S.product(inv.listed) : null;
    let extra = '';
    if (p.target && !p.mine && st) extra = st.intent >= p.target ? `<div class="note gold">${t('it_made')}</div>` : `<div class="bar" style="margin:16px 0 6px"><i style="width:${Math.min(100, Math.floor(st.pct * 100))}%;transition:none"></i></div><p class="hint" style="margin:0">${t('it_progress', { pct: Math.floor(st.pct * 100) })}</p>`;
    const act = listed && listed.active && !listed.sold
      ? `<div class="note">${t('it_listed', { x: S.fmt(listed.price) })}</div><div class="btnrow"><button class="b2" data-a="unlist">${t('it_unlist')}</button></div>`
      : inv.sample ? '' : `<div class="btnrow"><button class="b1" data-a="resell">${t('it_resell')}</button></div>`;
    const sh = ui.sheet({
      title: '', html: `${ui.picHTML(p, 'hero')}<div class="d-title">${esc(L(p.title))}${inv.sample ? `<span class="tag">${t('it_sample')}</span>` : ''}</div>
        <div class="sec" style="margin-top:14px"><div class="list">
          <div class="li"><div class="g">${t('it_paid')}</div><div class="v">${inv.sample ? t('it_free') : S.fmt(inv.paid)}</div></div>
          <div class="li"><div class="g">${t('it_date')}</div><div class="v">${ui.date(inv.t)}</div></div>
          <div class="li"><div class="g">${t('it_from')}</div><div class="v">${esc(L(p.seller))}</div></div>
          <div class="li"><div class="g">${t('it_where')}</div><div class="v">${inv.slot >= 0 ? t('cat_' + p.cat) : t('r_storage')}</div></div>
        </div></div>${extra}${act}${inv.sample ? '' : ui.commentsHTML(p)}`,
    });
    if (!inv.sample) ui.bindComments(sh.body, p);
    sh.body.onclick = (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return; sh.close();
      if (a.dataset.a === 'resell') QL.post.startResell(inv.id);
      else if (a.dataset.a === 'unlist') Promise.resolve(S.takeDown(inv.listed)).then(() => RU.reload(), (er) => ui.toast(ui.errText(er)));
    };
  }
  const cellHTML = (i) => { const p = S.product(i.pid); return p ? `<button class="cell" data-id="${i.id}">${ui.thumbHTML(p, 'im')}<h6>${esc(L(p.title))}</h6><small>${i.sample ? t('it_sample') : S.fmt(i.paid)}</small></button>` : ''; };
  function gridSheet(title, html) {
    const sh = ui.sheet({ title, html });
    sh.body.onclick = (e) => { const c = e.target.closest('.cell'); if (!c) return; const it = S.s.inv.find((x) => x.id === c.dataset.id); sh.close(); if (it) { if (it.slot >= 0) QL.room.focus(it.id); setTimeout(() => showItem(it), 260); } };
  }
  function openTray() {
    if (!S.s.inv.length) return hint(t('r_hint_empty'));
    const on = S.s.inv.filter((i) => i.slot >= 0), box = S.s.inv.filter((i) => i.slot < 0);
    gridSheet(t('r_tray'), `${on.length ? `<div class="sec" style="margin-top:6px"><h4>${t('r_on_show')} · ${on.length}</h4><div class="grid3">${on.map(cellHTML).join('')}</div></div>` : ''}${box.length ? `<div class="sec"><h4>${t('r_storage')} · ${box.length}</h4><div class="grid3">${box.map(cellHTML).join('')}</div></div>` : ''}`);
  }
  function openStorage() {
    if (visiting) return;
    const box = S.s.inv.filter((i) => i.slot < 0);
    gridSheet(t('r_storage'), box.length ? `<div class="grid3">${box.map(cellHTML).join('')}</div>` : `<p class="d-desc" style="margin-top:0">${t('r_storage_empty')}</p>`);
  }
  function shareLink(code) { return location.origin + location.pathname + '#r=' + code; }
  function visit(room) { visiting = room; QL.room.load(view()); hud(); }
  RU.visitCode = function (code) {
    return S.roomByCode(code).then((r) => {
      if (!r) { ui.toast(t('r_code_404')); return false; }
      if (r.self) { visiting = null; QL.room.load(view()); hud(); return true; }
      if (r.nid === undefined && !r.code) r.code = String(code).toUpperCase();
      if (!r.nid) r.nid = 'c:' + (r.code || code);
      visit(r); return true;
    }, () => { ui.toast(t('err_net')); return false; });
  };
  function openNeighbors() {
    const code = S.s.user || !S.cloud ? S.myCode() : '';
    const sh = ui.sheet({ title: t('nb_title'), html: `
      ${code ? `<div class="share"><div class="hint" style="margin:0">${t('r_my_code')}</div><div class="code">${esc(code)}</div><p class="hint" style="margin:0 0 4px">${t('r_share_sub')}</p><div class="btnrow"><button class="b1 sm" id="r-share">${t('r_share')}</button></div></div>` : `<div class="note" style="margin-top:0">${t('r_code_need_login')}</div>`}
      <div class="sec"><h4>${t('r_enter_code')}</h4><form class="codein" id="r-form"><input class="in" id="r-code" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="${t('r_code_ph')}"><button class="b1 sm" type="submit">${t('r_go')}</button></form></div>
      <div class="sec"><h4>${t('r_demo_nb')}</h4><div class="list">${QL.SEED.neighbors.map((n) => `<button class="li" data-id="${n.id}"><canvas class="px" width="16" height="18" style="width:40px;height:45px;background:var(--gold2);border-radius:12px;padding:3px 3px 0"></canvas><div class="g"><b>${esc(L(n.name))}</b><small>${t('nb_items', { n: n.items.length })} · ${n.code}</small></div><div class="v">→</div></button>`).join('')}</div></div>` });
    QL.SEED.neighbors.forEach((n) => G.avatar($(`[data-id="${n.id}"] canvas`, sh.body), n.char));
    sh.body.onclick = (e) => { const b = e.target.closest('[data-id]'); if (!b) return; sh.close(); visit(S.neighborRoom(b.dataset.id)); };
    const sbtn = $('#r-share', sh.body);
    if (sbtn) sbtn.onclick = () => {
      const url = shareLink(code), text = t('r_share_text', { code });
      if (navigator.share) { navigator.share({ title: '钱来 · Buy or Bye', text, url }).catch(() => { }); return; }
      const done = () => ui.toast(t('r_copied'));
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + ' ' + url).then(done, () => prompt(t('r_copy_manual'), url));
      else prompt(t('r_copy_manual'), url);
    };
    $('#r-form', sh.body).onsubmit = (e) => {
      e.preventDefault(); const v = $('#r-code', sh.body).value.trim(); if (!v) return;
      RU.visitCode(v).then((ok) => { if (ok) sh.close(); });
    };
  }
  function openTheme() {
    const TH = { cream: ['#F8EBD8', '#F2A98F'], mint: ['#DDEEE2', '#F6E2A8'], berry: ['#F6D6DD', '#B9A6E3'] };
    const sh = ui.sheet({ title: t('r_theme'), html: `<div class="themes">${Object.keys(TH).map((k) => `<button data-k="${k}" class="${S.s.set.theme === k ? 'on' : ''}"><i style="background:linear-gradient(135deg,${TH[k][0]} 55%,${TH[k][1]} 55%)"></i>${t('th_' + k)}</button>`).join('')}</div>` });
    sh.body.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; S.setTheme(b.dataset.k); sh.close(); RU.reload(); };
  }
  $('#hud-btns').onclick = (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'visit') openNeighbors(); else if (b.dataset.a === 'theme') openTheme(); else { visiting = null; QL.room.load(view()); hud(); }
  };
  $('#btn-tray').onclick = openTray;
})();
