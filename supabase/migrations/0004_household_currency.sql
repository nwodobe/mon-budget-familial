-- Multi-devises : la devise reste une preference d'affichage du foyer.
-- Les montants existants ne sont jamais convertis automatiquement.

alter table public.mbf_settings
  add column if not exists currency text not null default 'XOF';

alter table public.mbf_settings
  drop constraint if exists mbf_settings_currency_check;

alter table public.mbf_settings
  add constraint mbf_settings_currency_check
  check (currency in ('XOF','EUR','USD','GBP','CAD','CHF','NGN','GHS','MAD'));

comment on column public.mbf_settings.currency is
  'Devise ISO 4217 d affichage du foyer. Aucun taux de change ni conversion automatique.';
