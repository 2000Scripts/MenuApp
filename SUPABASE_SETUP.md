# Supabase setup

## 1. Create the Supabase project

Create a project at [supabase.com](https://supabase.com), then copy its Project URL and anon/publishable key from **Project Settings → API**. Never put the `service_role` key in this mobile app.

Copy `.env.example` to `.env` and replace both values. Restart Expo after changing environment variables.

## 2. Create or update the database schema

For a new project, run `supabase/schema.sql` in **SQL Editor**. It creates profiles, meals, orders, order items, row-level security policies, and the atomic `place_order` database function.

For a project that already ran the original schema, run `supabase/migrations/20261010_owner_role_requests.sql` instead. This adds the requested role column and updates profile creation for new signups.

## 3. Choose and approve a role

During signup, a user can select customer or request owner access. A request is **not** an owner grant: new accounts always receive `role = 'customer'`, and the requested role is stored separately. This prevents anyone from granting themselves owner privileges in the app.

After reviewing the request, an administrator can promote the trusted user in **SQL Editor** using the auth user UUID:

```sql
update public.profiles
set role = 'owner'
where id = 'AUTH-USER-UUID-HERE';
```

Find that UUID in **Authentication → Users**. After approval, have the user sign out and sign back in so the app reloads their role. The app only registers the `AddMeal` route for profiles whose database role is `owner`; database row-level security independently protects meal changes. Do not grant clients update permission on `profiles.role`.

## 4. Current checkout behavior

The app submits an order to Supabase and stores a server-calculated total and item-price snapshots. This is order placement, **not card payment**. Before collecting money, integrate a payment provider such as Stripe through a trusted server/Edge Function; do not handle secret payment keys in the app. Currency display is currently USD.

Meal images currently use an optional public image URL. Supabase Storage image upload can be added after creating a bucket and upload policies.