-- Barcodes the household has scanned: which ingredient a product is and how
-- much one pack holds, so the next scan (on either phone) needs no lookup.
create table if not exists public.product_barcodes (
  household_id uuid not null references public.households(id) on delete cascade,
  barcode text not null,
  ingredient text not null,
  product text not null default '',
  pack text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (household_id, barcode)
);

alter table public.product_barcodes enable row level security;
create policy "members read their barcodes" on public.product_barcodes
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add barcodes" on public.product_barcodes
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members change barcodes" on public.product_barcodes
  for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members remove barcodes" on public.product_barcodes
  for delete to authenticated using (public.is_household_member(household_id));
