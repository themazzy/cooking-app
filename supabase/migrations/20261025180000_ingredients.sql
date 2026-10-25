-- Ingredient catalog: the shared starting list (household_id is null) plus
-- each household's own entries, e.g. local brands with their own photo.
-- base: the general ingredient a custom one stands for ("Butter" for a
-- brand of butter), so recipes and shopping lists treat them alike.
create table public.ingredients (
  id bigint generated always as identity primary key,
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  aisle text not null default 'Other',
  image text,
  image_data text,
  base text,
  aliases text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create unique index ingredients_name_key
  on public.ingredients (coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

alter table public.ingredients enable row level security;
create policy "everyone reads the shared list, members their own" on public.ingredients
  for select to anon, authenticated using (household_id is null or public.is_household_member(household_id));
create policy "members add their own" on public.ingredients
  for insert to authenticated with check (household_id is not null and public.is_household_member(household_id));
create policy "members change their own" on public.ingredients
  for update to authenticated using (household_id is not null and public.is_household_member(household_id))
  with check (household_id is not null and public.is_household_member(household_id));
create policy "members remove their own" on public.ingredients
  for delete to authenticated using (household_id is not null and public.is_household_member(household_id));

-- What the household has at home
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  amount text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid()
);
create unique index pantry_items_name_key on public.pantry_items (household_id, lower(name));

alter table public.pantry_items enable row level security;
create policy "members read the pantry" on public.pantry_items
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add to the pantry" on public.pantry_items
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members change the pantry" on public.pantry_items
  for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members remove from the pantry" on public.pantry_items
  for delete to authenticated using (public.is_household_member(household_id));

alter publication supabase_realtime add table public.ingredients, public.pantry_items;
