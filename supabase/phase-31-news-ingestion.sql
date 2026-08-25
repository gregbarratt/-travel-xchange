-- Phase 31: automated travel trade news ingestion (RSS / Atom)
-- Run this in the Supabase SQL Editor after Phase 7 (supabase/phase-7-news.sql).
--
-- This phase is additive. It creates the news ingestion pipeline tables and
-- leaves every existing table untouched.
--
-- Concepts:
--   news_sources        publisher / feed configuration and health
--   news_items          raw normalised item captured from a feed
--   news_posts          the Travel Xchange publication of an item
--   news_topics         taxonomy used for classification and following
--   *_follows           member personalisation
--   news_ingestion_*    operational history for each scheduled run

-- ---------------------------------------------------------------------------
-- Role helper
-- ---------------------------------------------------------------------------

create or replace function public.is_news_source_admin()
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
      and profiles.role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.is_news_source_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------

create table if not exists public.news_topics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  topic_group text not null default 'sector' check (
    topic_group in ('sector', 'destination', 'discipline', 'platform')
  ),
  is_default boolean not null default false,
  sort_order integer not null default 100,
  status text not null default 'active' check (status in ('active', 'hidden'))
);

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  publisher text not null,
  website_url text not null,
  feed_url text,
  feed_type text not null default 'rss' check (feed_type in ('rss', 'atom', 'json')),
  source_type text not null default 'trade_media' check (
    source_type in ('trade_media', 'official_body', 'supplier', 'platform')
  ),
  enabled boolean not null default false,
  auto_publish boolean not null default false,
  polling_interval_minutes integer not null default 15
    check (polling_interval_minutes between 5 and 1440),
  trust_level text not null default 'standard'
    check (trust_level in ('low', 'standard', 'high')),
  rights_notes text,
  default_topic_slugs text[] not null default '{}',
  request_etag text,
  request_last_modified text,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  consecutive_failures integer not null default 0,
  health_status text not null default 'unverified' check (
    health_status in ('unverified', 'healthy', 'warning', 'failing', 'disabled')
  ),
  -- A source can only be switched on once a real, verified feed endpoint exists.
  constraint news_sources_enabled_requires_feed
    check (enabled = false or feed_url is not null)
);

-- ---------------------------------------------------------------------------
-- Raw ingested items
-- ---------------------------------------------------------------------------

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_id uuid not null references public.news_sources(id) on delete cascade,
  external_guid text,
  canonical_url text not null,
  canonical_url_hash text not null,
  source_url text not null,
  title text not null,
  title_fingerprint text not null,
  original_description text,
  author text,
  image_url text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  duplicate_of_item_id uuid references public.news_items(id) on delete set null,
  processing_status text not null default 'pending' check (
    processing_status in ('pending', 'processed', 'duplicate', 'rejected', 'failed')
  ),
  processing_error text
);

-- ---------------------------------------------------------------------------
-- Travel Xchange publication of an item
-- ---------------------------------------------------------------------------

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  news_item_id uuid not null unique references public.news_items(id) on delete cascade,
  source_id uuid not null references public.news_sources(id) on delete cascade,
  -- Denormalised display fields so the reading path never needs news_items.
  title text not null,
  summary text,
  canonical_url text not null,
  publisher text not null,
  image_url text,
  published_at timestamptz not null,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'published', 'rejected', 'unpublished')
  ),
  classification_confidence numeric(4, 3) not null default 0
    check (classification_confidence between 0 and 1),
  requires_moderation boolean not null default true,
  sensitivity text not null default 'routine' check (
    sensitivity in ('routine', 'sensitive', 'high_risk')
  ),
  auto_published boolean not null default false,
  is_featured boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  published_to_feed_at timestamptz
);

create table if not exists public.news_post_topics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  news_post_id uuid not null references public.news_posts(id) on delete cascade,
  topic_id uuid not null references public.news_topics(id) on delete cascade,
  confidence numeric(4, 3) not null default 0.5 check (confidence between 0 and 1),
  assigned_by text not null default 'rules' check (
    assigned_by in ('rules', 'source_default', 'manual')
  )
);

-- ---------------------------------------------------------------------------
-- Personalisation
-- ---------------------------------------------------------------------------

create table if not exists public.user_topic_follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.news_topics(id) on delete cascade
);

create table if not exists public.user_source_follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.news_sources(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Moderation and engagement
-- ---------------------------------------------------------------------------

create table if not exists public.news_moderation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  news_post_id uuid not null references public.news_posts(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (
    action in ('reviewed', 'approved', 'rejected', 'edited', 'auto_published', 'unpublished')
  ),
  note text
);

create table if not exists public.news_click_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  news_post_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  surface text not null default 'news' check (
    surface in ('news', 'feed', 'search', 'digest')
  )
);

-- ---------------------------------------------------------------------------
-- Ingestion runs
-- ---------------------------------------------------------------------------

create table if not exists public.news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  trigger text not null default 'cron' check (trigger in ('cron', 'manual', 'test')),
  status text not null default 'running' check (
    status in ('running', 'succeeded', 'partial', 'failed', 'timed_out')
  ),
  source_count integer not null default 0,
  fetched_count integer not null default 0,
  not_modified_count integer not null default 0,
  new_item_count integer not null default 0,
  duplicate_count integer not null default 0,
  published_count integer not null default 0,
  moderation_count integer not null default 0,
  failure_count integer not null default 0,
  duration_ms integer
);

create table if not exists public.news_ingestion_source_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references public.news_ingestion_runs(id) on delete cascade,
  source_id uuid not null references public.news_sources(id) on delete cascade,
  status text not null check (
    status in ('succeeded', 'not_modified', 'skipped', 'failed')
  ),
  http_status integer,
  discovered_count integer not null default 0,
  new_item_count integer not null default 0,
  duplicate_count integer not null default 0,
  published_count integer not null default 0,
  moderation_count integer not null default 0,
  duration_ms integer,
  error_message text
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists set_news_topics_updated_at on public.news_topics;
create trigger set_news_topics_updated_at
before update on public.news_topics
for each row execute function public.set_updated_at();

drop trigger if exists set_news_sources_updated_at on public.news_sources;
create trigger set_news_sources_updated_at
before update on public.news_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_news_items_updated_at on public.news_items;
create trigger set_news_items_updated_at
before update on public.news_items
for each row execute function public.set_updated_at();

drop trigger if exists set_news_posts_updated_at on public.news_posts;
create trigger set_news_posts_updated_at
before update on public.news_posts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes and deduplication constraints
-- ---------------------------------------------------------------------------

create index if not exists news_topics_slug_idx on public.news_topics (slug);
create index if not exists news_topics_status_sort_idx
  on public.news_topics (status, sort_order, name);

create index if not exists news_sources_slug_idx on public.news_sources (slug);
create index if not exists news_sources_enabled_idx
  on public.news_sources (enabled, health_status);

-- Layer 1: a trustworthy feed GUID is unique within its own source.
create unique index if not exists news_items_source_guid_idx
  on public.news_items (source_id, external_guid)
  where external_guid is not null;

-- Layer 2: the same canonical URL never enters twice from the same source.
create unique index if not exists news_items_source_canonical_idx
  on public.news_items (source_id, canonical_url_hash);

-- Layer 3: cross-publisher lookups for syndicated copies of one story.
create index if not exists news_items_canonical_hash_idx
  on public.news_items (canonical_url_hash);
create index if not exists news_items_title_fingerprint_idx
  on public.news_items (title_fingerprint, published_at desc);
create index if not exists news_items_source_published_idx
  on public.news_items (source_id, published_at desc);
create index if not exists news_items_processing_status_idx
  on public.news_items (processing_status);

create index if not exists news_posts_status_published_idx
  on public.news_posts (status, published_at desc);
create index if not exists news_posts_source_idx on public.news_posts (source_id);
create index if not exists news_posts_moderation_idx
  on public.news_posts (requires_moderation, status, created_at desc);

create index if not exists news_post_topics_post_idx
  on public.news_post_topics (news_post_id);
create index if not exists news_post_topics_topic_idx
  on public.news_post_topics (topic_id);
create unique index if not exists news_post_topics_unique_idx
  on public.news_post_topics (news_post_id, topic_id);

create unique index if not exists user_topic_follows_unique_idx
  on public.user_topic_follows (user_id, topic_id);
create unique index if not exists user_source_follows_unique_idx
  on public.user_source_follows (user_id, source_id);

create index if not exists news_moderation_events_post_idx
  on public.news_moderation_events (news_post_id, created_at desc);
create index if not exists news_click_events_post_idx
  on public.news_click_events (news_post_id, created_at desc);

create index if not exists news_ingestion_runs_started_idx
  on public.news_ingestion_runs (started_at desc);
create index if not exists news_ingestion_source_runs_run_idx
  on public.news_ingestion_source_runs (run_id);
create index if not exists news_ingestion_source_runs_source_idx
  on public.news_ingestion_source_runs (source_id, created_at desc);

-- Overlapping cron invocations must not both ingest. Only one run may hold
-- the 'running' status at a time, so a second insert fails and that
-- invocation exits without touching any feed.
create unique index if not exists news_ingestion_runs_single_active_idx
  on public.news_ingestion_runs ((status))
  where status = 'running';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.news_topics enable row level security;
alter table public.news_sources enable row level security;
alter table public.news_items enable row level security;
alter table public.news_posts enable row level security;
alter table public.news_post_topics enable row level security;
alter table public.user_topic_follows enable row level security;
alter table public.user_source_follows enable row level security;
alter table public.news_moderation_events enable row level security;
alter table public.news_click_events enable row level security;
alter table public.news_ingestion_runs enable row level security;
alter table public.news_ingestion_source_runs enable row level security;

drop policy if exists "Members can view active news topics" on public.news_topics;
create policy "Members can view active news topics"
on public.news_topics for select
using (auth.role() = 'authenticated' and (status = 'active' or public.is_news_source_admin()));

drop policy if exists "News admins manage news topics" on public.news_topics;
create policy "News admins manage news topics"
on public.news_topics for all
using (public.is_news_source_admin())
with check (public.is_news_source_admin());

drop policy if exists "Members can view news sources" on public.news_sources;
create policy "Members can view news sources"
on public.news_sources for select
using (auth.role() = 'authenticated');

drop policy if exists "News admins manage news sources" on public.news_sources;
create policy "News admins manage news sources"
on public.news_sources for all
using (public.is_news_source_admin())
with check (public.is_news_source_admin());

-- Raw items stay behind the admin boundary. Members read news_posts.
drop policy if exists "News admins can view news items" on public.news_items;
create policy "News admins can view news items"
on public.news_items for select
using (public.is_news_source_admin());

drop policy if exists "News admins manage news items" on public.news_items;
create policy "News admins manage news items"
on public.news_items for all
using (public.is_news_source_admin())
with check (public.is_news_source_admin());

drop policy if exists "Members can view published news posts" on public.news_posts;
create policy "Members can view published news posts"
on public.news_posts for select
using (
  auth.role() = 'authenticated'
  and (status = 'published' or public.is_admin_user())
);

drop policy if exists "News admins manage news posts" on public.news_posts;
create policy "News admins manage news posts"
on public.news_posts for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Members can view topics for published news" on public.news_post_topics;
create policy "Members can view topics for published news"
on public.news_post_topics for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.news_posts
    where news_posts.id = news_post_topics.news_post_id
      and (news_posts.status = 'published' or public.is_admin_user())
  )
);

drop policy if exists "News admins manage news post topics" on public.news_post_topics;
create policy "News admins manage news post topics"
on public.news_post_topics for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Members manage their topic follows" on public.user_topic_follows;
create policy "Members manage their topic follows"
on public.user_topic_follows for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Members manage their source follows" on public.user_source_follows;
create policy "Members manage their source follows"
on public.user_source_follows for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "News admins view moderation events" on public.news_moderation_events;
create policy "News admins view moderation events"
on public.news_moderation_events for select
using (public.is_admin_user());

drop policy if exists "News admins record moderation events" on public.news_moderation_events;
create policy "News admins record moderation events"
on public.news_moderation_events for insert
with check (public.is_admin_user());

drop policy if exists "Members record their news clicks" on public.news_click_events;
create policy "Members record their news clicks"
on public.news_click_events for insert
with check (auth.uid() = user_id);

drop policy if exists "News admins view news clicks" on public.news_click_events;
create policy "News admins view news clicks"
on public.news_click_events for select
using (public.is_admin_user());

drop policy if exists "News admins view ingestion runs" on public.news_ingestion_runs;
create policy "News admins view ingestion runs"
on public.news_ingestion_runs for select
using (public.is_news_source_admin());

drop policy if exists "News admins view ingestion source runs" on public.news_ingestion_source_runs;
create policy "News admins view ingestion source runs"
on public.news_ingestion_source_runs for select
using (public.is_news_source_admin());

-- ---------------------------------------------------------------------------
-- Seed: topic taxonomy
-- ---------------------------------------------------------------------------

insert into public.news_topics (name, slug, description, topic_group, is_default, sort_order)
values
  ('Cruise', 'cruise', 'Cruise lines, ships, itineraries and cruise trade support.', 'sector', true, 10),
  ('Aviation', 'aviation', 'Airlines, airports, routes, capacity and air disruption.', 'sector', true, 20),
  ('Tour Operators', 'tour-operators', 'Tour operator product, commercial and trade updates.', 'sector', true, 30),
  ('Hotels', 'hotels', 'Hotel groups, openings, brands and accommodation product.', 'sector', false, 40),
  ('Luxury', 'luxury', 'Luxury travel product, premium brands and high-value selling.', 'sector', false, 50),
  ('Travel Technology', 'travel-technology', 'Booking platforms, distribution, payments and trade tooling.', 'sector', false, 60),
  ('Supplier Updates', 'supplier-updates', 'Supplier announcements, incentives, launches and trade offers.', 'sector', true, 70),
  ('UK Travel', 'uk-travel', 'United Kingdom market, domestic product and UK trade.', 'destination', true, 110),
  ('Europe', 'europe', 'European destinations and short-haul product.', 'destination', false, 120),
  ('USA', 'usa', 'United States destinations and product.', 'destination', false, 130),
  ('Long Haul', 'long-haul', 'Long-haul destinations, worldwide product and specialist selling.', 'destination', false, 140),
  ('Regulation', 'regulation', 'ATOL, package travel rules, consumer protection and compliance.', 'discipline', true, 210),
  ('Disruption', 'disruption', 'Travel disruption, strikes, closures and traveller safety.', 'discipline', true, 220),
  ('Training & Webinars', 'training-webinars', 'Training, academies, webinars and destination specialist programmes.', 'discipline', true, 230),
  ('Regional Support', 'regional-support', 'BDM and regional trade support activity.', 'discipline', false, 240),
  ('Community Discussions', 'community-discussions', 'Member questions, sales wins and trade discussion.', 'platform', false, 310),
  ('Platform Updates', 'platform-updates', 'Travel Xchange product and Smart Quote announcements.', 'platform', true, 320)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: source pool
-- ---------------------------------------------------------------------------
--
-- Every source below ships DISABLED with health_status 'unverified' and a NULL
-- feed_url. No feed endpoint is invented here. A Super Admin discovers and
-- verifies the real endpoint from /admin/news-sources ("Test source"), which
-- performs a live fetch and parse; only a source that returns a genuine RSS,
-- Atom or JSON feed can be saved with a feed_url and switched on.

insert into public.news_sources (
  name, slug, publisher, website_url, source_type, trust_level,
  default_topic_slugs, rights_notes
)
values
  ('Travel Weekly UK', 'travel-weekly-uk', 'Travel Weekly UK', 'https://www.travelweekly.co.uk', 'trade_media', 'high',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('TTG Media', 'ttg-media', 'TTG Media', 'https://www.ttgmedia.com', 'trade_media', 'high',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('TravelMole', 'travelmole', 'TravelMole', 'https://www.travelmole.com', 'trade_media', 'standard',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Breaking Travel News', 'breaking-travel-news', 'Breaking Travel News', 'https://www.breakingtravelnews.com', 'trade_media', 'standard',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Travel Daily Media', 'travel-daily-media', 'Travel Daily Media', 'https://www.traveldailymedia.com', 'trade_media', 'standard',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Skift', 'skift', 'Skift', 'https://skift.com', 'trade_media', 'high',
   '{travel-technology}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('PhocusWire', 'phocuswire', 'PhocusWire', 'https://www.phocuswire.com', 'trade_media', 'high',
   '{travel-technology}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Seatrade Cruise News', 'seatrade-cruise-news', 'Seatrade Cruise News', 'https://www.seatrade-cruise.com', 'trade_media', 'high',
   '{cruise}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Travel Agent Central', 'travel-agent-central', 'Travel Agent Central', 'https://www.travelagentcentral.com', 'trade_media', 'standard',
   '{}', 'Headline, short original summary and canonical link only. Verify feed endpoint and terms of use before enabling.'),
  ('Travel Industry Wire', 'travel-industry-wire', 'Travel Industry Wire', 'https://www.travelindustrywire.com', 'trade_media', 'low',
   '{supplier-updates}', 'Press release wire. Treat as low trust and moderate before publication. Verify feed endpoint before enabling.'),
  ('ABTA', 'abta', 'ABTA - The Travel Association', 'https://www.abta.com', 'official_body', 'high',
   '{regulation}', 'Official trade body. Confirm the published feed or media endpoint and reuse terms before enabling.'),
  ('CLIA', 'clia', 'Cruise Lines International Association', 'https://cruising.org', 'official_body', 'high',
   '{cruise}', 'Official trade body. Confirm the published feed or media endpoint and reuse terms before enabling.'),
  ('IATA', 'iata', 'International Air Transport Association', 'https://www.iata.org', 'official_body', 'high',
   '{aviation}', 'Official trade body. Confirm the published feed or media endpoint and reuse terms before enabling.'),
  ('UK Civil Aviation Authority', 'uk-caa', 'UK Civil Aviation Authority', 'https://www.caa.co.uk', 'official_body', 'high',
   '{aviation,regulation}', 'Official regulator. Confirm the published feed or media endpoint and reuse terms before enabling.'),
  ('FCDO Travel Advice', 'fcdo-travel-advice', 'UK Foreign, Commonwealth & Development Office', 'https://www.gov.uk/foreign-travel-advice', 'official_body', 'high',
   '{disruption,regulation}', 'Open Government Licence content. Confirm the machine-readable endpoint and attribution requirements before enabling.')
on conflict (slug) do nothing;
