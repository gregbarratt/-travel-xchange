-- Supplier page role access, Phase 2: custom role section permissions.
-- Run this after supabase/phase-22-supplier-access-phase-1.sql.

insert into public.supplier_page_permissions (key, section_key, label, description)
values
  ('manage_training', 'training', 'Manage training', 'Manage supplier training modules and academy content.'),
  ('manage_adverts', 'adverts', 'Manage adverts', 'Manage supplier adverts, spotlight cards, and sponsorship slots.'),
  ('manage_team', 'team', 'Manage team', 'Manage supplier page team members and page assignments.')
on conflict (key) do update
set
  section_key = excluded.section_key,
  label = excluded.label,
  description = excluded.description,
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
  supplier_page_roles.role_key = 'page_admin',
  supplier_page_roles.created_by
from public.supplier_page_roles
join public.supplier_page_permissions
  on supplier_page_permissions.key in (
    'manage_training',
    'manage_adverts',
    'manage_team'
  )
on conflict (role_id, permission_key) do nothing;
