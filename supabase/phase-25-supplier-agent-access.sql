-- Supplier page access, Phase 4: agent access requests.
-- Run this after supabase/phase-24-supplier-visibility-approval.sql.

create table if not exists public.supplier_page_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  unique (company_id, user_id)
);

drop trigger if exists set_supplier_page_access_requests_updated_at on public.supplier_page_access_requests;
create trigger set_supplier_page_access_requests_updated_at
before update on public.supplier_page_access_requests
for each row execute function public.set_updated_at();

create index if not exists supplier_page_access_requests_company_status_idx
on public.supplier_page_access_requests (company_id, status, created_at desc);

insert into public.supplier_page_roles (
  company_id,
  created_by,
  role_key,
  name,
  description,
  role_type,
  is_system,
  status
)
select
  companies.id,
  companies.created_by,
  'approved_agent',
  'Approved agent',
  'Can view private supplier sections after approval but cannot manage page areas.',
  'baseline',
  true,
  'active'
from public.companies
on conflict (company_id, role_key) do update
set
  name = excluded.name,
  description = excluded.description,
  role_type = excluded.role_type,
  is_system = true,
  status = 'active';

insert into public.supplier_page_role_permissions (
  role_id,
  permission_key,
  is_allowed,
  updated_by
)
select
  supplier_page_roles.id,
  supplier_page_permissions.key,
  false,
  supplier_page_roles.created_by
from public.supplier_page_roles
cross join public.supplier_page_permissions
where supplier_page_roles.role_key = 'approved_agent'
on conflict (role_id, permission_key) do update
set is_allowed = false;

create or replace function public.seed_supplier_page_approved_agent_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_agent_role_id uuid;
begin
  insert into public.supplier_page_roles (
    company_id,
    created_by,
    role_key,
    name,
    description,
    role_type,
    is_system,
    status
  )
  values (
    new.id,
    new.created_by,
    'approved_agent',
    'Approved agent',
    'Can view private supplier sections after approval but cannot manage page areas.',
    'baseline',
    true,
    'active'
  )
  on conflict (company_id, role_key) do update
  set
    name = excluded.name,
    description = excluded.description,
    role_type = excluded.role_type,
    is_system = true,
    status = 'active'
  returning id into approved_agent_role_id;

  if approved_agent_role_id is null then
    select id
    into approved_agent_role_id
    from public.supplier_page_roles
    where company_id = new.id
      and role_key = 'approved_agent'
    limit 1;
  end if;

  if approved_agent_role_id is not null then
    insert into public.supplier_page_role_permissions (
      role_id,
      permission_key,
      is_allowed,
      updated_by
    )
    select
      approved_agent_role_id,
      supplier_page_permissions.key,
      false,
      new.created_by
    from public.supplier_page_permissions
    on conflict (role_id, permission_key) do update
    set is_allowed = false;
  end if;

  return new;
end;
$$;

drop trigger if exists seed_supplier_page_approved_agent_role_on_company on public.companies;
create trigger seed_supplier_page_approved_agent_role_on_company
after insert on public.companies
for each row execute function public.seed_supplier_page_approved_agent_role();

alter table public.supplier_page_access_requests enable row level security;

drop policy if exists "Users and page admins can view supplier access requests" on public.supplier_page_access_requests;
create policy "Users and page admins can view supplier access requests"
on public.supplier_page_access_requests for select
using (
  user_id = auth.uid()
  or public.is_supplier_page_admin(company_id)
);

drop policy if exists "Users can create their own supplier access request" on public.supplier_page_access_requests;
create policy "Users can create their own supplier access request"
on public.supplier_page_access_requests for insert
with check (
  user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "Users can update their own pending supplier access request" on public.supplier_page_access_requests;
create policy "Users can update their own pending supplier access request"
on public.supplier_page_access_requests for update
using (
  user_id = auth.uid()
  and status in ('pending', 'rejected', 'cancelled')
)
with check (
  user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "Page admins can review supplier access requests" on public.supplier_page_access_requests;
create policy "Page admins can review supplier access requests"
on public.supplier_page_access_requests for update
using (public.is_supplier_page_admin(company_id))
with check (public.is_supplier_page_admin(company_id));
