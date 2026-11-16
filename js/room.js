/* 钱来 — 3D 房间（three.js，等距俯视的娃娃屋）+ 方块像素小人 */
(function () {
  const QL = window.QL, T = window.THREE, G = QL.gfx;
  const R = (QL.room = { onItem: null, onBox: null, insets: { top: 124, bottom: 104 }, ok: false });
  const SZ = 12, WH = 7, CELL = 0.5, N = SZ / CELL;

  const THEMES = {
    cream: { wallL: 0xF1DFC6, wallR: 0xF8EBD8, trim: 0xFFFFFF, floor: ['#DDB07C', '#D5A46E', '#E4BB88', '#D9AA76'], gap: '#C4935D', base: 0xC08A55, rug: 0xF2A98F, rug2: 0xFFF1DF, bed: 0xF7C59D, bed2: 0xFFFFFF, pillow: 0x9BD0C0, curtain: 0xF2A98F, wood: 0xC99A66, wood2: 0xB5834F, white: 0xFFF9F0, accent: 0x8CC4EE, bg: ['#FBEFDD', '#F5DCC2'] },
    mint: { wallL: 0xCFE5D6, wallR: 0xDDEEE2, trim: 0xFFFFFF, floor: ['#D2A878', '#C99C6A', '#DAB384', '#CFA272'], gap: '#B88A58', base: 0x9E7A52, rug: 0xF6E2A8, rug2: 0xFFFBEA, bed: 0x8FC3A9, bed2: 0xFFFFFF, pillow: 0xF6D58A, curtain: 0xF6E2A8, wood: 0xC9A074, wood2: 0xAE8558, white: 0xFDFBF4, accent: 0xF2A98F, bg: ['#E6F3EA', '#CFE5D6'] },
    berry: { wallL: 0xEEC4CF, wallR: 0xF6D6DD, trim: 0xFFFFFF, floor: ['#C08D6E', '#B68262', '#C9987A', '#BC8868'], gap: '#A3724F', base: 0x8E6048, rug: 0xB9A6E3, rug2: 0xF3EEFF, bed: 0xF29CB1, bed2: 0xFFFFFF, pillow: 0xB9A6E3, curtain: 0xB9A6E3, wood: 0xB98B6A, wood2: 0x9F7353, white: 0xFFF7F5, accent: 0xF9D15B, bg: ['#FBE6EA', '#F0C8D3'] },
  };

  /* 摆放位置 */
  const SLOT = {
    wall: [{ w: 'R', a: 7.5, y: 4.7, s: 1.1 }, { w: 'L', a: 2.95, y: 4.75, s: 1.1 }, { w: 'R', a: 5.55, y: 4.8, s: 1 }, { w: 'R', a: 9.45, y: 4.8, s: 1 }, { w: 'L', a: 1.15, y: 4.85, s: 0.95 }, { w: 'L', a: 4.75, y: 4.85, s: 0.95 }, { w: 'R', a: 11.05, y: 4.6, s: 0.8 }],
    table: [{ x: 5.75, y: 1.99, z: 1.05 }, { x: 6.2, y: 1.04, z: 6.6 }, { x: 7.75, y: 1.99, z: 1.05 }, { x: 4.2, y: 1.42, z: 0.9 }, { x: 6.75, y: 1.99, z: 1.1 }, { x: 7.05, y: 1.04, z: 7.05 }, { x: 8.6, y: 1.99, z: 1.1 }, { x: 6.2, y: 1.04, z: 7.5 }],
    floor: [{ x: 10.8, z: 1.5 }, { x: 4.75, z: 4.2 }, { x: 10.9, z: 7.3 }, { x: 6.0, z: 10.9 }, { x: 10.9, z: 4.4 }, { x: 3.4, z: 10.6 }, { x: 8.7, z: 10.9 }, { x: 9.0, z: 8.7 }],
    shelf: [{ x: 0.74, y: 2.78, z: 6.72 }, { x: 0.74, y: 2.78, z: 8.08 }, { x: 0.74, y: 1.58, z: 6.72 }, { x: 0.74, y: 1.58, z: 8.08 }, { x: 0.74, y: 5.26, z: 6.8 }, { x: 0.74, y: 5.26, z: 8.0 }, { x: 0.74, y: 0.38, z: 6.72 }, { x: 0.74, y: 0.38, z: 8.08 }],
    wear: [{ x: 0.82, y: 4.86, z: 9.8, hang: 1 }, { x: 0.82, y: 4.86, z: 10.5, hang: 1 }, { x: 0.82, y: 4.86, z: 11.2, hang: 1 }, { x: 0.8, y: 1.58, z: 9.75 }, { x: 0.8, y: 1.58, z: 10.5 }, { x: 0.8, y: 1.58, z: 11.25 }, { x: 0.8, y: 0.38, z: 9.95 }, { x: 0.8, y: 0.38, z: 11.05 }],
  };
  const MAXW = { table: 1.3, shelf: 1.12, wear: 0.95, floor: 2.5, wall: 1.42 };
  const BLOCK = [[0, 0, 3.9, 5.7], [3.4, 0, 4.9, 1.7], [4.7, 0, 9.4, 2.1], [6.2, 2.1, 7.8, 3.5], [0, 5.7, 1.7, 9.1], [0, 9.1, 1.8, 12], [10.1, 10.1, 12, 12]];

  let cvs, renderer, scene, cam, ray, roomG, itemsG, fxG, charG = null, cp = null;
  let W = 1, H = 1, zoom = 1, pan = { x: 0, y: 0 }, upp = 0.03, running = false, raf = 0, last = 0, time = 0;
  let state = null, themeKey = '', charKey = '', token = 0, grid = null, prevIds = null, prevOwner = '';
  let itemMeshes = [], boxMesh = null, badge = null, ring = null, anims = [], path = [], walking = false, jumpT = 0, blinkT = 3, lamps = [];
  const pos = { x: 4.2, z: 7.7 }; let rot = Math.PI / 4, rotTo = Math.PI / 4;

  const mat = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  function add(parent, geo, m, x, y, z, sh) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sh !== false; o.receiveShadow = true; parent.add(o); return o; }
  const box = (p, w, h, d, c, x, y, z, sh) => add(p, new T.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c, x, y, z, sh);
  const cyl = (p, r1, r2, h, c, x, y, z, seg) => add(p, new T.CylinderGeometry(r1, r2, h, seg || 28), typeof c === 'number' ? mat(c) : c, x, y, z);
  function roundGeo(w, h, d, r) {
    r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
    const iw = w - 2 * r, ih = h - 2 * r, c = Math.min(r * 0.6, iw / 2, ih / 2), s = new T.Shape(), x = -iw / 2, y = -ih / 2;
    s.moveTo(x + c, y); s.lineTo(x + iw - c, y); s.quadraticCurveTo(x + iw, y, x + iw, y + c); s.lineTo(x + iw, y + ih - c); s.quadraticCurveTo(x + iw, y + ih, x + iw - c, y + ih);
    s.lineTo(x + c, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - c); s.lineTo(x, y + c); s.quadraticCurveTo(x, y, x + c, y);
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 4, curveSegments: 5 });
    g.translate(0, 0, -(d - 2 * r) / 2); return g;
  }
  const rbox = (p, w, h, d, r, c, x, y, z) => add(p, roundGeo(w, h, d, r), typeof c === 'number' ? mat(c) : c, x, y, z);
  function tex(c, nearest) { const t = new T.CanvasTexture(c); if (nearest) { t.magFilter = t.minFilter = T.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4; return t; }
  function dispose(o) { o.traverse((m) => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []; ms.forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); if (m.customDepthMaterial) m.customDepthMaterial.dispose(); }); }
  function clear(g) { while (g.children.length) { const c = g.children[0]; g.remove(c); dispose(c); } }

  /* ---------- 时间：白天 / 傍晚 / 夜里 ---------- */
  function daypart() { if (R.part) return R.part; const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 6.5 && h < 17 ? 'day' : h >= 17 && h < 19.5 ? 'dusk' : 'night'; }
  function skyTex(part) {
    const c = G.cv(128, 128), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
    const cols = part === 'day' ? ['#9FD4F5', '#DDF1FB'] : part === 'dusk' ? ['#F6A56B', '#FCE0A8'] : ['#1F2A55', '#4B5B94'];
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    if (part === 'night') { x.fillStyle = '#FFF6D2'; x.beginPath(); x.arc(86, 40, 15, 0, 7); x.fill(); x.fillStyle = cols[0]; x.beginPath(); x.arc(79, 35, 13, 0, 7); x.fill(); x.fillStyle = '#fff'; [[22, 26], [44, 60], [104, 84], [30, 96], [64, 20], [112, 22]].forEach((p) => x.fillRect(p[0], p[1], 2.4, 2.4)); }
    else { x.fillStyle = part === 'day' ? '#fff' : '#FFE9C9'; [[34, 44, 15], [52, 40, 19], [72, 46, 14], [84, 90, 12], [100, 88, 16]].forEach((p) => { x.beginPath(); x.arc(p[0], p[1], p[2], 0, 7); x.fill(); }); x.fillStyle = part === 'day' ? '#FFE9A0' : '#FFF3C4'; x.beginPath(); x.arc(100, 30, 12, 0, 7); x.fill(); }
    return tex(c);
  }

  /* ---------- 房间 ---------- */
  function floorTex(th) {
    const c = G.cv(512, 512), x = c.getContext('2d'); x.fillStyle = th.gap; x.fillRect(0, 0, 512, 512);
    let k = 7;
    for (let r = 0; r < 8; r++) { let px = -((r * 83) % 150); while (px < 512) { k = (k * 73 + 31) % 997; const w = 130 + (k % 90); x.fillStyle = th.floor[k % th.floor.length]; x.fillRect(px + 1.5, r * 64 + 1.5, w - 3, 61); px += w; } }
    const t = tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1.6, 1.6); return t;
  }
  function buildRoom(th) {
    clear(roomG); lamps = [];
    const part = daypart(), g = roomG;
    // 底座、地板、两面墙
    box(g, SZ + 0.36, 0.7, SZ + 0.36, th.base, SZ / 2 - 0.18, -0.36, SZ / 2 - 0.18, false);
    const fl = add(g, new T.PlaneGeometry(SZ, SZ), mat(0xffffff, { map: floorTex(th) }), SZ / 2, 0, SZ / 2, false); fl.rotation.x = -Math.PI / 2; fl.userData.floor = 1;
    box(g, 0.36, WH + 0.7, SZ + 0.36, th.wallL, -0.18, WH / 2 - 0.35, SZ / 2 - 0.18, false);
    box(g, SZ, WH + 0.7, 0.36, th.wallR, SZ / 2, WH / 2 - 0.35, -0.18, false);
    box(g, 0.1, 0.36, SZ, th.trim, 0.05, 0.18, SZ / 2, false); box(g, SZ, 0.36, 0.1, th.trim, SZ / 2, 0.18, 0.05, false);
    // 窗 + 窗帘
    const sky = add(g, new T.PlaneGeometry(2.3, 2.3), new T.MeshBasicMaterial({ map: skyTex(part) }), 1.9, 4.5, 0.03, false);
    sky.castShadow = false;
    [[1.9, 5.72, 2.6, 0.16], [1.9, 3.28, 2.6, 0.16]].forEach((a) => box(g, a[2], a[3], 0.16, th.trim, a[0], a[1], 0.08, false));
    [[0.68, 4.5], [3.12, 4.5]].forEach((a) => box(g, 0.16, 2.6, 0.16, th.trim, a[0], a[1], 0.08, false));
    box(g, 0.08, 2.3, 0.08, th.trim, 1.9, 4.5, 0.06, false); box(g, 2.3, 0.08, 0.08, th.trim, 1.9, 4.5, 0.06, false);
    box(g, 2.9, 0.12, 0.34, th.trim, 1.9, 3.16, 0.17);
    cyl(g, 0.05, 0.05, 3.5, th.wood2, 1.9, 6.02, 0.16, 10).rotation.z = Math.PI / 2;
    rbox(g, 0.62, 2.9, 0.2, 0.09, th.curtain, 0.5, 4.5, 0.2); rbox(g, 0.62, 2.9, 0.2, 0.09, th.curtain, 3.3, 4.5, 0.2);
    // 小彩灯
    const cols = [0xFFD27A, 0xF9A28C, 0xA9D9C4, 0xFFE9B0];
    for (let i = 0; i <= 12; i++) { const u = i / 12, x = 4.3 + u * 7.3, y = 6.45 - Math.sin(u * Math.PI) * 0.34; const b = add(g, new T.SphereGeometry(0.1, 12, 10), new T.MeshBasicMaterial({ color: cols[i % 4] }), x, y, 0.1, false); b.castShadow = false; lamps.push(b); }
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new T.Vector3(4.3 + u * 7.3, 6.55 - Math.sin(u * Math.PI) * 0.34, 0.06)); }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8A6A4A })));
    // 床
    box(g, 3.2, 0.5, 5.0, th.wood, 1.9, 0.6, 2.8); [[0.5, 0.5], [3.3, 0.5], [0.5, 5.1], [3.3, 5.1]].forEach((a) => box(g, 0.24, 0.36, 0.24, th.wood2, a[0], 0.18, a[1]));
    rbox(g, 3.3, 2.5, 0.3, 0.13, th.wood, 1.9, 1.5, 0.42);
    rbox(g, 3.0, 0.55, 4.7, 0.2, th.bed2, 1.9, 1.1, 2.9);
    rbox(g, 3.14, 0.5, 3.1, 0.22, th.bed, 1.9, 1.22, 3.72);
    rbox(g, 3.14, 0.2, 0.7, 0.09, th.bed2, 1.9, 1.5, 2.3);
    rbox(g, 1.3, 0.4, 0.86, 0.18, th.pillow, 1.15, 1.5, 1.2); rbox(g, 1.3, 0.4, 0.86, 0.18, th.white, 2.65, 1.5, 1.2);
    // 床头柜
    rbox(g, 1.05, 1.3, 1.05, 0.08, th.white, 4.2, 0.76, 0.85); box(g, 0.86, 0.36, 0.05, th.wallL, 4.2, 1.02, 1.39, false); box(g, 0.86, 0.36, 0.05, th.wallL, 4.2, 0.56, 1.39, false);
    add(g, new T.SphereGeometry(0.06, 10, 8), mat(th.wood2), 4.2, 1.02, 1.43); add(g, new T.SphereGeometry(0.06, 10, 8), mat(th.wood2), 4.2, 0.56, 1.43);
    [[3.78, 0.43], [4.62, 0.43], [3.78, 1.27], [4.62, 1.27]].forEach((a) => box(g, 0.1, 0.12, 0.1, th.wood2, a[0], 0.06, a[1]));
    // 书桌 + 椅子
    rbox(g, 4.1, 0.16, 1.8, 0.07, th.wood, 7.0, 1.9, 1.05);
    [[5.15, 0.35], [8.85, 0.35], [5.15, 1.75], [8.85, 1.75]].forEach((a) => box(g, 0.16, 1.82, 0.16, th.white, a[0], 0.91, a[1]));
    rbox(g, 1.2, 0.5, 1.5, 0.06, th.white, 8.25, 1.56, 1.05); box(g, 0.9, 0.24, 0.05, th.wallL, 8.25, 1.56, 1.82, false);
    rbox(g, 1.0, 0.2, 1.0, 0.09, th.accent, 7.0, 1.12, 2.85); rbox(g, 1.0, 1.15, 0.16, 0.07, th.accent, 7.0, 1.72, 3.3);
    [[6.6, 2.45], [7.4, 2.45], [6.6, 3.25], [7.4, 3.25]].forEach((a) => box(g, 0.1, 1.04, 0.1, th.wood2, a[0], 0.52, a[1]));
    // 书架
    const bs = (x, y, z, w, h, d) => box(g, w, h, d, th.white, x, y, z);
    bs(0.16, 2.6, 7.4, 0.12, 5.2, 2.8); bs(0.72, 2.6, 6.02, 1.1, 5.2, 0.12); bs(0.72, 2.6, 8.78, 1.1, 5.2, 0.12);
    [0.3, 1.5, 2.7, 3.9, 5.14].forEach((y) => bs(0.72, y, 7.4, 1.1, 0.12, 2.8)); bs(0.72, 2.1, 7.4, 1.06, 3.5, 0.1);
    // 衣柜（开放式）
    const ws = (x, y, z, w, h, d) => box(g, w, h, d, th.wood, x, y, z);
    ws(0.16, 2.75, 10.5, 0.12, 5.5, 2.5); ws(0.8, 2.75, 9.28, 1.25, 5.5, 0.12); ws(0.8, 2.75, 11.72, 1.25, 5.5, 0.12);
    [0.3, 1.5, 2.72, 5.44].forEach((y) => ws(0.8, y, 10.5, 1.25, 0.12, 2.5));
    cyl(g, 0.05, 0.05, 2.36, 0xD9D2C6, 0.86, 4.98, 10.5, 10).rotation.x = Math.PI / 2;
    // 地毯 + 茶几
    cyl(g, 2.75, 2.75, 0.06, th.rug, 6.7, 0.03, 7.0, 48).castShadow = false; cyl(g, 2.25, 2.25, 0.07, th.rug2, 6.7, 0.035, 7.0, 48).castShadow = false; cyl(g, 1.75, 1.75, 0.08, th.rug, 6.7, 0.04, 7.0, 48).castShadow = false;
    cyl(g, 1.2, 1.2, 0.14, th.white, 6.55, 0.96, 7.0, 40); [[6.0, 6.5], [7.1, 6.5], [6.55, 7.6]].forEach((a) => cyl(g, 0.07, 0.05, 0.9, th.wood2, a[0], 0.45, a[1], 10));
    // 储物箱
    boxMesh = new T.Group(); g.add(boxMesh); boxMesh.position.set(11.0, 0, 11.0); boxMesh.userData.box = 1;
    box(boxMesh, 1.5, 1.05, 1.5, 0xD6AB7C, 0, 0.53, 0); box(boxMesh, 1.5, 0.06, 0.7, 0xC79A66, 0, 1.12, -0.62).rotation.x = -0.9; box(boxMesh, 1.5, 0.06, 0.7, 0xC79A66, 0, 1.12, 0.62).rotation.x = 0.9;
    box(boxMesh, 0.5, 0.3, 0.02, 0xFFF9F0, 0.76, 0.6, 0.2, false).rotation.y = Math.PI / 2; box(boxMesh, 0.5, 0.3, 0.02, 0xFFF9F0, 0.2, 0.6, 0.76, false);
    boxMesh.traverse((m) => (m.userData.box = 1));
    // 灯光
    const night = part === 'night', dusk = part === 'dusk';
    scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
    scene.add(new T.AmbientLight(night ? 0xE4E6FF : dusk ? 0xFFEBD8 : 0xFFF8EE, night ? 0.62 : dusk ? 0.7 : 0.76));
    const dl = new T.DirectionalLight(night ? 0xC9D6FF : dusk ? 0xFFD2A0 : 0xFFF1DE, night ? 0.3 : dusk ? 0.4 : 0.38);
    dl.position.set(SZ / 2 + 0.466 * 30, 0.847 * 30, SZ / 2 + 0.254 * 30); dl.target.position.set(SZ / 2, 0, SZ / 2); scene.add(dl); scene.add(dl.target);
    dl.castShadow = true; const sm = Math.min(window.innerWidth, window.innerHeight) < 700 ? 1024 : 2048; dl.shadow.mapSize.set(sm, sm);
    Object.assign(dl.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 70 }); dl.shadow.bias = -0.0015; dl.shadow.normalBias = 0.03;
    if (night || dusk) { const pl = new T.PointLight(0xFFCF8A, night ? 0.75 : 0.35, 20, 1.2); pl.position.set(7.5, 5.6, 2.6); scene.add(pl); }
    document.getElementById('app').classList.toggle('night', night);
    document.getElementById('pg-room').style.background = night ? 'linear-gradient(180deg,#39406B,#5A5078)' : `linear-gradient(180deg,${th.bg[0]},${th.bg[1]})`;
  }

  /* ---------- 小人（方块像素风） ---------- */
  function faceTex(skin, blink) {
    const c = G.cv(12, 10), x = c.getContext('2d'); x.fillStyle = skin; x.fillRect(0, 0, 12, 10);
    x.fillStyle = '#2B2320'; if (blink) { x.fillRect(2, 5, 2, 1); x.fillRect(8, 5, 2, 1); } else { x.fillRect(3, 4, 1, 2); x.fillRect(8, 4, 1, 2); }
    x.fillStyle = '#F29C9C'; x.fillRect(1, 7, 2, 1); x.fillRect(9, 7, 2, 1); x.fillStyle = '#B5645A'; x.fillRect(5, 7, 2, 1);
    return tex(c, true);
  }
  function buildChar(ch) {
    const Lk = QL.LOOK, o = Lk.outfits[ch.outfit || 0] || Lk.outfits[0], hair = Lk.hair[ch.hair || 0], skin = Lk.skin[ch.skin || 0], f = ch.gender !== 'm';
    const g = new T.Group(), P = {};
    const limb = (w, h, d, c, x, y, z, endC, endH) => {
      const geo = new T.BoxGeometry(w, h, d); geo.translate(0, -h / 2, 0);
      const m = add(g, geo, mat(c), x, y, z);
      if (endC) { const e = add(m, new T.BoxGeometry(w + 0.02, endH, d + 0.06), mat(endC), 0, -h + endH / 2, 0.02); e.castShadow = true; }
      return m;
    };
    P.legL = limb(0.34, 0.64, 0.38, f ? skin : o.bottom, -0.22, 0.64, 0, f ? o.bottom : '#3A3330', 0.2);
    P.legR = limb(0.34, 0.64, 0.38, f ? skin : o.bottom, 0.22, 0.64, 0, f ? o.bottom : '#3A3330', 0.2);
    P.body = box(g, 0.94, 0.9, 0.6, new T.Color(o.top).getHex(), 0, 1.07, 0);
    if (f) box(g, 1.12, 0.4, 0.78, new T.Color(o.top).getHex(), 0, 0.76, 0); else box(g, 0.96, 0.24, 0.62, new T.Color(o.bottom).getHex(), 0, 0.72, 0);
    P.armL = limb(0.26, 0.78, 0.32, o.top, -0.61, 1.48, 0, skin, 0.2); P.armR = limb(0.26, 0.78, 0.32, o.top, 0.61, 1.48, 0, skin, 0.2);
    const head = new T.Group(); head.position.set(0, 2.1, 0); g.add(head); P.head = head;
    const sk = mat(skin); P.face = mat(0xffffff, { map: faceTex(skin, false) }); P.faceA = P.face.map; P.faceB = faceTex(skin, true);
    add(head, new T.BoxGeometry(1.24, 1.1, 1.12), [sk, sk, sk, sk, P.face, sk], 0, 0, 0);
    const hc = new T.Color(hair).getHex();
    box(head, 1.34, 0.34, 1.22, hc, 0, 0.5, -0.02); box(head, 1.34, f ? 1.5 : 0.86, 0.3, hc, 0, f ? -0.12 : 0.14, -0.5); box(head, 1.28, 0.22, 0.14, hc, 0, 0.36, 0.58);
    if (f) { box(head, 0.18, 1.34, 0.86, hc, -0.66, -0.16, -0.08); box(head, 0.18, 1.34, 0.86, hc, 0.66, -0.16, -0.08); add(head, new T.SphereGeometry(0.2, 10, 8), mat(0xF28C8C), 0.5, 0.74, 0.1); }
    else { box(head, 0.16, 0.5, 0.7, hc, -0.66, 0.26, -0.14); box(head, 0.16, 0.5, 0.7, hc, 0.66, 0.26, -0.14); }
    g.userData.P = P; return g;
  }
  function animChar(dt) {
    if (!charG) return; const P = charG.userData.P;
    if (walking && path.length) {
      const tg = path[0], dx = tg.x - pos.x, dz = tg.z - pos.z, dist = Math.hypot(dx, dz), step = 3.6 * dt;
      if (dist <= step) { pos.x = tg.x; pos.z = tg.z; path.shift(); if (!path.length) walking = false; }
      else { pos.x += dx / dist * step; pos.z += dz / dist * step; rotTo = Math.atan2(dx, dz); }
    }
    let dr = rotTo - rot; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2; rot += dr * Math.min(1, dt * 12);
    let y = 0;
    if (walking) { const s = Math.sin(time * 11); P.legL.rotation.x = s * 0.75; P.legR.rotation.x = -s * 0.75; P.armL.rotation.x = -s * 0.6; P.armR.rotation.x = s * 0.6; y = Math.abs(Math.cos(time * 11)) * 0.07; P.armL.rotation.z = P.armR.rotation.z = 0; }
    else { const k = Math.min(1, dt * 10); P.legL.rotation.x *= 1 - k; P.legR.rotation.x *= 1 - k; P.armL.rotation.x *= 1 - k; P.armR.rotation.x *= 1 - k; const sw = Math.sin(time * 1.8) * 0.04; P.armL.rotation.z = -0.05 - sw; P.armR.rotation.z = 0.05 + sw; P.head.rotation.z = Math.sin(time * 0.9) * 0.03; }
    if (jumpT > 0) { jumpT -= dt; const u = 1 - Math.max(0, jumpT) / 0.9, hop = Math.abs(Math.sin(u * Math.PI * 2)); y += hop * 0.8; P.armL.rotation.z = -2.5 * hop; P.armR.rotation.z = 2.5 * hop; }
    blinkT -= dt; if (blinkT < 0) { P.face.map = P.faceB; if (blinkT < -0.13) { P.face.map = P.faceA; blinkT = 2.4 + Math.random() * 3; } }
    charG.position.set(pos.x, y, pos.z); charG.rotation.y = rot;
  }

  /* ---------- 寻路 ---------- */
  function buildGrid() {
    grid = new Uint8Array(N * N);
    const blockRect = (x0, z0, x1, z1) => { for (let i = Math.max(0, Math.floor(x0 / CELL)); i < Math.min(N, Math.ceil(x1 / CELL)); i++) for (let j = Math.max(0, Math.floor(z0 / CELL)); j < Math.min(N, Math.ceil(z1 / CELL)); j++) grid[j * N + i] = 1; };
    BLOCK.forEach((b) => blockRect(b[0], b[1], b[2], b[3]));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = (i + 0.5) * CELL, z = (j + 0.5) * CELL; if (Math.hypot(x - 6.55, z - 7.0) < 1.55) grid[j * N + i] = 1; if (x < 0.5 || z < 0.5) grid[j * N + i] = 1; }
    if (state) state.items.forEach((it) => { const p = QL.store.product(it.pid); if (p && p.cat === 'floor' && it.slot >= 0) { const s = SLOT.floor[it.slot]; blockRect(s.x - 0.7, s.z - 0.6, s.x + 0.7, s.z + 0.6); } });
  }
  const free = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !grid[j * N + i];
  function nearestFree(i, j) {
    if (free(i, j)) return [i, j];
    for (let r = 1; r < N; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; if (free(i + a, j + b)) return [i + a, j + b]; }
    return null;
  }
  function los(a, b) { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.2); for (let k = 0; k <= n; k++) { const u = k / n, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u; if (!free(Math.floor(x / CELL), Math.floor(z / CELL))) return false; } return true; }
  function walkTo(x, z) {
    if (!grid) buildGrid();
    const s = nearestFree(Math.floor(pos.x / CELL), Math.floor(pos.z / CELL)), e = nearestFree(Math.min(N - 1, Math.max(0, Math.floor(x / CELL))), Math.min(N - 1, Math.max(0, Math.floor(z / CELL))));
    if (!s || !e) return;
    const key = (i, j) => j * N + i, open = [[s[0], s[1], 0, 0]], came = new Map(), gs = new Map([[key(s[0], s[1]), 0]]);
    let found = false, guard = 0;
    while (open.length && guard++ < 4000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][3] < open[bi][3]) bi = k;
      const c = open.splice(bi, 1)[0]; if (c[0] === e[0] && c[1] === e[1]) { found = true; break; }
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue; const ni = c[0] + a, nj = c[1] + b; if (!free(ni, nj)) continue; if (a && b && (!free(c[0] + a, c[1]) || !free(c[0], c[1] + b))) continue;
        const ng = c[2] + (a && b ? 1.414 : 1), kk = key(ni, nj); if (gs.has(kk) && gs.get(kk) <= ng) continue;
        gs.set(kk, ng); came.set(kk, key(c[0], c[1])); open.push([ni, nj, ng, ng + Math.hypot(e[0] - ni, e[1] - nj)]);
      }
    }
    if (!found) return;
    let pts = [], k = key(e[0], e[1]); const sk = key(s[0], s[1]);
    while (k !== undefined && k !== sk) { pts.unshift({ x: ((k % N) + 0.5) * CELL, z: (Math.floor(k / N) + 0.5) * CELL }); k = came.get(k); }
    const out = []; let curP = { x: pos.x, z: pos.z }, i = 0; // 拉直路径
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !los(curP, pts[j])) j--; out.push(pts[j]); curP = pts[j]; i = j + 1; }
    path = out; walking = path.length > 0;
  }

  /* ---------- 物品 ---------- */
  function placeItem(it, p, canvas, isNew) {
    const ar = canvas.width / canvas.height, s = SLOT[p.cat][it.slot]; if (!s) return;
    const map = tex(canvas); let obj;
    if (p.cat === 'wall') {
      let h = (p.rh || 1.3) * s.s, w = h * ar; if (w > MAXW.wall * s.s) { w = MAXW.wall * s.s; h = w / ar; }
      obj = new T.Group();
      if (p.frame) {
        const fc = [0x2F2A26, 0xFFFFFF, 0xC99A66][(it.slot + (p.id.length % 3)) % 3];
        box(obj, w + 0.26, h + 0.26, 0.1, fc, 0, 0, 0.05); box(obj, w + 0.1, h + 0.1, 0.02, 0xFFFDF8, 0, 0, 0.105, false);
        const pm = add(obj, new T.PlaneGeometry(w, h), mat(0xffffff, { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.2 }), 0, 0, 0.12, false); pm.castShadow = false;
      } else {
        const pm = add(obj, new T.PlaneGeometry(w, h), mat(0xffffff, { map, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.2 }), 0, 0, 0.07, false); pm.castShadow = false;
      }
      if (s.w === 'R') obj.position.set(s.a, s.y, 0); else { obj.position.set(0, s.y, s.a); obj.rotation.y = Math.PI / 2; }
    } else {
      let h = (p.rh || QL.store.RH[p.cat]) * 1.2, w = h * ar; const mw = MAXW[p.cat] * 1.12; if (w > mw) { w = mw; h = w / ar; }
      if (p.cat === 'shelf' || (p.cat === 'wear' && !s.hang)) { const mh = 1.06; if (h > mh) { h = mh; w = h * ar; } }
      if (s.hang && h > 1.9) { h = 1.9; w = h * ar; }
      const geo = new T.PlaneGeometry(w, h); geo.translate(0, s.hang ? -h / 2 : h / 2, 0);
      obj = add(itemsG, geo, mat(0xffffff, { map, alphaTest: 0.5, side: T.DoubleSide, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.1 }), s.x, p.cat === 'floor' ? 0.02 : s.y, s.z);
      obj.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5 });
      obj.rotation.y = Math.PI / 4; obj.receiveShadow = false;
    }
    if (obj.parent !== itemsG) itemsG.add(obj);
    obj.traverse((m) => (m.userData.item = it));
    itemMeshes.push(obj);
    if (isNew) { obj.scale.setScalar(0.001); anims.push({ o: obj, t: 0, d: 0.55, k: 'pop' }); }
  }
  function badgeTex(n) { const c = G.cv(96, 96), x = c.getContext('2d'); x.fillStyle = '#16130F'; x.beginPath(); x.arc(48, 48, 44, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 46px -apple-system,Helvetica,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+' + n, 48, 51); return tex(c); }

  function load(st) {
    if (!R.ok) return;
    state = st; const my = ++token, S = QL.store;
    const owner = st.me ? 'me' : st.nid || st.code;
    if (st.theme !== themeKey || !roomG.children.length) { themeKey = st.theme; buildRoom(THEMES[st.theme] || THEMES.cream); }
    const ck = JSON.stringify(st.char);
    if (ck !== charKey || !charG) { if (charG) { scene.remove(charG); dispose(charG); } charG = buildChar(st.char); scene.add(charG); charG.traverse((m) => { if (m.isMesh) m.castShadow = true; }); charKey = ck; }
    if (owner !== prevOwner) { pos.x = 4.2; pos.z = 7.7; rot = rotTo = Math.PI / 4; path = []; walking = false; prevIds = null; zoom = 1; pan.x = pan.y = 0; fit(); }
    const ids = new Set(st.items.map((i) => i.id)), fresh = prevIds ? st.items.filter((i) => !prevIds.has(i.id) && i.slot >= 0).map((i) => i.id) : [];
    prevIds = ids; prevOwner = owner;
    clear(itemsG); itemMeshes = []; anims = anims.filter((a) => a.k !== 'pop');
    buildGrid();
    let over = 0;
    st.items.forEach((it) => {
      const p = S.product(it.pid); if (!p) return;
      if (it.slot < 0) { over++; return; }
      G.sticker(p).then((c) => { if (my === token) placeItem(it, p, c, fresh.includes(it.id)); }).catch(() => { });
    });
    if (badge) { boxMesh.remove(badge); dispose(badge); badge = null; }
    if (over) { badge = new T.Sprite(new T.SpriteMaterial({ map: badgeTex(over), depthTest: false })); badge.scale.set(0.9, 0.9, 1); badge.position.set(0, 2.0, 0); badge.userData.box = 1; boxMesh.add(badge); }
    if (fresh.length) jumpT = 0.9;
  }

  /* ---------- 相机 ---------- */
  function fit() {
    if (!cam) return;
    cam.updateMatrixWorld(); const inv = cam.matrixWorldInverse; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    [0, SZ].forEach((x) => [-0.7, WH + 0.4].forEach((y) => [0, SZ].forEach((z) => { const v = new T.Vector3(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); })));
    const top = R.insets.top, bot = R.insets.bottom, aw = Math.max(60, W - 16), ah = Math.max(60, H - top - bot);
    upp = Math.max((x1 - x0) / aw, (y1 - y0) / ah) / zoom;
    const lim = 9 * (1 - 1 / Math.max(1, zoom)) + 0.001; pan.x = Math.max(-lim, Math.min(lim, pan.x)); pan.y = Math.max(-lim, Math.min(lim, pan.y));
    const cx = (x0 + x1) / 2 + pan.x, cy = (y0 + y1) / 2 + ((top - bot) / 2) * upp + pan.y;
    cam.left = cx - W * upp / 2; cam.right = cx + W * upp / 2; cam.top = cy + H * upp / 2; cam.bottom = cy - H * upp / 2; cam.updateProjectionMatrix();
  }
  function resize() {
    if (!renderer) return; const r = cvs.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    W = r.width; H = r.height; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false); fit();
  }

  /* ---------- 点击 ---------- */
  function click(x, y) {
    const r = cvs.getBoundingClientRect(), ndc = new T.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(itemMeshes.concat([boxMesh]), true)[0];
    if (hit) {
      const ud = hit.object.userData;
      if (ud.item) { const o = itemMeshes.find((m) => m.userData.item === ud.item) || hit.object; anims.push({ o, t: 0, d: 0.4, k: 'pulse' }); const wp = new T.Vector3(); o.getWorldPosition(wp); walkTo(wp.x + 0.9, wp.z + 0.9); if (R.onItem) R.onItem(ud.item); return; }
      if (ud.box) { walkTo(9.6, 10.4); if (R.onBox) R.onBox(); return; }
    }
    const pl = new T.Plane(new T.Vector3(0, 1, 0), 0), pt = new T.Vector3();
    if (ray.ray.intersectPlane(pl, pt) && pt.x > 0 && pt.z > 0 && pt.x < SZ && pt.z < SZ) {
      walkTo(pt.x, pt.z);
      ring.position.set(pt.x, 0.05, pt.z); ring.material.opacity = 0.7; ring.scale.setScalar(0.4); anims.push({ o: ring, t: 0, d: 0.5, k: 'ring' });
    }
  }
  function bindInput() {
    const pts = new Map(); let moved = false, t0 = 0, pinch = 0;
    cvs.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cvs.setPointerCapture(e.pointerId); } catch (er) { } if (pts.size === 1) { moved = false; t0 = performance.now(); } else { moved = true; const a = Array.from(pts.values()); pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    cvs.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const a = Array.from(pts.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch) { zoom = Math.max(1, Math.min(2.6, zoom * d / pinch)); fit(); } pinch = d; return; }
      if (!moved && Math.hypot(dx, dy) < 8) return; moved = true; p.x = e.clientX; p.y = e.clientY;
      if (zoom > 1.01) { pan.x -= dx * upp; pan.y += dy * upp; fit(); }
    });
    const up = (e) => { const had = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (had && !moved && e.type === 'pointerup' && performance.now() - t0 < 600) click(e.clientX, e.clientY); };
    cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
    cvs.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(1, Math.min(2.6, zoom * Math.exp(-e.deltaY * 0.0016))); fit(); }, { passive: false });
  }

  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; time += dt;
    animChar(dt);
    anims = anims.filter((a) => {
      a.t += dt; const u = Math.min(1, a.t / a.d);
      if (a.k === 'pop') { const c1 = 1.70158, c3 = c1 + 1, e = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); a.o.scale.setScalar(Math.max(0.001, e)); }
      else if (a.k === 'pulse') a.o.scale.setScalar(1 + Math.sin(u * Math.PI) * 0.18);
      else if (a.k === 'ring') { a.o.scale.setScalar(0.4 + u * 0.9); a.o.material.opacity = 0.7 * (1 - u); }
      return u < 1;
    });
    lamps.forEach((b, i) => b.scale.setScalar(1 + Math.sin(time * 2 + i * 1.3) * 0.12));
    renderer.render(scene, cam);
  }

  R.mount = function (canvas) {
    if (R.ok) return true;
    try {
      cvs = canvas; renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
      scene = new T.Scene(); cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
      cam.position.set(SZ / 2 + 30, 2 + 30 * 0.8, SZ / 2 + 30); cam.lookAt(SZ / 2, 2, SZ / 2);
      ray = new T.Raycaster(); roomG = new T.Group(); itemsG = new T.Group(); fxG = new T.Group(); scene.add(roomG, itemsG, fxG);
      ring = new T.Mesh(new T.RingGeometry(0.34, 0.46, 32), new T.MeshBasicMaterial({ color: 0x16130F, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; fxG.add(ring);
      bindInput(); R.ok = true;
      if (window.ResizeObserver) new ResizeObserver(resize).observe(cvs); else window.addEventListener('resize', resize);
      resize(); return true;
    } catch (e) { console.warn('3D unavailable', e); return false; }
  };
  R.load = load;
  R.start = function () { if (!R.ok || running) return; running = true; last = performance.now(); resize(); raf = requestAnimationFrame(frame); };
  R.stop = function () { running = false; cancelAnimationFrame(raf); };
  R.resize = resize;
  R.focus = function (id) { const o = itemMeshes.find((m) => m.userData.item && m.userData.item.id === id); if (!o) return; anims.push({ o, t: 0, d: 0.5, k: 'pulse' }); const wp = new T.Vector3(); o.getWorldPosition(wp); walkTo(wp.x + 0.9, wp.z + 0.9); };
  R.cheer = function () { jumpT = 0.9; };
  /* 调试用：强制白天 / 傍晚 / 夜里（'day' | 'dusk' | 'night' | null） */
  R.setPart = function (p) { R.part = p || null; themeKey = ''; if (state) load(state); };
})();
