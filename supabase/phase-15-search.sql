-- Phase 15: Search and discovery indexes
-- Run this in Supabase SQL Editor before testing the search page.

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
