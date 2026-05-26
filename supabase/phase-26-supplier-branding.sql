-- Phase 26: Supplier page brand image controls
-- Adds URL-based logo and cover image fields for supplier/company pages.

alter table public.companies
add column if not exists logo_url text;

alter table public.companies
add column if not exists cover_image_url text;
