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
