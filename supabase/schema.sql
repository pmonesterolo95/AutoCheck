-- ============================================================
-- AutoCheck - Gestión Inteligente de Mantenimiento Vehicular
-- FASE 3: Esquema de base de datos (PostgreSQL / Supabase)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
--
-- ¡ADVERTENCIA! Este script es DESTRUCTIVO:
-- al inicio elimina todo lo existente (tablas, funciones, triggers y
-- políticas de Storage) y regenera el esquema completo desde cero.
-- Los buckets de Storage no se borran (Supabase lo bloquea) y sus
-- objetos quedan intactos. NO lo ejecutes sobre una base con datos
-- que quieras conservar.
-- ============================================================

-- ------------------------------------------------------------
-- 0. REINICIO TOTAL (drop si existe cualquier objeto del sistema)
-- ------------------------------------------------------------

-- 1) Trigger primero (depende de handle_new_user)
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Tablas en orden inverso de dependencias (al caer, se eliminan
--    en cascada sus políticas RLS; los índices se borran con su tabla)
drop table if exists public.notifications;
drop table if exists public.reminders;
drop table if exists public.documents;
drop table if exists public.expenses;
drop table if exists public.maintenances;
drop table if exists public.maintenance_types;
drop table if exists public.vehicles;
drop table if exists public.vehicle_types;
drop table if exists public.profiles;

-- 3) Funciones auxiliares AL FINAL, cuando ya no tienen políticas que
--    las referencien (si no, PostgreSQL las protege y falla el drop)
drop function if exists public.handle_new_user();
drop function if exists public.my_role();
drop function if exists public.owns_vehicle(uuid);
drop function if exists public.is_admin();

-- 4) Políticas de Storage (los buckets no se borran: Supabase lo bloquea
--    con storage.protect_delete(); se reutilizan con "on conflict")
drop policy if exists "vehicle_images_insert" on storage.objects;
drop policy if exists "vehicle_images_select" on storage.objects;
drop policy if exists "vehicle_images_delete" on storage.objects;
drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "documents_select" on storage.objects;
drop policy if exists "documents_delete" on storage.objects;

-- Buckets de Storage: se reutilizan (no es posible borrarlos por SQL).
-- Si hace falta vaciarlos, usar la Storage API o la consola de Supabase.

-- ------------------------------------------------------------
-- 1. TABLA: profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. TABLA: vehicle_types (catálogo de tipos de vehículo/automotor)
--    Se crea antes que vehicles porque esta última la referencia por FK.
-- ------------------------------------------------------------
create table if not exists public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🚗',
  description text,
  created_at timestamptz not null default now()
);

-- Evita duplicar el catálogo (hace efectivo el "on conflict do nothing" del seed)
create unique index if not exists vehicle_types_name_key
  on public.vehicle_types (name);

-- ------------------------------------------------------------
-- 2b. TABLA: vehicles
--    Soporta todo tipo de vehículos y automotores (auto, camioneta,
--    moto, camión, furgón, ómnibus, maquinaria, etc.) para uso en
--    flotas personales o empresariales.
-- ------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null,
  model text not null,
  year int not null check (year between 1950 and 2100),
  license_plate text not null default '',
  current_km int not null default 0 check (current_km >= 0),
  fuel_type text not null default 'Nafta',
  vehicle_type_id uuid references public.vehicle_types (id),
  unit_number text,
  purchase_date date,
  image_url text,
  created_at timestamptz not null default now()
);

-- Migración idempotente para instalaciones existentes:
alter table public.vehicles add column if not exists vehicle_type_id uuid references public.vehicle_types (id);
alter table public.vehicles add column if not exists unit_number text;
alter table public.vehicles alter column license_plate set default '';
alter table public.vehicles add column if not exists fuel_type text not null default 'Nafta';
alter table public.vehicles add column if not exists purchase_date date;
alter table public.vehicles add column if not exists image_url text;

-- ------------------------------------------------------------
-- 3. TABLA: maintenance_types (catálogo administrable por ADMIN)
-- ------------------------------------------------------------
create table if not exists public.maintenance_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  recommended_km int check (recommended_km is null or recommended_km >= 0),
  recommended_months int check (recommended_months is null or recommended_months >= 0),
  created_at timestamptz not null default now()
);

-- Migración idempotente para instalaciones existentes que no
-- tengan las columnas de intervalos (recomendados por km/meses):
alter table public.maintenance_types add column if not exists recommended_km int check (recommended_km is null or recommended_km >= 0);
alter table public.maintenance_types add column if not exists recommended_months int check (recommended_months is null or recommended_months >= 0);

-- Evita duplicar el catálogo (hace efectivo el "on conflict do nothing" del seed)
create unique index if not exists maintenance_types_name_key
  on public.maintenance_types (name);

-- ------------------------------------------------------------
-- 4. TABLA: maintenances
-- ------------------------------------------------------------
create table if not exists public.maintenances (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  maintenance_type_id uuid not null references public.maintenance_types (id) on delete restrict,
  date date not null,
  kilometers int not null check (kilometers >= 0),
  description text,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  workshop text,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. TABLA: expenses
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12, 2) not null check (amount >= 0),
  date date not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. TABLA: documents
-- ------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  type text not null,
  expiration_date date,
  document_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. TABLA: reminders
-- ------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  title text not null,
  description text,
  reminder_date date,
  reminder_km int check (reminder_km is null or reminder_km >= 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'completado', 'vencido')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. TABLA: notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'alerta', 'vencimiento', 'mantenimiento')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 9. ÍNDICES (rendimiento de consultas frecuentes)
-- ------------------------------------------------------------
create index if not exists idx_vehicles_user_id on public.vehicles (user_id);
create index if not exists idx_vehicles_plate on public.vehicles (upper (license_plate));
create index if not exists idx_vehicles_type on public.vehicles (vehicle_type_id);
create index if not exists idx_vehicles_unit on public.vehicles (unit_number);
create index if not exists idx_maintenances_vehicle on public.maintenances (vehicle_id, date desc);
create index if not exists idx_expenses_vehicle_date on public.expenses (vehicle_id, date desc);
create index if not exists idx_documents_vehicle on public.documents (vehicle_id);
create index if not exists idx_reminders_vehicle on public.reminders (vehicle_id, reminder_date);
create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

-- ============================================================
-- 10. FUNCIONES AUXILIARES
-- ============================================================

-- Devuelve true si el usuario autenticado es ADMIN.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- Devuelve true si el vehículo pertenece al usuario autenticado.
create or replace function public.owns_vehicle(vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vehicles
    where id = vehicle_id and user_id = auth.uid()
  );
$$;

-- Devuelve el rol del usuario autenticado (evita recursión de RLS en profiles).
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Crea el profile automáticamente al registrarse un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'USER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_types enable row level security;
alter table public.maintenance_types enable row level security;
alter table public.maintenances enable row level security;
alter table public.expenses enable row level security;
alter table public.documents enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- vehicles ----------
drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "vehicles_insert" on public.vehicles;
create policy "vehicles_insert" on public.vehicles
  for insert with check (user_id = auth.uid());

drop policy if exists "vehicles_update" on public.vehicles;
create policy "vehicles_update" on public.vehicles
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists "vehicles_delete" on public.vehicles;
create policy "vehicles_delete" on public.vehicles
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- maintenance_types (catálogo compartido) ----------
drop policy if exists "maintenance_types_select" on public.maintenance_types;
create policy "maintenance_types_select" on public.maintenance_types
  for select using (auth.role() = 'authenticated');

drop policy if exists "maintenance_types_insert_admin" on public.maintenance_types;
create policy "maintenance_types_insert_admin" on public.maintenance_types
  for insert with check (public.is_admin());

drop policy if exists "maintenance_types_update_admin" on public.maintenance_types;
create policy "maintenance_types_update_admin" on public.maintenance_types
  for update using (public.is_admin());

drop policy if exists "maintenance_types_delete_admin" on public.maintenance_types;
create policy "maintenance_types_delete_admin" on public.maintenance_types
  for delete using (public.is_admin());

-- ---------- vehicle_types (catálogo compartido) ----------
drop policy if exists "vehicle_types_select" on public.vehicle_types;
create policy "vehicle_types_select" on public.vehicle_types
  for select using (auth.role() = 'authenticated');

drop policy if exists "vehicle_types_insert_admin" on public.vehicle_types;
create policy "vehicle_types_insert_admin" on public.vehicle_types
  for insert with check (public.is_admin());

drop policy if exists "vehicle_types_update_admin" on public.vehicle_types;
create policy "vehicle_types_update_admin" on public.vehicle_types
  for update using (public.is_admin());

drop policy if exists "vehicle_types_delete_admin" on public.vehicle_types;
create policy "vehicle_types_delete_admin" on public.vehicle_types
  for delete using (public.is_admin());

-- ---------- maintenances ----------
drop policy if exists "maintenances_select" on public.maintenances;
create policy "maintenances_select" on public.maintenances
  for select using (public.owns_vehicle(vehicle_id) or public.is_admin());

drop policy if exists "maintenances_insert" on public.maintenances;
create policy "maintenances_insert" on public.maintenances
  for insert with check (public.owns_vehicle(vehicle_id));

drop policy if exists "maintenances_update" on public.maintenances;
create policy "maintenances_update" on public.maintenances
  for update using (public.owns_vehicle(vehicle_id));

drop policy if exists "maintenances_delete" on public.maintenances;
create policy "maintenances_delete" on public.maintenances
  for delete using (public.owns_vehicle(vehicle_id));

-- ---------- expenses ----------
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select using (public.owns_vehicle(vehicle_id) or public.is_admin());

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert with check (public.owns_vehicle(vehicle_id));

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update using (public.owns_vehicle(vehicle_id));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete using (public.owns_vehicle(vehicle_id));

-- ---------- documents ----------
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (public.owns_vehicle(vehicle_id) or public.is_admin());

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents
  for insert with check (public.owns_vehicle(vehicle_id));

drop policy if exists "documents_update" on public.documents;
create policy "documents_update" on public.documents
  for update using (public.owns_vehicle(vehicle_id));

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents
  for delete using (public.owns_vehicle(vehicle_id));

-- ---------- reminders ----------
drop policy if exists "reminders_select" on public.reminders;
create policy "reminders_select" on public.reminders
  for select using (public.owns_vehicle(vehicle_id) or public.is_admin());

drop policy if exists "reminders_insert" on public.reminders;
create policy "reminders_insert" on public.reminders
  for insert with check (public.owns_vehicle(vehicle_id));

drop policy if exists "reminders_update" on public.reminders;
create policy "reminders_update" on public.reminders
  for update using (public.owns_vehicle(vehicle_id));

drop policy if exists "reminders_delete" on public.reminders;
create policy "reminders_delete" on public.reminders
  for delete using (public.owns_vehicle(vehicle_id));

-- ---------- notifications ----------
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- 12. STORAGE (imágenes de vehículos y documentos)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Política de carpetas: cada usuario guarda en su propia carpeta (auth.uid()).
drop policy if exists "vehicle_images_insert" on storage.objects;
create policy "vehicle_images_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vehicle_images_select" on storage.objects;
create policy "vehicle_images_select" on storage.objects
  for select using (bucket_id = 'vehicle-images');

drop policy if exists "vehicle_images_delete" on storage.objects;
create policy "vehicle_images_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_insert" on storage.objects;
create policy "documents_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_select" on storage.objects;
create policy "documents_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_delete" on storage.objects;
create policy "documents_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 13. GRANTS (permisos para la API REST / PostgREST)
--     Error típico sin esto: GET /rest/v1/<tabla> → 404
--     ("Could not find the table in the schema cache").
--     Las tablas creadas por SQL no reciben permisos automáticos;
--     PostgREST solo expone las que el rol puede usar. La RLS sigue
--     siendo la barrera real de datos.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Aplica también a tablas que ya existieran antes de este GRANT en
-- instalaciones parcheadas:
grant select on public.vehicle_types to anon, authenticated;
grant insert, update, delete on public.vehicle_types to authenticated;
