-- Shared ingredient catalog: canonical English name, other names recipes
-- use, shopping aisle and a TheMealDB picture name. Everyone can read it,
-- signed-in users can add and fix entries.
create table public.ingredients (
  id bigint generated always as identity primary key,
  name text not null,
  aisle text not null default 'Other',
  image text,
  aliases text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create unique index ingredients_name_key on public.ingredients (lower(name));

alter table public.ingredients enable row level security;
create policy "anyone reads the catalog" on public.ingredients for select to anon, authenticated using (true);
create policy "signed-in users add ingredients" on public.ingredients for insert to authenticated with check (true);
create policy "signed-in users fix ingredients" on public.ingredients for update to authenticated using (true) with check (true);
