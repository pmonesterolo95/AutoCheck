-- ============================================================
-- AutoCheck - Migración: cargas de combustible (fuel_logs)
-- Ejecutar UNA VEZ en Supabase Dashboard -> SQL Editor.
-- Idempotente: se puede correr varias veces sin romper nada.
-- Sin esto, la pantalla de Combustible muestra un aviso y no falla.
-- ============================================================

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  kilometers int not null check (kilometers >= 0),
  liters numeric(10, 2) not null check (liters > 0),
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  full_tank boolean not null default true,
  station text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fuel_vehicle_date
  on public.fuel_logs (vehicle_id, date desc, kilometers desc);

alter table public.fuel_logs enable row level security;

drop policy if exists "fuel_select" on public.fuel_logs;
create policy "fuel_select" on public.fuel_logs
  for select using (public.owns_vehicle(vehicle_id) or public.is_admin());

drop policy if exists "fuel_insert" on public.fuel_logs;
create policy "fuel_insert" on public.fuel_logs
  for insert with check (public.owns_vehicle(vehicle_id));

drop policy if exists "fuel_update" on public.fuel_logs;
create policy "fuel_update" on public.fuel_logs
  for update using (public.owns_vehicle(vehicle_id));

drop policy if exists "fuel_delete" on public.fuel_logs;
create policy "fuel_delete" on public.fuel_logs
  for delete using (public.owns_vehicle(vehicle_id));

grant select, insert, update, delete on public.fuel_logs to authenticated;
