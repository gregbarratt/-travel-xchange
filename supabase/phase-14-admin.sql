-- Phase 14: Admin dashboard and moderation
-- Run this in Supabase SQL Editor before testing the admin pages.

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

grant execute on function public.is_admin_user() to authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('post', 'comment', 'user', 'company')),
  content_id uuid,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  moderator_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  action text not null,
  reason text,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_tier public.verification_tier not null default 'travel_professional_verified',
  company_id uuid references public.companies(id) on delete set null,
  evidence_url text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected', 'more_info')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists set_verification_requests_updated_at on public.verification_requests;
create trigger set_verification_requests_updated_at
before update on public.verification_requests
for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.verification_requests enable row level security;

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports"
on public.reports for select
using (auth.uid() = reporter_id);

drop policy if exists "Admins can manage reports" on public.reports;
create policy "Admins can manage reports"
on public.reports for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Users can create their own verification requests" on public.verification_requests;
create policy "Users can create their own verification requests"
on public.verification_requests for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view their own verification requests" on public.verification_requests;
create policy "Users can view their own verification requests"
on public.verification_requests for select
using (auth.uid() = user_id);

drop policy if exists "Admins can manage verification requests" on public.verification_requests;
create policy "Admins can manage verification requests"
on public.verification_requests for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can view moderation actions" on public.moderation_actions;
create policy "Admins can view moderation actions"
on public.moderation_actions for select
using (public.is_admin_user());

drop policy if exists "Admins can create moderation actions" on public.moderation_actions;
create policy "Admins can create moderation actions"
on public.moderation_actions for insert
with check (public.is_admin_user());

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs for select
using (public.is_admin_user());

drop policy if exists "Admins can create audit logs" on public.audit_logs;
create policy "Admins can create audit logs"
on public.audit_logs for insert
with check (public.is_admin_user());

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
using (public.is_admin_user());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles for select
using (public.is_admin_user());

drop policy if exists "Admins can manage all posts" on public.posts;
create policy "Admins can manage all posts"
on public.posts for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all comments" on public.comments;
create policy "Admins can manage all comments"
on public.comments for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all jobs" on public.jobs;
create policy "Admins can manage all jobs"
on public.jobs for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all articles" on public.articles;
create policy "Admins can manage all articles"
on public.articles for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all advertisers" on public.advertisers;
create policy "Admins can manage all advertisers"
on public.advertisers for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all ad campaigns" on public.ad_campaigns;
create policy "Admins can manage all ad campaigns"
on public.ad_campaigns for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all ad creatives" on public.ad_creatives;
create policy "Admins can manage all ad creatives"
on public.ad_creatives for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage all ad placements" on public.ad_placements;
create policy "Admins can manage all ad placements"
on public.ad_placements for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can view all ad impressions" on public.ad_impressions;
create policy "Admins can view all ad impressions"
on public.ad_impressions for select
using (public.is_admin_user());

drop policy if exists "Admins can view all ad clicks" on public.ad_clicks;
create policy "Admins can view all ad clicks"
on public.ad_clicks for select
using (public.is_admin_user());

create index if not exists reports_status_created_at_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists moderation_actions_target_idx on public.moderation_actions (target_type, target_id);
create index if not exists moderation_actions_moderator_idx on public.moderation_actions (moderator_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists verification_requests_user_status_idx on public.verification_requests (user_id, status);
create index if not exists verification_requests_status_created_at_idx on public.verification_requests (status, created_at desc);
