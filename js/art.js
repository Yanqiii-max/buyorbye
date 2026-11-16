/* 钱来 — 演示商品插画（纯 SVG，透明底）。vb 省略时为 200×200。 */
(function () {
  const QL = (window.QL = window.QL || {});
  const A = {};
  const keys = (() => { // 键盘按键
    let s = '';
    const rows = [[70, 12], [85, 12], [100, 12]];
    rows.forEach(([y, n], r) => {
      for (let i = 0; i < n; i++) {
        let f = '#FFFDF8';
        if (r === 0 && i === 0) f = '#F28C6B';
        if (r === 1 && i === 11) f = '#9CCBB8';
        if (r === 2 && i === 11) f = '#F2C14E';
        s += `<rect x="${22 + i * 13.2}" y="${y}" width="11" height="12" rx="3" fill="${f}"/>`;
      }
    });
    s += '<rect x="22" y="115" width="24" height="12" rx="3" fill="#FFFDF8"/><rect x="48.4" y="115" width="90" height="12" rx="3" fill="#FFFDF8"/><rect x="140.8" y="115" width="37" height="12" rx="3" fill="#FFFDF8"/>';
    return s;
  })();
  const pearls = (() => { // 珍珠项链
    let s = '';
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, x = 38 + u * 124, y = 34 + 118 * (1 - Math.pow(2 * u - 1, 2));
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.4" fill="#FFF9F0"/><circle cx="${(x - 2).toFixed(1)}" cy="${(y - 2).toFixed(1)}" r="2.4" fill="#fff"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.4" fill="none" stroke="#E6D9C5" stroke-width="1.4"/>`;
    }
    return s + '<path d="M100 158l-10 18a11 11 0 1 0 20 0z" fill="#E9C46A"/><circle cx="100" cy="182" r="5" fill="#FFF3C9"/>';
  })();
  const ticks = (() => {
    let s = '';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x1 = 100 + Math.sin(a) * 34, y1 = 100 - Math.cos(a) * 34, x2 = 100 + Math.sin(a) * 39, y2 = 100 - Math.cos(a) * 39;
      s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#27335B" stroke-width="${i % 3 ? 1.6 : 3}" stroke-linecap="round"/>`;
    }
    return s;
  })();

  A.mug = { svg: `<path d="M148 92h10a20 20 0 0 1 0 40h-12" fill="none" stroke="#EADBC3" stroke-width="13" stroke-linecap="round"/><path d="M44 66h112v62a38 38 0 0 1-38 38H82a38 38 0 0 1-38-38z" fill="#FFF7EA"/><path d="M134 66h22v62a38 38 0 0 1-38 38h-8a38 38 0 0 0 24-38z" fill="#F3E7D2"/><ellipse cx="100" cy="66" rx="56" ry="11" fill="#F3E7D2"/><ellipse cx="100" cy="67" rx="47" ry="8" fill="#7A5240"/><path d="M70 128a11 11 0 0 1 11-13 15 15 0 0 1 28 1 11 11 0 0 1 9 20H78a9 9 0 0 1-8-8z" fill="#8CC4EE"/><path d="M90 42c-6-8 6-12 0-22M110 46c-6-8 6-12 0-22" fill="none" stroke="#E2D5C0" stroke-width="5" stroke-linecap="round"/>` };

  A.dusk = { vb: [200, 250], svg: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7CB73"/><stop offset=".5" stop-color="#F08A6B"/><stop offset="1" stop-color="#8E5B9A"/></linearGradient></defs><rect width="200" height="250" fill="url(#g)"/><circle cx="128" cy="116" r="36" fill="#FFE9B0"/><circle cx="128" cy="116" r="50" fill="#FFE9B0" opacity=".25"/><path d="M0 172q50-42 100-12t100-22v112H0z" fill="#6A4A8C"/><path d="M0 202q60-32 110 0t90-12v60H0z" fill="#46356E"/><path d="M0 230q70-22 200 0v20H0z" fill="#2E2550"/><circle cx="44" cy="52" r="2.5" fill="#FFF6DC"/><circle cx="70" cy="30" r="2" fill="#FFF6DC"/><circle cx="168" cy="40" r="2.5" fill="#FFF6DC"/><path d="M36 92q8-8 16 0q8-8 16 0" fill="none" stroke="#5B3B66" stroke-width="2.5" stroke-linecap="round"/>` };

  A.lamp = { svg: `<ellipse cx="100" cy="172" rx="46" ry="9" fill="#E9DFD0"/><path d="M82 100h36l8 62a8 8 0 0 1-8 8H82a8 8 0 0 1-8-8z" fill="#FFF3DD"/><path d="M106 100h12l8 62a8 8 0 0 1-8 8h-10z" fill="#F4E3C5"/><path d="M30 104a70 62 0 0 1 140 0c0 8-8 10-16 10H46c-8 0-16-2-16-10z" fill="#FF9F6B"/><path d="M30 104a70 62 0 0 1 58-57c-26 14-38 40-38 67h-4c-8 0-16-2-16-10z" fill="#FFB98F"/><circle cx="122" cy="70" r="9" fill="#FFE2C8"/><circle cx="88" cy="88" r="6" fill="#FFE2C8"/><circle cx="146" cy="94" r="5" fill="#FFE2C8"/>` };

  A.beanbag = { svg: `<path d="M34 150c-14-42 12-98 66-98s80 56 66 98c-6 18-26 22-66 22s-60-4-66-22z" fill="#BFD8F2"/><path d="M34 150c-10-30 0-66 26-86-8 22-8 50 2 76 6 16 18 26 38 32-40 0-60-4-66-22z" fill="#D7E7F9"/><ellipse cx="102" cy="92" rx="36" ry="13" fill="#A6C5E6"/><path d="M148 110q10 24 2 48" fill="none" stroke="#A6C5E6" stroke-width="4" stroke-linecap="round"/>` };

  A.teapot = { svg: `<path d="M150 104c22-4 30 10 26 26s-18 22-30 20" fill="none" stroke="#9CCBB8" stroke-width="10" stroke-linecap="round"/><path d="M54 120c-18-6-26-20-30-36l14-4c2 12 8 22 20 26z" fill="#9CCBB8"/><ellipse cx="100" cy="124" rx="56" ry="46" fill="#B5DCCB"/><path d="M100 78a56 46 0 0 1 0 92a76 46 0 0 0 0-92z" fill="#9CCBB8" opacity=".55"/><ellipse cx="100" cy="82" rx="34" ry="9" fill="#9CCBB8"/><path d="M70 80a30 17 0 0 1 60 0z" fill="#C9E8DA"/><circle cx="100" cy="60" r="8" fill="#9CCBB8"/><path d="M70 112q-8 14-4 30" fill="none" stroke="#D5EEE3" stroke-width="5" stroke-linecap="round"/>` };

  A.poster = { vb: [200, 250], svg: `<rect width="200" height="250" fill="#F7F1E6"/><circle cx="152" cy="54" r="15" fill="#F2B33D"/><path d="M62 192c-8-40 0-70 22-84l-6-32 22 17c6-2 14-2 20 0l22-17-6 32c22 14 30 44 22 84z" fill="none" stroke="#1F1B16" stroke-width="5" stroke-linejoin="round"/><path d="M86 128q4 6 8 0M106 128q4 6 8 0M96 141l4 4 4-4" fill="none" stroke="#1F1B16" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M152 192c14-4 20-18 12-30" fill="none" stroke="#1F1B16" stroke-width="5" stroke-linecap="round"/><text x="100" y="230" font-family="Georgia,serif" font-size="13" text-anchor="middle" fill="#1F1B16" letter-spacing="4">CAT · 2026</text>` };

  A.tote = { svg: `<path d="M70 80c0-44 60-44 60 0" fill="none" stroke="#C9B28C" stroke-width="9" stroke-linecap="round"/><path d="M44 76h112l10 94a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8z" fill="#F3E8D2"/><path d="M138 76h18l10 94a8 8 0 0 1-8 8h-24z" fill="#E7D8BB"/><text x="90" y="134" font-family="Georgia,serif" font-style="italic" font-size="26" text-anchor="middle" fill="#3A3A3A">weekend</text><circle cx="66" cy="154" r="7" fill="#F28C6B"/><circle cx="84" cy="154" r="7" fill="#F2B33D"/><circle cx="102" cy="154" r="7" fill="#8CC4EE"/>` };

  A.candle = { svg: `<path d="M100 24c10 12 14 20 14 28a14 14 0 0 1-28 0c0-8 4-16 14-28z" fill="#FFB648"/><path d="M100 40c5 6 7 10 7 14a7 7 0 0 1-14 0c0-4 2-8 7-14z" fill="#FFE39A"/><rect x="97" y="62" width="6" height="14" rx="2" fill="#4A3B32"/><rect x="52" y="74" width="96" height="102" rx="14" fill="#F5E9DA"/><rect x="52" y="74" width="96" height="22" rx="11" fill="#EAD9C4"/><rect x="66" y="112" width="68" height="42" rx="6" fill="#7C4A6B"/><text x="100" y="139" font-family="Georgia,serif" font-size="15" text-anchor="middle" fill="#F5E9DA" letter-spacing="3">FIG</text>` };

  A.robot = { svg: `<rect x="92" y="18" width="16" height="16" rx="4" fill="#E4573D"/><rect x="97" y="32" width="6" height="16" fill="#9A9A9A"/><rect x="58" y="46" width="84" height="56" rx="12" fill="#6FB4C9"/><circle cx="82" cy="72" r="11" fill="#fff"/><circle cx="118" cy="72" r="11" fill="#fff"/><circle cx="84" cy="74" r="5" fill="#222"/><circle cx="116" cy="74" r="5" fill="#222"/><rect x="84" y="88" width="32" height="6" rx="3" fill="#2F6E82"/><rect x="44" y="110" width="16" height="42" rx="8" fill="#6FB4C9"/><rect x="140" y="110" width="16" height="42" rx="8" fill="#6FB4C9"/><rect x="66" y="106" width="68" height="54" rx="8" fill="#F2C14E"/><rect x="78" y="116" width="44" height="18" rx="4" fill="#FFF3D0"/><circle cx="88" cy="147" r="4" fill="#E4573D"/><circle cx="102" cy="147" r="4" fill="#6FB4C9"/><rect x="76" y="162" width="18" height="20" rx="4" fill="#6FB4C9"/><rect x="106" y="162" width="18" height="20" rx="4" fill="#6FB4C9"/>` };

  A.chair = { svg: `<path d="M58 146l-9 36M142 146l9 36M82 146v32M118 146v32" stroke="#A86E3C" stroke-width="8" stroke-linecap="round"/><path d="M54 98c0-50 92-50 92 0v42H54z" fill="#C98B55"/><path d="M68 100c0-32 64-32 64 0v30H68z" fill="#F4E3C8"/><rect x="44" y="120" width="112" height="28" rx="13" fill="#F9EDD8"/><path d="M38 100q-2 28 8 44M162 100q2 28-8 44" stroke="#A86E3C" stroke-width="9" fill="none" stroke-linecap="round"/>` };

  A.keyboard = { svg: `<rect x="12" y="60" width="176" height="84" rx="13" fill="#EFE4D0"/><rect x="12" y="132" width="176" height="12" rx="6" fill="#DCCDB2"/>${keys}` };

  A.vase = { svg: `<path d="M100 96C96 70 84 54 72 40M100 96c2-30 10-44 24-58M100 96V36" stroke="#6E9B6B" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="70" cy="36" r="14" fill="#F6B8C4"/><circle cx="70" cy="36" r="5" fill="#F9E2A0"/><circle cx="126" cy="34" r="14" fill="#F9D777"/><circle cx="126" cy="34" r="5" fill="#F28C6B"/><circle cx="100" cy="26" r="13" fill="#fff"/><circle cx="100" cy="26" r="5" fill="#F9D777"/><path d="M82 92h36c0 14 22 26 22 50a40 36 0 0 1-80 0c0-24 22-36 22-50z" fill="#F4B6B0"/><path d="M118 92c0 14 22 26 22 50a40 36 0 0 1-40 36c20-6 26-22 26-36 0-20-18-34-20-50z" fill="#E99B96"/><rect x="78" y="86" width="44" height="10" rx="5" fill="#F9CFCB"/>` };

  A.sneakers = { svg: `<path d="M22 134c0-8 4-14 12-16l10-36c2-6 10-8 16-4l10 8c10 12 30 26 58 34 22 6 46 10 50 22v10H22z" fill="#FFF6EA"/><path d="M130 122c20 6 44 8 48 20h-52z" fill="#EADCC6"/><path d="M34 118l9-30c6-4 13 0 15 4l-6 28z" fill="#3E6BB5"/><path d="M60 124q32-18 72 6" stroke="#3E6BB5" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M76 94l14 9M86 102l14 9M96 109l14 8" stroke="#3E6BB5" stroke-width="4" stroke-linecap="round"/><rect x="22" y="140" width="156" height="9" fill="#fff"/><path d="M22 149h156a12 12 0 0 1-12 12H34a12 12 0 0 1-12-12z" fill="#D9A05B"/>` };

  A.beanie = { svg: `<circle cx="100" cy="40" r="19" fill="#FFF3E0"/><path d="M40 130c0-92 120-92 120 0z" fill="#E4573D"/><path d="M68 62q-11 30-11 66M100 56v72M132 62q11 30 11 66" stroke="#C9432C" stroke-width="5" fill="none"/><rect x="32" y="122" width="136" height="40" rx="14" fill="#F27C63"/><path d="M52 128v28M72 128v28M92 128v28M112 128v28M132 128v28M150 128v28" stroke="#E4573D" stroke-width="5" stroke-linecap="round"/>` };

  A.plant = { svg: `<path d="M100 128C96 102 80 86 62 74M100 128c4-30 20-48 42-58M100 128V54" stroke="#4E8B5A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M64 74c-26-6-42-30-32-52 26-4 48 12 52 36-4 8-10 14-20 16z" fill="#5FA56B"/><path d="M140 70c26-8 40-32 28-54-26-2-46 14-48 40 4 8 10 12 20 14z" fill="#6DB57A"/><path d="M100 54c-20-10-24-36-8-50 22 4 32 28 20 48z" fill="#7CC489"/><path d="M44 40l16 10M48 58l14 3M152 36l-14 12M158 54l-14 5M96 20l4 14" stroke="#3F7A4B" stroke-width="3" stroke-linecap="round"/><path d="M66 134h68l-8 42a8 8 0 0 1-8 6H82a8 8 0 0 1-8-6z" fill="#E6A57E"/><rect x="60" y="126" width="80" height="14" rx="6" fill="#F0B895"/>` };

  A.vinyl = { svg: `<circle cx="128" cy="100" r="58" fill="#1E1B1A"/><circle cx="128" cy="100" r="44" fill="none" stroke="#3A3534" stroke-width="2"/><circle cx="128" cy="100" r="33" fill="none" stroke="#3A3534" stroke-width="2"/><circle cx="128" cy="100" r="19" fill="#E4573D"/><circle cx="128" cy="100" r="3" fill="#fff"/><rect x="14" y="38" width="124" height="124" rx="6" fill="#F2B33D"/><circle cx="76" cy="96" r="34" fill="#F8DDA4"/><path d="M14 132q62-32 124 0v24a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#E08B3A"/><path d="M14 148q62-26 124 0v8a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#B9622A"/>` };

  A.watch = { svg: `<rect x="76" y="12" width="48" height="176" rx="14" fill="#3B2F2A"/><path d="M76 40h48M76 160h48" stroke="#5A4A42" stroke-width="3"/><rect x="148" y="94" width="11" height="12" rx="3" fill="#D9B36A"/><circle cx="100" cy="100" r="51" fill="#D9B36A"/><circle cx="100" cy="100" r="43" fill="#FBF6EA"/>${ticks}<path d="M82 120a18 18 0 0 1 36 0z" fill="#27335B"/><circle cx="105" cy="115" r="6.5" fill="#F5DE9A"/><path d="M100 100V72M100 100l19-10" stroke="#27335B" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="4.5" fill="#27335B"/>` };

  A.necklace = { svg: pearls };

  A.floorlamp = { vb: [200, 320], svg: `<ellipse cx="62" cy="300" rx="42" ry="11" fill="#3A3A3A"/><path d="M62 298V122c0-74 76-84 92-44" stroke="#3A3A3A" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M112 116a40 40 0 0 1 80 0z" fill="#F6D58A"/><ellipse cx="152" cy="116" rx="40" ry="8" fill="#FFF1C4"/><path d="M124 130l-14 60h84l-14-60z" fill="#FFF1C4" opacity=".35"/>` };

  A.book = { svg: `<rect x="150" y="34" width="10" height="138" fill="#F5EFE2"/><rect x="42" y="28" width="112" height="150" rx="6" fill="#2F4858"/><rect x="42" y="28" width="15" height="150" rx="5" fill="#243845"/><circle cx="106" cy="92" r="27" fill="#F2B33D"/><path d="M79 92a27 27 0 0 1 54 0z" fill="#E4573D"/><text x="106" y="148" font-family="Georgia,serif" font-size="13" fill="#F5EFE2" text-anchor="middle" letter-spacing="3">OBJECTS</text>` };

  A.clock = { svg: `<circle cx="100" cy="100" r="80" fill="#E9B93A"/><circle cx="100" cy="100" r="71" fill="#F9D15B"/><circle cx="62" cy="70" r="10" fill="#E9B93A"/><circle cx="142" cy="130" r="13" fill="#E9B93A"/><circle cx="74" cy="142" r="7" fill="#E9B93A"/><circle cx="136" cy="62" r="6" fill="#E9B93A"/><path d="M100 100V54M100 100l30 18" stroke="#4A3B32" stroke-width="7" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="#4A3B32"/>` };

  A.handheld = { svg: `<rect x="20" y="50" width="160" height="100" rx="24" fill="#B8A7E8"/><rect x="20" y="126" width="160" height="24" rx="12" fill="#A592DC"/><rect x="60" y="62" width="80" height="62" rx="7" fill="#2B2540"/><rect x="66" y="68" width="68" height="50" rx="3" fill="#9BE3C0"/><rect x="86" y="82" width="8" height="8" fill="#2B2540"/><rect x="106" y="82" width="8" height="8" fill="#2B2540"/><rect x="90" y="100" width="20" height="5" fill="#2B2540"/><path d="M30 92h7v-7h7v7h7v7h-7v7h-7v-7h-7z" fill="#2B2540"/><circle cx="154" cy="88" r="6.5" fill="#E4573D"/><circle cx="164" cy="104" r="6.5" fill="#F2B33D"/><rect x="88" y="134" width="24" height="5" rx="2.5" fill="#8E7CC8"/>` };

  A.skateboard = { svg: `<rect x="54" y="38" width="16" height="22" rx="7" fill="#FFF6EA"/><rect x="130" y="38" width="16" height="22" rx="7" fill="#FFF6EA"/><rect x="54" y="140" width="16" height="22" rx="7" fill="#FFF6EA"/><rect x="130" y="140" width="16" height="22" rx="7" fill="#FFF6EA"/><rect x="62" y="45" width="76" height="8" rx="4" fill="#9A9A9A"/><rect x="62" y="147" width="76" height="8" rx="4" fill="#9A9A9A"/><rect x="74" y="12" width="52" height="176" rx="26" fill="#F28C6B"/><path d="M74 72q26 18 52 0v44q-26 18-52 0z" fill="#F9D15B"/><circle cx="100" cy="94" r="10" fill="#2F4858"/>` };

  A.guitar = { vb: [160, 320], svg: `<rect x="66" y="6" width="28" height="42" rx="6" fill="#4A3020"/><circle cx="62" cy="16" r="4" fill="#D9D9D9"/><circle cx="62" cy="34" r="4" fill="#D9D9D9"/><circle cx="98" cy="16" r="4" fill="#D9D9D9"/><circle cx="98" cy="34" r="4" fill="#D9D9D9"/><rect x="72" y="40" width="16" height="150" fill="#6B4630"/><circle cx="80" cy="198" r="42" fill="#E2A860"/><circle cx="80" cy="254" r="58" fill="#E2A860"/><path d="M80 196a58 58 0 0 1 0 116a76 58 0 0 0 0-116z" fill="#CF9148" opacity=".6"/><circle cx="80" cy="222" r="19" fill="#3A261A"/><circle cx="80" cy="222" r="24" fill="none" stroke="#B87A3A" stroke-width="3"/><rect x="58" y="268" width="44" height="9" rx="3" fill="#4A3020"/><path d="M75 44V270M80 44V270M85 44V270" stroke="#F5EAD6" stroke-width="1.4"/>` };

  A.camera = { svg: `<rect x="44" y="48" width="36" height="20" rx="5" fill="#C9C9C9"/><rect x="122" y="52" width="28" height="14" rx="4" fill="#E4573D"/><rect x="24" y="62" width="152" height="98" rx="13" fill="#2E2E2E"/><path d="M24 75a13 13 0 0 1 13-13h126a13 13 0 0 1 13 13v17H24z" fill="#CFCFCF"/><rect x="142" y="70" width="22" height="14" rx="3" fill="#6E6E6E"/><circle cx="100" cy="120" r="35" fill="#4A4A4A"/><circle cx="100" cy="120" r="26" fill="#1D1D1D"/><circle cx="100" cy="120" r="14" fill="#3E5C8A"/><circle cx="93" cy="113" r="5" fill="#9DB8E0"/>` };

  A.jacket = { svg: `<path d="M70 32l30 15 30-15 34 22 14 72-22 8-8-42v80H52V92l-8 42-22-8 14-72z" fill="#5B8BC9"/><path d="M70 32l30 15-12 24-28-26zM130 32l-30 15 12 24 28-26z" fill="#4A78B4"/><path d="M100 47v124" stroke="#3E6BA5" stroke-width="3"/><circle cx="100" cy="82" r="3.2" fill="#F2D28B"/><circle cx="100" cy="106" r="3.2" fill="#F2D28B"/><circle cx="100" cy="130" r="3.2" fill="#F2D28B"/><circle cx="100" cy="154" r="3.2" fill="#F2D28B"/><rect x="62" y="92" width="27" height="25" rx="3" fill="#4A78B4"/><rect x="111" y="92" width="27" height="25" rx="3" fill="#4A78B4"/><rect x="52" y="162" width="96" height="10" fill="#4A78B4"/>` };

  A.cactus = { svg: `<circle cx="100" cy="46" r="9" fill="#F6B8C4"/><path d="M84 104H70a12 12 0 0 1-12-12V78a8 8 0 0 1 16 0v10h10zM116 116h14a12 12 0 0 0 12-12V88a8 8 0 0 0-16 0v12h-10z" fill="#5FA56B"/><path d="M84 62a16 16 0 0 1 32 0v76H84z" fill="#6DB57A"/><path d="M100 60v72M92 70v60M108 70v60" stroke="#4E8B5A" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M64 136h72l-8 40a8 8 0 0 1-8 6H80a8 8 0 0 1-8-6z" fill="#F0B895"/><rect x="58" y="130" width="84" height="14" rx="6" fill="#F6CDB2"/>` };

  A.seaside = { vb: [250, 200], svg: `<rect width="250" height="200" fill="#BFE3F2"/><circle cx="198" cy="46" r="21" fill="#FFF3C4"/><path d="M30 44q14-12 28 0q14-10 26 2" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect y="92" width="250" height="62" fill="#5FA8D3"/><path d="M0 108q31-9 62 0t62 0 62 0 64 0M0 124q31-9 62 0t62 0 62 0 64 0" stroke="#BFE3F2" stroke-width="3" fill="none"/><path d="M0 144q90-22 250 0v56H0z" fill="#F4DDB0"/><path d="M84 164l14-56" stroke="#8C6B4A" stroke-width="4" stroke-linecap="round"/><path d="M58 112a40 30 0 0 1 78-8z" fill="#E4573D"/><path d="M84 110a14 28 0 0 1 26-4z" fill="#FFF6EA"/><rect x="112" y="166" width="46" height="9" rx="3" fill="#8CC4EE"/>` };

  A.dinnerware = { svg: `<ellipse cx="86" cy="134" rx="72" ry="31" fill="#F7F1E6"/><ellipse cx="86" cy="131" rx="50" ry="20" fill="#E9E0CF"/><path d="M14 104l112-52M18 114l114-48" stroke="#8C5A3C" stroke-width="5" stroke-linecap="round"/><path d="M96 86h86c0 32-18 52-43 52s-43-20-43-52z" fill="#7FA6C9"/><path d="M160 86h22c0 32-18 52-43 52 14-8 21-28 21-52z" fill="#6C93B6"/><ellipse cx="139" cy="86" rx="43" ry="9" fill="#A9C6DF"/><ellipse cx="139" cy="87" rx="35" ry="6" fill="#F7F1E6"/>` };

  A.headphones = { svg: `<path d="M44 122V98a56 56 0 0 1 112 0v24" fill="none" stroke="#2B2B2B" stroke-width="12" stroke-linecap="round"/><rect x="28" y="106" width="36" height="64" rx="16" fill="#F2B33D"/><rect x="136" y="106" width="36" height="64" rx="16" fill="#F2B33D"/><rect x="28" y="118" width="13" height="40" rx="6.5" fill="#D99A2A"/><rect x="159" y="118" width="13" height="40" rx="6.5" fill="#D99A2A"/>` };

  A.bear = { svg: `<circle cx="64" cy="50" r="18" fill="#C99466"/><circle cx="136" cy="50" r="18" fill="#C99466"/><circle cx="64" cy="50" r="9" fill="#E8C4A0"/><circle cx="136" cy="50" r="9" fill="#E8C4A0"/><ellipse cx="54" cy="134" rx="14" ry="21" fill="#D4A373"/><ellipse cx="146" cy="134" rx="14" ry="21" fill="#D4A373"/><ellipse cx="100" cy="146" rx="46" ry="40" fill="#C99466"/><ellipse cx="100" cy="152" rx="26" ry="24" fill="#E8C4A0"/><ellipse cx="74" cy="180" rx="18" ry="12" fill="#D4A373"/><ellipse cx="126" cy="180" rx="18" ry="12" fill="#D4A373"/><circle cx="100" cy="82" r="46" fill="#D4A373"/><ellipse cx="100" cy="98" rx="20" ry="15" fill="#F1DCC2"/><ellipse cx="100" cy="92" rx="7" ry="5" fill="#4A3B32"/><path d="M100 97v7M92 106q8 6 16 0" stroke="#4A3B32" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="82" cy="76" r="5" fill="#2B2B2B"/><circle cx="118" cy="76" r="5" fill="#2B2B2B"/><path d="M84 124l16 8 16-8v14l-16-6-16 6z" fill="#E4573D"/>` };

  A.perfume = { svg: `<rect x="84" y="22" width="32" height="32" rx="6" fill="#D9B36A"/><rect x="90" y="52" width="20" height="12" fill="#C9A45B"/><rect x="52" y="62" width="96" height="114" rx="16" fill="#FBE3E7"/><rect x="60" y="98" width="80" height="70" rx="10" fill="#F2B5C0"/><rect x="78" y="112" width="44" height="30" rx="4" fill="#FFF8F2"/><text x="100" y="132" font-family="Georgia,serif" font-size="12" text-anchor="middle" fill="#8A5A60" letter-spacing="2">No.7</text><path d="M64 76v30" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>` };

  QL.ART = A;
  const cache = {};
  QL.artURL = function (id) {
    if (cache[id]) return cache[id];
    const a = A[id]; if (!a) return '';
    const [w, h] = a.vb || [200, 200];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${a.svg}</svg>`;
    return (cache[id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
})();
