/* 钱来 — 界面：公共部件、刷卡页、登录引导、钱包、设置 */
(function () {
  const QL = window.QL, S = QL.store, G = QL.gfx;
  const t = (k, v) => QL.i18n.t(k, v), L = (o) => QL.i18n.L(o);
  const $ = (q, el) => (el || document).querySelector(q), $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const appEl = $('#app'), fx = $('#fx');
  const ui = (QL.ui = { $, $$, esc, t, L });
  const App = (QL.app = {});

  /* ---------- 公共部件 ---------- */
  ui.priceHTML = (base) => `<span class="cur">${S.sym()}</span>${S.num(base)}`;
  ui.picHTML = function (p, cls, url) {
    url = url || G.cardURL(p);
    const kind = p.frame ? 'framed' : p.art ? '' : p.pic ? 'cut' : 'photo';
    return `<div class="${cls || 'pic'} ${kind}" style="background:${p.bg || '#F3EEE6'}"><img src="${url}" alt="" draggable="false"${kind === 'photo' ? ' onload="QL.gfx.edge(this)"' : ''}></div>`;
  };
  ui.thumbHTML = (p, cls) => `<div class="${cls || 'thumb'} ${p.art || p.pic ? '' : 'photo'}" style="background:${p.bg || '#F3EEE6'}"><img src="${G.cardURL(p)}" alt=""></div>`;
  ui.chipHTML = (p) => (p.kind === 'used' ? `<span class="chip used">${t('chip_used')}</span>` : `<span class="chip">${t('chip_new')}</span>`);
  ui.cardFront = function (p, url) {
    return `${ui.picHTML(p, 'pic', url)}<div class="meta"><div class="chips">${ui.chipHTML(p)}<span>${esc(L(p.seller))}</span></div>
      <h2 class="title">${esc(L(p.title))}</h2><p class="desc">${esc(L(p.desc))}</p><div class="price">${ui.priceHTML(p.price)}</div></div>`;
  };
  ui.date = (ts) => new Date(ts).toLocaleDateString(QL.i18n.lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let toastT = 0;
  ui.toast = function (msg, ms) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2600);
  };

  /* 底部弹层（手机）/ 居中弹窗（电脑） */
  const stack = [];
  ui.sheet = function (o) {
    const wrap = document.createElement('div'); wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet ${o.cls || ''}">${o.bare ? '' : `<div class="sheet-h"><h3>${o.title || ''}</h3><button class="x" aria-label="close">✕</button></div>`}<div class="sheet-b"></div></div>`;
    $('#sheets').appendChild(wrap);
    const body = $('.sheet-b', wrap), api = { el: wrap, body, closed: false };
    api.close = function (silent) {
      if (api.closed) return; api.closed = true;
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 340);
      if (!silent && o.onClose) o.onClose();
    };
    api.set = (html) => { body.innerHTML = html; };
    if (o.html) body.innerHTML = o.html;
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && !o.lock) api.close(); });
    const x = $('.x', wrap); if (x) x.onclick = () => api.close();
    stack.push(api);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    return api;
  };
  ui.closeAll = () => stack.slice().forEach((a) => a.close(true));
  ui.sheetOpen = () => stack.length > 0;

  ui.refreshTop = function (bump) {
    $('#bal').textContent = S.authed() ? S.fmt(S.s.w.bal) : t('s_signin');
    G.avatar($('#me-av'), S.s.user ? S.s.user.char : null);
    if (bump) { const p = $('#btn-wallet'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  };

  ui.fly = function (p, fromEl) {
    return G.stickerURL(p).then((url) => {
      const a = fromEl.getBoundingClientRect(), b = $('#tab-room').getBoundingClientRect(), r0 = appEl.getBoundingClientRect();
      const size = Math.min(a.width, a.height) * 0.46, cx = a.left + a.width / 2, cy = a.top + a.height * 0.36;
      const img = new Image(); img.src = url; img.className = 'fly';
      Object.assign(img.style, { left: cx - size / 2 - r0.left + 'px', top: cy - size / 2 - r0.top + 'px', width: size + 'px', height: size + 'px' });
      fx.appendChild(img);
      const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
      const an = img.animate([
        { transform: 'translate(0,0) scale(.6) rotate(0deg)', opacity: 0 },
        { transform: 'translate(0,-30px) scale(1) rotate(-8deg)', opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px,${dy}px) scale(.14) rotate(18deg)`, opacity: 1 },
      ], { duration: 820, easing: 'cubic-bezier(.45,0,.25,1)' });
      an.onfinish = () => { img.remove(); const tab = $('#tab-room'); tab.classList.remove('pop'); void tab.offsetWidth; tab.classList.add('pop'); };
    }).catch(() => { });
  };
  ui.confetti = function (x, y) {
    const cols = ['#F2B33D', '#F28C6B', '#8CC4EE', '#7CC489', '#B8A7E8', '#F6B8C4'];
    for (let i = 0; i < 44; i++) {
      const c = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
      c.className = 'conf'; c.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 60}px;--rot:${Math.random() * 720 - 360}deg`;
      fx.appendChild(c); setTimeout(() => c.remove(), 1200);
    }
  };
  ui.payday = function (amount, n, label, cb) {
    const el = document.createElement('div'); el.className = 'payday';
    el.innerHTML = `<h2>${t('payday_title')}</h2><div class="amt">+${S.sym()}<span>0</span></div><p>${n > 1 ? t('payday_sub_n', { n }) : t('payday_sub')}</p><button class="b1">${label || t('payday_ok')}</button>`;
    for (let i = 0; i < 30; i++) { const c = document.createElement('i'); c.className = 'rain'; c.style.cssText = `left:${Math.random() * 100}%;animation-duration:${1.5 + Math.random() * 1.6}s;animation-delay:${Math.random() * 1.2}s;width:${18 + Math.random() * 16}px;height:auto;aspect-ratio:1`; el.appendChild(c); }
    appEl.appendChild(el);
    const sp = $('.amt span', el), t0 = performance.now();
    (function tick(now) { const k = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3); sp.textContent = S.num(amount * e); if (k < 1) requestAnimationFrame(tick); })(t0);
    $('button', el).onclick = () => { el.remove(); ui.refreshTop(true); if (cb) cb(); };
  };

  /* ---------- 刷卡页 ---------- */
  const deck = $('#deck'), pgSwipe = $('#pg-swipe'), nextBtn = $('#btn-next');
  let feed = [], cur = null, curEl = null, phase = 'idle', snap = null, lastRes = null, pin = null;

  function cardEl(p, cls) {
    const el = document.createElement('div'); el.className = 'card ' + (cls || '');
    el.innerHTML = `<div class="flip"><div class="face front">${ui.cardFront(p)}<button class="more">${t('details')}</button><div class="stamp s-buy">Buy</div><div class="stamp s-bye">Bye</div></div><div class="face back"></div></div>`;
    return el;
  }
  function renderDeck(enter) {
    feed = S.feed();
    if (pin) { const i = feed.findIndex((p) => p.id === pin); if (i > 0) feed.unshift(feed.splice(i, 1)[0]); pin = null; }
    cur = feed[0] || null; curEl = null; phase = 'idle';
    pgSwipe.classList.remove('revealing'); deck.innerHTML = '';
    pgSwipe.classList.toggle('is-empty', !cur);
    if (!cur) {
      const hasBye = Object.values(S.s.dec).some((d) => d.d === 'bye');
      deck.innerHTML = `<div class="empty"><h3>${t('empty_title')}</h3><p>${t('empty_sub')}</p><div class="col"><button class="b1" data-a="post">${t('btn_list_one')}</button><button class="b2" data-a="room">${t('btn_see_room')}</button>${hasBye ? `<button class="b3" data-a="again">${t('empty_again')}</button>` : ''}</div></div>`;
      deck.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'again') { S.redoByes(); renderDeck(true); } else App.go(a.dataset.a); };
      return;
    }
    deck.onclick = null;
    if (feed[1]) deck.appendChild(cardEl(feed[1], 'next'));
    curEl = cardEl(cur, enter ? 'enter' : ''); deck.appendChild(curEl); bindCard(curEl);
  }
  function bindCard(el) {
    let sx = 0, sy = 0, dx = 0, drag = false, moved = false, t0 = 0, pid = null;
    const sb = $('.s-buy', el), sy2 = $('.s-bye', el);
    const reset = () => { el.style.transition = 'transform .32s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; sb.style.opacity = sy2.style.opacity = 0; };
    el.addEventListener('pointerdown', (e) => {
      if (phase !== 'idle' || e.target.closest('.more')) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; drag = true; moved = false; t0 = performance.now();
      try { el.setPointerCapture(pid); } catch (er) { } el.style.transition = 'none';
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== pid) return;
      dx = e.clientX - sx; const dy = e.clientY - sy;
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) moved = true;
      el.style.transform = `translate(${dx}px,${dy * 0.2}px) rotate(${dx / 24}deg)`;
      sb.style.opacity = Math.max(0, Math.min(1, dx / 90)); sy2.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const end = (e) => {
      if (!drag || (e.pointerId !== pid)) return; drag = false;
      const th = Math.min(120, deck.clientWidth * 0.26);
      reset();
      if (dx > th) choose('buy'); else if (dx < -th) choose('bye');
      else if (!moved && performance.now() - t0 < 450 && e.type === 'pointerup') openDetail(cur);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    $('.more', el).onclick = () => openDetail(cur);
    $('.back', el).addEventListener('click', (e) => { if (phase === 'reveal' && !e.target.closest('.wtp')) advance(); });
  }

  function choose(kind) {
    if (phase !== 'idle' || !cur || ui.sheetOpen()) return;
    if (kind === 'buy') {
      if (!S.authed()) { const id = cur.id; QL.onboard.start(() => { if (cur && cur.id === id) choose('buy'); }); return; }
      if (S.s.w.bal < cur.price - 1e-6) { const b = $('#btn-buy'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); openShort(cur); return; }
    }
    snap = S.snapshot();
    const id = cur.id, r = S.decide(id, kind);
    if (!r || typeof r.then !== 'function') { lastRes = r; reveal(r); return; }
    phase = 'busy'; pgSwipe.classList.add('busy');
    r.then((res) => { pgSwipe.classList.remove('busy'); if (!cur || cur.id !== id) return; lastRes = res; reveal(res); })
      .catch((e) => {
        pgSwipe.classList.remove('busy'); phase = 'idle'; snap = null;
        ui.toast(ui.errText(e));
        if (e.code === 'insufficient') { ui.refreshTop(true); openShort(cur); }
        else if (['sold', 'gone', 'own', 'already'].includes(e.code)) { S.s.hide[id] = 1; renderDeck(true); }
      });
  }
  ui.errText = (e) => { const k = 'err_' + ((e && e.code) || 'net'), m = t(k); return m === k ? t('err_net') : m; };
  function wtpHTML() {
    return `<form class="wtp"><label>${t('rv_wtp_q')}</label><div class="row"><div class="inp"><span>${S.sym()}</span><input inputmode="decimal" autocomplete="off" maxlength="10"></div><button type="submit">${t('rv_wtp_send')}</button></div></form>`;
  }
  function backHTML(r) {
    const p = r.p, a = r.after, n = a.b.toLocaleString('en-US');
    if (p.kind === 'used') {
      if (r.kind === 'buy') return `<img class="rv-art" src="${G.cardURL(p)}" alt=""><div class="rv-big">${t('rv_used_buy')}</div><div class="rv-sub">${t(r.inv.slot >= 0 ? 'rv_in_room' : 'rv_in_storage')}</div>`;
      return `<div class="rv-big">${t('rv_used_bye')}</div><div class="rv-sub">${t('rv_used_bye_sub')}</div>${wtpHTML()}`;
    }
    let h = `<div class="rv-big">${t(r.kind === 'buy' ? 'rv_you_nth' : 'rv_n_want', { n })}</div>`;
    if (p.target) {
      const pct = Math.floor(a.pct * 100), left = p.target - a.intent;
      h += `<div class="bar ${r.reached ? 'done' : ''}"><i data-w="${Math.min(100, pct)}"></i></div>
        <div class="rv-pct"><span>${pct}%</span><span>${r.reached ? t('rv_reached') : ''}</span></div>
        <div class="rows"><div><span>${t('rv_goal')}</span><b>${S.fmt(p.target)}</b></div><div><span>${t('rv_got')}</span><b>${S.fmt(a.intent)}</b></div><div><span>${t(left > 0 ? 'rv_left' : 'rv_over')}</span><b>${S.fmt(Math.abs(left))}</b></div></div>`;
      if (r.tipped) h += `<div class="rv-sub" style="margin-top:14px;color:var(--good);font-weight:700">${t('rv_tipped')}</div>`;
      else if (r.reached) h += `<div class="rv-sub" style="margin-top:14px">${t('rv_reached_sub')}</div>`;
    } else {
      h += `<div class="rv-sub">${t('rv_rate', { v: a.v.toLocaleString('en-US'), pct: Math.round(a.rate * 100) })}</div>`;
    }
    if (r.kind === 'buy') h += `<div class="rv-sub" style="margin-top:14px">${t(r.inv.slot >= 0 ? 'rv_in_room' : 'rv_in_storage')}</div>`;
    else h += wtpHTML();
    return h;
  }
  function countdown(ms) {
    nextBtn.classList.remove('run', 'paused'); void nextBtn.offsetWidth;
    $('i', nextBtn).style.animationDuration = ms + 'ms'; nextBtn.classList.add('run');
  }
  function reveal(r) {
    phase = 'reveal';
    const back = $('.back', curEl); back.innerHTML = backHTML(r);
    curEl.classList.add('flipped'); pgSwipe.classList.add('revealing'); $('#btn-undo').hidden = !S.canUndo(r);
    ui.refreshTop(r.kind === 'buy');
    const bar = $('.bar i', back); if (bar) setTimeout(() => (bar.style.width = bar.dataset.w + '%'), 60);
    if (r.tipped) setTimeout(() => { const b = curEl.getBoundingClientRect(), r0 = appEl.getBoundingClientRect(); ui.confetti(b.left + b.width / 2 - r0.left, b.top + b.height * 0.4 - r0.top); }, 900);
    const form = $('.wtp', back);
    if (form) {
      const inp = $('input', form);
      inp.addEventListener('focus', () => nextBtn.classList.add('paused'));
      inp.addEventListener('blur', () => { if (!inp.value) nextBtn.classList.remove('paused'); });
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const v = parseFloat(inp.value);
        if (!(v > 0)) { inp.focus(); return; }
        S.setWtp(r.p.id, S.toBase(v)); inp.blur();
        form.innerHTML = `<div class="ok">✓ ${t('rv_wtp_thanks')}</div>`; countdown(1300);
      });
    }
    countdown(r.kind === 'buy' ? (r.tipped ? 5200 : 3600) : 6500);
  }
  function advance() {
    if (phase !== 'reveal') return; phase = 'leaving';
    nextBtn.classList.remove('run', 'paused');
    const el = curEl, r = lastRes;
    if (r && r.kind === 'buy') { ui.fly(r.p, el); el.style.transition = 'transform .38s ease-in,opacity .38s'; el.style.transform = 'scale(.82) translateY(30px)'; el.style.opacity = 0; }
    else { el.style.transition = 'transform .36s ease-in,opacity .36s'; el.style.transform = 'translateX(-110%) rotate(-10deg)'; el.style.opacity = 0; }
    setTimeout(() => renderDeck(true), 300);
  }
  nextBtn.addEventListener('animationend', (e) => { if (e.target.tagName === 'I') advance(); });
  nextBtn.onclick = advance;
  $('#btn-undo').onclick = () => {
    if (phase !== 'reveal' || !snap) return;
    S.restore(snap); snap = null; phase = 'idle'; nextBtn.classList.remove('run', 'paused');
    curEl.classList.remove('flipped'); pgSwipe.classList.remove('revealing'); ui.refreshTop(true);
  };
  $('#btn-buy').onclick = () => choose('buy');
  $('#btn-bye').onclick = () => choose('bye');

  function openShort(p) {
    const sh = ui.sheet({
      title: t('short_title'),
      html: `<p class="d-desc" style="margin-top:0">${t('short_sub', { x: S.fmt(p.price - S.s.w.bal), d: S.dur(S.nextCredit()), w: S.fmt(S.s.w.weekly) })}</p>
        <div class="btnrow" style="flex-direction:column"><button class="b1" data-a="wish">${t('short_wish')}</button><button class="b2" data-a="bye">${t('short_bye')}</button></div>`,
    });
    sh.body.onclick = (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return; sh.close();
      if (a.dataset.a === 'wish') {
        Promise.resolve(S.decide(p.id, 'wish')).then(() => ui.toast(t('wish_saved')), (er) => ui.toast(ui.errText(er)));
        if (curEl) { curEl.style.transition = 'transform .36s ease-in,opacity .36s'; curEl.style.transform = 'translateY(60%) scale(.9)'; curEl.style.opacity = 0; }
        phase = 'leaving'; setTimeout(() => renderDeck(true), 300);
      } else setTimeout(() => choose('bye'), 50);
    };
  }
  function openDetail(p) {
    if (!p || phase !== 'idle') return;
    const imgs = !p.art && p.img && p.img.length > 1 ? `<div class="ph-row" style="margin-top:10px">${p.img.slice(1).map((k) => `<div class="ph"><img src="${S.img(k)}" alt=""></div>`).join('')}</div>` : '';
    const sh = ui.sheet({
      title: '', html: `${ui.picHTML(p, 'hero')}${imgs}<div class="chips" style="margin-top:16px">${ui.chipHTML(p)}<span>${esc(L(p.seller))}</span></div>
        <div class="d-title">${esc(L(p.title))}</div><div class="d-price">${S.fmt(p.price)}</div><p class="d-desc">${esc(L(p.desc))}</p>
        <div class="sec"><div class="list"><div class="li"><div class="g">${t('p_cat')}</div><div class="v">${t('cat_' + p.cat)}</div></div></div></div><button class="report" id="d-rep">${t('rep_btn')}</button>`,
    });
    $('#d-rep', sh.body).onclick = () => { sh.close(); openReport(p); };
  }
  function openReport(p) {
    const sh = ui.sheet({ title: t('rep_title'), html: `<p class="hint" style="margin:0 0 12px">${t('rep_sub')}</p><div class="list">${['illegal', 'porn', 'ip', 'fake', 'other'].map((k) => `<button class="li" data-r="${k}"><div class="g">${t('rep_' + k)}</div><div class="v">→</div></button>`).join('')}</div>` });
    sh.body.onclick = (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      Promise.resolve(S.report(p.id, b.dataset.r)).catch(() => { }); sh.close(); ui.toast(t('rep_done'));
      if (cur && cur.id === p.id && curEl) { curEl.style.transition = 'transform .36s ease-in,opacity .36s'; curEl.style.transform = 'translateY(60%) scale(.9)'; curEl.style.opacity = 0; phase = 'leaving'; setTimeout(() => renderDeck(true), 300); }
    };
  }
  ui.doc = (kind) => ui.sheet({ title: t(kind + '_title'), html: `<div class="doc">${t(kind + '_html')}</div>` });
  App.showFirst = (pid) => { pin = pid; App.go('swipe'); };

  /* ---------- 导航 ---------- */
  App.go = function (pg) {
    if (pg === 'post' && !S.authed()) { QL.onboard.start(() => App.go('post')); return; }
    const prev = appEl.dataset.page; appEl.dataset.page = pg;
    $$('#tabbar .tab').forEach((b) => b.classList.toggle('on', b.dataset.go === pg));
    if (prev === 'room' && pg !== 'room') QL.roomui.leave();
    if (pg === 'swipe' && (phase === 'idle' || prev !== 'swipe')) renderDeck(prev !== 'swipe');
    if (pg === 'post') QL.post.render();
    if (pg === 'room') QL.roomui.enter();
  };
  $('#tabbar').onclick = (e) => { const b = e.target.closest('.tab'); if (b) App.go(b.dataset.go); };
  $('#brand').onclick = () => App.go('swipe');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.sheetOpen()) { const top = $('#sheets').lastElementChild; const x = top && $('.x', top); if (x) x.click(); return; }
    if (appEl.dataset.page !== 'swipe' || ui.sheetOpen() || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
    if (phase === 'reveal') { if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); advance(); } return; }
    if (e.key === 'ArrowLeft') choose('bye'); else if (e.key === 'ArrowRight') choose('buy'); else if (e.key === ' ') { e.preventDefault(); openDetail(cur); }
  });

  /* ---------- 登录引导 ---------- */
  function charEditor(ch, withGender) {
    const Lk = QL.LOOK, sw = (key, arr, bg) => `<div class="swl">${t('ob_' + key)}</div><div class="sw" data-k="${key}">${arr.map((c, i) => `<button data-i="${i}" class="${(ch[key] || 0) === i ? 'on' : ''}" style="background:${bg(c)}"></button>`).join('')}</div>`;
    return `${withGender ? `<div class="chars"><button data-g="f" class="${ch.gender !== 'm' ? 'on' : ''}"><canvas class="px"></canvas>${t('ob_girl')}</button><button data-g="m" class="${ch.gender === 'm' ? 'on' : ''}"><canvas class="px"></canvas>${t('ob_boy')}</button></div>` : ''}
      ${sw('outfit', Lk.outfits, (o) => `linear-gradient(180deg,${o.top} 55%,${o.bottom} 55%)`)}${sw('hair', Lk.hair, (c) => c)}${sw('skin', Lk.skin, (c) => c)}`;
  }
  function bindCharEditor(root, ch, onChange) {
    const draw = () => $$('.chars button', root).forEach((b) => G.avatar($('canvas', b), Object.assign({}, ch, { gender: b.dataset.g })));
    draw();
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]'), s = e.target.closest('.sw button');
      if (g) { ch.gender = g.dataset.g; $$('.chars button', root).forEach((b) => b.classList.toggle('on', b === g)); }
      else if (s) { const k = s.parentNode.dataset.k; ch[k] = +s.dataset.i; $$('button', s.parentNode).forEach((b) => b.classList.toggle('on', b === s)); }
      else return;
      draw(); if (onChange) onChange();
    });
  }
  QL.onboard = {
    start(cb) {
      const cloud = S.cloud;
      let step = S.s.user ? 2 : 1, email = '', busy = false;
      const ch = Object.assign({ gender: 'f', outfit: 0, hair: 1, skin: 0 }, S.s.user ? S.s.user.char : {});
      let name = S.s.user ? S.s.user.name || '' : '';
      const sh = ui.sheet({ cls: 'full', bare: true, lock: true });
      const steps = (n) => `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
      const closeBtn = `<button class="x" style="position:absolute;top:calc(14px + var(--sat));right:16px">✕</button>`;
      const wait = (btn, p) => { busy = true; btn.disabled = true; const old = btn.textContent; btn.textContent = '…'; return p.finally(() => { busy = false; btn.disabled = false; btn.textContent = old; }); };
      const finish = () => { sh.close(true); App.refresh(); if (cb) cb(); };
      function render() {
        if (step === 1) {
          sh.set(`${closeBtn}<div class="ob">${steps(1)}<h2>${t('ob_login_title')}</h2><p>${t('ob_login_sub')}</p>
            <div class="fld"><label>${t('ob_email')}</label><input class="in" id="ob-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(email)}"></div>
            ${cloud ? '' : `<div class="fld"><label>${t('ob_name')}</label><input class="in" id="ob-name" maxlength="16" placeholder="${t('ob_name_ph')}"></div>`}
            <button class="b1" id="ob-go">${t(cloud ? 'ob_send' : 'ob_next')}</button>${cloud ? `<p class="rules">${t('ob_agree')}<button data-doc="rules">${t('rules_name')}</button> <button data-doc="privacy">${t('privacy_title')}</button></p>` : `<div class="note">${t('ob_local_note')}</div>`}</div>`);
          const go = $('#ob-go', sh.body);
          go.onclick = () => {
            if (busy) return;
            const em = $('#ob-email', sh.body).value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return ui.toast(t('ob_bad_email'));
            if (!cloud) { const nm = $('#ob-name', sh.body).value.trim(); if (!nm) return ui.toast(t('ob_bad_name')); S.login(em, nm); step = 2; return render(); }
            email = em;
            wait(go, S.sendCode(em)).then(() => { step = 'code'; render(); }, (er) => ui.toast(ui.errText(er)));
          };
          $('#ob-email', sh.body).onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
        } else if (step === 'code') {
          sh.set(`${closeBtn}<div class="ob">${steps(1)}<h2>${t('ob_code_title')}</h2><p>${t('ob_code_sub', { email: esc(email) })}</p>
            <div class="fld"><input class="in" id="ob-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" style="text-align:center;font:800 30px var(--round);letter-spacing:.3em;height:64px"></div>
            <button class="b1" id="ob-go">${t('ob_verify')}</button>
            <p class="rules">${t('ob_spam')}</p><button class="b3" id="ob-back">${t('ob_change_email')}</button></div>`);
          const go = $('#ob-go', sh.body), inp = $('#ob-code', sh.body);
          setTimeout(() => inp.focus(), 50);
          go.onclick = () => {
            if (busy) return;
            const code = inp.value.replace(/\D/g, ''); if (code.length < 6) return ui.toast(t('ob_bad_code'));
            wait(go, S.verifyCode(email, code)).then((r) => {
              if (!r.isNew) { ui.toast(t('ob_welcome_back')); return finish(); }
              name = S.s.user.name || ''; Object.assign(ch, S.s.user.char || {}); step = 2; render();
            }, (er) => ui.toast(ui.errText(er)));
          };
          inp.oninput = () => { if (inp.value.replace(/\D/g, '').length >= 6) go.click(); };
          $('#ob-back', sh.body).onclick = () => { step = 1; render(); };
        } else if (step === 2) {
          sh.set(`${closeBtn}<div class="ob">${steps(2)}<h2>${t('ob_char_title')}</h2>
            ${cloud ? `<div class="fld" style="margin:6px 0 4px"><input class="in" id="ob-name" maxlength="16" placeholder="${t('ob_name_ph')}" value="${esc(name)}" style="text-align:center"></div>` : ''}
            ${charEditor(ch, true)}<button class="b1" id="ob-go">${t('ob_next')}</button></div>`);
          bindCharEditor(sh.body, ch);
          $('#ob-go', sh.body).onclick = () => {
            if (cloud) { name = $('#ob-name', sh.body).value.trim(); if (!name) return ui.toast(t('ob_bad_name')); }
            else S.setChar(ch);
            step = 3; render();
          };
        } else {
          const qv = S.s.set.cur === 'CNY' || S.s.set.cur === 'HKD' ? [100, 300, 500, 1000] : S.s.set.cur === 'JPY' ? [2000, 5000, 10000, 20000] : S.s.set.cur === 'KRW' ? [20000, 50000, 100000, 200000] : [20, 50, 100, 200];
          sh.set(`${closeBtn}<div class="ob">${steps(3)}<h2>${t('ob_budget_title').replace('\n', '<br>')}</h2><p>${t('ob_budget_sub')}</p>
            <div class="fld"><div class="money"><span>${S.sym()}</span><input id="ob-bud" inputmode="decimal" autocomplete="off" maxlength="9" placeholder="0"></div></div>
            <div class="quick">${qv.map((v) => `<button data-v="${v}">${S.sym()}${v.toLocaleString('en-US')}</button>`).join('')}</div>
            <button class="b1" id="ob-go">${t('ob_start')}</button></div>`);
          const inp = $('#ob-bud', sh.body), go = $('#ob-go', sh.body);
          $('.quick', sh.body).onclick = (e) => { const b = e.target.closest('button'); if (b) inp.value = b.dataset.v; };
          go.onclick = () => {
            if (busy) return;
            const v = parseFloat(inp.value); if (!(v > 0)) return ui.toast(t('ob_bad_budget'));
            const base = S.toBase(v);
            const pay = () => { sh.close(true); ui.payday(base, 1, t('payday_go'), () => { App.refresh(); if (cb) cb(); }); };
            if (!cloud) { S.setWeekly(base, true); return pay(); }
            wait(go, S.setup(name, ch, base)).then(pay, (er) => ui.toast(ui.errText(er)));
          };
        }
        const x = $('.x', sh.body); if (x) x.onclick = () => { sh.close(true); ui.refreshTop(); };
        sh.body.querySelectorAll('[data-doc]').forEach((d) => (d.onclick = () => ui.doc(d.dataset.doc)));
      }
      render();
    },
  };

  /* ---------- 钱包 ---------- */
  function openWallet() {
    if (!S.authed()) { QL.onboard.start(); return; }
    const sh = ui.sheet({ title: t('w_title') });
    function render() {
      const w = S.s.w, wish = S.wishes();
      const led = w.led.slice(0, 40).map((e) => {
        const p = e.pid ? S.product(e.pid) : null;
        const name = e.k === 'credit' ? t('l_credit') : e.k === 'first' ? t('l_first') : (e.k === 'buy' ? t('l_buy') : t('l_sale')) + (p ? ' · ' + esc(L(p.title)) : '');
        return `<div class="li"><div class="g">${name}<small>${ui.date(e.t)}</small></div><div class="v ${e.a > 0 ? 'plus' : ''}">${e.a > 0 ? '+' : ''}${S.fmt(e.a)}</div></div>`;
      }).join('');
      sh.set(`<div class="hint">${t('w_balance')}</div><div class="bigbal">${S.fmt(w.bal)}</div>
        <div class="kv"><div><small>${t('w_weekly')}</small><b>${S.fmt(w.weekly)}</b></div><div><small>${t('w_next')}</small><b>${S.dur(S.nextCredit())}</b></div></div>
        ${S.canChange() ? `<div class="btnrow"><button class="b2 sm" id="w-chg">${t('w_change')}</button></div>` : `<div class="note">${t('w_change_wait', { d: S.dur(S.changeWait()) })}</div>`}
        ${wish.length ? `<div class="sec"><h4>${t('w_wish')}</h4><div class="list">${wish.map((p) => `<div class="li">${ui.thumbHTML(p)}<div class="g">${esc(L(p.title))}</div><div class="v">${S.fmt(p.price)}</div></div>`).join('')}</div></div>` : ''}
        <div class="sec"><h4>${t('w_ledger')}</h4><div class="list">${led || `<div class="li"><div class="g" style="color:var(--ink2)">${t('w_empty')}</div></div>`}</div></div>`);
      const c = $('#w-chg', sh.body);
      if (c) c.onclick = () => {
        const s2 = ui.sheet({ title: t('w_change'), html: `<div class="money"><span>${S.sym()}</span><input id="w-in" inputmode="decimal" maxlength="9" value="${S.fromBase(w.weekly)}"></div><p class="hint">${t('ob_budget_sub')}</p><div class="btnrow"><button class="b1" id="w-save">${t('w_save')}</button></div>` });
        $('#w-save', s2.body).onclick = () => { const v = parseFloat($('#w-in', s2.body).value); if (!(v > 0)) return ui.toast(t('ob_bad_budget')); Promise.resolve(S.setWeekly(S.toBase(v), false)).then(() => { s2.close(); ui.toast(t('w_changed')); render(); ui.refreshTop(); }, (er) => ui.toast(ui.errText(er))); };
      };
    }
    render();
  }
  $('#btn-wallet').onclick = openWallet;

  /* ---------- 设置 ---------- */
  function openSettings() {
    const sh = ui.sheet({ title: t('s_title') });
    const u = S.s.user;
    sh.set(`${u ? `<button class="li list" id="s-me" style="border-radius:18px"><canvas class="px" width="16" height="18" style="width:40px;height:45px;background:var(--gold2);border-radius:12px;padding:3px 3px 0"></canvas><div class="g"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div><div class="v" style="color:var(--ink2);font-weight:600">${t('s_edit')}</div></button>`
      : `<button class="b1" id="s-in" style="width:100%">${t('s_signin')}</button>`}
      <div class="sec"><div class="list">
        <div class="li"><div class="g">${t('s_lang')}</div><select id="s-lang"><option value="zh">中文</option><option value="en">English</option></select></div>
        <div class="li"><div class="g">${t('s_cur')}</div><select id="s-cur">${Object.keys(S.CUR).map((k) => `<option value="${k}">${S.CUR[k].label}</option>`).join('')}</select></div>
      </div></div>
      <div class="sec"><div class="list">
        <button class="li" data-doc="rules"><div class="g">${t('rules_title')}</div><div class="v">→</div></button>
        <button class="li" data-doc="privacy"><div class="g">${t('privacy_title')}</div><div class="v">→</div></button>
        ${!S.cloud || S.isAdmin ? `<a class="li" href="admin.html" target="_blank" style="text-decoration:none;color:inherit"><div class="g">${t('s_admin')}<small>${t('s_admin_sub')}</small></div><div class="v">↗</div></a>` : ''}
      </div></div>
      ${S.cloud ? (u ? `<div class="sec"><div class="list"><button class="li danger" id="s-out"><div class="g">${t('s_signout')}</div></button></div></div>` : '') : `<div class="sec"><h4>${t('s_debug')}</h4><div class="list">
        <button class="li" id="s-ff"><div class="g">${t('s_ff')}<small>${t('s_ff_sub')}</small></div><div class="v">→</div></button>
        <button class="li danger" id="s-reset"><div class="g">${t('s_reset')}</div></button>
      </div></div>`}
      <div class="note">${t(S.cloud ? 's_about_live' : 's_about_txt')}</div>`);
    sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-doc]'); if (b) ui.doc(b.dataset.doc); });
    const me = $('#s-me', sh.body); if (me) { G.avatar($('canvas', me), u.char); me.onclick = () => { sh.close(); openProfile(); }; }
    const si = $('#s-in', sh.body); if (si) si.onclick = () => { sh.close(); QL.onboard.start(); };
    const sl = $('#s-lang', sh.body), sc = $('#s-cur', sh.body); sl.value = S.s.set.lang; sc.value = S.s.set.cur;
    sl.onchange = () => { S.setLang(sl.value); sh.close(); App.refresh(); openSettings(); };
    sc.onchange = () => { S.setCur(sc.value); sh.close(); App.refresh(); openSettings(); };
    const ff = $('#s-ff', sh.body); if (ff) ff.onclick = () => { S.fastForward(); sh.close(); ui.toast(t('ff_done')); checkCredit(); App.refresh(); };
    const rs = $('#s-reset', sh.body); if (rs) rs.onclick = () => { if (confirm(t('s_reset_q'))) { S.resetAll(); ui.closeAll(); App.refresh(); App.go('swipe'); } };
    const so = $('#s-out', sh.body); if (so) so.onclick = () => { if (!confirm(t('s_signout_q'))) return; S.signOut().then(() => { ui.closeAll(); App.refresh(); App.go('swipe'); }); };
  }
  function openProfile() {
    const u = S.s.user, ch = Object.assign({}, u.char);
    const sh = ui.sheet({ title: t('s_char'), html: `<div class="fld" style="margin-top:4px"><label>${t('s_name')}</label><input class="in" id="pf-name" maxlength="16" value="${esc(u.name)}"></div><div style="text-align:center">${charEditor(ch, true)}</div><div class="btnrow"><button class="b1" id="pf-ok">${t('s_done')}</button></div>` });
    bindCharEditor(sh.body, ch);
    $('#pf-ok', sh.body).onclick = () => { const nm = $('#pf-name', sh.body).value.trim(); if (nm && nm !== u.name) { if (S.setName) S.setName(nm); else { u.name = nm; S.save(); } } S.setChar(ch); sh.close(); App.refresh(); };
  }
  $('#btn-me').onclick = openSettings;

  /* ---------- 启动 ---------- */
  function applyI18n() {
    $$('[data-i18n]').forEach((e) => (e.textContent = t(e.dataset.i18n)));
    $('#keys').innerHTML = t('keys_hint');
  }
  let crediting = false;
  function checkCredit() {
    if (crediting) return; crediting = true;
    Promise.resolve(S.checkCredit()).then((c) => { if (c) ui.payday(c.amount, c.n, t('payday_ok'), () => App.refresh()); }).catch(() => { }).then(() => (crediting = false));
  }
  App.refresh = function () {
    applyI18n(); ui.refreshTop();
    const pg = appEl.dataset.page;
    if (pg === 'swipe') { if (phase === 'idle' || phase === 'leaving') renderDeck(); }
    else if (pg === 'post') QL.post.render();
    else if (pg === 'room') QL.roomui.reload();
  };
  App.boot = function () {
    S.init().then(() => {
      applyI18n(); ui.refreshTop();
      const m = /[#&]r=([A-Za-z0-9]{4,8})/.exec(location.hash);
      if (m) { history.replaceState(null, '', location.pathname + location.search); App.go('room'); QL.roomui.visitCode(m[1]); } else App.go('swipe');
      checkCredit();
      setInterval(() => {
        const ev = S.simTick();
        ev.forEach((e) => { if (e.type === 'sold') { ui.toast(t('sold_toast', { t: L(e.l.title), x: S.fmt(e.l.price) }), 4200); ui.refreshTop(true); if (appEl.dataset.page === 'room') QL.roomui.reload(); } });
        QL.post.onSim();
      }, 3500);
      setInterval(checkCredit, 30000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkCredit(); });
      window.addEventListener('storage', (e) => { if (S.reloadIf(e)) App.refresh(); });
    });
  };
})();
