-- Esquema minimo para el modulo de usuarios del panel Huellitas.
-- Ejecutar en SQL Editor del proyecto Supabase conectado a Vercel.
-- No modifica profiles, adoption_requests ni triggers de Android.

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  avatar_path text,
  role text,
  team text check (team is null or char_length(team) <= 80),
  location text check (location is null or char_length(location) <= 80),
  status text not null default 'Activo' check (status in ('Activo', 'Invitación pendiente', 'Inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles add column if not exists avatar_path text;
alter table public.staff_profiles drop constraint if exists staff_profiles_role_check;
alter table public.staff_profiles
  add constraint staff_profiles_role_check
  check (role is null or role in ('admin', 'operador', 'voluntario')) not valid;

create or replace function public.shelter_handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_profiles_updated_at on public.staff_profiles;
create trigger staff_profiles_updated_at
before update on public.staff_profiles
for each row
execute function public.shelter_handle_updated_at();

create or replace function public.shelter_handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') not in ('admin', 'operador', 'voluntario') then
    delete from public.staff_profiles where id = new.id;
    return new;
  end if;

  insert into public.staff_profiles as p (id, email, full_name, avatar_path, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_path',
    new.raw_app_meta_data ->> 'role'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, p.full_name),
        avatar_path = excluded.avatar_path,
        role = excluded.role;
  return new;
end;
$$;

revoke all on function public.shelter_handle_auth_user_change() from public, anon, authenticated;

drop trigger if exists on_shelter_staff_user_created on auth.users;
create trigger on_shelter_staff_user_created
after insert on auth.users
for each row
execute function public.shelter_handle_auth_user_change();

drop trigger if exists on_shelter_staff_user_updated on auth.users;
create trigger on_shelter_staff_user_updated
after update of email, raw_app_meta_data, raw_user_meta_data on auth.users
for each row
execute function public.shelter_handle_auth_user_change();

insert into public.staff_profiles (id, email, full_name, avatar_path, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_path',
  u.raw_app_meta_data ->> 'role'
from auth.users u
where u.email is not null
  and u.raw_app_meta_data ->> 'role' in ('admin', 'operador', 'voluntario')
on conflict (id) do nothing;

alter table public.staff_profiles enable row level security;

drop policy if exists "Users read own staff profile" on public.staff_profiles;
create policy "Users read own staff profile" on public.staff_profiles
for select to authenticated
using (
  id = (select auth.uid())
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admin manage staff profiles" on public.staff_profiles;
create policy "Admin manage staff profiles" on public.staff_profiles
for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.staff_profiles to authenticated;

drop function if exists public.shelter_set_user_role(text, text);

create function public.shelter_set_user_role(new_role text, target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Solo la administración puede cambiar roles.' using errcode = '42501';
  end if;

  if new_role not in ('admin', 'operador', 'voluntario') then
    raise exception 'Rol no válido. Usa admin, operador o voluntario.' using errcode = '22023';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  where lower(email) = lower(trim(target_email));

  if not found then
    raise exception 'No existe un usuario con ese correo.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.shelter_set_user_role(text, text) from public, anon;
grant execute on function public.shelter_set_user_role(text, text) to authenticated;

notify pgrst, 'reload schema';
