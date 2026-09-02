-- Discipline financiere V2
-- 1) Memorise les alertes forcees sur les depenses pour expliquer le score.
-- 2) Ajoute les provisions de grosses depenses futures.

alter table public.mbf_expenses
  add column if not exists discipline_flags text[] not null default '{}';

create table if not exists public.mbf_provisions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount bigint not null check (target_amount >= 0),
  target_date date not null,
  pocket_id uuid,
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  active boolean not null default true,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mbf_provisions_sync_idx
  on public.mbf_provisions (user_id, updated_at);

alter table public.mbf_provisions enable row level security;
alter table public.mbf_provisions force row level security;

drop policy if exists mbf_provisions_select_own on public.mbf_provisions;
drop policy if exists mbf_provisions_insert_own on public.mbf_provisions;
drop policy if exists mbf_provisions_update_own on public.mbf_provisions;
drop policy if exists mbf_provisions_delete_own on public.mbf_provisions;

create policy mbf_provisions_select_own
  on public.mbf_provisions for select to authenticated
  using (auth.uid() = user_id);
create policy mbf_provisions_insert_own
  on public.mbf_provisions for insert to authenticated
  with check (auth.uid() = user_id);
create policy mbf_provisions_update_own
  on public.mbf_provisions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy mbf_provisions_delete_own
  on public.mbf_provisions for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.mbf_provisions from anon;
grant select, insert, update, delete on public.mbf_provisions to authenticated;
