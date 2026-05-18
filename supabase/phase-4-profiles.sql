-- Phase 4 Travel Xchange profiles and company pages schema
-- Run this in the Supabase SQL editor after Phase 3 has been installed.

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

create table if not exists public.profile_experience (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company_name text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  display_order integer not null default 0
);

create table if not exists public.profile_specialisms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null default 'travel'
);

create table if not exists public.company_followers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (company_id, user_id)
);

create unique index if not exists profile_specialisms_unique_name_idx
on public.profile_specialisms (profile_id, lower(name));

drop trigger if exists set_profile_experience_updated_at on public.profile_experience;
create trigger set_profile_experience_updated_at
before update on public.profile_experience
for each row execute function public.set_updated_at();

alter table public.profile_experience enable row level security;
alter table public.profile_specialisms enable row level security;
alter table public.company_followers enable row level security;

drop policy if exists "Members can view profile experience" on public.profile_experience;
create policy "Members can view profile experience"
on public.profile_experience for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create their own profile experience" on public.profile_experience;
create policy "Users can create their own profile experience"
on public.profile_experience for insert
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their own profile experience" on public.profile_experience;
create policy "Users can update their own profile experience"
on public.profile_experience for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their own profile experience" on public.profile_experience;
create policy "Users can delete their own profile experience"
on public.profile_experience for delete
using (auth.uid() = profile_id);

drop policy if exists "Members can view profile specialisms" on public.profile_specialisms;
create policy "Members can view profile specialisms"
on public.profile_specialisms for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create their own profile specialisms" on public.profile_specialisms;
create policy "Users can create their own profile specialisms"
on public.profile_specialisms for insert
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their own profile specialisms" on public.profile_specialisms;
create policy "Users can update their own profile specialisms"
on public.profile_specialisms for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their own profile specialisms" on public.profile_specialisms;
create policy "Users can delete their own profile specialisms"
on public.profile_specialisms for delete
using (auth.uid() = profile_id);

drop policy if exists "Members can view company followers" on public.company_followers;
create policy "Members can view company followers"
on public.company_followers for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can follow companies as themselves" on public.company_followers;
create policy "Users can follow companies as themselves"
on public.company_followers for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can unfollow companies as themselves" on public.company_followers;
create policy "Users can unfollow companies as themselves"
on public.company_followers for delete
using (auth.uid() = user_id);

create index if not exists profile_experience_profile_id_idx
on public.profile_experience (profile_id, display_order, start_date desc);

create index if not exists profile_specialisms_profile_id_idx
on public.profile_specialisms (profile_id, name);

create index if not exists company_followers_company_id_idx
on public.company_followers (company_id);

create index if not exists company_followers_user_id_idx
on public.company_followers (user_id);
