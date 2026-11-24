-- Configuracion aislada para las fotos de perfil del panel Huellitas.
-- Ejecutar en SQL Editor del proyecto Supabase conectado a Vercel.
-- No crea ni modifica tablas de la app Android.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-avatars', 'staff-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Staff can read own avatar" on storage.objects;
create policy "Staff can read own avatar" on storage.objects
for select to authenticated
using (
  bucket_id = 'staff-avatars'
  and (select public.is_app_user())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Staff can upload own avatar" on storage.objects;
create policy "Staff can upload own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'staff-avatars'
  and (select public.is_app_user())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Staff can delete own avatar" on storage.objects;
create policy "Staff can delete own avatar" on storage.objects
for delete to authenticated
using (
  bucket_id = 'staff-avatars'
  and (select public.is_app_user())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);