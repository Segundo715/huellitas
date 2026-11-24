-- Esquema minimo para solicitudes internas de adopcion del panel Huellitas.
-- Ejecutar en SQL Editor del proyecto Supabase conectado a Vercel.
-- No crea ni modifica public.adoption_requests de la app Android.

create table if not exists public.shelter_adoption_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(applicant_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 30),
  city text,
  animal_id uuid references public.animals(id) on delete set null,
  animal_name text not null check (char_length(animal_name) between 1 and 80),
  stage text not null default 'Nueva' check (stage in ('Nueva', 'Preselección', 'Entrevista', 'Documentación', 'Aprobada', 'Rechazada')),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  source text not null default 'Web',
  housing text not null default 'Por confirmar',
  assignee text,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shelter_adoption_requests_stage_idx
  on public.shelter_adoption_requests (stage, created_at desc);
create index if not exists shelter_adoption_requests_animal_id_idx
  on public.shelter_adoption_requests (animal_id);

create or replace function public.shelter_adoption_handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shelter_adoption_requests_updated_at on public.shelter_adoption_requests;
create trigger shelter_adoption_requests_updated_at
before update on public.shelter_adoption_requests
for each row
execute function public.shelter_adoption_handle_updated_at();

alter table public.shelter_adoption_requests enable row level security;

drop policy if exists "Staff manage shelter adoption requests" on public.shelter_adoption_requests;
create policy "Staff manage shelter adoption requests" on public.shelter_adoption_requests
for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'operador'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'operador'));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shelter_adoption_requests to authenticated;

notify pgrst, 'reload schema';
