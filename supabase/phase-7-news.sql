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
