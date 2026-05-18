-- Phase 3 Travel Xchange social feed schema
-- Run this in the Supabase SQL editor after Phase 2 has been installed.

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
