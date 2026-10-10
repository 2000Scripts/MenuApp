-- Run this in Supabase Dashboard > SQL Editor.
-- Owner role is assigned manually by an administrator; signup metadata cannot grant it.

create type public.app_role as enum ('customer', 'owner');
create type public.order_status as enum ('placed', 'confirmed', 'preparing', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'customer',
  requested_role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  course text not null check (course in ('starter', 'main', 'dessert')),
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  is_available boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'placed',
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  meal_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);

create index meals_available_created_idx on public.meals (is_available, created_at desc);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);

-- Security-definer helper avoids recursive profile-table RLS lookups.
create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

create function public.create_profile_for_new_user()
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
    case when new.raw_user_meta_data ->> 'requested_role' = 'owner' then 'owner'::public.app_role else 'customer'::public.app_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select on public.profiles to authenticated;
grant select on public.meals to anon, authenticated;
grant insert, update, delete on public.meals to authenticated;
grant select on public.orders, public.order_items to authenticated;

create policy "Users can read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_owner());
create policy "Owners can manage meals" on public.meals
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Anyone can read available meals" on public.meals
  for select to anon, authenticated using (is_available);
create policy "Customers can read own orders; owners can read all" on public.orders
  for select to authenticated using (customer_id = (select auth.uid()) or public.is_owner());
create policy "Customers and owners can read order items" on public.order_items
  for select to authenticated using (
    public.is_owner() or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select auth.uid())
    )
  );

-- The function snapshots names/prices and creates order + lines atomically.
create function public.place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  computed_total integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(items) as input(meal_id uuid, quantity integer)
    where quantity is null or quantity < 1
  ) then
    raise exception 'Each quantity must be at least 1';
  end if;

  select sum(m.price_cents * input.quantity)::integer
  into computed_total
  from jsonb_to_recordset(items) as input(meal_id uuid, quantity integer)
  join public.meals m on m.id = input.meal_id and m.is_available;

  if computed_total is null or (
    select count(*) from jsonb_to_recordset(items) as input(meal_id uuid, quantity integer)
    join public.meals m on m.id = input.meal_id and m.is_available
  ) <> jsonb_array_length(items) then
    raise exception 'One or more meals are unavailable';
  end if;

  insert into public.orders (customer_id, total_cents)
  values (auth.uid(), computed_total)
  returning id into new_order_id;

  insert into public.order_items (order_id, meal_id, meal_name, unit_price_cents, quantity)
  select new_order_id, m.id, m.name, m.price_cents, input.quantity
  from jsonb_to_recordset(items) as input(meal_id uuid, quantity integer)
  join public.meals m on m.id = input.meal_id and m.is_available;

  return new_order_id;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;
