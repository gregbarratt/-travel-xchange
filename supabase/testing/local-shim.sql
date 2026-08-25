-- Local verification shim.
--
-- Supabase provides the auth schema, auth.uid(), auth.role() and the Phase 3/4
-- helpers. This file recreates just enough of them to apply and exercise the
-- Travel Xchange migrations against a plain PostgreSQL instance, so schema
-- changes can be proven before they reach a hosted project.
--
--   createdb travel_xchange_verify
--   psql -d travel_xchange_verify -f supabase/testing/local-shim.sql
--   psql -d travel_xchange_verify -f supabase/phase-31-news-ingestion.sql

-- Supabase ships these roles. Create them locally so grants in the migrations
-- apply unchanged.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- request.jwt.claim.sub mirrors how Supabase exposes the signed-in user.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  role text not null default 'registered_user',
  verification_tier text not null default 'unverified'
);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin', 'super_admin')
  );
$$;

-- Supabase grants table privileges to these roles by default. Recreate that so
-- row level security is what actually decides access during verification,
-- rather than a missing GRANT.
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
