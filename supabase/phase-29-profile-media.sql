-- Phase 29: Profile and supplier media uploads
-- Run this in Supabase before using profile photo, profile banner, supplier
-- logo, or supplier banner uploads.

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists cover_image_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'travel-xchange-media',
  'travel-xchange-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view Travel Xchange media" on storage.objects;
create policy "Public can view Travel Xchange media"
on storage.objects for select
using (bucket_id = 'travel-xchange-media');

drop policy if exists "Authenticated users can upload Travel Xchange media" on storage.objects;
create policy "Authenticated users can upload Travel Xchange media"
on storage.objects for insert
with check (
  bucket_id = 'travel-xchange-media'
  and auth.role() = 'authenticated'
);

drop policy if exists "Users can update their own Travel Xchange media" on storage.objects;
create policy "Users can update their own Travel Xchange media"
on storage.objects for update
using (
  bucket_id = 'travel-xchange-media'
  and owner = auth.uid()
)
with check (
  bucket_id = 'travel-xchange-media'
  and owner = auth.uid()
);

drop policy if exists "Users can delete their own Travel Xchange media" on storage.objects;
create policy "Users can delete their own Travel Xchange media"
on storage.objects for delete
using (
  bucket_id = 'travel-xchange-media'
  and owner = auth.uid()
);
