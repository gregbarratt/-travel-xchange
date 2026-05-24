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
