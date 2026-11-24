-- Schema para Huellitas
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: puedes volver a ejecutarlo sin duplicar datos ni romper nada.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Helpers de rol (vienen de app_metadata.role del JWT).
-- app_metadata solo lo puede modificar el backend/SQL, no el usuario.
-- `search_path = ''` evita que alguien secuestre las funciones con objetos propios.
-- ─────────────────────────────────────────────────────────────
create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_role() in ('admin', 'operador');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_role() = 'admin';
$$;

-- Cualquier usuario con rol válido en el panel.
create or replace function public.is_app_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_role() in ('admin', 'operador', 'voluntario');
$$;

-- Quien entra a /voluntariado (ver lib/auth/roles.ts).
create or replace function public.can_volunteer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_role() in ('admin', 'voluntario');
$$;

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

-- ─────────────────────────────────────────────────────────────
-- Perfiles del personal (módulo Usuarios). No usa la tabla profiles de la app.
-- Se crean solos al dar de alta a alguien en Authentication → Users.
-- El rol "de verdad" vive en app_metadata; aquí se refleja para poder listarlo.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  avatar_path text,
  role text check (role is null or role in ('admin', 'operador', 'voluntario')),
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
        role = excluded.role,
        full_name = coalesce(excluded.full_name, p.full_name),
        avatar_path = excluded.avatar_path;
  return new;
end;
$$;

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

-- Usuarios que ya existían antes de crear la tabla.
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

-- ─────────────────────────────────────────────────────────────
-- Animales
-- ─────────────────────────────────────────────────────────────
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Perro',
  breed text,
  age_years numeric not null default 0,
  status text not null default 'Disponible',
  weight_kg numeric,
  sex text,
  location text,
  notes text,
  photo_webp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.animals add column if not exists sex text;
alter table public.animals add column if not exists photo_webp text;

-- Perfil público para la página de adopción (/adopta). Las notas internas nunca se publican.
alter table public.animals add column if not exists public_description text;
alter table public.animals add column if not exists size text;
alter table public.animals add column if not exists energy text;
alter table public.animals add column if not exists vaccinated boolean;
alter table public.animals add column if not exists sterilized boolean;
alter table public.animals add column if not exists good_with_kids boolean;
alter table public.animals add column if not exists good_with_dogs boolean;
alter table public.animals add column if not exists good_with_cats boolean;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'animals_name_length') then
    alter table public.animals add constraint animals_name_length check (char_length(name) between 1 and 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'animals_age_range') then
    alter table public.animals add constraint animals_age_range check (age_years >= 0 and age_years <= 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'animals_weight_range') then
    alter table public.animals add constraint animals_weight_range check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 200)) not valid;
  end if;
  -- Fotos WebP en base64: máx. ~450 KB de texto (320 KB binarios).
  if not exists (select 1 from pg_constraint where conname = 'animals_photo_size') then
    alter table public.animals add constraint animals_photo_size check (photo_webp is null or char_length(photo_webp) <= 460000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'animals_public_profile') then
    alter table public.animals add constraint animals_public_profile check (
      (public_description is null or char_length(public_description) <= 1500)
      and (size is null or size in ('Pequeño', 'Mediano', 'Grande'))
      and (energy is null or energy in ('Tranquilo', 'Moderado', 'Muy activo'))
    ) not valid;
  end if;
end $$;

create index if not exists animals_status_idx on public.animals (status);

drop trigger if exists animals_updated_at on public.animals;
create trigger animals_updated_at
before update on public.animals
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Historial / notas de cada animal
-- ─────────────────────────────────────────────────────────────
create table if not exists public.animal_notes (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  author_id uuid default auth.uid(),
  author_email text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

create index if not exists animal_notes_animal_id_idx on public.animal_notes (animal_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Seguimiento: recordatorios de cuidado (vacunas, controles, tratamientos)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  -- Si se borra el expediente, el recordatorio conserva el nombre del animal.
  animal_id uuid references public.animals(id) on delete set null,
  animal_name text not null check (char_length(animal_name) between 1 and 80),
  task text not null check (char_length(task) between 1 and 160),
  due_at timestamptz not null,
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Programada', 'En curso', 'Completada')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_reminders_due_idx on public.care_reminders (status, due_at);
create index if not exists care_reminders_animal_id_idx on public.care_reminders (animal_id);

drop trigger if exists care_reminders_updated_at on public.care_reminders;
create trigger care_reminders_updated_at
before update on public.care_reminders
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Inventario
-- ─────────────────────────────────────────────────────────────
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  stock integer not null default 0,
  min_stock integer not null default 0,
  expiry_date date,
  unit text not null default 'unidad',
  status text not null default 'Suficiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_stock_positive') then
    alter table public.inventory_items add constraint inventory_stock_positive check (stock >= 0 and min_stock >= 0) not valid;
  end if;
end $$;

create index if not exists inventory_items_expiry_idx on public.inventory_items (expiry_date) where expiry_date is not null;

drop trigger if exists inventory_items_updated_at on public.inventory_items;
create trigger inventory_items_updated_at
before update on public.inventory_items
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Solicitudes de adopción
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shelter_adoption_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(applicant_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 30),
  city text,
  -- Si se borra el expediente, la solicitud conserva el nombre del animal.
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

create index if not exists shelter_adoption_requests_stage_idx on public.shelter_adoption_requests (stage, created_at desc);
create index if not exists shelter_adoption_requests_animal_id_idx on public.shelter_adoption_requests (animal_id);

drop trigger if exists shelter_adoption_requests_updated_at on public.shelter_adoption_requests;
create trigger shelter_adoption_requests_updated_at
before update on public.shelter_adoption_requests
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Adopciones particulares: personas que buscan hogar para su mascota.
-- El equipo las modera antes de publicarlas.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.adoption_listings (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null check (char_length(owner_name) between 1 and 120),
  owner_email text check (owner_email is null or char_length(owner_email) between 3 and 254),
  owner_phone text check (owner_phone is null or char_length(owner_phone) <= 30),
  pet_name text not null check (char_length(pet_name) between 1 and 80),
  pet_type text not null default 'Perro',
  location text check (location is null or char_length(location) <= 120),
  motive text not null check (char_length(motive) between 1 and 1000),
  photo_webp text check (photo_webp is null or char_length(photo_webp) <= 460000),
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Aprobada', 'Rechazada')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adoption_listings_status_idx on public.adoption_listings (status, created_at desc);

drop trigger if exists adoption_listings_updated_at on public.adoption_listings;
create trigger adoption_listings_updated_at
before update on public.adoption_listings
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Finanzas: donaciones (ingresos) y gastos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ingreso', 'gasto')),
  concept text not null check (char_length(concept) between 1 and 120),
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  method text not null default 'Transferencia',
  contact text check (contact is null or char_length(contact) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions (date desc);

drop trigger if exists transactions_updated_at on public.transactions;
create trigger transactions_updated_at
before update on public.transactions
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Agenda: citas y tareas del equipo
-- ─────────────────────────────────────────────────────────────
create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  date date not null,
  time time,
  type text not null default 'Cita' check (type in ('Cita', 'Salud', 'Evento', 'Tarea')),
  assignee text check (assignee is null or char_length(assignee) <= 80),
  status text not null default 'Programada' check (status in ('Programada', 'Confirmada', 'Pendiente', 'Abierta', 'Completada', 'Cancelada')),
  animal_id uuid references public.animals(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_entries_date_idx on public.calendar_entries (date, time);
create index if not exists calendar_entries_animal_id_idx on public.calendar_entries (animal_id);

drop trigger if exists calendar_entries_updated_at on public.calendar_entries;
create trigger calendar_entries_updated_at
before update on public.calendar_entries
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Eventos y campañas (ferias, jornadas, colectas)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  type text not null default 'Comunidad' check (char_length(type) between 1 and 40),
  event_date date not null,
  start_time time,
  end_time time,
  location text check (location is null or char_length(location) <= 160),
  description text check (description is null or char_length(description) <= 2000),
  -- Meta de recaudación opcional; lo recaudado se suma desde transactions (categoría «Evento o campaña»).
  fundraising_goal numeric(12, 2) check (fundraising_goal is null or fundraising_goal > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (start_time is null or end_time is null or end_time > start_time)
);

create index if not exists events_date_idx on public.events (event_date);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Voluntariado: equipos y turnos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.volunteer_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  -- Turnos por semana que el equipo necesita cubrir (para calcular la cobertura).
  weekly_shifts_needed integer not null default 5 check (weekly_shifts_needed between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists volunteer_teams_updated_at on public.volunteer_teams;
create trigger volunteer_teams_updated_at
before update on public.volunteer_teams
for each row
execute function public.shelter_handle_updated_at();

create table if not exists public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.volunteer_teams(id) on delete cascade,
  volunteer_name text not null check (char_length(volunteer_name) between 1 and 120),
  volunteer_id uuid references auth.users(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'Programado' check (status in ('Programado', 'Cumplido', 'Ausente', 'Cancelado')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_shifts_time_order check (end_time is null or end_time > start_time)
);

create index if not exists volunteer_shifts_date_idx on public.volunteer_shifts (date, start_time);
create index if not exists volunteer_shifts_team_id_idx on public.volunteer_shifts (team_id, date);

drop trigger if exists volunteer_shifts_updated_at on public.volunteer_shifts;
create trigger volunteer_shifts_updated_at
before update on public.volunteer_shifts
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Reportes ciudadanos (maltrato, abandono, animal herido…)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.citizen_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Maltrato', 'Animal abandonado', 'Herido', 'Extraviado', 'Otro')),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Aprobado', 'Rechazado', 'Atendido')),
  description text check (description is null or char_length(description) <= 2000),
  address text check (address is null or char_length(address) <= 240),
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  reporter_name text check (reporter_name is null or char_length(reporter_name) <= 120),
  reporter_contact text check (reporter_contact is null or char_length(reporter_contact) <= 120),
  photo_webp text check (photo_webp is null or char_length(photo_webp) <= 460000),
  assignee text check (assignee is null or char_length(assignee) <= 80),
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 2000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists citizen_reports_status_idx on public.citizen_reports (status, priority, created_at desc);

drop trigger if exists citizen_reports_updated_at on public.citizen_reports;
create trigger citizen_reports_updated_at
before update on public.citizen_reports
for each row
execute function public.shelter_handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Las funciones van envueltas en (select …) para que Postgres las evalúe
-- una vez por consulta y no una vez por fila.
-- ─────────────────────────────────────────────────────────────
alter table public.staff_profiles enable row level security;
alter table public.animals enable row level security;
alter table public.animal_notes enable row level security;
alter table public.care_reminders enable row level security;
alter table public.inventory_items enable row level security;
alter table public.shelter_adoption_requests enable row level security;
alter table public.adoption_listings enable row level security;
alter table public.transactions enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.events enable row level security;
alter table public.volunteer_teams enable row level security;
alter table public.volunteer_shifts enable row level security;
alter table public.citizen_reports enable row level security;

-- Limpia políticas de versiones anteriores
drop policy if exists "Allow authenticated users to view animals" on public.animals;
drop policy if exists "Allow authenticated users to insert animals" on public.animals;
drop policy if exists "Allow authenticated users to update animals" on public.animals;
drop policy if exists "Allow authenticated users to delete animals" on public.animals;
drop policy if exists "Allow authenticated users to view inventory" on public.inventory_items;
drop policy if exists "Allow authenticated users to insert inventory" on public.inventory_items;
drop policy if exists "Allow authenticated users to update inventory" on public.inventory_items;
drop policy if exists "Allow authenticated users to delete inventory" on public.inventory_items;
drop policy if exists "Allow staff to view animals" on public.animals;
drop policy if exists "Allow staff to insert animals" on public.animals;
drop policy if exists "Allow staff to update animals" on public.animals;
drop policy if exists "Allow staff to delete animals" on public.animals;
drop policy if exists "Allow staff to view inventory" on public.inventory_items;
drop policy if exists "Allow staff to insert inventory" on public.inventory_items;
drop policy if exists "Allow staff to update inventory" on public.inventory_items;
drop policy if exists "Allow staff to delete inventory" on public.inventory_items;
drop policy if exists "Staff manage animals" on public.animals;
drop policy if exists "Staff manage animal notes" on public.animal_notes;
drop policy if exists "Staff manage inventory" on public.inventory_items;
drop policy if exists "Staff manage shelter adoption requests" on public.shelter_adoption_requests;
drop policy if exists "Staff manage transactions" on public.transactions;
drop policy if exists "Users read own staff profile" on public.staff_profiles;
drop policy if exists "Admin manage staff profiles" on public.staff_profiles;
drop policy if exists "Team reads care reminders" on public.care_reminders;
drop policy if exists "Team creates care reminders" on public.care_reminders;
drop policy if exists "Team updates care reminders" on public.care_reminders;
drop policy if exists "Staff or author deletes care reminders" on public.care_reminders;
drop policy if exists "Staff manage adoption listings" on public.adoption_listings;
drop policy if exists "Team reads calendar" on public.calendar_entries;
drop policy if exists "Team creates calendar entries" on public.calendar_entries;
drop policy if exists "Staff or author edits calendar entries" on public.calendar_entries;
drop policy if exists "Staff or author deletes calendar entries" on public.calendar_entries;
drop policy if exists "Team reads events" on public.events;
drop policy if exists "Staff manage events" on public.events;
drop policy if exists "Volunteers read teams" on public.volunteer_teams;
drop policy if exists "Admin manage teams" on public.volunteer_teams;
drop policy if exists "Volunteers read shifts" on public.volunteer_shifts;
drop policy if exists "Volunteers create shifts" on public.volunteer_shifts;
drop policy if exists "Admin or author edits shifts" on public.volunteer_shifts;
drop policy if exists "Admin or author deletes shifts" on public.volunteer_shifts;
drop policy if exists "Team reads citizen reports" on public.citizen_reports;
drop policy if exists "Team creates citizen reports" on public.citizen_reports;
drop policy if exists "Staff manage citizen reports" on public.citizen_reports;
drop policy if exists "Staff delete citizen reports" on public.citizen_reports;

-- Solo staff: expedientes, notas, inventario, solicitudes, particulares y finanzas.
create policy "Staff manage animals" on public.animals
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff manage animal notes" on public.animal_notes
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff manage inventory" on public.inventory_items
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff manage shelter adoption requests" on public.shelter_adoption_requests
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff manage adoption listings" on public.adoption_listings
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff manage transactions" on public.transactions
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Perfiles del personal: cada quien ve el suyo; la administración ve y gestiona todos.
create policy "Users read own staff profile" on public.staff_profiles
for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Admin manage staff profiles" on public.staff_profiles
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Seguimiento: todo el equipo ve, crea y marca avances; borrar, staff o quien lo creó.
create policy "Team reads care reminders" on public.care_reminders
for select to authenticated using ((select public.is_app_user()));

create policy "Team creates care reminders" on public.care_reminders
for insert to authenticated with check ((select public.is_app_user()));

create policy "Team updates care reminders" on public.care_reminders
for update to authenticated using ((select public.is_app_user())) with check ((select public.is_app_user()));

create policy "Staff or author deletes care reminders" on public.care_reminders
for delete to authenticated using ((select public.is_staff()) or created_by = (select auth.uid()));

-- Agenda: todo el equipo ve y crea; editar o borrar, staff o quien la creó.
create policy "Team reads calendar" on public.calendar_entries
for select to authenticated using ((select public.is_app_user()));

create policy "Team creates calendar entries" on public.calendar_entries
for insert to authenticated with check ((select public.is_app_user()));

create policy "Staff or author edits calendar entries" on public.calendar_entries
for update to authenticated
using ((select public.is_staff()) or created_by = (select auth.uid()))
with check ((select public.is_staff()) or created_by = (select auth.uid()));

create policy "Staff or author deletes calendar entries" on public.calendar_entries
for delete to authenticated using ((select public.is_staff()) or created_by = (select auth.uid()));

-- Eventos: todo el equipo los ve; solo staff los organiza.
create policy "Team reads events" on public.events
for select to authenticated using ((select public.is_app_user()));

create policy "Staff manage events" on public.events
for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Voluntariado: admin y voluntarios. Los equipos los define la administración.
create policy "Volunteers read teams" on public.volunteer_teams
for select to authenticated using ((select public.can_volunteer()));

create policy "Admin manage teams" on public.volunteer_teams
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Volunteers read shifts" on public.volunteer_shifts
for select to authenticated using ((select public.can_volunteer()));

create policy "Volunteers create shifts" on public.volunteer_shifts
for insert to authenticated with check ((select public.can_volunteer()));

create policy "Admin or author edits shifts" on public.volunteer_shifts
for update to authenticated
using ((select public.is_admin()) or created_by = (select auth.uid()))
with check ((select public.is_admin()) or created_by = (select auth.uid()));

create policy "Admin or author deletes shifts" on public.volunteer_shifts
for delete to authenticated using ((select public.is_admin()) or created_by = (select auth.uid()));

-- Reportes ciudadanos: todo el equipo los ve y registra; staff cambia estado o los borra.
create policy "Team reads citizen reports" on public.citizen_reports
for select to authenticated using ((select public.is_app_user()));

create policy "Team creates citizen reports" on public.citizen_reports
for insert to authenticated with check ((select public.is_app_user()));

create policy "Staff manage citizen reports" on public.citizen_reports
for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "Staff delete citizen reports" on public.citizen_reports
for delete to authenticated using ((select public.is_staff()));

-- Opcional: aceptar reportes desde un formulario público sin cuenta.
-- Descomenta solo si vas a publicar ese formulario (y considera un captcha):
--
-- create policy "Public submits citizen reports" on public.citizen_reports
-- for insert to anon
-- with check (status = 'Pendiente' and assignee is null and resolution_notes is null);
-- grant insert on public.citizen_reports to anon;

-- ─────────────────────────────────────────────────────────────
-- Permisos de la API. RLS decide qué filas; esto solo abre las tablas al rol
-- `authenticated` (algunos proyectos nuevos de Supabase ya no lo hacen solos).
-- `anon` (sin sesión) no recibe nada.
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.staff_profiles,
  public.animals,
  public.animal_notes,
  public.care_reminders,
  public.inventory_items,
  public.shelter_adoption_requests,
  public.adoption_listings,
  public.transactions,
  public.calendar_entries,
  public.events,
  public.volunteer_teams,
  public.volunteer_shifts,
  public.citizen_reports
to authenticated;

revoke all on function public.shelter_handle_auth_user_change() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Asignar rol a un usuario (créalo antes en Authentication → Users).
-- Desde el SQL Editor:   select public.shelter_set_user_role('admin', 'tu-correo@ejemplo.com');
-- También la puede llamar un admin desde la app. El usuario debe cerrar sesión
-- y volver a entrar para que el rol nuevo aparezca en su token.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.shelter_set_user_role(text, text);

create function public.shelter_set_user_role(new_role text, target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() es null en el SQL Editor; en la app, solo un admin puede usarla.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo la administración puede cambiar roles.' using errcode = '42501';
  end if;

  if new_role not in ('admin', 'operador', 'voluntario') then
    raise exception 'Rol no válido: %. Usa admin, operador o voluntario.', new_role using errcode = '22023';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  where lower(email) = lower(trim(target_email));

  if not found then
    raise exception 'No existe un usuario con el correo %.', target_email using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.shelter_set_user_role(text, text) from public, anon;
grant execute on function public.shelter_set_user_role(text, text) to authenticated;

notify pgrst, 'reload schema';

-- Fotos privadas del personal: cada cuenta solo puede gestionar su propia carpeta.
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

-- ─────────────────────────────────────────────────────────────
-- Página pública de adopción (/adopta), sin iniciar sesión.
-- Los visitantes no tocan las tablas: solo estas funciones, que exponen
-- únicamente columnas públicas y validan lo que reciben.
-- ─────────────────────────────────────────────────────────────
create or replace function public.list_adoptable_animals()
returns table (
  id uuid,
  name text,
  type text,
  breed text,
  age_years numeric,
  sex text,
  weight_kg numeric,
  status text,
  photo_webp text,
  public_description text,
  size text,
  energy text,
  vaccinated boolean,
  sterilized boolean,
  good_with_kids boolean,
  good_with_dogs boolean,
  good_with_cats boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.type, a.breed, a.age_years, a.sex, a.weight_kg, a.status, a.photo_webp,
         a.public_description, a.size, a.energy, a.vaccinated, a.sterilized,
         a.good_with_kids, a.good_with_dogs, a.good_with_cats, a.created_at
  from public.animals a
  where a.status in ('Disponible', 'Reservado')
  order by (a.status = 'Disponible') desc, a.created_at desc;
$$;

create or replace function public.shelter_public_stats()
returns table (available integer, adopted integer, rescued integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where status = 'Disponible')::integer,
    count(*) filter (where status = 'Adoptado')::integer,
    count(*)::integer
  from public.animals;
$$;

create or replace function public.submit_adoption_request(
  p_animal_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_housing text,
  p_message text,
  p_website text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_animal record;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_name, ''));
begin
  -- Campo trampa: los humanos no lo ven; si viene lleno es un bot. Fingimos éxito.
  if coalesce(trim(p_website), '') <> '' then
    return;
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Escribe tu nombre completo.' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un correo válido.' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_phone), '')) not between 8 and 30 then
    raise exception 'Escribe un teléfono de contacto.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_city, '')) > 120 or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'El texto es demasiado largo.' using errcode = '22023';
  end if;

  select a.id, a.name, a.status into v_animal from public.animals a where a.id = p_animal_id;
  if not found or v_animal.status not in ('Disponible', 'Reservado') then
    raise exception 'Este animal ya no está en adopción.' using errcode = 'P0002';
  end if;
  if v_animal.status = 'Reservado' then
    raise exception '% ya tiene una adopción en proceso. ¡Conoce a los demás!', v_animal.name using errcode = '22023';
  end if;

  -- Límites contra spam.
  if exists (
    select 1 from public.shelter_adoption_requests r
    where lower(r.email) = v_email and r.animal_id = p_animal_id and r.stage not in ('Aprobada', 'Rechazada')
  ) then
    raise exception 'Ya recibimos tu solicitud para %. Te contactaremos pronto.', v_animal.name using errcode = '23505';
  end if;
  if (select count(*) from public.shelter_adoption_requests r where lower(r.email) = v_email and r.created_at > now() - interval '1 day') >= 3 then
    raise exception 'Ya enviaste varias solicitudes hoy. Espera nuestra llamada.' using errcode = '54000';
  end if;
  if (select count(*) from public.shelter_adoption_requests r where r.source = 'Web' and r.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Estamos recibiendo muchas solicitudes. Intenta en un rato.' using errcode = '54000';
  end if;

  insert into public.shelter_adoption_requests (applicant_name, email, phone, city, animal_id, animal_name, stage, priority, source, housing, notes)
  values (
    v_name,
    v_email,
    trim(p_phone),
    nullif(trim(coalesce(p_city, '')), ''),
    v_animal.id,
    v_animal.name,
    'Nueva',
    'Media',
    'Web',
    case when p_housing in ('Casa con patio', 'Casa', 'Departamento', 'Otro') then p_housing else 'Por confirmar' end,
    nullif(trim(coalesce(p_message, '')), '')
  );
end;
$$;

revoke all on function public.list_adoptable_animals() from public;
revoke all on function public.shelter_public_stats() from public;
revoke all on function public.submit_adoption_request(uuid, text, text, text, text, text, text, text) from public;
grant usage on schema public to anon;
grant execute on function public.list_adoptable_animals() to anon, authenticated;
grant execute on function public.shelter_public_stats() to anon, authenticated;
grant execute on function public.submit_adoption_request(uuid, text, text, text, text, text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Datos de ejemplo (solo si las tablas están vacías)
-- ─────────────────────────────────────────────────────────────
insert into public.animals (name, type, breed, age_years, status, weight_kg, sex, location, notes)
select * from (values
  ('Luna', 'Perro', 'Mestiza', 2, 'Disponible', 18.5, 'Hembra', 'Área A / Sala 2', 'Muy sociable y tranquila.'),
  ('Milo', 'Gato', 'Siamés', 1, 'En tratamiento', 4.8, 'Macho', 'Área B / Sala 1', 'Control de piel y revisión.'),
  ('Nilo', 'Perro', 'Pastor', 4, 'Disponible', 24.0, 'Macho', 'Área A / Sala 3', 'Necesita ejercicio diario.')
) as seed(name, type, breed, age_years, status, weight_kg, sex, location, notes)
where not exists (select 1 from public.animals);

insert into public.inventory_items (name, category, stock, min_stock, expiry_date, unit, status)
select * from (values
  ('Croquetas Premium', 'Alimentos', 75, 30, date '2027-03-12', 'kg', 'Suficiente'),
  ('Vitaminas caninas', 'Medicamentos', 18, 25, date '2027-01-04', 'caja', 'Bajo stock'),
  ('Gasas esterilizadas', 'Material médico', 32, 20, date '2026-10-29', 'paquete', 'Por caducar')
) as seed(name, category, stock, min_stock, expiry_date, unit, status)
where not exists (select 1 from public.inventory_items);

insert into public.shelter_adoption_requests (applicant_name, email, city, animal_id, animal_name, stage, priority, source, housing, assignee)
select seed.applicant_name, seed.email, seed.city, a.id, seed.animal_name, seed.stage, seed.priority, seed.source, seed.housing, seed.assignee
from (values
  ('Valeria R.', 'valeria.r@example.com', 'Roma Norte', 'Luna', 'Preselección', 'Alta', 'Web', 'Casa con patio', 'Ana'),
  ('Carlos M.', 'carlos.m@example.com', 'Coyoacán', 'Nilo', 'Entrevista', 'Media', 'Instagram', 'Departamento', 'Luis'),
  ('Javier S.', 'javier.s@example.com', 'Polanco', 'Milo', 'Nueva', 'Baja', 'Facebook', 'Departamento', 'Ana')
) as seed(applicant_name, email, city, animal_name, stage, priority, source, housing, assignee)
left join lateral (select id from public.animals where name = seed.animal_name order by created_at limit 1) a on true
where not exists (select 1 from public.shelter_adoption_requests);

insert into public.transactions (kind, concept, category, amount, date, method, contact)
select * from (values
  ('ingreso', 'Donativo mensual', 'Fundación o empresa', 2500.00, current_date - 2, 'Transferencia', 'Fundación K9'),
  ('ingreso', 'Paseo solidario', 'Evento o campaña', 4200.00, current_date - 35, 'Efectivo', null),
  ('gasto', 'Vacunas y desparasitantes', 'Salud veterinaria', 1400.00, current_date - 5, 'Transferencia', 'Clínica San Roque'),
  ('gasto', 'Croquetas premium', 'Alimentos', 1100.00, current_date - 40, 'Tarjeta', 'Distribuidora Can')
) as seed(kind, concept, category, amount, date, method, contact)
where not exists (select 1 from public.transactions);

insert into public.care_reminders (animal_id, animal_name, task, due_at, status)
select a.id, seed.animal_name, seed.task, seed.due_at, seed.status
from (values
  ('Milo', 'Control de piel', now() + interval '3 hours', 'Pendiente'),
  ('Luna', 'Vacuna anual', now() + interval '1 day', 'Programada'),
  ('Nilo', 'Revisión de peso', now() + interval '6 hours', 'En curso')
) as seed(animal_name, task, due_at, status)
left join lateral (select id from public.animals where name = seed.animal_name order by created_at limit 1) a on true
where not exists (select 1 from public.care_reminders);

insert into public.adoption_listings (owner_name, pet_name, pet_type, location, motive)
select * from (values
  ('Nora', 'Toby', 'Perro', 'Coyoacán', 'Necesita espacio para correr.'),
  ('Rafael', 'Canela', 'Perro', 'Roma Norte', 'Se va a mudar y busca un hogar responsable.'),
  ('María', 'Michi', 'Gato', 'Condesa', 'Busca familia con experiencia en gatos y trato con niños.')
) as seed(owner_name, pet_name, pet_type, location, motive)
where not exists (select 1 from public.adoption_listings);

insert into public.calendar_entries (title, date, time, type, assignee, status, animal_id)
select seed.title, seed.date, seed.time, seed.type, seed.assignee, seed.status, a.id
from (values
  ('Cita de adopción', current_date + 1, time '10:00', 'Cita', 'Ana', 'Confirmada', 'Luna'),
  ('Visita veterinaria', current_date + 1, time '13:30', 'Salud', 'Luis', 'Programada', 'Milo'),
  ('Revisión de inventario', current_date + 3, time '09:00', 'Tarea', 'Luis', 'Pendiente', null)
) as seed(title, date, time, type, assignee, status, animal_name)
left join lateral (select id from public.animals where name = seed.animal_name order by created_at limit 1) a on true
where not exists (select 1 from public.calendar_entries);

insert into public.events (title, type, event_date, start_time, end_time, location, fundraising_goal)
select * from (values
  ('Jornada de esterilización', 'Salud', current_date + 7, time '09:00', time '15:00', 'Refugio Huellitas', null::numeric),
  ('Taller de adopción responsable', 'Comunidad', current_date + 12, time '18:00', time '20:00', 'Centro comunitario', null),
  ('Paseo solidario', 'Fundraising', current_date + 20, time '08:30', time '12:00', 'Parque principal', 12000.00)
) as seed(title, type, event_date, start_time, end_time, location, fundraising_goal)
where not exists (select 1 from public.events);

insert into public.volunteer_teams (name, description, weekly_shifts_needed)
select * from (values
  ('Paseo y socialización', 'Paseos diarios y juego con los animales.', 14),
  ('Adopciones y entrevistas', 'Acompaña a las familias en el proceso.', 6),
  ('Cuidado veterinario', 'Apoyo en curaciones, baños y medicación.', 5)
) as seed(name, description, weekly_shifts_needed)
where not exists (select 1 from public.volunteer_teams);

insert into public.citizen_reports (type, priority, status, description, address)
select * from (values
  ('Maltrato', 'Alta', 'Pendiente', 'Perro amarrado sin agua ni sombra.', 'Calle Hidalgo 120'),
  ('Animal abandonado', 'Media', 'Aprobado', 'Gata con crías en un lote baldío.', 'Av. Juárez y 5 de Mayo'),
  ('Herido', 'Alta', 'Atendido', 'Perro atropellado, trasladado a la clínica.', 'Periférico Sur km 3')
) as seed(type, priority, status, description, address)
where not exists (select 1 from public.citizen_reports);
