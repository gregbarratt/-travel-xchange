-- Phase 16: Analytics dashboards
-- Run this in Supabase SQL Editor before testing the analytics page.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  page_path text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dashboard_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metric_key text not null unique,
  label text not null,
  value numeric not null default 0,
  period text not null default 'placeholder' check (period in ('all_time', 'daily', 'weekly', 'monthly', 'placeholder')),
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists set_dashboard_metrics_updated_at on public.dashboard_metrics;
create trigger set_dashboard_metrics_updated_at
before update on public.dashboard_metrics
for each row execute function public.set_updated_at();

alter table public.analytics_events enable row level security;
alter table public.dashboard_metrics enable row level security;

drop policy if exists "Members can record analytics events" on public.analytics_events;
create policy "Members can record analytics events"
on public.analytics_events for insert
with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events"
on public.analytics_events for select
using (public.is_admin_user());

drop policy if exists "Admins can manage analytics events" on public.analytics_events;
create policy "Admins can manage analytics events"
on public.analytics_events for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage dashboard metrics" on public.dashboard_metrics;
create policy "Admins can manage dashboard metrics"
on public.dashboard_metrics for all
using (public.is_admin_user())
with check (public.is_admin_user());

insert into public.dashboard_metrics (metric_key, label, value, period, metadata)
values
  ('active_users_30d_placeholder', 'Active users placeholder', 0, 'monthly', '{"source":"Phase 16 starter metric"}'::jsonb),
  ('job_views_placeholder', 'Job views placeholder', 0, 'monthly', '{"source":"Phase 16 starter metric"}'::jsonb),
  ('ad_revenue_placeholder', 'Revenue placeholder', 0, 'monthly', '{"source":"Phase 16 starter metric","currency":"GBP"}'::jsonb),
  ('course_completion_placeholder', 'Course completion placeholder', 0, 'monthly', '{"source":"Phase 16 starter metric"}'::jsonb)
on conflict (metric_key) do nothing;

create index if not exists analytics_events_event_name_created_at_idx
on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_id_created_at_idx
on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_entity_idx
on public.analytics_events (entity_type, entity_id);

create index if not exists dashboard_metrics_metric_key_idx
on public.dashboard_metrics (metric_key);
