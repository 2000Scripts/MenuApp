-- Apply this migration to an existing Supabase project before using role selection.
-- Signup may request owner access, but every new account remains a customer until approved.

alter table public.profiles
  add column if not exists requested_role public.app_role not null default 'customer';

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, requested_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer',
    case
      when new.raw_user_meta_data ->> 'requested_role' = 'owner' then 'owner'::public.app_role
      else 'customer'::public.app_role
    end
  );
  return new;
end;
$$;
