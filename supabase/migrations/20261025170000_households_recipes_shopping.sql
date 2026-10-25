-- A household shares recipes, videos and one shopping list. One shared
-- login works, and separate logins can join with the invite code.
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Home',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members(user_id);

create table public.recipes (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null default '',
  data jsonb not null,
  video_path text,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index recipes_household_updated_idx on public.recipes(household_id, updated_at);

create table public.shopping_lists (
  household_id uuid primary key references public.households(id) on delete cascade,
  data jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.household_members m where m.household_id = hid and m.user_id = (select auth.uid()));
$$;

-- The caller's household, created on first use
create or replace function public.my_household()
returns public.households language plpgsql security definer set search_path = ''
as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select hh.* into h from public.households hh
    join public.household_members m on m.household_id = hh.id
    where m.user_id = auth.uid() order by m.joined_at limit 1;
  if h.id is null then
    insert into public.households default values returning * into h;
    insert into public.household_members(household_id, user_id) values (h.id, auth.uid());
  end if;
  return h;
end;
$$;

-- Moves the caller into the household with this invite code
create or replace function public.join_household(code text)
returns public.households language plpgsql security definer set search_path = ''
as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into h from public.households where invite_code = upper(trim(code));
  if h.id is null then raise exception 'No household has this code'; end if;
  delete from public.household_members where user_id = auth.uid();
  insert into public.household_members(household_id, user_id) values (h.id, auth.uid());
  return h;
end;
$$;

revoke execute on function public.my_household() from anon, public;
revoke execute on function public.join_household(text) from anon, public;
revoke execute on function public.is_household_member(uuid) from anon, public;
grant execute on function public.my_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_lists enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "members see who is in their household" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));

create policy "members read recipes" on public.recipes
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add recipes" on public.recipes
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members change recipes" on public.recipes
  for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create policy "members read the list" on public.shopping_lists
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add the list" on public.shopping_lists
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members change the list" on public.shopping_lists
  for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- Videos: private bucket, files under <household id>/<recipe id>.webm
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-videos', 'recipe-videos', false, 52428800, array['video/webm', 'video/mp4']);

create policy "members read videos" on storage.objects
  for select to authenticated using (bucket_id = 'recipe-videos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "members upload videos" on storage.objects
  for insert to authenticated with check (bucket_id = 'recipe-videos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "members replace videos" on storage.objects
  for update to authenticated using (bucket_id = 'recipe-videos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "members delete videos" on storage.objects
  for delete to authenticated using (bucket_id = 'recipe-videos' and public.is_household_member(((storage.foldername(name))[1])::uuid));

-- Live updates between the phones
alter publication supabase_realtime add table public.recipes, public.shopping_lists;
