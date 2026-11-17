-- 钱来 · Buy or Bye — 数据库结构
-- 用法：Supabase 控制台 → SQL Editor → New query → 把整个文件粘进去 → Run。
-- 可以重复运行（会先删掉旧的规则和函数再建），但表里的数据会保留。
-- 金额一律按人民币元存，网页显示时再换算。

-- ============ 表 ============
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 16),
  ch jsonb not null default '{"gender":"f","outfit":0,"hair":1,"skin":0}',
  theme text not null default 'cream' check (theme in ('cream','mint','berry')),
  weekly numeric not null default 0 check (weekly >= 0 and weekly <= 1e9),
  bal numeric not null default 0,
  last_pay timestamptz,
  weekly_changed timestamptz,
  room_code text unique not null,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,                                -- 官方商品用固定 id（如 mug），用户上架用 uuid
  owner uuid references public.profiles(id) on delete cascade,  -- 空 = 官方商品
  seller text not null default '',
  kind text not null check (kind in ('new','used')),
  cat text not null check (cat in ('wall','table','floor','shelf','wear')),
  price numeric not null check (price > 0 and price < 1e12),
  target numeric not null default 0 check (target >= 0 and target < 1e15),
  title text not null default '' check (char_length(title) <= 60),
  descr text not null default '' check (char_length(descr) <= 600),
  frame boolean not null default false,
  imgs text[] not null default '{}',                    -- 图片在 uploads 存储桶里的路径
  sticker text,
  art text, pic text, sid text,                        -- 转卖官方商品时沿用官方的图
  bg text, rh numeric, ref numeric not null default 0,
  from_inv uuid,                                       -- 出闲置：来自卖家房间里的哪一件
  active boolean not null default true,
  sold boolean not null default false,
  removed boolean not null default false,              -- 被管理员下架
  v int not null default 0,                            -- 真实曝光（官方商品另有展示用的基础数，在网页里）
  b int not null default 0,                            -- 真实想买
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create index if not exists products_feed on public.products (created_at desc) where owner is not null and active and not removed;

-- 只给卖家和管理员看的数据
create table if not exists public.insights (
  pid text primary key references public.products(id) on delete cascade,
  cant int not null default 0,
  seg jsonb not null default '[[0,0],[0,0],[0,0],[0,0],[0,0]]',
  wtps numeric[] not null default '{}',
  hist jsonb not null default '[]'
);

create table if not exists public.decisions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pid text not null references public.products(id) on delete cascade,
  d text not null check (d in ('buy','bye','wish')),
  price numeric not null,
  wtp numeric,
  t timestamptz not null default now(),
  primary key (user_id, pid)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pid text not null references public.products(id) on delete cascade,
  paid numeric not null default 0,
  slot int not null default -1,
  sample boolean not null default false,
  listed text,
  t timestamptz not null default now()
);
create index if not exists inventory_user on public.inventory (user_id);

create table if not exists public.ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  k text not null,
  a numeric not null,
  pid text,
  t timestamptz not null default now()
);
create index if not exists ledger_user on public.ledger (user_id, t desc);

create table if not exists public.reports (
  id bigserial primary key,
  pid text not null references public.products(id) on delete cascade,
  reason text not null,
  by_user uuid references public.profiles(id) on delete set null,
  t timestamptz not null default now(),
  st text not null default 'open' check (st in ('open','removed','dismissed'))
);

-- 商品评论（2026-11-17 加）
create table if not exists public.comments (
  id bigserial primary key,
  pid text not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default '',
  ch jsonb,
  d text,                                              -- 评论时这个人的选择：buy / bye / wish / 空；卖家本人是 seller
  body text not null check (char_length(body) between 1 and 300),
  removed boolean not null default false,
  t timestamptz not null default now()
);
create index if not exists comments_pid on public.comments (pid, t desc);
alter table public.products add column if not exists nc int not null default 0;   -- 评论数
alter table public.reports add column if not exists cid bigint references public.comments(id) on delete cascade;  -- 举报的是评论时填

-- ============ 内部工具函数 ============
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public._room_code() returns text
language plpgsql set search_path = public as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where room_code = c);
  end loop;
  return c;
end $$;

create or replace function public._on_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, room_code) values (new.id, public._room_code()) on conflict do nothing;
  return new;
end $$;
drop trigger if exists qianlai_new_user on auth.users;
create trigger qianlai_new_user after insert on auth.users for each row execute function public._on_new_user();

-- 当前登录的人（没有资料就补建），并锁住这一行，避免两个窗口同时扣钱
create or replace function public._me() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select * into me from public.profiles where id = auth.uid() for update;
  if not found then
    insert into public.profiles (id, room_code) values (auth.uid(), public._room_code()) returning * into me;
  end if;
  return me;
end $$;

create or replace function public._seg(w numeric) returns int
language sql immutable as $$
  select case when w < 200 then 0 when w < 500 then 1 when w < 1000 then 2 when w < 3000 then 3 else 4 end;
$$;

create or replace function public._free_slot(uid uuid, c text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select k from generate_series(0, case when c = 'wall' then 6 else 7 end) k
    where not exists (
      select 1 from public.inventory i join public.products p on p.id = i.pid
      where i.user_id = uid and p.cat = c and i.slot = k)
    order by k limit 1), -1);
$$;

-- 拿走房间里的一件，并把储物箱里同类最早的一件补上空位
create or replace function public._remove_inv(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare it public.inventory; c text; nxt uuid;
begin
  delete from public.inventory where id = _id returning * into it;
  if not found or it.slot < 0 then return; end if;
  select cat into c from public.products where id = it.pid;
  select i.id into nxt from public.inventory i join public.products p on p.id = i.pid
    where i.user_id = it.user_id and p.cat = c and i.slot < 0 order by i.t limit 1;
  if nxt is not null then update public.inventory set slot = it.slot where id = nxt; end if;
end $$;

create or replace function public._bump_seg(_pid text, sg int, col int, delta int) returns void
language sql security definer set search_path = public as $$
  update public.insights
     set seg = jsonb_set(seg, array[sg::text, col::text], to_jsonb(greatest(0, (seg -> sg ->> col)::int + delta)))
   where pid = _pid;
$$;

-- ============ 给网页调用的函数 ============

-- 第一次登录：昵称、小人、每周预算，并发第一笔钱
create or replace function public.setup(_name text, _ch jsonb, _weekly numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  me := public._me();
  if char_length(trim(coalesce(_name, ''))) = 0 then raise exception 'name'; end if;
  update public.profiles set name = left(trim(_name), 16), ch = coalesce(_ch, ch) where id = me.id;
  if me.weekly = 0 then
    if _weekly is null or _weekly <= 0 or _weekly > 1e9 then raise exception 'weekly'; end if;
    update public.profiles set weekly = _weekly, bal = bal + _weekly, last_pay = now(), weekly_changed = now() where id = me.id;
    insert into public.ledger (user_id, k, a) values (me.id, 'first', _weekly);
  end if;
  return (select to_jsonb(p) from public.profiles p where id = me.id);
end $$;

-- 改每周预算（每 7 天一次，从下次到账起生效）
create or replace function public.set_weekly(_weekly numeric) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  me := public._me();
  if _weekly is null or _weekly <= 0 or _weekly > 1e9 then raise exception 'weekly'; end if;
  if me.weekly_changed is not null and me.weekly_changed > now() - interval '7 days' then raise exception 'wait'; end if;
  update public.profiles set weekly = _weekly, weekly_changed = now() where id = me.id;
end $$;

-- 每 7 天到账一次；打开网页时调用
create or replace function public.claim_pay() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; n int;
begin
  me := public._me();
  if me.weekly <= 0 or me.last_pay is null then return jsonb_build_object('n', 0); end if;
  n := floor(extract(epoch from (now() - me.last_pay)) / 604800)::int;
  if n <= 0 then return jsonb_build_object('n', 0); end if;
  update public.profiles set bal = bal + me.weekly * n, last_pay = last_pay + n * interval '7 days' where id = me.id;
  insert into public.ledger (user_id, k, a) values (me.id, 'credit', me.weekly * n);
  return jsonb_build_object('n', n, 'amount', me.weekly * n);
end $$;

-- 买 / 不买 / 钱不够先记下
create or replace function public.decide(_pid text, _kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; p public.products; had boolean; prev text; sg int; inv uuid; sl int := null;
begin
  me := public._me();
  if me.banned then raise exception 'banned'; end if;
  if _kind not in ('buy', 'bye', 'wish') then raise exception 'kind'; end if;
  select * into p from public.products where id = _pid for update;
  if not found or p.removed or not p.active then raise exception 'gone'; end if;
  if p.sold then raise exception 'sold'; end if;
  if p.owner = me.id then raise exception 'own'; end if;
  select d into prev from public.decisions where user_id = me.id and pid = _pid;
  had := found;
  if prev = 'buy' then raise exception 'already'; end if;
  sg := public._seg(me.weekly);
  insert into public.insights (pid) values (_pid) on conflict do nothing;
  if not had then
    update public.products set v = v + 1 where id = _pid;
    perform public._bump_seg(_pid, sg, 0, 1);
  end if;
  if _kind = 'buy' then
    if me.weekly <= 0 then raise exception 'setup'; end if;
    if me.bal < p.price then raise exception 'insufficient'; end if;
    update public.profiles set bal = bal - p.price where id = me.id;
    insert into public.ledger (user_id, k, a, pid) values (me.id, 'buy', -p.price, _pid);
    update public.products set b = b + 1 where id = _pid;
    perform public._bump_seg(_pid, sg, 1, 1);
    sl := public._free_slot(me.id, p.cat);
    insert into public.inventory (user_id, pid, paid, slot) values (me.id, _pid, p.price, sl) returning id into inv;
    if p.kind = 'used' then
      update public.products set sold = true, active = false, sold_at = now() where id = _pid;
      if p.owner is not null then
        update public.profiles set bal = bal + p.price where id = p.owner;
        insert into public.ledger (user_id, k, a, pid) values (p.owner, 'sale', p.price, _pid);
        if p.from_inv is not null then perform public._remove_inv(p.from_inv); end if;
      end if;
    end if;
  elsif _kind = 'wish' and not had then
    update public.insights set cant = cant + 1 where pid = _pid;
  end if;
  insert into public.decisions (user_id, pid, d, price) values (me.id, _pid, _kind, p.price)
    on conflict (user_id, pid) do update set d = excluded.d, price = excluded.price, t = now(), wtp = null;
  select * into p from public.products where id = _pid;
  return jsonb_build_object('v', p.v, 'b', p.b, 'bal', (select bal from public.profiles where id = me.id), 'inv', inv, 'slot', sl);
end $$;

-- 撤销刚才的选择（3 分钟内；买闲置不能撤销，因为钱已经给了卖家）
create or replace function public.undo_decision(_pid text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles; dd public.decisions; p public.products; it public.inventory;
begin
  me := public._me();
  select * into dd from public.decisions where user_id = me.id and pid = _pid;
  if not found then return; end if;
  if dd.t < now() - interval '3 minutes' then raise exception 'late'; end if;
  select * into p from public.products where id = _pid for update;
  if dd.d = 'buy' then
    if p.kind = 'used' then raise exception 'used'; end if;
    select * into it from public.inventory where user_id = me.id and pid = _pid and not sample order by t desc limit 1;
    if found then
      if it.listed is not null then raise exception 'listed'; end if;
      perform public._remove_inv(it.id);
    end if;
    update public.profiles set bal = bal + dd.price where id = me.id;
    delete from public.ledger where id = (select id from public.ledger where user_id = me.id and pid = _pid and k = 'buy' order by t desc limit 1);
    update public.products set b = greatest(0, b - 1) where id = _pid;
    perform public._bump_seg(_pid, public._seg(me.weekly), 1, -1);
  end if;
  delete from public.decisions where user_id = me.id and pid = _pid;
end $$;

-- 说「不买」后留下的心理价（每人每件只记一次）
create or replace function public.set_wtp(_pid text, _amt numeric) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  me := public._me();
  if _amt is null or _amt <= 0 or _amt > 1e12 then raise exception 'amt'; end if;
  update public.decisions set wtp = _amt where user_id = me.id and pid = _pid and d in ('bye', 'wish') and wtp is null;
  if found then
    update public.insights set wtps = wtps || _amt where pid = _pid and coalesce(array_length(wtps, 1), 0) < 5000;
  end if;
end $$;

-- 重新看一遍说过「不买」的
create or replace function public.redo_byes() returns void
language sql security definer set search_path = public as $$
  delete from public.decisions where user_id = auth.uid() and d = 'bye';
$$;

-- 上架（新品测价或出闲置）
create or replace function public.publish(d jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; nid text := gen_random_uuid()::text; fi uuid; it public.inventory; arr text[];
begin
  me := public._me();
  if me.banned then raise exception 'banned'; end if;
  if me.weekly <= 0 then raise exception 'setup'; end if;
  if (select count(*) from public.products where owner = me.id and created_at > now() - interval '1 day') >= 30 then raise exception 'limit'; end if;
  if char_length(trim(coalesce(d ->> 'title', ''))) = 0 then raise exception 'title'; end if;
  arr := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d -> 'imgs', '[]')) x), '{}');
  if array_length(arr, 1) > 4 then raise exception 'imgs'; end if;
  -- 图片只存“上传文件夹里的路径”，而且这个文件必须真的已经传上来了（防止塞外部链接）
  if exists (select 1 from unnest(arr || nullif(d ->> 'sticker', '')) u
             where u is not null and not exists (select 1 from storage.objects o where o.bucket_id = 'uploads' and o.name = u)) then raise exception 'imgs'; end if;
  if coalesce(d ->> 'pic', '') <> '' and (d ->> 'pic') !~ '^img/[a-z0-9]+\.webp$' then raise exception 'pic'; end if;
  if coalesce(d ->> 'art', '') <> '' and (d ->> 'art') !~ '^[a-z0-9]+$' then raise exception 'art'; end if;
  if array_length(arr, 1) is null and coalesce(d ->> 'pic', '') = '' and coalesce(d ->> 'art', '') = '' then raise exception 'imgs'; end if;
  fi := nullif(d ->> 'from_inv', '')::uuid;
  if fi is not null then
    select * into it from public.inventory where id = fi and user_id = me.id and not sample for update;
    if not found or it.listed is not null then raise exception 'inv'; end if;
  end if;
  insert into public.products (id, owner, seller, kind, cat, price, target, title, descr, frame, imgs, sticker, art, pic, sid, bg, rh, ref, from_inv)
  values (nid, me.id, me.name, d ->> 'kind', d ->> 'cat', (d ->> 'price')::numeric,
          case when d ->> 'kind' = 'new' then coalesce((d ->> 'target')::numeric, 0) else 0 end,
          left(trim(d ->> 'title'), 60), left(coalesce(d ->> 'desc', ''), 600), coalesce((d ->> 'frame')::boolean, false),
          arr, nullif(d ->> 'sticker', ''), nullif(d ->> 'art', ''), nullif(d ->> 'pic', ''), nullif(d ->> 'sid', ''),
          left(d ->> 'bg', 9), least(greatest(coalesce((d ->> 'rh')::numeric, 1), 0.3), 5), coalesce((d ->> 'ref')::numeric, 0), fi);
  insert into public.insights (pid) values (nid);
  if fi is not null then update public.inventory set listed = nid where id = fi; end if;
  return (select to_jsonb(p) from public.products p where id = nid);
end $$;

create or replace function public.reprice(_pid text, _price numeric) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles; p public.products;
begin
  me := public._me();
  select * into p from public.products where id = _pid and owner = me.id for update;
  if not found or p.removed or p.sold then raise exception 'gone'; end if;
  if _price is null or _price <= 0 or _price >= 1e12 then raise exception 'price'; end if;
  update public.insights set hist = jsonb_build_array(jsonb_build_object('price', p.price, 'v', p.v, 'b', p.b, 't', now())) || hist,
         cant = 0, seg = '[[0,0],[0,0],[0,0],[0,0],[0,0]]', wtps = '{}' where pid = _pid;
  update public.products set price = _price, v = 0, b = 0 where id = _pid;
end $$;

create or replace function public.take_down(_pid text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  me := public._me();
  update public.products set active = false where id = _pid and owner = me.id;
  if found then update public.inventory set listed = null where listed = _pid; end if;
end $$;

create or replace function public.place_sample(_pid text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; p public.products; sl int; nid uuid;
begin
  me := public._me();
  select * into p from public.products where id = _pid and owner = me.id;
  if not found then raise exception 'gone'; end if;
  sl := public._free_slot(me.id, p.cat);
  insert into public.inventory (user_id, pid, paid, slot, sample) values (me.id, _pid, 0, sl, true) returning id into nid;
  return jsonb_build_object('id', nid, 'slot', sl);
end $$;

create or replace function public.report_item(_pid text, _reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _reason not in ('illegal', 'porn', 'ip', 'fake', 'abuse', 'other') then raise exception 'reason'; end if;
  if not exists (select 1 from public.products where id = _pid) then raise exception 'gone'; end if;
  if auth.uid() is not null and exists (select 1 from public.reports where pid = _pid and cid is null and by_user = auth.uid()) then return; end if;
  if (select count(*) from public.reports where t > now() - interval '1 hour' and by_user is not distinct from auth.uid()) >= 20 then raise exception 'limit'; end if;
  insert into public.reports (pid, reason, by_user) values (_pid, _reason, auth.uid());
end $$;

-- ============ 评论 ============
-- 看评论（游客也能看）。不返回评论人的 id，只告诉你哪条是你自己写的。
create or replace function public.list_comments(_pid text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'ch', c.ch, 'd', c.d, 'body', c.body, 't', c.t,
                                               'mine', c.user_id = auth.uid()) order by c.t desc), '[]')
  from (select * from public.comments where pid = _pid and not removed order by t desc limit 200) c
  where exists (select 1 from public.products p where p.id = _pid and (not p.removed or p.owner = auth.uid() or public.is_admin()));
$$;

create or replace function public.add_comment(_pid text, _body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; p public.products; b text := trim(coalesce(_body, '')); dd text; c public.comments;
begin
  me := public._me();
  if me.banned then raise exception 'banned'; end if;
  if me.weekly <= 0 then raise exception 'setup'; end if;
  if char_length(b) = 0 or char_length(b) > 300 then raise exception 'body'; end if;
  select * into p from public.products where id = _pid;
  if not found or p.removed then raise exception 'gone'; end if;
  if (select count(*) from public.comments where user_id = me.id and t > now() - interval '1 minute') >= 5
     or (select count(*) from public.comments where user_id = me.id and t > now() - interval '1 day') >= 100 then raise exception 'limit'; end if;
  if p.owner = me.id then dd := 'seller'; else select d into dd from public.decisions where user_id = me.id and pid = _pid; end if;
  insert into public.comments (pid, user_id, name, ch, d, body) values (_pid, me.id, me.name, me.ch, dd, b) returning * into c;
  update public.products set nc = nc + 1 where id = _pid;
  return jsonb_build_object('id', c.id, 'name', c.name, 'ch', c.ch, 'd', c.d, 'body', c.body, 't', c.t, 'mine', true);
end $$;

-- 删评论：自己的可以删，管理员可以删任何人的
create or replace function public.delete_comment(_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c public.comments;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select * into c from public.comments where id = _id for update;
  if not found or c.removed then return; end if;
  if c.user_id <> auth.uid() and not public.is_admin() then raise exception 'own'; end if;
  update public.comments set removed = true where id = _id;
  update public.products set nc = greatest(0, nc - 1) where id = c.pid;
  update public.reports set st = 'removed' where cid = _id and st = 'open';
end $$;

create or replace function public.report_comment(_id bigint, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.comments;
begin
  if _reason not in ('illegal', 'porn', 'ip', 'fake', 'abuse', 'other') then raise exception 'reason'; end if;
  select * into c from public.comments where id = _id and not removed;
  if not found then raise exception 'gone'; end if;
  if auth.uid() is not null and exists (select 1 from public.reports where cid = _id and by_user = auth.uid()) then return; end if;
  if (select count(*) from public.reports where t > now() - interval '1 hour' and by_user is not distinct from auth.uid()) >= 20 then raise exception 'limit'; end if;
  insert into public.reports (pid, cid, reason, by_user) values (c.pid, _id, _reason, auth.uid());
end $$;

-- 用串门码看别人的房间（不用登录也能看）
create or replace function public.room_by_code(_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', p.name, 'ch', p.ch, 'theme', p.theme, 'code', p.room_code,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'pid', i.pid, 'slot', i.slot) order by i.t)
                       from public.inventory i join public.products pr on pr.id = i.pid
                       where i.user_id = p.id and not pr.removed), '[]'))
  from public.profiles p where p.room_code = upper(trim(_code)) and not p.banned and p.weekly > 0;
$$;

-- ============ 管理后台 ============
create or replace function public.admin_users() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'created_at' desc) from (
    select jsonb_build_object('id', p.id, 'email', u.email, 'name', p.name, 'ch', p.ch, 'created_at', p.created_at,
      'weekly', p.weekly, 'bal', p.bal, 'banned', p.banned, 'code', p.room_code,
      'bought', (select count(*) from public.inventory i where i.user_id = p.id and not i.sample),
      'listed', (select count(*) from public.products pr where pr.owner = p.id)) x
    from public.profiles p join auth.users u on u.id = p.id) q), '[]');
end $$;

create or replace function public.admin_remove(_pid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin'; end if;
  update public.products set removed = true, active = false where id = _pid;
  update public.inventory set listed = null where listed = _pid;
  update public.reports set st = 'removed' where pid = _pid and st = 'open';
end $$;

create or replace function public.admin_restore(_pid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin'; end if;
  update public.products set removed = false, active = not sold where id = _pid;
end $$;

create or replace function public.admin_dismiss(_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin'; end if;
  update public.reports set st = 'dismissed' where id = _id;
end $$;

create or replace function public.admin_ban(_uid uuid, _on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin'; end if;
  update public.profiles set banned = _on where id = _uid;
  if _on then update public.products set active = false where owner = _uid and active; end if;
end $$;

create or replace function public.am_i_admin() returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin(); $$;

-- ============ 权限 ============
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.insights enable row level security;
alter table public.decisions enable row level security;
alter table public.inventory enable row level security;
alter table public.ledger enable row level security;
alter table public.reports enable row level security;
alter table public.comments enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read products" on public.products;
create policy "read products" on public.products for select using (not removed or owner = auth.uid() or public.is_admin());

drop policy if exists "read own insights" on public.insights;
create policy "read own insights" on public.insights for select
  using (exists (select 1 from public.products p where p.id = pid and p.owner = auth.uid()) or public.is_admin());

drop policy if exists "read own decisions" on public.decisions;
create policy "read own decisions" on public.decisions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "read own inventory" on public.inventory;
create policy "read own inventory" on public.inventory for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "read own ledger" on public.ledger;
create policy "read own ledger" on public.ledger for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin reads comments" on public.comments;
create policy "admin reads comments" on public.comments for select using (public.is_admin());
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports" on public.reports for select using (public.is_admin());

-- 网页只能读；所有修改都必须走上面的函数（函数里有检查）
revoke all on all tables in schema public from anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.profiles, public.insights, public.decisions, public.inventory, public.ledger, public.reports, public.comments to authenticated;
grant update (name, ch, theme) on public.profiles to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
-- is_admin 会在读取规则里用到，所以游客也要能调用（它只回答“我是不是管理员”）
grant execute on function public.room_by_code(text), public.report_item(text, text), public.is_admin(), public.list_comments(text), public.report_comment(bigint, text) to anon, authenticated;
grant execute on function public.setup(text, jsonb, numeric), public.set_weekly(numeric), public.claim_pay(), public.decide(text, text),
  public.undo_decision(text), public.set_wtp(text, numeric), public.redo_byes(), public.publish(jsonb), public.reprice(text, numeric),
  public.take_down(text), public.place_sample(text), public.am_i_admin(), public.is_admin(),
  public.add_comment(text, text), public.delete_comment(bigint),
  public.admin_users(), public.admin_remove(text), public.admin_restore(text), public.admin_dismiss(bigint), public.admin_ban(uuid, boolean)
  to authenticated;

-- ============ 图片存储 ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "qianlai upload own folder" on storage.objects;
create policy "qianlai upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text
              and not exists (select 1 from public.profiles where id = auth.uid() and banned));
