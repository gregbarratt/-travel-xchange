-- Phase 6 Travel Xchange jobs board schema
-- Run this in the Supabase SQL editor after Phase 5 has been installed.

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

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  slug text not null unique,
  category text not null default 'travel_sales',
  employment_type text not null default 'full_time' check (
    employment_type in ('full_time', 'part_time', 'contract', 'temporary', 'homeworking', 'freelance')
  ),
  location text not null default 'Remote',
  is_remote boolean not null default false,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'GBP',
  description text not null check (char_length(trim(description)) between 1 and 5000),
  requirements text,
  application_url text,
  contact_email text,
  package_type text not null default 'basic' check (
    package_type in ('basic', 'featured', 'sponsored_employer', 'recruiter_subscription')
  ),
  is_featured boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (status in ('draft', 'published', 'closed', 'hidden', 'deleted'))
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text,
  status text not null default 'interested' check (
    status in ('interested', 'applied', 'shortlisted', 'rejected', 'withdrawn')
  ),
  unique (job_id, user_id)
);

create table if not exists public.job_bookmarks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (job_id, user_id)
);

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_bookmarks enable row level security;

drop policy if exists "Members can view published jobs" on public.jobs;
create policy "Members can view published jobs"
on public.jobs for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own jobs" on public.jobs;
create policy "Users can create their own jobs"
on public.jobs for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs"
on public.jobs for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs"
on public.jobs for delete
using (auth.uid() = created_by);

drop policy if exists "Users can view relevant job applications" on public.job_applications;
create policy "Users can view relevant job applications"
on public.job_applications for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_applications.job_id
      and jobs.created_by = auth.uid()
  )
);

drop policy if exists "Users can register interest as themselves" on public.job_applications;
create policy "Users can register interest as themselves"
on public.job_applications for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own job applications" on public.job_applications;
create policy "Users can update their own job applications"
on public.job_applications for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_applications.job_id
      and jobs.created_by = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_applications.job_id
      and jobs.created_by = auth.uid()
  )
);

drop policy if exists "Users can delete their own job applications" on public.job_applications;
create policy "Users can delete their own job applications"
on public.job_applications for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their own job bookmarks" on public.job_bookmarks;
create policy "Users can view their own job bookmarks"
on public.job_bookmarks for select
using (auth.uid() = user_id);

drop policy if exists "Users can bookmark jobs as themselves" on public.job_bookmarks;
create policy "Users can bookmark jobs as themselves"
on public.job_bookmarks for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own job bookmarks" on public.job_bookmarks;
create policy "Users can remove their own job bookmarks"
on public.job_bookmarks for delete
using (auth.uid() = user_id);

create index if not exists jobs_slug_idx on public.jobs (slug);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_category_idx on public.jobs (category);
create index if not exists jobs_location_idx on public.jobs (location);
create index if not exists jobs_company_id_idx on public.jobs (company_id);
create index if not exists job_applications_job_id_idx on public.job_applications (job_id);
create index if not exists job_applications_user_id_idx on public.job_applications (user_id);
create index if not exists job_bookmarks_job_id_idx on public.job_bookmarks (job_id);
create index if not exists job_bookmarks_user_id_idx on public.job_bookmarks (user_id);
