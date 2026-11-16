// 把网页里的官方演示商品写成 SQL（supabase/seed.sql）。加了新的官方商品后重跑：node tools/gen_seed_sql.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { window: {}, navigator: { language: 'zh-CN' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['i18n', 'art', 'seed', 'seed2']) vm.runInContext(fs.readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8'), ctx);
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const rows = ctx.QL.SEED.products.map((p) => `(${q(p.id)}, ${q(p.kind)}, ${q(p.cat)}, ${p.price}, ${p.target || 0}, ${q(p.title.zh)}, ${q(p.seller.zh)})`);
const sql = `-- 钱来官方演示商品（由 tools/gen_seed_sql.mjs 生成，在 schema.sql 之后运行）\ninsert into public.products (id, kind, cat, price, target, title, seller) values\n${rows.join(',\n')}\non conflict (id) do update set kind = excluded.kind, cat = excluded.cat, price = excluded.price, target = excluded.target, title = excluded.title, seller = excluded.seller;\ninsert into public.insights (pid) select id from public.products where owner is null on conflict do nothing;\n`;
fs.writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log(rows.length, 'products');
