-- Phase 12: advertising and sponsorship system

create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  website_url text,
  contact_email text,
  billing_status text not null default 'placeholder' check (
    billing_status in ('placeholder', 'trial', 'active', 'past_due')
  ),
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'suspended')
  )
);

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  package_type text not null default 'supplier_spotlight' check (
    package_type in (
      'supplier_spotlight',
      'feed_sidebar',
      'sponsored_post',
      'newsletter_sponsor',
      'featured_supplier',
      'job_board_package'
    )
  ),
  pricing_model text not null default 'fixed_monthly' check (
    pricing_model in ('cpm', 'cpc', 'fixed_monthly', 'sponsorship_placeholder')
  ),
  budget_amount numeric(10, 2),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'ended')
  )
);

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  cta_label text not null default 'Learn more',
  image_url text,
  target_url text,
  sponsor_label text not null default 'Sponsored',
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'archived')
  )
);

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  placement_key text not null check (
    placement_key in (
      'homepage_hero_banner',
      'feed_right_sidebar_ad',
      'feed_sponsored_post',
      'jobs_featured_employer',
      'news_sponsored_article',
      'events_sponsor_banner',
      'training_course_sponsor',
      'group_sponsor',
      'newsletter_sponsor',
      'mobile_inter_card_ad',
      'supplier_spotlight_card'
    )
  ),
  placement_label text not null,
  weight integer not null default 1 check (weight > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'ended')
  )
);

create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  placement_id uuid references public.ad_placements(id) on delete set null,
  creative_id uuid references public.ad_creatives(id) on delete set null,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  page_path text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ad_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  placement_id uuid references public.ad_placements(id) on delete set null,
  creative_id uuid references public.ad_creatives(id) on delete set null,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  page_path text,
  target_url text,
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists set_advertisers_updated_at on public.advertisers;
create trigger set_advertisers_updated_at
before update on public.advertisers
for each row execute function public.set_updated_at();

drop trigger if exists set_ad_campaigns_updated_at on public.ad_campaigns;
create trigger set_ad_campaigns_updated_at
before update on public.ad_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_ad_creatives_updated_at on public.ad_creatives;
create trigger set_ad_creatives_updated_at
before update on public.ad_creatives
for each row execute function public.set_updated_at();

drop trigger if exists set_ad_placements_updated_at on public.ad_placements;
create trigger set_ad_placements_updated_at
before update on public.ad_placements
for each row execute function public.set_updated_at();

alter table public.advertisers enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_clicks enable row level security;

drop policy if exists "Members can view active advertisers" on public.advertisers;
create policy "Members can view active advertisers"
on public.advertisers for select
using (auth.role() = 'authenticated' and (status = 'active' or created_by = auth.uid()));

drop policy if exists "Users can create advertisers" on public.advertisers;
create policy "Users can create advertisers"
on public.advertisers for insert
with check (auth.uid() = created_by);

drop policy if exists "Advertiser owners can update advertisers" on public.advertisers;
create policy "Advertiser owners can update advertisers"
on public.advertisers for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Advertiser owners can delete advertisers" on public.advertisers;
create policy "Advertiser owners can delete advertisers"
on public.advertisers for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view active ad campaigns" on public.ad_campaigns;
create policy "Members can view active ad campaigns"
on public.ad_campaigns for select
using (auth.role() = 'authenticated' and (status = 'active' or created_by = auth.uid()));

drop policy if exists "Users can create ad campaigns" on public.ad_campaigns;
create policy "Users can create ad campaigns"
on public.ad_campaigns for insert
with check (auth.uid() = created_by);

drop policy if exists "Campaign owners can update ad campaigns" on public.ad_campaigns;
create policy "Campaign owners can update ad campaigns"
on public.ad_campaigns for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Campaign owners can delete ad campaigns" on public.ad_campaigns;
create policy "Campaign owners can delete ad campaigns"
on public.ad_campaigns for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view active ad creatives" on public.ad_creatives;
create policy "Members can view active ad creatives"
on public.ad_creatives for select
using (auth.role() = 'authenticated' and (status = 'active' or created_by = auth.uid()));

drop policy if exists "Users can create ad creatives" on public.ad_creatives;
create policy "Users can create ad creatives"
on public.ad_creatives for insert
with check (auth.uid() = created_by);

drop policy if exists "Creative owners can update ad creatives" on public.ad_creatives;
create policy "Creative owners can update ad creatives"
on public.ad_creatives for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Creative owners can delete ad creatives" on public.ad_creatives;
create policy "Creative owners can delete ad creatives"
on public.ad_creatives for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view active ad placements" on public.ad_placements;
create policy "Members can view active ad placements"
on public.ad_placements for select
using (
  auth.role() = 'authenticated'
  and (
    created_by = auth.uid()
    or (
      status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  )
);

drop policy if exists "Users can create ad placements" on public.ad_placements;
create policy "Users can create ad placements"
on public.ad_placements for insert
with check (auth.uid() = created_by);

drop policy if exists "Placement owners can update ad placements" on public.ad_placements;
create policy "Placement owners can update ad placements"
on public.ad_placements for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Placement owners can delete ad placements" on public.ad_placements;
create policy "Placement owners can delete ad placements"
on public.ad_placements for delete
using (auth.uid() = created_by);

drop policy if exists "Members can record ad impressions" on public.ad_impressions;
create policy "Members can record ad impressions"
on public.ad_impressions for insert
with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

drop policy if exists "Campaign owners can view ad impressions" on public.ad_impressions;
create policy "Campaign owners can view ad impressions"
on public.ad_impressions for select
using (
  exists (
    select 1
    from public.ad_campaigns
    where ad_campaigns.id = ad_impressions.campaign_id
      and ad_campaigns.created_by = auth.uid()
  )
);

drop policy if exists "Members can record ad clicks" on public.ad_clicks;
create policy "Members can record ad clicks"
on public.ad_clicks for insert
with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

drop policy if exists "Campaign owners can view ad clicks" on public.ad_clicks;
create policy "Campaign owners can view ad clicks"
on public.ad_clicks for select
using (
  exists (
    select 1
    from public.ad_campaigns
    where ad_campaigns.id = ad_clicks.campaign_id
      and ad_campaigns.created_by = auth.uid()
  )
);

create index if not exists advertisers_created_by_idx on public.advertisers (created_by);
create index if not exists ad_campaigns_advertiser_id_idx on public.ad_campaigns (advertiser_id);
create index if not exists ad_campaigns_created_by_idx on public.ad_campaigns (created_by);
create index if not exists ad_creatives_campaign_id_idx on public.ad_creatives (campaign_id);
create index if not exists ad_creatives_created_by_idx on public.ad_creatives (created_by);
create index if not exists ad_placements_key_status_idx on public.ad_placements (placement_key, status);
create index if not exists ad_placements_campaign_id_idx on public.ad_placements (campaign_id);
create index if not exists ad_impressions_campaign_id_idx on public.ad_impressions (campaign_id, created_at desc);
create index if not exists ad_clicks_campaign_id_idx on public.ad_clicks (campaign_id, created_at desc);
