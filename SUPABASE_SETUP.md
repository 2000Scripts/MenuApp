# Supabase setup

## 1. Create the Supabase project

Create a project at [supabase.com](https://supabase.com), then copy its Project URL and anon/publishable key from **Project Settings → API**. Never put the `service_role` key in this mobile app.

Copy `.env.example` to `.env` and replace both values. Restart Expo after changing environment variables.

## 2. Create the database schema

Open **SQL Editor** in the Supabase dashboard and run `supabase/schema.sql`. It creates profiles, meals, orders, order items, row-level security policies, and the atomic `place_order` database function.

## 3. Approve the owner account

Create an account from the app first. In the SQL Editor, promote only the trusted account using its auth user UUID:

```sql
update public.profiles
set role = 'owner'
where id = 'AUTH-USER-UUID-HERE';
```

Find that UUID in **Authentication → Users**. Public signup always creates a `customer`; never let a client choose its own owner role. Row-level security still enforces owner permissions even if someone navigates directly to the owner screen.

## 4. Current checkout behavior

The app submits an order to Supabase and stores a server-calculated total and item-price snapshots. This is order placement, **not card payment**. Before collecting money, integrate a payment provider such as Stripe through a trusted server/Edge Function; do not handle secret payment keys in the app. Currency display is currently USD.

Meal images currently use an optional public image URL. Supabase Storage image upload can be added after creating a bucket and upload policies.