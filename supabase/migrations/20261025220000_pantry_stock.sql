-- Home stock: a minimum to keep (staples) and an expiry date per item
alter table public.pantry_items
  add column if not exists min_amount text not null default '',
  add column if not exists expires_on date;
