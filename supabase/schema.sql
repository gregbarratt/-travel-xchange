-- Travel Xchange database schema
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

-- Phase 3: main social feed

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  topic text not null default 'general',
  image_url text,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'deleted'))
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted'))
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (post_id, user_id)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows enable row level security;

drop policy if exists "Members can view member profiles" on public.profiles;
create policy "Members can view member profiles"
on public.profiles for select
using (auth.role() = 'authenticated');

drop policy if exists "Members can view published posts" on public.posts;
create policy "Members can view published posts"
on public.posts for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
on public.posts for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
on public.posts for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
on public.posts for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view published comments" on public.comments;
create policy "Members can view published comments"
on public.comments for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.status = 'published'
  )
);

drop policy if exists "Users can create their own comments" on public.comments;
create policy "Users can create their own comments"
on public.comments for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.status = 'published'
  )
);

drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
on public.comments for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view likes" on public.post_likes;
create policy "Members can view likes"
on public.post_likes for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves"
on public.post_likes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can remove their own likes"
on public.post_likes for delete
using (auth.uid() = user_id);

drop policy if exists "Members can view follows" on public.follows;
create policy "Members can view follows"
on public.follows for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves"
on public.follows for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow as themselves" on public.follows;
create policy "Users can unfollow as themselves"
on public.follows for delete
using (auth.uid() = follower_id);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_topic_idx on public.posts (topic);
create index if not exists comments_post_id_idx on public.comments (post_id, created_at);
create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists follows_follower_id_idx on public.follows (follower_id);
create index if not exists follows_following_id_idx on public.follows (following_id);

-- Phase 4: profile and company pages

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

-- Phase 5: groups and community discussions

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default 'general',
  visibility text not null default 'members' check (visibility in ('public', 'members', 'private')),
  image_url text,
  status text not null default 'active' check (status in ('active', 'archived', 'hidden'))
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  unique (group_id, user_id)
);

create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted'))
);

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists set_group_posts_updated_at on public.group_posts;
create trigger set_group_posts_updated_at
before update on public.group_posts
for each row execute function public.set_updated_at();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;

drop policy if exists "Members can view active groups" on public.groups;
create policy "Members can view active groups"
on public.groups for select
using (auth.role() = 'authenticated' and status = 'active');

drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups"
on public.groups for insert
with check (auth.uid() = created_by);

drop policy if exists "Group creators can update groups" on public.groups;
create policy "Group creators can update groups"
on public.groups for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Group creators can delete groups" on public.groups;
create policy "Group creators can delete groups"
on public.groups for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view group memberships" on public.group_members;
create policy "Members can view group memberships"
on public.group_members for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can join groups as themselves" on public.group_members;
create policy "Users can join groups as themselves"
on public.group_members for insert
with check (
  auth.uid() = user_id
  and (
    role = 'member'
    or exists (
      select 1
      from public.groups
      where groups.id = group_members.group_id
        and groups.created_by = auth.uid()
    )
  )
);

drop policy if exists "Users can leave groups as themselves" on public.group_members;
create policy "Users can leave groups as themselves"
on public.group_members for delete
using (auth.uid() = user_id);

drop policy if exists "Members can view group posts" on public.group_posts;
create policy "Members can view group posts"
on public.group_posts for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.groups
    where groups.id = group_posts.group_id
      and groups.status = 'active'
  )
);

drop policy if exists "Group members can create group posts" on public.group_posts;
create policy "Group members can create group posts"
on public.group_posts for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.group_members
    where group_members.group_id = group_posts.group_id
      and group_members.user_id = auth.uid()
      and group_members.status = 'active'
  )
);

drop policy if exists "Users can update their own group posts" on public.group_posts;
create policy "Users can update their own group posts"
on public.group_posts for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own group posts" on public.group_posts;
create policy "Users can delete their own group posts"
on public.group_posts for delete
using (auth.uid() = created_by);

create index if not exists groups_slug_idx on public.groups (slug);
create index if not exists groups_category_idx on public.groups (category);
create index if not exists group_members_group_id_idx on public.group_members (group_id);
create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists group_posts_group_id_idx on public.group_posts (group_id, created_at desc);

insert into public.groups (name, slug, description, category, visibility, status)
values
  (
    'Cruise Sellers',
    'cruise-sellers',
    'A focused space for cruise specialists to share selling tips, ship updates, and itinerary knowledge.',
    'cruise',
    'members',
    'active'
  ),
  (
    'Luxury Travel',
    'luxury-travel',
    'Discuss high-value enquiries, premium suppliers, client service, and luxury destination knowledge.',
    'luxury',
    'members',
    'active'
  ),
  (
    'Disney Specialists',
    'disney-specialists',
    'For agents selling Disney holidays, parks, cruises, hotels, and family travel experiences.',
    'specialist',
    'members',
    'active'
  ),
  (
    'Touring & Adventure',
    'touring-adventure',
    'A place for escorted touring, adventure travel, expedition, and activity-led holiday discussion.',
    'touring_adventure',
    'members',
    'active'
  ),
  (
    'Homeworkers',
    'homeworkers',
    'Community support for homeworkers, self-employed agents, and home-based agency owners.',
    'homeworking',
    'members',
    'active'
  ),
  (
    'Travel Compliance',
    'travel-compliance',
    'Questions and updates around ATOL, package travel rules, complaints handling, and trade compliance.',
    'compliance',
    'members',
    'active'
  ),
  (
    'Supplier Updates',
    'supplier-updates',
    'A dedicated space for supplier news, incentives, product updates, and trade-facing announcements.',
    'supplier_updates',
    'members',
    'active'
  ),
  (
    'Marketing for Travel Agents',
    'marketing-for-travel-agents',
    'Share practical marketing ideas for social media, email, local promotion, and lead generation.',
    'marketing',
    'members',
    'active'
  )
on conflict (slug) do nothing;

-- Phase 6: jobs board

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

-- Phase 7: news and supplier updates

create table if not exists public.article_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'hidden'))
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  category_id uuid references public.article_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null check (char_length(trim(content)) between 1 and 10000),
  article_type text not null default 'news' check (
    article_type in ('news', 'supplier_update', 'press_release', 'featured')
  ),
  image_url text,
  is_featured boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'hidden', 'archived')
  )
);

create table if not exists public.article_tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  article_id uuid not null references public.articles(id) on delete cascade,
  name text not null
);

drop trigger if exists set_article_categories_updated_at on public.article_categories;
create trigger set_article_categories_updated_at
before update on public.article_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

alter table public.article_categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;

drop policy if exists "Members can view active article categories" on public.article_categories;
create policy "Members can view active article categories"
on public.article_categories for select
using (auth.role() = 'authenticated' and status = 'active');

drop policy if exists "Members can view published articles" on public.articles;
create policy "Members can view published articles"
on public.articles for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own articles" on public.articles;
create policy "Users can create their own articles"
on public.articles for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own articles" on public.articles;
create policy "Users can update their own articles"
on public.articles for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own articles" on public.articles;
create policy "Users can delete their own articles"
on public.articles for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view tags for published articles" on public.article_tags;
create policy "Members can view tags for published articles"
on public.article_tags for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.status = 'published'
  )
);

drop policy if exists "Article owners can create tags" on public.article_tags;
create policy "Article owners can create tags"
on public.article_tags for insert
with check (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.created_by = auth.uid()
  )
);

drop policy if exists "Article owners can update tags" on public.article_tags;
create policy "Article owners can update tags"
on public.article_tags for update
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.created_by = auth.uid()
  )
);

drop policy if exists "Article owners can delete tags" on public.article_tags;
create policy "Article owners can delete tags"
on public.article_tags for delete
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.created_by = auth.uid()
  )
);

create index if not exists article_categories_slug_idx on public.article_categories (slug);
create index if not exists articles_slug_idx on public.articles (slug);
create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_id_idx on public.articles (category_id);
create index if not exists articles_company_id_idx on public.articles (company_id);
create index if not exists articles_article_type_idx on public.articles (article_type);
create index if not exists article_tags_article_id_idx on public.article_tags (article_id);
create unique index if not exists article_tags_article_id_lower_name_idx
on public.article_tags (article_id, lower(name));

insert into public.article_categories (name, slug, description, status)
values
  (
    'Travel Trade News',
    'travel-trade-news',
    'General travel industry news for agents, suppliers, operators, and partners.',
    'active'
  ),
  (
    'Supplier Updates',
    'supplier-updates',
    'Trade-facing supplier announcements, incentives, launches, and press releases.',
    'active'
  ),
  (
    'Cruise',
    'cruise',
    'Cruise line updates, sales tips, training news, and ship announcements.',
    'active'
  ),
  (
    'Tour Operators',
    'tour-operators',
    'Tour operator product, commercial, and trade support updates.',
    'active'
  ),
  (
    'Technology',
    'technology',
    'Travel technology, booking platforms, CRM, payments, and digital tools.',
    'active'
  ),
  (
    'Recruitment',
    'recruitment',
    'Travel recruitment, careers, hiring trends, and employer updates.',
    'active'
  ),
  (
    'Training',
    'training',
    'Training, academy, supplier education, and destination specialist updates.',
    'active'
  ),
  (
    'Events',
    'events',
    'Industry events, webinars, roadshows, fam trips, and networking.',
    'active'
  ),
  (
    'Destinations',
    'destinations',
    'Destination updates, tourist board news, and product knowledge.',
    'active'
  ),
  (
    'Compliance',
    'compliance',
    'ATOL, package travel rules, complaints handling, and trade compliance.',
    'active'
  )
on conflict (slug) do nothing;

-- Phase 8: events directory

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null check (char_length(trim(description)) between 1 and 6000),
  event_type text not null default 'webinar' check (
    event_type in (
      'webinar',
      'fam_trip',
      'roadshow',
      'conference',
      'training_day',
      'networking',
      'virtual_event',
      'trade_show'
    )
  ),
  delivery_format text not null default 'online' check (
    delivery_format in ('online', 'in_person', 'hybrid')
  ),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/London',
  venue_name text,
  location text,
  registration_url text,
  capacity integer check (capacity is null or capacity > 0),
  image_url text,
  is_featured boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'cancelled', 'hidden', 'archived')
  )
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status text not null default 'registered' check (
    status in ('interested', 'registered', 'cancelled', 'attended')
  ),
  unique (event_id, user_id)
);

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "Members can view published events" on public.events;
create policy "Members can view published events"
on public.events for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own events" on public.events;
create policy "Users can create their own events"
on public.events for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
on public.events for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own events" on public.events;
create policy "Users can delete their own events"
on public.events for delete
using (auth.uid() = created_by);

drop policy if exists "Users can view relevant event registrations" on public.event_registrations;
create policy "Users can view relevant event registrations"
on public.event_registrations for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
);

drop policy if exists "Users can register for events as themselves" on public.event_registrations;
create policy "Users can register for events as themselves"
on public.event_registrations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own event registrations" on public.event_registrations;
create policy "Users can update their own event registrations"
on public.event_registrations for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
);

drop policy if exists "Users can remove their own event registrations" on public.event_registrations;
create policy "Users can remove their own event registrations"
on public.event_registrations for delete
using (auth.uid() = user_id);

create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_event_type_idx on public.events (event_type);
create index if not exists events_delivery_format_idx on public.events (delivery_format);
create index if not exists events_company_id_idx on public.events (company_id);
create index if not exists event_registrations_event_id_idx on public.event_registrations (event_id);
create index if not exists event_registrations_user_id_idx on public.event_registrations (user_id);

-- Phase 9: training academy

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null check (char_length(trim(description)) between 1 and 5000),
  category text not null default 'new_starter' check (
    category in (
      'destination',
      'cruise',
      'sales_marketing',
      'compliance',
      'technology',
      'supplier_training',
      'new_starter',
      'leadership'
    )
  ),
  level text not null default 'beginner' check (
    level in ('beginner', 'intermediate', 'advanced')
  ),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  image_url text,
  is_supplier_sponsored boolean not null default false,
  certificate_available boolean not null default false,
  monetisation_type text not null default 'free' check (
    monetisation_type in ('free', 'premium_placeholder', 'sponsored')
  ),
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'hidden', 'archived')
  )
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  slug text not null,
  summary text,
  content text not null check (char_length(trim(content)) between 1 and 8000),
  video_url text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  display_order integer not null default 1,
  status text not null default 'published' check (
    status in ('draft', 'published', 'hidden')
  ),
  unique (course_id, slug)
);

create table if not exists public.course_enrolments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (
    status in ('active', 'completed', 'cancelled')
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, user_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'completed')
  ),
  completed_at timestamptz,
  unique (lesson_id, user_id)
);

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_progress_updated_at on public.lesson_progress;
create trigger set_lesson_progress_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_enrolments enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "Members can view published courses" on public.courses;
create policy "Members can view published courses"
on public.courses for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own courses" on public.courses;
create policy "Users can create their own courses"
on public.courses for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own courses" on public.courses;
create policy "Users can update their own courses"
on public.courses for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own courses" on public.courses;
create policy "Users can delete their own courses"
on public.courses for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view published lessons" on public.lessons;
create policy "Members can view published lessons"
on public.lessons for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.status = 'published'
  )
);

drop policy if exists "Course owners can create lessons" on public.lessons;
create policy "Course owners can create lessons"
on public.lessons for insert
with check (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Course owners can update lessons" on public.lessons;
create policy "Course owners can update lessons"
on public.lessons for update
using (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Course owners can delete lessons" on public.lessons;
create policy "Course owners can delete lessons"
on public.lessons for delete
using (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Users can view relevant course enrolments" on public.course_enrolments;
create policy "Users can view relevant course enrolments"
on public.course_enrolments for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.courses
    where courses.id = course_enrolments.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Users can enrol as themselves" on public.course_enrolments;
create policy "Users can enrol as themselves"
on public.course_enrolments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.courses
    where courses.id = course_enrolments.course_id
      and courses.status = 'published'
  )
);

drop policy if exists "Users can update their own enrolments" on public.course_enrolments;
create policy "Users can update their own enrolments"
on public.course_enrolments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own enrolments" on public.course_enrolments;
create policy "Users can delete their own enrolments"
on public.course_enrolments for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their own lesson progress" on public.lesson_progress;
create policy "Users can view their own lesson progress"
on public.lesson_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own lesson progress" on public.lesson_progress;
create policy "Users can create their own lesson progress"
on public.lesson_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
create policy "Users can update their own lesson progress"
on public.lesson_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own lesson progress" on public.lesson_progress;
create policy "Users can delete their own lesson progress"
on public.lesson_progress for delete
using (auth.uid() = user_id);

create index if not exists courses_slug_idx on public.courses (slug);
create index if not exists courses_category_idx on public.courses (category);
create index if not exists courses_company_id_idx on public.courses (company_id);
create index if not exists lessons_course_id_idx on public.lessons (course_id, display_order);
create index if not exists course_enrolments_course_id_idx on public.course_enrolments (course_id);
create index if not exists course_enrolments_user_id_idx on public.course_enrolments (user_id);
create index if not exists lesson_progress_course_id_idx on public.lesson_progress (course_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);
create index if not exists lesson_progress_user_id_idx on public.lesson_progress (user_id);

insert into public.courses (
  id,
  title,
  slug,
  description,
  category,
  level,
  duration_minutes,
  is_supplier_sponsored,
  certificate_available,
  monetisation_type,
  visibility,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000901',
    'New Starter Travel Agent Essentials',
    'new-starter-travel-agent-essentials',
    'A practical foundation course for new entrants covering customer discovery, supplier basics, quoting, and confident next steps.',
    'new_starter',
    'beginner',
    75,
    false,
    true,
    'free',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000902',
    'Cruise Selling Essentials',
    'cruise-selling-essentials',
    'Build confidence with cruise terminology, customer matching, onboard value, and first-time cruise objections.',
    'cruise',
    'beginner',
    90,
    true,
    true,
    'sponsored',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000903',
    'ATOL and Package Travel Basics',
    'atol-and-package-travel-basics',
    'A starter compliance module covering package travel responsibilities, customer information, complaints, and where to get help.',
    'compliance',
    'intermediate',
    60,
    false,
    true,
    'free',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000904',
    'Travel Technology Toolkit',
    'travel-technology-toolkit',
    'Understand the core technology stack used by modern travel professionals, including CRM, booking tools, payments, and marketing systems.',
    'technology',
    'beginner',
    50,
    false,
    false,
    'premium_placeholder',
    'members',
    'published'
  )
on conflict (slug) do nothing;

insert into public.lessons (
  id,
  course_id,
  title,
  slug,
  summary,
  content,
  duration_minutes,
  display_order,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000911',
    '00000000-0000-4000-8000-000000000901',
    'Understanding the Travel Trade',
    'understanding-the-travel-trade',
    'A quick map of agents, suppliers, operators, and industry partners.',
    'The travel trade connects customers with the right suppliers, products, destinations, and service. In this starter lesson, focus on the basic roles: agents advise and sell, suppliers create or provide the product, tour operators package services, and technology providers help the work happen efficiently. Travel Xchange will become a shared hub for these professional groups.',
    20,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000912',
    '00000000-0000-4000-8000-000000000901',
    'Asking Better Client Questions',
    'asking-better-client-questions',
    'Use discovery questions to build stronger quotes.',
    'Good travel selling starts with discovery. Ask about budget, dates, flexibility, previous trips, travel style, non-negotiables, and what would make the holiday feel successful. Strong questions reduce wasted quoting time and help you recommend with confidence.',
    25,
    2,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000913',
    '00000000-0000-4000-8000-000000000902',
    'Cruise Product Basics',
    'cruise-product-basics',
    'Learn the language of ship, itinerary, cabin, and onboard value.',
    'Cruise selling becomes easier when you can explain the basics clearly: ship size, itinerary style, cabin type, dining, inclusions, excursions, gratuities, and onboard experience. Match the ship and itinerary to the customer rather than selling cruise as one generic product.',
    30,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000914',
    '00000000-0000-4000-8000-000000000902',
    'Handling First-Time Cruise Objections',
    'handling-first-time-cruise-objections',
    'Respond to common worries from customers new to cruise.',
    'First-time cruise customers often worry about feeling trapped, dress codes, seasickness, cost, or whether they will enjoy the onboard atmosphere. Listen first, then match the concern to the right cruise style, ship, itinerary, and cabin choice.',
    30,
    2,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000915',
    '00000000-0000-4000-8000-000000000903',
    'Package Travel Responsibilities',
    'package-travel-responsibilities',
    'A simple overview of why compliance matters in package travel.',
    'Compliance protects customers, agencies, and suppliers. This lesson introduces the idea that package travel brings responsibilities around information, financial protection, supplier clarity, and support when things change.',
    25,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000916',
    '00000000-0000-4000-8000-000000000904',
    'Choosing Your Core Tech Stack',
    'choosing-your-core-tech-stack',
    'Understand the main tools a travel professional uses day to day.',
    'A practical travel technology stack usually includes customer records, enquiry tracking, quoting, supplier booking tools, payment handling, marketing, and reporting. Start simple, keep customer notes organised, and avoid duplicating work across too many systems.',
    25,
    1,
    'published'
  )
on conflict (course_id, slug) do nothing;

-- Phase 10: support and Q&A hub

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  content text not null check (char_length(trim(content)) between 1 and 6000),
  category text not null default 'new_starter_help' check (
    category in (
      'booking_systems',
      'suppliers',
      'payments',
      'atol_compliance',
      'marketing',
      'cruise',
      'long_haul',
      'complaints_handling',
      'new_starter_help'
    )
  ),
  best_answer_id uuid,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'resolved', 'hidden', 'deleted')
  )
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question_id uuid not null references public.questions(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 6000),
  is_best_answer boolean not null default false,
  status text not null default 'published' check (
    status in ('published', 'hidden', 'deleted')
  )
);

create table if not exists public.question_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null default 'helpful' check (vote_type in ('upvote', 'helpful'))
);

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists set_answers_updated_at on public.answers;
create trigger set_answers_updated_at
before update on public.answers
for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.question_votes enable row level security;

drop policy if exists "Members can view visible questions" on public.questions;
create policy "Members can view visible questions"
on public.questions for select
using (
  auth.role() = 'authenticated'
  and status in ('published', 'resolved')
);

drop policy if exists "Users can create their own questions" on public.questions;
create policy "Users can create their own questions"
on public.questions for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own questions" on public.questions;
create policy "Users can update their own questions"
on public.questions for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own questions" on public.questions;
create policy "Users can delete their own questions"
on public.questions for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view published answers" on public.answers;
create policy "Members can view published answers"
on public.answers for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can answer visible questions" on public.answers;
create policy "Users can answer visible questions"
on public.answers for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Answer owners and question owners can update answers" on public.answers;
drop policy if exists "Question owners can choose best answers" on public.answers;
create policy "Question owners can choose best answers"
on public.answers for update
using (
  exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.created_by = auth.uid()
  )
);

drop policy if exists "Users can delete their own answers" on public.answers;
create policy "Users can delete their own answers"
on public.answers for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view votes on visible questions" on public.question_votes;
create policy "Members can view votes on visible questions"
on public.question_votes for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.questions
    where questions.id = question_votes.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can vote as themselves" on public.question_votes;
create policy "Users can vote as themselves"
on public.question_votes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.questions
    where questions.id = question_votes.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can remove their own votes" on public.question_votes;
create policy "Users can remove their own votes"
on public.question_votes for delete
using (auth.uid() = user_id);

create index if not exists questions_slug_idx on public.questions (slug);
create index if not exists questions_created_at_idx on public.questions (created_at desc);
create index if not exists questions_category_idx on public.questions (category);
create index if not exists questions_created_by_idx on public.questions (created_by);
create index if not exists answers_question_id_idx on public.answers (question_id, created_at);
create index if not exists answers_created_by_idx on public.answers (created_by);
create index if not exists question_votes_question_id_idx on public.question_votes (question_id);
create index if not exists question_votes_answer_id_idx on public.question_votes (answer_id);
create index if not exists question_votes_user_id_idx on public.question_votes (user_id);

create unique index if not exists question_votes_question_user_upvote_idx
on public.question_votes (question_id, user_id)
where answer_id is null and vote_type = 'upvote';

create unique index if not exists question_votes_answer_user_helpful_idx
on public.question_votes (answer_id, user_id)
where answer_id is not null and vote_type = 'helpful';

-- Phase 11: messaging and notifications

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text,
  conversation_type text not null default 'direct' check (
    conversation_type in ('direct', 'group')
  ),
  status text not null default 'active' check (
    status in ('active', 'archived', 'hidden')
  )
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  last_read_at timestamptz,
  is_muted boolean not null default false,
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  unique (conversation_id, user_id)
);

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = target_conversation_id
      and conversation_members.user_id = auth.uid()
      and conversation_members.status = 'active'
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  status text not null default 'sent' check (status in ('sent', 'hidden', 'deleted'))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'message' check (
    type in (
      'message',
      'reply',
      'best_answer',
      'group_post',
      'job_application',
      'event_registration',
      'system'
    )
  ),
  title text not null,
  body text,
  href text,
  is_read boolean not null default false,
  status text not null default 'active' check (status in ('active', 'dismissed'))
);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_for_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists touch_conversation_after_message on public.messages;
create trigger touch_conversation_after_message
after insert on public.messages
for each row execute function public.touch_conversation_for_message();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
on public.conversations for select
using (public.is_conversation_member(id));

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
on public.conversations for insert
with check (auth.uid() = created_by);

drop policy if exists "Conversation members can update conversations" on public.conversations;
create policy "Conversation members can update conversations"
on public.conversations for update
using (public.is_conversation_member(id))
with check (public.is_conversation_member(id));

drop policy if exists "Conversation members can view members" on public.conversation_members;
create policy "Conversation members can view members"
on public.conversation_members for select
using (public.is_conversation_member(conversation_id));

drop policy if exists "Conversation members can add members" on public.conversation_members;
create policy "Conversation members can add members"
on public.conversation_members for insert
with check (
  auth.uid() = user_id
  or public.is_conversation_member(conversation_id)
);

drop policy if exists "Users can update their own conversation membership" on public.conversation_members;
create policy "Users can update their own conversation membership"
on public.conversation_members for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Conversation members can view messages" on public.messages;
create policy "Conversation members can view messages"
on public.messages for select
using (
  status = 'sent'
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "Users can update their own messages" on public.messages;
create policy "Users can update their own messages"
on public.messages for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can create notifications they trigger" on public.notifications;
create policy "Users can create notifications they trigger"
on public.notifications for insert
with check (auth.uid() = actor_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
on public.notifications for delete
using (auth.uid() = user_id);

create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);
create index if not exists conversations_created_by_idx on public.conversations (created_by);
create index if not exists conversation_members_conversation_id_idx
on public.conversation_members (conversation_id);
create index if not exists conversation_members_user_id_idx
on public.conversation_members (user_id, status);
create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
on public.notifications (user_id, is_read, status);

create or replace function public.create_direct_conversation(
  target_user_id uuid,
  first_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_message text := trim(first_message);
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be logged in to start a conversation.';
  end if;

  if target_user_id is null then
    raise exception 'Choose a member to message.';
  end if;

  if clean_message is null or char_length(clean_message) = 0 then
    raise exception 'Write a message before starting a conversation.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = target_user_id
  ) then
    raise exception 'That member profile could not be found.';
  end if;

  insert into public.conversations (created_by, conversation_type, status)
  values (current_user_id, 'direct', 'active')
  returning id into new_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    user_id,
    role,
    last_read_at,
    status
  )
  values (
    new_conversation_id,
    current_user_id,
    'owner',
    now(),
    'active'
  )
  on conflict (conversation_id, user_id)
  do update set status = 'active', last_read_at = now();

  if target_user_id <> current_user_id then
    insert into public.conversation_members (
      conversation_id,
      user_id,
      role,
      status
    )
    values (
      new_conversation_id,
      target_user_id,
      'member',
      'active'
    )
    on conflict (conversation_id, user_id)
    do update set status = 'active';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    status
  )
  values (
    new_conversation_id,
    current_user_id,
    clean_message,
    'sent'
  );

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    href
  )
  values (
    target_user_id,
    current_user_id,
    'message',
    'New message',
    left(clean_message, 180),
    '/messages'
  );

  return new_conversation_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid, text) to authenticated;

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

-- Phase 13: Stripe Billing subscriptions

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

-- Phase 14: Admin dashboard and moderation

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

-- Phase 15: Search and discovery indexes

create extension if not exists pg_trgm;

create index if not exists profiles_full_name_trgm_idx
on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists profiles_headline_trgm_idx
on public.profiles using gin (headline gin_trgm_ops);

create index if not exists profiles_location_trgm_idx
on public.profiles using gin (location gin_trgm_ops);

create index if not exists companies_name_trgm_idx
on public.companies using gin (name gin_trgm_ops);

create index if not exists companies_description_trgm_idx
on public.companies using gin (description gin_trgm_ops);

create index if not exists posts_title_trgm_idx
on public.posts using gin (title gin_trgm_ops);

create index if not exists posts_content_trgm_idx
on public.posts using gin (content gin_trgm_ops);

create index if not exists groups_name_trgm_idx
on public.groups using gin (name gin_trgm_ops);

create index if not exists groups_description_trgm_idx
on public.groups using gin (description gin_trgm_ops);

create index if not exists jobs_title_trgm_idx
on public.jobs using gin (title gin_trgm_ops);

create index if not exists jobs_description_trgm_idx
on public.jobs using gin (description gin_trgm_ops);

create index if not exists jobs_location_trgm_idx
on public.jobs using gin (location gin_trgm_ops);

create index if not exists events_title_trgm_idx
on public.events using gin (title gin_trgm_ops);

create index if not exists events_description_trgm_idx
on public.events using gin (description gin_trgm_ops);

create index if not exists events_location_trgm_idx
on public.events using gin (location gin_trgm_ops);

create index if not exists events_venue_name_trgm_idx
on public.events using gin (venue_name gin_trgm_ops);

create index if not exists articles_title_trgm_idx
on public.articles using gin (title gin_trgm_ops);

create index if not exists articles_excerpt_trgm_idx
on public.articles using gin (excerpt gin_trgm_ops);

create index if not exists articles_content_trgm_idx
on public.articles using gin (content gin_trgm_ops);

create index if not exists courses_title_trgm_idx
on public.courses using gin (title gin_trgm_ops);

create index if not exists courses_description_trgm_idx
on public.courses using gin (description gin_trgm_ops);

create index if not exists questions_title_trgm_idx
on public.questions using gin (title gin_trgm_ops);

create index if not exists questions_content_trgm_idx
on public.questions using gin (content gin_trgm_ops);

-- Phase 16: Analytics dashboards

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

-- Phase 21: Launch waitlist signups

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

-- Supplier page role access, Phase 1: page visibility and baseline roles.

alter table public.companies
add column if not exists page_visibility text not null default 'public'
check (page_visibility in ('public', 'private'));

create index if not exists companies_page_visibility_status_idx
on public.companies (page_visibility, status);

create table if not exists public.supplier_page_permissions (
  key text primary key,
  created_at timestamptz not null default now(),
  section_key text not null,
  label text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived'))
);

insert into public.supplier_page_permissions (key, section_key, label, description)
values
  ('manage_profile', 'profile', 'Manage profile/about', 'Edit supplier page profile, about text, and core company details.'),
  ('manage_news', 'news', 'Manage news', 'Create and manage supplier news, updates, and press releases.'),
  ('manage_jobs', 'jobs', 'Manage jobs', 'Create and manage supplier job listings.'),
  ('manage_events', 'events', 'Manage events', 'Create and manage supplier events, webinars, and roadshows.'),
  ('manage_media', 'media', 'Manage media/gallery', 'Manage supplier media, images, gallery, and downloadable assets.'),
  ('manage_training', 'training', 'Manage training', 'Manage supplier training modules and academy content.'),
  ('manage_adverts', 'adverts', 'Manage adverts', 'Manage supplier adverts, spotlight cards, and sponsorship slots.'),
  ('manage_team', 'team', 'Manage team', 'Manage supplier page team members and page assignments.'),
  ('manage_roles', 'settings', 'Manage roles and permissions', 'Manage supplier page roles and permission settings.')
on conflict (key) do update
set
  section_key = excluded.section_key,
  label = excluded.label,
  description = excluded.description,
  status = 'active';

create table if not exists public.supplier_page_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  role_key text not null,
  name text not null,
  description text,
  role_type text not null default 'custom' check (role_type in ('baseline', 'custom')),
  is_system boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  unique (company_id, role_key)
);

create table if not exists public.supplier_page_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.supplier_page_roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  unique (company_id, user_id, role_id)
);

create table if not exists public.supplier_page_role_permissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role_id uuid not null references public.supplier_page_roles(id) on delete cascade,
  permission_key text not null references public.supplier_page_permissions(key) on delete cascade,
  is_allowed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  unique (role_id, permission_key)
);

drop trigger if exists set_supplier_page_roles_updated_at on public.supplier_page_roles;
create trigger set_supplier_page_roles_updated_at
before update on public.supplier_page_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_supplier_page_members_updated_at on public.supplier_page_members;
create trigger set_supplier_page_members_updated_at
before update on public.supplier_page_members
for each row execute function public.set_updated_at();

drop trigger if exists set_supplier_page_role_permissions_updated_at on public.supplier_page_role_permissions;
create trigger set_supplier_page_role_permissions_updated_at
before update on public.supplier_page_role_permissions
for each row execute function public.set_updated_at();

create index if not exists supplier_page_roles_company_id_idx
on public.supplier_page_roles (company_id, status);

create index if not exists supplier_page_members_company_user_idx
on public.supplier_page_members (company_id, user_id, status);

create index if not exists supplier_page_role_permissions_role_idx
on public.supplier_page_role_permissions (role_id, permission_key);

create or replace function public.seed_supplier_page_baseline_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  page_admin_role_id uuid;
begin
  insert into public.supplier_page_roles (
    company_id,
    created_by,
    role_key,
    name,
    description,
    role_type,
    is_system
  )
  values
    (new.id, new.created_by, 'page_admin', 'Page admin', 'Full control over the supplier page, team roles, and settings.', 'baseline', true),
    (new.id, new.created_by, 'bdm', 'BDM', 'Business development user. Permissions are optional and controlled by the page admin.', 'baseline', true),
    (new.id, new.created_by, 'marketer', 'Marketer', 'Marketing user. Permissions are optional and controlled by the page admin.', 'baseline', true)
  on conflict (company_id, role_key) do nothing;

  insert into public.supplier_page_role_permissions (
    role_id,
    permission_key,
    is_allowed,
    updated_by
  )
  select
    supplier_page_roles.id,
    supplier_page_permissions.key,
    supplier_page_roles.role_key = 'page_admin',
    new.created_by
  from public.supplier_page_roles
  cross join public.supplier_page_permissions
  where supplier_page_roles.company_id = new.id
  on conflict (role_id, permission_key) do nothing;

  select id
  into page_admin_role_id
  from public.supplier_page_roles
  where company_id = new.id
    and role_key = 'page_admin'
  limit 1;

  if page_admin_role_id is not null then
    insert into public.supplier_page_members (
      company_id,
      user_id,
      role_id,
      assigned_by,
      status
    )
    values (
      new.id,
      new.created_by,
      page_admin_role_id,
      new.created_by,
      'active'
    )
    on conflict (company_id, user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists seed_supplier_page_baseline_roles_on_company on public.companies;
create trigger seed_supplier_page_baseline_roles_on_company
after insert on public.companies
for each row execute function public.seed_supplier_page_baseline_roles();

with baseline_roles (role_key, name, description) as (
  values
    ('page_admin', 'Page admin', 'Full control over the supplier page, team roles, and settings.'),
    ('bdm', 'BDM', 'Business development user. Permissions are optional and controlled by the page admin.'),
    ('marketer', 'Marketer', 'Marketing user. Permissions are optional and controlled by the page admin.')
)
insert into public.supplier_page_roles (
  company_id,
  created_by,
  role_key,
  name,
  description,
  role_type,
  is_system
)
select
  companies.id,
  companies.created_by,
  baseline_roles.role_key,
  baseline_roles.name,
  baseline_roles.description,
  'baseline',
  true
from public.companies
cross join baseline_roles
on conflict (company_id, role_key) do nothing;

insert into public.supplier_page_role_permissions (
  role_id,
  permission_key,
  is_allowed,
  updated_by
)
select
  supplier_page_roles.id,
  supplier_page_permissions.key,
  supplier_page_roles.role_key = 'page_admin',
  supplier_page_roles.created_by
from public.supplier_page_roles
cross join public.supplier_page_permissions
on conflict (role_id, permission_key) do nothing;

insert into public.supplier_page_members (
  company_id,
  user_id,
  role_id,
  assigned_by,
  status
)
select
  companies.id,
  companies.created_by,
  supplier_page_roles.id,
  companies.created_by,
  'active'
from public.companies
join public.supplier_page_roles
  on supplier_page_roles.company_id = companies.id
 and supplier_page_roles.role_key = 'page_admin'
on conflict (company_id, user_id, role_id) do nothing;

create or replace function public.is_supplier_page_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.supplier_page_members
    where supplier_page_members.company_id = target_company_id
      and supplier_page_members.user_id = auth.uid()
      and supplier_page_members.status = 'active'
  );
$$;

create or replace function public.is_supplier_page_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user()
    or exists (
      select 1
      from public.companies
      where companies.id = target_company_id
        and companies.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.supplier_page_members
      join public.supplier_page_roles
        on supplier_page_roles.id = supplier_page_members.role_id
      where supplier_page_members.company_id = target_company_id
        and supplier_page_members.user_id = auth.uid()
        and supplier_page_members.status = 'active'
        and supplier_page_roles.role_key = 'page_admin'
        and supplier_page_roles.status = 'active'
    );
$$;

create or replace function public.has_supplier_page_permission(
  target_company_id uuid,
  target_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_supplier_page_admin(target_company_id)
    or exists (
      select 1
      from public.supplier_page_members
      join public.supplier_page_roles
        on supplier_page_roles.id = supplier_page_members.role_id
      join public.supplier_page_role_permissions
        on supplier_page_role_permissions.role_id = supplier_page_roles.id
      where supplier_page_members.company_id = target_company_id
        and supplier_page_members.user_id = auth.uid()
        and supplier_page_members.status = 'active'
        and supplier_page_roles.status = 'active'
        and supplier_page_role_permissions.permission_key = target_permission_key
        and supplier_page_role_permissions.is_allowed
    );
$$;

grant execute on function public.is_supplier_page_member(uuid) to anon, authenticated;
grant execute on function public.is_supplier_page_admin(uuid) to anon, authenticated;
grant execute on function public.has_supplier_page_permission(uuid, text) to anon, authenticated;

alter table public.supplier_page_permissions enable row level security;
alter table public.supplier_page_roles enable row level security;
alter table public.supplier_page_members enable row level security;
alter table public.supplier_page_role_permissions enable row level security;

drop policy if exists "Anyone can view active supplier page permissions" on public.supplier_page_permissions;
create policy "Anyone can view active supplier page permissions"
on public.supplier_page_permissions for select
using (status = 'active');

drop policy if exists "Supplier page members can view roles" on public.supplier_page_roles;
create policy "Supplier page members can view roles"
on public.supplier_page_roles for select
using (
  public.is_supplier_page_member(company_id)
  or public.is_supplier_page_admin(company_id)
);

drop policy if exists "Page admins can create custom supplier roles" on public.supplier_page_roles;
create policy "Page admins can create custom supplier roles"
on public.supplier_page_roles for insert
with check (
  public.is_supplier_page_admin(company_id)
  and role_type = 'custom'
  and not is_system
);

drop policy if exists "Page admins can update custom supplier roles" on public.supplier_page_roles;
create policy "Page admins can update custom supplier roles"
on public.supplier_page_roles for update
using (
  public.is_supplier_page_admin(company_id)
  and role_type = 'custom'
)
with check (
  public.is_supplier_page_admin(company_id)
  and role_type = 'custom'
  and not is_system
);

drop policy if exists "Page admins can delete custom supplier roles" on public.supplier_page_roles;
create policy "Page admins can delete custom supplier roles"
on public.supplier_page_roles for delete
using (
  public.is_supplier_page_admin(company_id)
  and role_type = 'custom'
);

drop policy if exists "Supplier page members can view memberships" on public.supplier_page_members;
create policy "Supplier page members can view memberships"
on public.supplier_page_members for select
using (
  user_id = auth.uid()
  or public.is_supplier_page_admin(company_id)
);

drop policy if exists "Page admins can assign supplier page members" on public.supplier_page_members;
create policy "Page admins can assign supplier page members"
on public.supplier_page_members for insert
with check (public.is_supplier_page_admin(company_id));

drop policy if exists "Page admins can update supplier page members" on public.supplier_page_members;
create policy "Page admins can update supplier page members"
on public.supplier_page_members for update
using (public.is_supplier_page_admin(company_id))
with check (public.is_supplier_page_admin(company_id));

drop policy if exists "Page admins can remove supplier page members" on public.supplier_page_members;
create policy "Page admins can remove supplier page members"
on public.supplier_page_members for delete
using (public.is_supplier_page_admin(company_id));

drop policy if exists "Supplier page members can view role permissions" on public.supplier_page_role_permissions;
create policy "Supplier page members can view role permissions"
on public.supplier_page_role_permissions for select
using (
  exists (
    select 1
    from public.supplier_page_roles
    where supplier_page_roles.id = supplier_page_role_permissions.role_id
      and (
        public.is_supplier_page_member(supplier_page_roles.company_id)
        or public.is_supplier_page_admin(supplier_page_roles.company_id)
      )
  )
);

drop policy if exists "Page admins can create role permission toggles" on public.supplier_page_role_permissions;
create policy "Page admins can create role permission toggles"
on public.supplier_page_role_permissions for insert
with check (
  exists (
    select 1
    from public.supplier_page_roles
    where supplier_page_roles.id = supplier_page_role_permissions.role_id
      and public.is_supplier_page_admin(supplier_page_roles.company_id)
  )
);

drop policy if exists "Page admins can update role permission toggles" on public.supplier_page_role_permissions;
create policy "Page admins can update role permission toggles"
on public.supplier_page_role_permissions for update
using (
  exists (
    select 1
    from public.supplier_page_roles
    where supplier_page_roles.id = supplier_page_role_permissions.role_id
      and public.is_supplier_page_admin(supplier_page_roles.company_id)
  )
)
with check (
  exists (
    select 1
    from public.supplier_page_roles
    where supplier_page_roles.id = supplier_page_role_permissions.role_id
      and public.is_supplier_page_admin(supplier_page_roles.company_id)
  )
);

drop policy if exists "Page admins can delete role permission toggles" on public.supplier_page_role_permissions;
create policy "Page admins can delete role permission toggles"
on public.supplier_page_role_permissions for delete
using (
  exists (
    select 1
    from public.supplier_page_roles
    where supplier_page_roles.id = supplier_page_role_permissions.role_id
      and public.is_supplier_page_admin(supplier_page_roles.company_id)
  )
);

drop policy if exists "Users can view active companies" on public.companies;
create policy "Users can view active companies"
on public.companies for select
using (
  (
    status = 'active'
    and page_visibility = 'public'
  )
  or auth.uid() = created_by
  or public.is_supplier_page_member(id)
  or public.is_supplier_page_admin(id)
);

drop policy if exists "Company owners can update their company" on public.companies;
create policy "Company owners can update their company"
on public.companies for update
using (
  auth.uid() = created_by
  or public.is_supplier_page_admin(id)
)
with check (
  auth.uid() = created_by
  or public.is_supplier_page_admin(id)
);

-- Supplier page role access, Phase 3: section visibility and approval workflow.
-- Run this after supabase/phase-23-supplier-custom-roles.sql.

create table if not exists public.supplier_page_section_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  section_key text not null check (
    section_key in (
      'profile',
      'news',
      'jobs',
      'events',
      'media',
      'training',
      'adverts',
      'team'
    )
  ),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  updated_by uuid references auth.users(id) on delete set null,
  unique (company_id, section_key)
);

create table if not exists public.supplier_page_content_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  section_key text not null check (
    section_key in (
      'profile',
      'news',
      'jobs',
      'events',
      'media',
      'training',
      'adverts',
      'team'
    )
  ),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  media_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists set_supplier_page_section_settings_updated_at on public.supplier_page_section_settings;
create trigger set_supplier_page_section_settings_updated_at
before update on public.supplier_page_section_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_supplier_page_content_submissions_updated_at on public.supplier_page_content_submissions;
create trigger set_supplier_page_content_submissions_updated_at
before update on public.supplier_page_content_submissions
for each row execute function public.set_updated_at();

create index if not exists supplier_page_section_settings_company_idx
on public.supplier_page_section_settings (company_id, section_key);

create index if not exists supplier_page_content_submissions_company_status_idx
on public.supplier_page_content_submissions (company_id, status, created_at desc);

create index if not exists supplier_page_content_submissions_created_by_idx
on public.supplier_page_content_submissions (created_by, created_at desc);

with sections (section_key) as (
  values
    ('profile'),
    ('news'),
    ('jobs'),
    ('events'),
    ('media'),
    ('training'),
    ('adverts'),
    ('team')
)
insert into public.supplier_page_section_settings (
  company_id,
  section_key,
  visibility,
  updated_by
)
select
  companies.id,
  sections.section_key,
  'public',
  companies.created_by
from public.companies
cross join sections
on conflict (company_id, section_key) do nothing;

create or replace function public.seed_supplier_page_section_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.supplier_page_section_settings (
    company_id,
    section_key,
    visibility,
    updated_by
  )
  values
    (new.id, 'profile', 'public', new.created_by),
    (new.id, 'news', 'public', new.created_by),
    (new.id, 'jobs', 'public', new.created_by),
    (new.id, 'events', 'public', new.created_by),
    (new.id, 'media', 'public', new.created_by),
    (new.id, 'training', 'public', new.created_by),
    (new.id, 'adverts', 'public', new.created_by),
    (new.id, 'team', 'public', new.created_by)
  on conflict (company_id, section_key) do nothing;

  return new;
end;
$$;

drop trigger if exists seed_supplier_page_section_settings_on_company on public.companies;
create trigger seed_supplier_page_section_settings_on_company
after insert on public.companies
for each row execute function public.seed_supplier_page_section_settings();

create or replace function public.is_supplier_page_section_visible(
  target_company_id uuid,
  target_section_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select supplier_page_section_settings.visibility = 'public'
        or public.is_supplier_page_member(target_company_id)
        or public.is_supplier_page_admin(target_company_id)
      from public.supplier_page_section_settings
      where supplier_page_section_settings.company_id = target_company_id
        and supplier_page_section_settings.section_key = target_section_key
      limit 1
    ),
    true
  );
$$;

grant execute on function public.is_supplier_page_section_visible(uuid, text) to anon, authenticated;

alter table public.supplier_page_section_settings enable row level security;
alter table public.supplier_page_content_submissions enable row level security;

drop policy if exists "Visible supplier section settings can be viewed" on public.supplier_page_section_settings;
create policy "Visible supplier section settings can be viewed"
on public.supplier_page_section_settings for select
using (
  visibility = 'public'
  or public.is_supplier_page_member(company_id)
  or public.is_supplier_page_admin(company_id)
);

drop policy if exists "Page admins can create supplier section settings" on public.supplier_page_section_settings;
create policy "Page admins can create supplier section settings"
on public.supplier_page_section_settings for insert
with check (public.is_supplier_page_admin(company_id));

drop policy if exists "Page admins can update supplier section settings" on public.supplier_page_section_settings;
create policy "Page admins can update supplier section settings"
on public.supplier_page_section_settings for update
using (public.is_supplier_page_admin(company_id))
with check (public.is_supplier_page_admin(company_id));

drop policy if exists "Approved supplier submissions can be viewed" on public.supplier_page_content_submissions;
create policy "Approved supplier submissions can be viewed"
on public.supplier_page_content_submissions for select
using (
  (
    status = 'approved'
    and public.is_supplier_page_section_visible(company_id, section_key)
  )
  or created_by = auth.uid()
  or public.is_supplier_page_admin(company_id)
);

drop policy if exists "Users can submit supplier content for review" on public.supplier_page_content_submissions;
create policy "Users can submit supplier content for review"
on public.supplier_page_content_submissions for insert
with check (
  created_by = auth.uid()
  and public.is_supplier_page_section_visible(company_id, section_key)
  and (
    status = 'pending'
    or public.is_supplier_page_admin(company_id)
  )
);

drop policy if exists "Page admins can review supplier submissions" on public.supplier_page_content_submissions;
create policy "Page admins can review supplier submissions"
on public.supplier_page_content_submissions for update
using (public.is_supplier_page_admin(company_id))
with check (public.is_supplier_page_admin(company_id));
