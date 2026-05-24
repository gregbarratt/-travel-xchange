-- Supplier page role access, Phase 1: page visibility and baseline roles.
-- Run this in Supabase SQL editor after the previous phase SQL files.

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
