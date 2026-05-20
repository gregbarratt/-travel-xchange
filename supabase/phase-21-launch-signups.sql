-- Phase 21: Launch waitlist signups
-- Run this in the Supabase SQL editor before making the public launch form live.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  email text not null check (position('@' in email) > 1),
  company_name text,
  role_interest text not null default 'travel_professional',
  message text,
  source_page text not null default 'coming_soon_homepage',
  status text not null default 'new' check (status in ('new', 'contacted', 'invited', 'converted', 'archived')),
  admin_notes text,
  invited_at timestamptz,
  converted_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists launch_signups_email_unique_idx
on public.launch_signups (lower(email));

create index if not exists launch_signups_status_created_at_idx
on public.launch_signups (status, created_at desc);

create index if not exists launch_signups_role_interest_idx
on public.launch_signups (role_interest);

drop trigger if exists set_launch_signups_updated_at on public.launch_signups;
create trigger set_launch_signups_updated_at
before update on public.launch_signups
for each row execute function public.set_updated_at();

alter table public.launch_signups enable row level security;

drop policy if exists "Anyone can join the launch waitlist" on public.launch_signups;
create policy "Anyone can join the launch waitlist"
on public.launch_signups for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can view launch waitlist" on public.launch_signups;
create policy "Admins can view launch waitlist"
on public.launch_signups for select
to authenticated
using (public.is_admin_user());

drop policy if exists "Admins can update launch waitlist" on public.launch_signups;
create policy "Admins can update launch waitlist"
on public.launch_signups for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can delete launch waitlist" on public.launch_signups;
create policy "Admins can delete launch waitlist"
on public.launch_signups for delete
to authenticated
using (public.is_admin_user());
