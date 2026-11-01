-- Gemini key for households that may use AI. Members of such a household can
-- read their own row; nobody can add, change or remove rows from the app:
-- that is done by hand in the dashboard, so other accounts get no AI at all.
create table if not exists public.household_ai (
  household_id uuid primary key references public.households(id) on delete cascade,
  gemini_key text not null,
  model text not null default 'gemini-flash-latest',
  created_at timestamptz not null default now()
);

alter table public.household_ai enable row level security;

revoke all on public.household_ai from anon, authenticated, public;
grant select on public.household_ai to authenticated;

drop policy if exists "members read their AI key" on public.household_ai;
create policy "members read their AI key" on public.household_ai
  for select to authenticated using (public.is_household_member(household_id));
