-- Accounts count as confirmed right away (private household app)
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;
revoke execute on function public.auto_confirm_email() from anon, authenticated, public;
drop trigger if exists auto_confirm_email on auth.users;
create trigger auto_confirm_email before insert on auth.users
  for each row execute function public.auto_confirm_email();
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
