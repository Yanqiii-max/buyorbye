/* 钱来 — 上架页：发布新品 / 出闲置，我的上架与数据 */
(function () {
  const QL = window.QL, S = QL.store, G = QL.gfx, ui = QL.ui;
  const { $, $$, esc, t, L } = ui;
  const root = $('#post');
  const CATS = ['wall', 'table', 'floor', 'shelf', 'wear'];
  const blank = () => ({ kind: 'new', imgs: [], title: '', price: '', desc: '', cat: 'table', frame: false, target: '', cut: null, whole: null, useCut: true, fromInv: null, art: null, pic: null, sid: null, bg: null, rh: null, ref: 0 });
  let tab = 'new', d = blank(), dash = null;

  const wide = () => window.innerWidth >= 940;
  const priceBase = () => { const v = parseFloat(d.price); return v > 0 ? S.toBase(v) : 0; };
  const targetBase = () => { const v = parseFloat(d.target); return v > 0 ? S.toBase(v) : 0; };
  const coverURL = () => (d.art ? QL.artURL(d.art) : d.pic || d.imgs[0] || '');
  const stickerURL = () => (d.useCut && d.cut ? d.cut : d.whole);
  function draftProduct() {
    return { id: 'draft', kind: d.kind, cat: d.cat, frame: d.cat === 'wall' && d.frame, art: d.art, pic: d.pic, bg: d.bg || '#F3EEE6', title: d.title || t('p_name_ph'), desc: d.desc, price: priceBase(), seller: S.s.user ? S.s.user.name : '' };
  }
  function missing() {
    const m = []; if (!coverURL()) m.push(t('need_photo')); if (!d.title.trim()) m.push(t('need_name')); if (!priceBase()) m.push(t('need_price')); return m;
  }
  function cardPreviewHTML() {
    const p = draftProduct(), url = coverURL();
    return `<div class="flip"><div class="face front">${url ? ui.cardFront(p, url) : `<div class="pic" style="background:var(--soft)"></div><div class="meta"><div class="chips">${ui.chipHTML(p)}<span>${esc(p.seller)}</span></div><h2 class="title">${esc(p.title)}</h2><p class="desc">${esc(p.desc)}</p><div class="price">${ui.priceHTML(p.price)}</div></div>`}</div></div>`;
  }
  function updateLive() {
    const c = $('#p-card', root); if (c) c.innerHTML = cardPreviewHTML();
    const m = missing(), need = $('#p-need', root), pub = $('#p-pub', root);
    if (need) need.textContent = m.length ? t('p_need', { x: m.join(QL.i18n.lang === 'zh' ? '、' : ', ') }) : '';
    if (pub) pub.disabled = m.length > 0;
    const th = $('#p-thint', root);
    if (th) { const pb = priceBase(), tb = targetBase(); th.textContent = pb && tb ? t('p_target_hint', { n: Math.ceil(tb / pb).toLocaleString('en-US') }) : t('p_target_hint0'); }
  }

  function render() {
    root.classList.toggle('wide', wide() && tab === 'new');
    const n = S.s.lst.length;
    let h = `<div><div class="segc" id="p-tabs"><button data-t="new" class="${tab === 'new' ? 'on' : ''}">${t('p_tab_new')}</button><button data-t="mine" class="${tab === 'mine' ? 'on' : ''}">${t('p_tab_mine')}${n ? ' · ' + n : ''}</button></div>`;
    if (tab === 'mine') h += mineHTML() + '</div>';
    else {
      const showStk = d.imgs.length && !d.art && !(d.cat === 'wall' && d.frame);
      h += `<div class="fld"><div class="segc" id="p-kind"><button data-k="new" class="${d.kind === 'new' ? 'on' : ''}">${t('p_kind_new')}</button><button data-k="used" class="${d.kind === 'used' ? 'on' : ''}">${t('p_kind_used')}</button></div><p class="hint">${t(d.kind === 'new' ? 'p_kind_new_sub' : 'p_kind_used_sub')}</p></div>
        <div class="fld"><div class="ph-row">${d.art || d.pic ? `<div class="ph" style="background:${d.bg}"><img src="${coverURL()}" style="object-fit:contain;padding:10px" alt=""><button class="del" data-del="art">✕</button></div>` : d.imgs.map((u, i) => `<div class="ph"><img src="${u}" alt=""><button class="del" data-del="${i}">✕</button></div>`).join('')}
          ${!d.art && !d.pic && d.imgs.length < 4 ? `<button class="ph add" id="p-add"><b>＋</b>${t('p_photo')}</button>` : ''}</div>
          ${d.kind === 'used' && !d.fromInv ? `<button class="b3" id="p-from" style="padding-left:0">${t('p_from_room')}</button>` : ''}
          <input type="file" id="p-file" accept="image/*" multiple hidden></div>
        <div class="fld"><label>${t('p_name')}</label><input class="in" id="p-title" maxlength="40" placeholder="${t('p_name_ph')}" value="${esc(d.title)}"></div>
        <div class="fld"><label>${t('p_price')}</label><div class="money"><span>${S.sym()}</span><input id="p-price" inputmode="decimal" autocomplete="off" maxlength="10" placeholder="0" value="${esc(d.price)}"></div></div>
        <div class="fld"><label>${t('p_desc')}</label><textarea class="in" id="p-desc" maxlength="400" placeholder="${t('p_desc_ph')}">${esc(d.desc)}</textarea></div>
        <div class="fld"><label>${t('p_cat')}</label><div class="cats" id="p-cats">${CATS.map((c) => `<button data-c="${c}" class="${d.cat === c ? 'on' : ''}">${t('cat_' + c)}</button>`).join('')}</div>
          ${d.cat === 'wall' ? `<label class="chk"><input type="checkbox" id="p-frame" ${d.frame ? 'checked' : ''}>${t('p_frame')}</label>` : ''}</div>
        ${showStk ? `<div class="fld"><label>${t('p_sticker')}</label><div class="stk"><div class="box"><img src="${stickerURL() || ''}" alt=""></div><div class="segc" id="p-cut"><button data-u="1" class="${d.useCut && d.cut ? 'on' : ''}" ${d.cut ? '' : 'disabled style="opacity:.35"'}>${t('p_cut_auto')}</button><button data-u="0" class="${!(d.useCut && d.cut) ? 'on' : ''}">${t('p_cut_whole')}</button></div></div>${d.cut ? '' : `<p class="hint">${t('p_cut_fail')}</p>`}</div>` : ''}
        ${d.kind === 'new' ? `<div class="fld"><label>${t('p_target')}</label><div class="money sm"><span>${S.sym()}</span><input id="p-target" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="0" value="${esc(d.target)}"></div><p class="hint" id="p-thint"></p></div>` : ''}
        <div class="pubbar">${wide() ? '' : `<button class="b2" id="p-prev" style="height:58px;border-radius:20px">${t('p_prev_btn')}</button>`}<button class="b1" id="p-pub">${t('p_submit')}</button></div>
        <p class="hint" id="p-need" style="text-align:center"></p><p class="rules">${t('rules_agree')}<button id="p-rules">${t('rules_name')}</button></p></div>
        <div class="pv"><h4>${t('p_preview')}</h4><div class="card" id="p-card"></div></div>`;
    }
    root.innerHTML = h;
    bind(); updateLive();
  }

  function bind() {
    $('#p-tabs', root).onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.t !== tab) { tab = b.dataset.t; render(); } };
    if (tab === 'mine') { $$('.mine-li', root).forEach((el) => (el.onclick = () => openDash(el.dataset.id))); const go = $('#m-new', root); if (go) go.onclick = () => { tab = 'new'; render(); }; return; }
    $('#p-kind', root).onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.k !== d.kind) { d.kind = b.dataset.k; if (d.kind === 'new' && d.fromInv) d = Object.assign(blank(), { kind: 'new' }); render(); } };
    const on = (id, key) => { const el = $(id, root); if (el) el.oninput = () => { d[key] = el.value; updateLive(); }; };
    on('#p-title', 'title'); on('#p-price', 'price'); on('#p-desc', 'desc'); on('#p-target', 'target');
    $('#p-cats', root).onclick = (e) => { const b = e.target.closest('button'); if (b) { d.cat = b.dataset.c; if (d.cat === 'wall' && !d.fromInv) d.frame = true; render(); } };
    const fr = $('#p-frame', root); if (fr) fr.onchange = () => { d.frame = fr.checked; render(); };
    const cut = $('#p-cut', root); if (cut) cut.onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) { d.useCut = b.dataset.u === '1'; render(); } };
    const add = $('#p-add', root), file = $('#p-file', root);
    if (add) add.onclick = () => file.click();
    file.onchange = () => {
      const fs = Array.from(file.files || []).slice(0, 4 - d.imgs.length); if (!fs.length) return;
      Promise.all(fs.map((f) => G.readFile(f).catch(() => null))).then((rs) => {
        const first = !d.imgs.length; rs.filter(Boolean).forEach((r) => d.imgs.push(r.url));
        return first ? makeSticker() : null;
      }).then(render);
    };
    $$('.del', root).forEach((b) => (b.onclick = () => {
      if (b.dataset.del === 'art') { d = Object.assign(blank(), { kind: d.kind }); render(); return; }
      const i = +b.dataset.del; d.imgs.splice(i, 1);
      (i === 0 ? makeSticker() : Promise.resolve()).then(render);
    }));
    const from = $('#p-from', root); if (from) from.onclick = pickFromRoom;
    const prev = $('#p-prev', root); if (prev) prev.onclick = () => { ui.sheet({ title: t('p_preview'), html: `<div class="card" style="position:relative;height:min(62dvh,520px);inset:auto">${cardPreviewHTML()}</div>` }); };
    $('#p-pub', root).onclick = publish; $('#p-rules', root).onclick = () => ui.doc('rules');
  }
  function makeSticker() {
    d.cut = d.whole = null; d.useCut = true;
    if (!d.imgs.length) return Promise.resolve();
    return G.load(d.imgs[0]).then((img) => {
      const c = G.cutout(img); d.cut = c ? c.toDataURL('image/png') : null; d.whole = G.wholeSticker(img).toDataURL('image/png'); d.useCut = !!c;
    }).catch(() => { });
  }
  function publish() {
    if (missing().length) return;
    if (S.s.mod.banned.me) return ui.toast(t('banned_msg'));
    const frame = d.cat === 'wall' && d.frame, btn = $('#p-pub', root);
    if (btn.dataset.busy) return; btn.dataset.busy = 1; btn.disabled = true; btn.textContent = t('p_publishing');
    Promise.resolve(S.addListing({
      kind: d.kind, title: d.title.trim(), desc: d.desc.trim(), price: priceBase(), cat: d.cat, frame, target: targetBase(),
      art: d.art, pic: d.pic, sid: d.sid, imgs: d.art || d.pic ? [] : d.imgs, sticker: d.art || d.pic || frame ? null : stickerURL(), bg: d.bg, rh: d.rh, ref: d.ref, fromInv: d.fromInv,
    })).then((l) => {
      d = blank(); tab = 'mine'; render(); ui.toast(t('p_done'));
      $('#pg-post').scrollTop = 0; setTimeout(() => openDash(l.id), 500);
    }, (er) => { delete btn.dataset.busy; btn.disabled = false; btn.textContent = t('p_submit'); ui.toast(ui.errText(er)); });
  }
  function pickFromRoom() {
    const items = S.s.inv.filter((i) => !i.sample && !i.listed);
    if (!items.length) return ui.toast(t('p_room_empty'));
    const sh = ui.sheet({ title: t('p_from_room'), html: `<div class="grid3">${items.map((i) => { const p = S.product(i.pid); return `<button class="cell" data-id="${i.id}">${ui.thumbHTML(p, 'im')}<h6>${esc(L(p.title))}</h6><small>${S.fmt(i.paid)}</small></button>`; }).join('')}</div>` });
    sh.body.onclick = (e) => { const c = e.target.closest('.cell'); if (!c) return; sh.close(); QL.post.startResell(c.dataset.id, true); };
  }

  /* ---------- 我的上架 ---------- */
  function mineHTML() {
    if (!S.s.lst.length) return `<div class="empty" style="position:relative;inset:auto;padding:70px 20px"><h3>${t('mine_empty')}</h3><div class="col"><button class="b1" id="m-new">${t('btn_list_one')}</button></div></div>`;
    return S.s.lst.map((l) => {
      const st = l.stats, pct = st.v ? Math.round(st.b / st.v * 100) : 0;
      const line = l.removed ? t('st_removed') : l.sold ? t('st_sold') : !l.active ? t('st_off') : l.kind === 'used' ? t('st_used_wait', { v: st.v }) : t('mine_stats', { v: st.v, b: st.b, pct });
      return `<button class="mine-li" data-id="${l.id}">${ui.thumbHTML(l)}<div class="g" style="flex:1;min-width:0"><h5>${esc(L(l.title))}${l.sold ? `<span class="tag ok">${t('st_sold')}</span>` : l.kind === 'used' ? `<span class="tag">${t('chip_used')}</span>` : ''}</h5><p>${line}</p></div><div class="v">${S.fmt(l.price)}</div></button>`;
    }).join('');
  }
  function dashHTML(l) {
    const st = l.stats, rate = st.v ? st.b / st.v : 0;
    let h = `<div style="display:flex;gap:14px;align-items:center">${ui.thumbHTML(l)}<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(L(l.title))}</div><div style="font:800 22px var(--round)">${S.fmt(l.price)}</div></div></div>`;
    if (l.sold) h += `<div class="note gold">${t('d_sold_for', { x: S.fmt(l.price) })}</div>`;
    else if (!l.active) h += `<div class="note">${t(l.removed ? 'st_removed' : 'st_off')}</div>`;
    else if (!st.v) h += `<div class="note">${t('d_waiting')}</div>`;
    h += `<div class="sec"><div class="big3"><div><b>${st.v}</b><small>${t('d_views')}</small></div>${l.kind === 'used' ? '' : `<div><b>${st.b}</b><small>${t('d_buys')}</small></div><div><b>${Math.round(rate * 100)}%</b><small>${t('d_rate')}</small></div>`}</div>${st.cant ? `<p class="hint">${t('d_cant', { n: st.cant })}</p>` : ''}</div>`;
    if (l.target) {
      const intent = st.b * l.price, pct = Math.floor(intent / l.target * 100), left = l.target - intent;
      h += `<div class="sec"><h4>${t('d_goal')}</h4><div class="bar ${left <= 0 ? 'done' : ''}" style="margin:0 0 8px"><i style="width:${Math.min(100, pct)}%;transition:none"></i></div><div class="rv-pct"><span>${pct}%</span><span>${left <= 0 ? t('rv_reached') : ''}</span></div>
        <div class="rows" style="margin-top:8px"><div><span>${t('rv_goal')}</span><b>${S.fmt(l.target)}</b></div><div><span>${t('rv_got')}</span><b>${S.fmt(intent)}</b></div><div><span>${t(left > 0 ? 'rv_left' : 'rv_over')}</span><b>${S.fmt(Math.abs(left))}</b></div></div></div>`;
    }
    if (l.kind === 'new' && st.v) {
      const rs = st.seg.map((x) => (x[0] ? x[1] / x[0] : 0)), mx = Math.max(0.01, ...rs);
      h += `<div class="sec"><h4>${t('d_seg')}</h4><div class="bars">${rs.map((r, i) => `<div><b>${Math.round(r * 100)}%</b><i style="height:${Math.round(r / mx * 62)}px"></i><small>${S.segLabel(i)}</small></div>`).join('')}</div></div>`;
    }
    if (st.v) {
      const med = S.median(st.wtps), cv = l.kind === 'new' ? S.curve(l) : [];
      h += `<div class="sec"><h4>${t('d_wtp')}</h4><p class="hint" style="margin:0 0 10px">${st.wtps.length ? t('d_wtp_med', { n: st.wtps.length, x: S.fmt(med) }) : t('d_wtp_none')}</p>`;
      if (cv.length) h += `<h4 style="margin-top:16px">${t('d_curve')}</h4><div class="tbl"><div class="cur"><span>${t('d_curve_row', { p: S.fmt(l.price) })}（${t('d_now')}）</span><b>${Math.round(rate * 100)}%</b></div>${cv.map((r) => `<div><span>${t('d_curve_row', { p: S.fmt(r.price) })}</span><b>${t('d_curve_val', { pct: r.pct })}</b></div>`).join('')}</div>`;
      h += '</div>';
    }
    if (l.hist.length) h += `<div class="sec"><h4>${t('d_hist')}</h4><div class="tbl">${l.hist.map((x) => `<div><span>${t('d_hist_row', { p: S.fmt(x.price), v: x.v })}</span><b>${x.v ? Math.round(x.b / x.v * 100) : 0}%</b></div>`).join('')}</div></div>`;
    if (l.active && !l.sold) h += `<div class="btnrow"><button class="b1 sm" data-a="reprice">${t('d_reprice')}</button>${l.kind === 'new' ? `<button class="b2 sm" data-a="sample">${t('d_sample')}</button>` : ''}</div><div style="text-align:center"><button class="b3 danger" data-a="remove">${t('d_remove')}</button></div>`;
    h += `<div class="note">${t('d_demo')}</div>`;
    return h;
  }
  function openDash(id) {
    const l = S.product(id); if (!l) return;
    const sh = ui.sheet({ title: l.kind === 'used' ? t('p_kind_used') : t('p_kind_new'), onClose: () => (dash = null) });
    dash = { id, sh, sig: '' };
    const draw = () => { const x = S.product(id); if (!x) return; const sig = x.stats.v + '|' + x.stats.b + '|' + x.sold + '|' + x.active + '|' + x.price; if (sig === dash.sig) return; dash.sig = sig; const y = sh.body.scrollTop; sh.set(dashHTML(x)); sh.body.scrollTop = y; };
    dash.draw = draw; draw();
    sh.body.onclick = (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const x = S.product(id);
      if (a.dataset.a === 'reprice') {
        const s2 = ui.sheet({ title: t('d_reprice'), html: `<div class="fld" style="margin-top:0"><label>${t('d_reprice_q')}</label><div class="money"><span>${S.sym()}</span><input id="rp" inputmode="decimal" maxlength="10" value="${S.fromBase(x.price)}"></div></div><div class="btnrow"><button class="b1" id="rp-ok">${t('w_save')}</button></div>` });
        $('#rp-ok', s2.body).onclick = () => { const v = parseFloat($('#rp', s2.body).value); if (!(v > 0)) return; Promise.resolve(S.reprice(id, S.toBase(v))).then(() => { s2.close(); ui.toast(t('d_reprice_ok')); dash.sig = ''; draw(); if (tab === 'mine') render(); }, (er) => ui.toast(ui.errText(er))); };
      } else if (a.dataset.a === 'sample') { Promise.resolve(S.placeSample(id)).then(() => ui.toast(t('d_sample_ok')), (er) => ui.toast(ui.errText(er))); }
      else if (a.dataset.a === 'remove') { Promise.resolve(S.takeDown(id)).then(() => { dash.sig = ''; draw(); if (tab === 'mine') render(); }, (er) => ui.toast(ui.errText(er))); }
    };
  }

  QL.post = {
    render,
    onSim() { if (dash && !dash.sh.closed) dash.draw(); if ($('#app').dataset.page === 'post' && tab === 'mine' && !dash) { const y = $('#pg-post').scrollTop; render(); $('#pg-post').scrollTop = y; } },
    /* 从房间里选一件出闲置 */
    startResell(invId, stay) {
      const it = S.s.inv.find((x) => x.id === invId); if (!it) return;
      const p = S.product(it.pid);
      d = Object.assign(blank(), { kind: 'used', fromInv: invId, art: p.art || null, pic: p.pic || null, sid: p.pic ? (p.sid || p.id) : null, imgs: p.art || p.pic ? [] : (p.img || []).map((k) => S.img(k)), title: L(p.title).replace(/（闲置）|\(pre-loved\)| \(pre-loved\)/gi, '').trim(), price: String(S.fromBase(Math.max(1, Math.round(it.paid * 0.7)))), desc: '', cat: p.cat, frame: !!p.frame, bg: p.bg, rh: p.rh, ref: it.paid, whole: p.sticker ? S.img(p.sticker) : null, useCut: false });
      tab = 'new';
      if (stay) render(); else QL.app.go('post');
    },
  };
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if ($('#app').dataset.page === 'post') { const w = root.classList.contains('wide'); if (w !== (wide() && tab === 'new')) render(); } }, 150); });
})();
