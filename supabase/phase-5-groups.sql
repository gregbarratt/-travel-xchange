-- Phase 5 Travel Xchange groups and community discussions schema
-- Run this in the Supabase SQL editor after Phase 4 has been installed.

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
