/* 钱来 — 图像工具：商品图、贴纸（白边）、抠图、像素小人头像 */
(function () {
  const QL = window.QL;
  const G = (QL.gfx = {});
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  G.cv = cv;
  G.load = (src) => new Promise((res, rej) => { const i = new Image(); if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = src; });

  /* 裁掉四周透明边 */
  G.trim = function (c) {
    try {
      const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) return c;
      const o = cv(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, -x0, -y0); return o;
    } catch (e) { return c; }
  };

  /* 给带透明通道的图加一圈白边，做成贴纸 */
  G.outline = function (src, pad) {
    pad = pad || Math.round(Math.max(src.width, src.height) * 0.045) + 2;
    const w = src.width + pad * 2 + 4, h = src.height + pad * 2 + 4, o = pad + 2;
    const c = cv(w, h), x = c.getContext('2d');
    const sil = (color) => { const s = cv(src.width, src.height), sx = s.getContext('2d'); sx.drawImage(src, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = color; sx.fillRect(0, 0, s.width, s.height); return s; };
    const dark = sil('rgba(70,45,15,.22)'), white = sil('#fff');
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; x.drawImage(dark, o + Math.cos(a) * (pad + 1.5), o + Math.sin(a) * (pad + 1.5)); }
    for (let r = pad; r > 0; r -= Math.max(1, pad / 3)) for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; x.drawImage(white, o + Math.cos(a) * r, o + Math.sin(a) * r); }
    x.drawImage(white, o, o); x.drawImage(src, o, o);
    return c;
  };

  /* 从四边向内漫水，去掉比较纯的背景。失败返回 null。 */
  G.cutout = function (img, maxSide) {
    maxSide = maxSide || 380;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(1, maxSide / Math.max(iw, ih)), w = Math.round(iw * s), h = Math.round(ih * s);
    const c = cv(w, h), x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    let d; try { d = x.getImageData(0, 0, w, h); } catch (e) { return null; }
    const p = d.data, bs = [];
    for (let i = 0; i < w; i++) bs.push(i, (h - 1) * w + i);
    for (let j = 1; j < h - 1; j++) bs.push(j * w, j * w + w - 1);
    const med = (ch) => { const a = bs.map((k) => p[k * 4 + ch]).sort((m, n) => m - n); return a[a.length >> 1]; };
    const br = med(0), bg = med(1), bb = med(2);
    const dist = (k) => { const dr = p[k * 4] - br, dg = p[k * 4 + 1] - bg, db = p[k * 4 + 2] - bb; return Math.sqrt(dr * dr + dg * dg + db * db); };
    const T = 44;
    let near = 0; bs.forEach((k) => { if (dist(k) < T) near++; });
    if (near / bs.length < 0.7) return null;
    const vis = new Uint8Array(w * h), st = [];
    bs.forEach((k) => { if (!vis[k] && dist(k) < T) { vis[k] = 1; st.push(k); } });
    while (st.length) {
      const k = st.pop(), px = k % w, py = (k / w) | 0;
      if (px > 0) { const n = k - 1; if (!vis[n] && dist(n) < T) { vis[n] = 1; st.push(n); } }
      if (px < w - 1) { const n = k + 1; if (!vis[n] && dist(n) < T) { vis[n] = 1; st.push(n); } }
      if (py > 0) { const n = k - w; if (!vis[n] && dist(n) < T) { vis[n] = 1; st.push(n); } }
      if (py < h - 1) { const n = k + w; if (!vis[n] && dist(n) < T) { vis[n] = 1; st.push(n); } }
    }
    // 只留最大的那块主体（和它差不多大的也留），这样图片里的文字、小标签不会被带进贴纸
    const lab = new Int32Array(w * h), sizes = [0]; let nl = 0;
    for (let k0 = 0; k0 < w * h; k0++) {
      if (vis[k0] || lab[k0]) continue;
      nl++; let cnt = 0; lab[k0] = nl; st.push(k0);
      while (st.length) {
        const k = st.pop(), px = k % w, py = (k / w) | 0; cnt++;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { // 隔 2 像素以内算连在一起
          const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const n = Y * w + X; if (!vis[n] && !lab[n]) { lab[n] = nl; st.push(n); }
        }
      }
      sizes.push(cnt);
    }
    const big = Math.max.apply(null, sizes);
    for (let k = 0; k < w * h; k++) if (!vis[k] && sizes[lab[k]] < big * 0.2) vis[k] = 1;
    let fg = 0; for (let k = 0; k < w * h; k++) if (!vis[k]) fg++;
    const frac = fg / (w * h);
    if (frac < 0.04 || frac > 0.9) return null;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { // 3×3 平均，让边缘柔一点
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = xx + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; sum += vis[Y * w + X] ? 0 : 1; n++;
      }
      p[(y * w + xx) * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (sum / n - 0.25) / 0.5)));
    }
    x.putImageData(d, 0, 0);
    return G.trim(c);
  };

  /* AI 抠出的图做清理：去雾状半透明、只留主体（去掉文字、小碎点）、补主体里的小洞 */
  G.refine = function (img) {
    const w = img.width, h = img.height, c = G.cv(w, h), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h), p = d.data, N = w * h;
    const a = new Uint8Array(N); for (let k = 0; k < N; k++) a[k] = p[k * 4 + 3];
    // 1. 分块：alpha≥110 算主体像素，8 邻接连成块
    const lab = new Int32Array(N), sizes = [0], sums = [0], st = []; let nl = 0;
    for (let k0 = 0; k0 < N; k0++) {
      if (a[k0] < 110 || lab[k0]) continue;
      nl++; let cnt = 0, sum = 0; lab[k0] = nl; st.push(k0);
      while (st.length) { const k = st.pop(), px = k % w, py = (k / w) | 0; cnt++; sum += a[k];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const n = Y * w + X; if (a[n] >= 110 && !lab[n]) { lab[n] = nl; st.push(n); } } }
      sizes.push(cnt); sums.push(sum);
    }
    if (nl === 0) return null;
    // 留最大的主体；别的块要够大、而且模型很确定（平均不透明度高）才留，比如套装里的杯和托。发灰的雾团、文字丢掉
    const big = Math.max.apply(null, sizes), keep = new Uint8Array(nl + 1);
    for (let i = 1; i <= nl; i++) keep[i] = sizes[i] === big || (sizes[i] >= big * 0.12 && sums[i] / sizes[i] >= 200) ? 1 : 0;
    // 2. 保留区：被保留的块 + 它们周围 6px 内的半透明边缘
    const R = Math.max(3, Math.round(Math.max(w, h) / 160));
    const core = new Uint8Array(N); for (let k = 0; k < N; k++) if (lab[k] && keep[lab[k]]) core[k] = 1;
    // 距离膨胀（两遍 box）
    const dil = (m, r) => { const t = new Uint8Array(N), o = new Uint8Array(N);
      for (let y = 0; y < h; y++) { let s = 0; for (let xx = -r; xx < w; xx++) { if (xx + r < w) s += m[y * w + xx + r]; if (xx - r - 1 >= 0) s -= m[y * w + xx - r - 1]; if (xx >= 0) t[y * w + xx] = s > 0; } }
      for (let xx = 0; xx < w; xx++) { let s = 0; for (let y = -r; y < h; y++) { if (y + r < h) s += t[(y + r) * w + xx]; if (y - r - 1 >= 0) s -= t[(y - r - 1) * w + xx]; if (y >= 0) o[y * w + xx] = s > 0; } }
      return o; };
    const zone = dil(core, R);
    // 3. 补洞：从边上漫进来的“外面”以外的空洞，如果很小（<主体 1.5%）就填满
    const out = new Uint8Array(N); const q = [];
    for (let xx = 0; xx < w; xx++) { q.push(xx, (h - 1) * w + xx); } for (let y = 0; y < h; y++) { q.push(y * w, y * w + w - 1); }
    q.forEach((k) => { if (!core[k]) out[k] = 1; }); const st2 = q.filter((k) => out[k]);
    while (st2.length) { const k = st2.pop(), px = k % w, py = (k / w) | 0;
      const nb = [px > 0 ? k - 1 : -1, px < w - 1 ? k + 1 : -1, py > 0 ? k - w : -1, py < h - 1 ? k + w : -1];
      for (const n of nb) if (n >= 0 && !out[n] && !core[n]) { out[n] = 1; st2.push(n); } }
    const hl = new Int32Array(N); let fg = 0;
    for (let k = 0; k < N; k++) if (core[k]) fg++;
    for (let k0 = 0; k0 < N; k0++) { if (core[k0] || out[k0] || hl[k0]) continue;
      const comp = [k0]; hl[k0] = 1; const s3 = [k0];
      while (s3.length) { const k = s3.pop(), px = k % w, py = (k / w) | 0;
        const nb = [px > 0 ? k - 1 : -1, px < w - 1 ? k + 1 : -1, py > 0 ? k - w : -1, py < h - 1 ? k + w : -1];
        for (const n of nb) if (n >= 0 && !core[n] && !out[n] && !hl[n]) { hl[n] = 1; s3.push(n); comp.push(n); } }
      if (comp.length < fg * 0.015) comp.forEach((k) => { a[k] = Math.max(a[k], 255); });
    }
    // 4. 写回 alpha：保留区外清零；很淡的雾清零；把 alpha 稍微拉陡，边缘干净但不锯齿
    for (let k = 0; k < N; k++) {
      let v = zone[k] ? a[k] : 0;
      v = v < 28 ? 0 : Math.min(255, Math.round((v - 28) * 255 / 200));
      p[k * 4 + 3] = v;
    }
    x.putImageData(d, 0, 0);
    return G.trim(c);
  };

  /* 智能抠图：后台线程里跑 U²-Net-p 小模型（lib/cut/，约 8MB，首次悄悄加载、之后走缓存，每张不到 1 秒），
     模型给出前景蒙版 → 贴回原图 → G.refine 清理。失败时退回老的纯色背景抠图。 */
  let cutW = null, cutN = 0;
  function cutCall(msg) {
    return new Promise((res, rej) => {
      try { if (!cutW) { cutW = new Worker(new URL('lib/cut/worker.mjs', location.href).href, { type: 'module' }); cutW.onerror = (e) => { cutW = null; rej(e); }; } } catch (e) { return rej(e); }
      const id = ++cutN, w = cutW;
      const on = (e) => { const m = e.data; if (m.id !== id) return; w.removeEventListener('message', on); m.err ? rej(new Error(m.err)) : res(m); };
      w.addEventListener('message', on); w.postMessage(Object.assign({ id }, msg));
    });
  }
  /* 进上架页时提前悄悄加载（省流量模式下不提前） */
  let warmed = false;
  G.cutWarm = function () {
    if (warmed || (navigator.connection && navigator.connection.saveData)) return;
    warmed = true; cutCall({ warm: 1 }).catch(() => { warmed = false; });
  };
  G.aiCutout = function (img, maxSide) {
    maxSide = maxSide || 460;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.min(1, 1000 / Math.max(iw, ih));
    const c = cv(iw * s, ih * s), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const S = 320, sm = cv(S, S), sx = sm.getContext('2d'); sx.drawImage(c, 0, 0, S, S);
    let rgba; try { rgba = sx.getImageData(0, 0, S, S).data; } catch (e) { return Promise.resolve(G.cutout(img)); }
    return cutCall({ rgba, S }).then((r) => {
      const m = cv(S, S), mx = m.getContext('2d'), md = mx.createImageData(S, S);
      for (let i = 0; i < S * S; i++) md.data[i * 4 + 3] = r.mask[i];
      mx.putImageData(md, 0, 0);
      const big = cv(c.width, c.height), bx = big.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(m, 0, 0, c.width, c.height);
      const al = bx.getImageData(0, 0, c.width, c.height).data, cd = x.getImageData(0, 0, c.width, c.height);
      for (let i = 3; i < al.length; i += 4) cd.data[i] = al[i];
      x.putImageData(cd, 0, 0);
      const o = G.refine(c); if (!o) return null;
      let fg = 0; const dd = o.getContext('2d').getImageData(0, 0, o.width, o.height).data; for (let i = 3; i < dd.length; i += 4) if (dd[i] > 128) fg++;
      if (fg < c.width * c.height * 0.01) return null;            // 几乎什么都没抠到
      const k = Math.min(1, maxSide / Math.max(o.width, o.height)); if (k >= 1) return o;
      const r2 = cv(o.width * k, o.height * k), rx = r2.getContext('2d'); rx.imageSmoothingQuality = 'high'; rx.drawImage(o, 0, 0, r2.width, r2.height); return r2;
    }).catch((e) => { console.warn('ai cutout', e); if (cutW) { cutW.terminate(); cutW = null; warmed = false; } return G.cutout(img); });
  };

  /* 整张图做成圆角小卡片 */
  G.wholeSticker = function (img, maxSide) {
    maxSide = maxSide || 340;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    let ar = iw / ih; ar = Math.max(0.75, Math.min(1.34, ar));
    const w = ar >= 1 ? maxSide : maxSide * ar, h = ar >= 1 ? maxSide / ar : maxSide;
    const c = cv(w, h), x = c.getContext('2d'), r = Math.min(w, h) * 0.1;
    x.beginPath(); x.moveTo(r, 0); x.arcTo(c.width, 0, c.width, c.height, r); x.arcTo(c.width, c.height, 0, c.height, r); x.arcTo(0, c.height, 0, 0, r); x.arcTo(0, 0, c.width, 0, r); x.closePath(); x.clip();
    const sc = Math.max(c.width / iw, c.height / ih);
    x.drawImage(img, (c.width - iw * sc) / 2, (c.height - ih * sc) / 2, iw * sc, ih * sc);
    return c;
  };

  /* 读取用户选的图片文件，缩到合适大小 */
  G.readFile = function (file, max) {
    max = max || 1000;
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('read'));
      fr.onload = () => G.load(fr.result).then((img) => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = cv(img.naturalWidth * s, img.naturalHeight * s), x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        res({ url: c.toDataURL('image/jpeg', 0.86), img });
      }, rej);
      fr.readAsDataURL(file);
    });
  };

  /* 卡片上用的图片地址 */
  G.cardURL = function (p) { return p.art ? QL.artURL(p.art) : p.pic ? p.pic : (QL.store.img(p.img && p.img[0]) || ''); };
  /* 照片四周的平均颜色，用作底色，这样完整显示时不会露出色差 */
  G.edge = function (img) {
    try {
      const c = cv(16, 16), x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < 16; i++) [i, 240 + i, i * 16, i * 16 + 15].forEach((k) => { if (d[k * 4 + 3] > 200) { r += d[k * 4]; g += d[k * 4 + 1]; b += d[k * 4 + 2]; n++; } });
      if (n > 20 && img.parentNode) img.parentNode.style.background = `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`;
    } catch (e) { }
  };
  /* 直接双击打开网页时，浏览器不让 3D 读取本地图片文件，这时改用内嵌的小贴纸 */
  let stkP = null;
  G.needStk = () => stkP || (stkP = new Promise((res) => { if (QL.STK) return res(); const s = document.createElement('script'); s.src = 'js/stickers.js'; s.onload = s.onerror = () => res(); document.head.appendChild(s); }));

  /* 房间里用的图（不带白边）。画作返回整张图。 */
  const rawCache = {}, stickCache = {}, urlCache = {};
  G.raw = function (p) {
    const key = p.id + '|' + (p.sticker || '') + '|' + (p.frame ? 'f' : '');
    if (rawCache[key]) return rawCache[key];
    let pr;
    if (p.art) {
      const a = QL.ART[p.art], vb = a.vb || [200, 200], sc = 360 / Math.max(vb[0], vb[1]);
      pr = G.load(QL.artURL(p.art)).then((img) => { const c = cv(vb[0] * sc, vb[1] * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return p.frame ? c : G.trim(c); });
    } else if (p.pic) {
      const src = location.protocol === 'file:' ? G.needStk().then(() => (QL.STK && QL.STK[p.sid || p.id]) || p.pic) : Promise.resolve(p.pic);
      pr = src.then(G.load).then((img) => {
        const s = Math.min(1, 420 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = cv(img.naturalWidth * s, img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
      });
    } else {
      const src = p.frame ? QL.store.img(p.img[0]) : (QL.store.img(p.sticker) || QL.store.img(p.img[0]));
      pr = G.load(src).then((img) => {
        const s = Math.min(1, 420 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = cv(img.naturalWidth * s, img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
      });
    }
    return (rawCache[key] = pr);
  };
  G.sticker = function (p) {
    const key = p.id + '|' + (p.sticker || '') + '|' + (p.frame ? 'f' : '');
    if (stickCache[key]) return stickCache[key];
    return (stickCache[key] = G.raw(p).then((c) => (p.frame ? c : G.outline(c))));
  };
  G.stickerURL = function (p) {
    const key = p.id + '|' + (p.sticker || '');
    if (urlCache[key]) return Promise.resolve(urlCache[key]);
    return G.sticker(p).then((c) => { try { return (urlCache[key] = c.toDataURL('image/png')); } catch (e) { return G.cardURL(p); } });
  };

  /* 16×18 像素小人头像（正面） */
  G.avatar = function (c, ch) {
    ch = ch || {};
    const L = QL.LOOK, o = L.outfits[ch.outfit || 0] || L.outfits[0], hair = L.hair[ch.hair || 0] || L.hair[0], skin = L.skin[ch.skin || 0] || L.skin[0];
    c.width = 16; c.height = 18;
    const x = c.getContext('2d'); x.clearRect(0, 0, 16, 18);
    const r = (col, X, Y, W, H) => { x.fillStyle = col; x.fillRect(X, Y, W, H); };
    const f = ch.gender !== 'm';
    if (f) r(hair, 2, 2, 12, 9); else r(hair, 3, 2, 10, 3);
    r(hair, 3, 1, 10, 3);
    r(skin, 4, 3, 8, 7);
    r(hair, 4, 3, 8, 1);
    if (f) { r(hair, 4, 4, 1, 2); r(hair, 11, 4, 1, 2); } else { r(hair, 4, 4, 2, 1); }
    r('#2B2320', 6, 6, 1, 2); r('#2B2320', 9, 6, 1, 2);
    r('#F4A0A0', 5, 8, 1, 1); r('#F4A0A0', 10, 8, 1, 1);
    r(skin, 7, 10, 2, 1);
    r(o.top, 4, 11, 8, 4); r(o.top, 3, 11, 1, 3); r(o.top, 12, 11, 1, 3); r(skin, 3, 14, 1, 1); r(skin, 12, 14, 1, 1);
    if (f) { r(o.top, 3, 15, 10, 1); r(skin, 5, 16, 2, 1); r(skin, 9, 16, 2, 1); r(o.bottom, 5, 17, 2, 1); r(o.bottom, 9, 17, 2, 1); }
    else { r(o.bottom, 5, 15, 6, 1); r(o.bottom, 5, 16, 2, 2); r(o.bottom, 9, 16, 2, 2); }
  };
})();
