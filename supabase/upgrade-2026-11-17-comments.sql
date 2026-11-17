-- 2026-11-17 升级：评论区。线上数据库已经装过旧版时，在 SQL Editor 里运行这一个文件就行（可重复运行）。

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

alter table public.comments enable row level security;
drop policy if exists "admin reads comments" on public.comments;
create policy "admin reads comments" on public.comments for select using (public.is_admin());
revoke all on public.comments from anon, authenticated;
grant select on public.comments to authenticated;
revoke execute on function public.list_comments(text), public.add_comment(text, text), public.delete_comment(bigint), public.report_comment(bigint, text) from public, anon, authenticated;
grant execute on function public.list_comments(text), public.report_comment(bigint, text) to anon, authenticated;
grant execute on function public.add_comment(text, text), public.delete_comment(bigint) to authenticated;
