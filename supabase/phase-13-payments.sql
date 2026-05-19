-- Phase 13: Stripe Billing subscriptions
-- Run this in Supabase SQL Editor before testing checkout/webhooks.

create table if not exists public.payment_customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id),
  unique (stripe_customer_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text,
  status text not null default 'incomplete',
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (stripe_subscription_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_invoice_id text not null,
  stripe_subscription_id text,
  amount_due integer,
  amount_paid integer,
  currency text,
  hosted_invoice_url text,
  invoice_pdf text,
  status text not null default 'unknown',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (stripe_invoice_id)
);

drop trigger if exists set_payment_customers_updated_at on public.payment_customers;
create trigger set_payment_customers_updated_at
before update on public.payment_customers
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

alter table public.payment_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "Users can view their own Stripe customer" on public.payment_customers;
create policy "Users can view their own Stripe customer"
on public.payment_customers for select
using (auth.uid() = user_id);

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "Users can view their own invoices" on public.invoices;
create policy "Users can view their own invoices"
on public.invoices for select
using (auth.uid() = user_id);

create index if not exists payment_customers_user_id_idx on public.payment_customers (user_id);
create index if not exists payment_customers_stripe_customer_id_idx on public.payment_customers (stripe_customer_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id, created_at desc);
create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
create index if not exists invoices_user_id_idx on public.invoices (user_id, created_at desc);
create index if not exists invoices_stripe_customer_id_idx on public.invoices (stripe_customer_id);
