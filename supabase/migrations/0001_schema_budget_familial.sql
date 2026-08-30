-- =====================================================================
-- Mon Budget Familial - schema initial
--
-- Principes tenus ici :
--  1. Chaque ligne appartient a un compte (user_id). Row Level Security est
--     ACTIVE sur toutes les tables, et aucune politique n'autorise a lire
--     ou ecrire la ligne d'autrui.
--  2. Les identifiants sont generes par le CLIENT (uuid) et servent de cle
--     primaire. C'est ce qui rend la synchronisation idempotente : rejouer
--     un envoi interrompu reecrit la meme ligne au lieu d'en creer une autre.
--  3. Les montants sont des entiers de FCFA. Aucun flottant.
--  4. Les suppressions sont logiques (deleted_at) pour pouvoir se propager
--     d'un appareil a l'autre.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reglages du foyer : une ligne par compte.
-- ---------------------------------------------------------------------
create table if not exists public.mbf_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  savings_rate_pct smallint not null default 15 check (savings_rate_pct between 0 and 100),
  warn_threshold_pct smallint not null default 80 check (warn_threshold_pct between 1 and 100),
  household_name text not null default 'Ma famille',
  members text[] not null default array['Moi'],
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Collections synchronisables.
-- ---------------------------------------------------------------------
create table if not exists public.mbf_envelopes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  planned bigint not null default 0 check (planned >= 0),
  position integer not null default 0,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_pockets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_charges (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  amount bigint not null check (amount >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  frequency text not null check (frequency in ('mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle')),
  start_month text not null check (start_month ~ '^\d{4}-\d{2}$'),
  active boolean not null default true,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_incomes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount bigint not null check (amount >= 0),
  source text not null default '',
  method text not null default 'especes',
  recurring boolean not null default false,
  note text not null default '',
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_budget_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  envelope_id uuid not null,
  planned bigint not null check (planned >= 0),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount bigint not null check (amount >= 0),
  envelope_id uuid,
  method text not null default 'especes',
  description text not null default '',
  member text not null default 'Moi',
  charge_id uuid,
  override_reason text not null default '',
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_charge_payments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  charge_id uuid not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  paid_date date not null,
  amount bigint not null check (amount >= 0),
  expense_id uuid,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_savings (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount bigint not null check (amount >= 0),
  pocket_id uuid not null,
  kind text not null check (kind in ('depot', 'retrait')),
  note text not null default '',
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mbf_goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount bigint not null check (target_amount >= 0),
  target_date date not null,
  pocket_id uuid,
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Index de synchronisation : la requete de reception filtre toujours sur
-- (user_id, updated_at).
-- ---------------------------------------------------------------------
create index if not exists mbf_envelopes_sync_idx on public.mbf_envelopes (user_id, updated_at);
create index if not exists mbf_pockets_sync_idx on public.mbf_pockets (user_id, updated_at);
create index if not exists mbf_charges_sync_idx on public.mbf_charges (user_id, updated_at);
create index if not exists mbf_incomes_sync_idx on public.mbf_incomes (user_id, updated_at);
create index if not exists mbf_budget_overrides_sync_idx on public.mbf_budget_overrides (user_id, updated_at);
create index if not exists mbf_expenses_sync_idx on public.mbf_expenses (user_id, updated_at);
create index if not exists mbf_charge_payments_sync_idx on public.mbf_charge_payments (user_id, updated_at);
create index if not exists mbf_savings_sync_idx on public.mbf_savings (user_id, updated_at);
create index if not exists mbf_goals_sync_idx on public.mbf_goals (user_id, updated_at);

create index if not exists mbf_expenses_date_idx on public.mbf_expenses (user_id, date);
create index if not exists mbf_incomes_date_idx on public.mbf_incomes (user_id, date);

-- ---------------------------------------------------------------------
-- Row Level Security.
--
-- Une seule regle, appliquee partout : auth.uid() = user_id, aussi bien en
-- lecture qu'en ecriture. La clause WITH CHECK empeche d'ecrire une ligne au
-- nom d'un autre compte, y compris par une mise a jour qui changerait
-- user_id.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'mbf_settings', 'mbf_envelopes', 'mbf_pockets', 'mbf_charges', 'mbf_incomes',
    'mbf_budget_overrides', 'mbf_expenses', 'mbf_charge_payments', 'mbf_savings', 'mbf_goals'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end
$$;

-- Aucun acces anonyme : un visiteur non authentifie ne voit rien.
revoke all on public.mbf_settings, public.mbf_envelopes, public.mbf_pockets,
  public.mbf_charges, public.mbf_incomes, public.mbf_budget_overrides,
  public.mbf_expenses, public.mbf_charge_payments, public.mbf_savings,
  public.mbf_goals from anon;
