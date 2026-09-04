create table if not exists public.mbf_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  product_id text not null check (product_id in ('premium_monthly','premium_annual')),
  premium_until timestamptz not null,
  purchase_token_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.mbf_entitlements enable row level security;
alter table public.mbf_entitlements force row level security;

revoke all on table public.mbf_entitlements from anon;
revoke insert, update, delete on table public.mbf_entitlements from authenticated;
grant select on table public.mbf_entitlements to authenticated;

drop policy if exists "Users can read own entitlement" on public.mbf_entitlements;
create policy "Users can read own entitlement"
on public.mbf_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists mbf_entitlements_premium_until_idx on public.mbf_entitlements (premium_until);
create unique index if not exists mbf_entitlements_purchase_token_hash_uidx on public.mbf_entitlements (purchase_token_hash);
