-- Phase 30: Supplier cover image positioning
-- Adds saved display controls for supplier/company cover banners.

alter table public.companies
add column if not exists logo_url text;

alter table public.companies
add column if not exists cover_image_url text;

alter table public.companies
add column if not exists cover_image_fit text not null default 'cover';

alter table public.companies
add column if not exists cover_image_position text not null default '50% 50%';

alter table public.companies
drop constraint if exists companies_cover_image_fit_check;

alter table public.companies
add constraint companies_cover_image_fit_check
check (cover_image_fit in ('cover', 'contain'));

alter table public.companies
drop constraint if exists companies_cover_image_position_check;

alter table public.companies
add constraint companies_cover_image_position_check
check (cover_image_position ~ '^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$');
