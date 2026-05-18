-- Phase 2 Travel Xchange schema
-- Run this in the Supabase SQL editor after creating the Supabase project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.travel_xchange_role as enum (
    'registered_user',
    'verified_travel_professional',
    'supplier',
    'recruiter',
    'trainer',
    'advertiser',
    'moderator',
    'admin',
    'super_admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_tier as enum (
    'unverified',
    'email_verified',
    'travel_professional_verified',
    'supplier_verified',
    'recruiter_verified',
    'trainer_verified',
    'admin_verified'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company_type text not null,
  website_url text,
  description text,
  verification_tier public.verification_tier not null default 'unverified',
  status text not null default 'active'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  headline text,
  location text,
  role public.travel_xchange_role not null default 'registered_user',
  verification_tier public.verification_tier not null default 'unverified',
  company_id uuid references public.companies(id) on delete set null,
  onboarding_completed boolean not null default false
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.travel_xchange_role not null default 'registered_user',
  unique (user_id, role)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view active companies" on public.companies;
create policy "Users can view active companies"
on public.companies for select
using (status = 'active' or auth.uid() = created_by);

drop policy if exists "Users can create their own company" on public.companies;
create policy "Users can create their own company"
on public.companies for insert
with check (auth.uid() = created_by);

drop policy if exists "Company owners can update their company" on public.companies;
create policy "Company owners can update their company"
on public.companies for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
on public.user_roles for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own starter role" on public.user_roles;
create policy "Users can create their own starter role"
on public.user_roles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own starter role" on public.user_roles;
create policy "Users can update their own starter role"
on public.user_roles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
