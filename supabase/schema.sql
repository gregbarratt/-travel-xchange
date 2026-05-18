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
