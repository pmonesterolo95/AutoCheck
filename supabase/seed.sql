-- ============================================================
-- AutoCheck - Seed ÚNICO: limpia toda la demo y la regenera
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de Supabase.
-- Se puede correr cuantas veces se quiera: siempre deja la
-- misma base demo (borra primero, inserta después).
--
-- Cuentas demo (contraseña de todas: AutoCheck2024!):
--   usuario@test.com -> particular con 1 auto
--   admin@test.com   -> administrador (rol ADMIN)
--   flota@test.com   -> Logística del Sur (5 unidades con alertas)
--   familia@test.com -> particular (auto + moto al día)
--
-- Las fechas de la flota/familia son relativas a CURRENT_DATE
-- para que vencidos / próximos / timeline se vean siempre bien.
-- ============================================================

-- pgcrypto habilita crypt() y gen_salt() para las contraseñas.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 0. LIMPIEZA: borra toda la data demo y los catálogos.
--    Los `on delete cascade` (auth.users -> profiles -> vehicles
--    -> mantenimientos/gastos/documentos/recordatorios/fuel_logs
--    y notificaciones) arrastran todo lo dependiente.
-- ------------------------------------------------------------
delete from auth.users
where email in ('usuario@test.com', 'admin@test.com', 'flota@test.com', 'familia@test.com');

delete from public.maintenance_types;
delete from public.vehicle_types;

-- ------------------------------------------------------------
-- 1. Tipos de mantenimiento (catálogo global, ampliable en Admin)
-- ------------------------------------------------------------
insert into public.maintenance_types (name, description, recommended_km, recommended_months)
values
  ('Cambio de aceite', 'Reemplazo de aceite y filtro de aceite', 10000, 6),
  ('Filtros', 'Filtro de aire, combustible y habitáculo', 20000, 12),
  ('Frenos', 'Pastillas, discos y líquido de frenos', 40000, 24),
  ('Neumáticos', 'Rotación, cambio o reparación de neumáticos', 30000, 24),
  ('Batería', 'Control y reemplazo de batería', null, 36),
  ('Distribución', 'Correa/cadena de distribución y tensor', 80000, 48),
  ('Service', 'Service oficial o revisión general', 10000, 12),
  ('Alineación y balanceo', 'Alineación de dirección y balanceo de ruedas', 15000, 12),
  ('Tren delantero', 'Amortiguadores, bujes, parrillas y extremos', 40000, 24),
  ('Embrague', 'Placa, disco, crapodina y volante', 90000, 48),
  ('Reparación', 'Reparación puntual o correctiva', null, null),
  ('Otros', 'Otro mantenimiento no listado', null, null)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 1b. Tipos de vehículo / automotores (catálogo global)
-- ------------------------------------------------------------
insert into public.vehicle_types (name, icon, description)
values
  -- Autos y livianos -------------------------------------------
  ('Automóvil', '🚗', 'Auto de uso particular o corporativo'),
  ('Auto deportivo', '🏎️', 'Deportivo, coupé o de alta performance'),
  ('SUV / 4x4', '🚙', 'SUV, todoterreno o 4x4 de uso mixto'),
  ('Camioneta', '🛻', 'Pickup o SUV de carga liviana'),
  ('Utilitario / Furgón', '🚐', 'Furgón, van o utilitario de reparto'),
  ('Minivan / Monovolumen', '🚐', 'Minivan o monovolumen de pasajeros'),
  -- Dos ruedas y cuatriciclos -------------------------------
  ('Motocicleta', '🏍️', 'Moto de calle o ruta'),
  ('Moto deportiva', '🏍️', 'Moto deportiva o de alta cilindrada'),
  ('Moto todoterreno', '🏍️', 'Moto enduro, cross o trail'),
  ('Scooter', '🛵', 'Scooter o moto de baja cilindrada'),
  ('Ciclomotor', '🛵', 'Ciclomotor de 50cc para ciudad'),
  ('Cuatriciclo / UTV', '🛵', 'ATV, cuatriciclo o side-by-side'),
  ('Triciclo', '🛺', 'Triciclo motorizado de pasajeros o carga'),
  -- Carga pesada -----------------------------------------------
  ('Camión', '🚚', 'Camión de carga pesada o media'),
  ('Camión articulado', '🚛', 'Camión tractor con semirremolque'),
  ('Semirremolque / Tráiler', '🚛', 'Semirremolque o tráiler de carga'),
  ('Remolque / Acoplado', '🚛', 'Remolque, acoplado o semirremolque'),
  -- Transporte de pasajeros y servicios ---------------------
  ('Colectivo / Ómnibus', '🚌', 'Transporte de pasajeros urbano o interurbano'),
  ('Micro / Minibús', '🚌', 'Micro, minibús o transporte escolar'),
  ('Ambulancia', '🚑', 'Ambulancia o móvil sanitario'),
  ('Vehículo de emergencia', '🚒', 'Bomberos, defensa civil u otro móvil de emergencia'),
  ('Móvil policial / Seguridad', '🚓', 'Patrulla o móvil de seguridad'),
  -- Agro --------------------------------------------------------
  ('Maquinaria agrícola', '🚜', 'Tractor, cosechadora o implemento agrícola'),
  ('Tractor agrícola', '🚜', 'Tractor de labranza o tiro'),
  ('Cosechadora', '🌾', 'Cosechadora de granos o forraje'),
  ('Pulverizadora', '🌱', 'Pulverizadora autopropulsada'),
  ('Sembradora', '🌱', 'Sembradora o implemento de siembra'),
  -- Construcción / vial --------------------------------------
  ('Maquinaria pesada', '🏗️', 'Excavadora, retroexcavadora u obra'),
  ('Excavadora', '🏗️', 'Excavadora o retroexcavadora'),
  ('Cargadora', '🏗️', 'Cargadora frontal o pala mecánica'),
  ('Topadora', '🚜', 'Topadora o bulldozer de obra'),
  ('Motoniveladora', '🏗️', 'Motoniveladora o niveladora de caminos'),
  ('Compactadora / Rodillo', '🏗️', 'Compactadora o rodillo de asfalto'),
  ('Grúa / Hidrogrúa', '🏗️', 'Grúa, hidrogrúa o camión grúa'),
  ('Mixer / Hormigonera', '🚚', 'Camión mixer u hormigonera'),
  -- Industrial / especial ------------------------------------
  ('Autoelevador / Montacargas', '🏭', 'Autoelevador o montacargas industrial'),
  ('Manipulador telescópico', '🏗️', 'Manipulador telescópico o telescópica'),
  ('Motonieve', '🎿', 'Motonieve u otro vehículo sobre nieve'),
  -- Micromovilidad / eléctrico / recreativo -----------------
  ('Bicicleta', '🚲', 'Bicicleta de calle o montaña'),
  ('Bicicleta / Eléctrico liviano', '🚲', 'Bicicleta, monopatín o vehículo eléctrico liviano'),
  ('Bicicleta eléctrica', '🚲', 'E-bike o bicicleta de pedaleo asistido'),
  ('Monopatín eléctrico', '🛴', 'Monopatín o scooter eléctrico de movilidad urbana'),
  ('Carro de golf / Eléctrico', '⛳', 'Carro de golf o vehículo eléctrico de paseo'),
  ('Vehículo eléctrico liviano', '⚡', 'Otro vehículo eléctrico de movilidad'),
  ('Moto náutica / Jet ski', '🚤', 'Moto náutica o jet ski'),
  -- Categoría residual ----------------------------------------
  ('Otros', '🔧', 'Otro tipo de automotor')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 2. Usuarios + vehículos + movimientos (todo en un bloque)
-- ------------------------------------------------------------
do $$
declare
  v_usuario_id uuid;
  v_admin_id uuid;
  v_flota_id uuid;
  v_fami_id uuid;
  v_u1 uuid; v_v1 uuid; v_v2 uuid; v_v3 uuid; v_v4 uuid; v_v5 uuid;
  v_f1 uuid; v_f2 uuid;
  t_aceite uuid; t_filtros uuid; t_frenos uuid; t_neum uuid;
  t_bateria uuid; t_distri uuid; t_service uuid; t_repar uuid;
  t_alin uuid; t_tren uuid; t_embra uuid;
  vt_util uuid; vt_camioneta uuid; vt_moto uuid; vt_camion uuid;
  vt_acoplado uuid; vt_auto uuid;
begin
  -- ============ Usuarios ============
  -- (la limpieza del inicio garantiza que no existen)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    recovery_token, email_change, email_change_token_new
  ) values
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
     'usuario@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Usuario de Prueba"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
     'admin@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Administrador AutoCheck"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
     'flota@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Logística del Sur"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
     'familia@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Lucía Fernández"}', now(), now(), '', '', '', '');

  -- Identidades requeridas por GoTrue (sin ellas el login da error 500)
  insert into auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  select gen_random_uuid(), u.id, 'email', u.id::text,
         jsonb_build_object(
           'sub', u.id::text,
           'email', u.email,
           'full_name', coalesce(u.raw_user_meta_data ->> 'full_name', ''),
           'email_verified', true,
           'phone_verified', false
         ),
         now(), now()
  from auth.users u
  where u.email in ('usuario@test.com', 'admin@test.com', 'flota@test.com', 'familia@test.com');

  -- Perfiles (el trigger handle_new_user ya los creó; esto es resguardo)
  insert into public.profiles (id, full_name, email, role)
  select u.id,
         coalesce(u.raw_user_meta_data ->> 'full_name', ''),
         coalesce(u.email, ''),
         'USER'
  from auth.users u
  where u.email in ('usuario@test.com', 'admin@test.com', 'flota@test.com', 'familia@test.com')
  on conflict (id) do nothing;

  update public.profiles set role = 'ADMIN' where email = 'admin@test.com';

  select id into v_usuario_id from auth.users where email = 'usuario@test.com';
  select id into v_admin_id from auth.users where email = 'admin@test.com';
  select id into v_flota_id from auth.users where email = 'flota@test.com';
  select id into v_fami_id from auth.users where email = 'familia@test.com';

  -- ============ Ids de catálogos ============
  select id into t_aceite  from public.maintenance_types where name = 'Cambio de aceite';
  select id into t_filtros from public.maintenance_types where name = 'Filtros';
  select id into t_frenos  from public.maintenance_types where name = 'Frenos';
  select id into t_neum    from public.maintenance_types where name = 'Neumáticos';
  select id into t_bateria from public.maintenance_types where name = 'Batería';
  select id into t_distri  from public.maintenance_types where name = 'Distribución';
  select id into t_service from public.maintenance_types where name = 'Service';
  select id into t_repar   from public.maintenance_types where name = 'Reparación';
  select id into t_alin    from public.maintenance_types where name = 'Alineación y balanceo';
  select id into t_tren    from public.maintenance_types where name = 'Tren delantero';
  select id into t_embra   from public.maintenance_types where name = 'Embrague';

  select id into vt_util      from public.vehicle_types where name = 'Utilitario / Furgón';
  select id into vt_camioneta from public.vehicle_types where name = 'Camioneta';
  select id into vt_moto      from public.vehicle_types where name = 'Motocicleta';
  select id into vt_camion    from public.vehicle_types where name = 'Camión';
  select id into vt_acoplado  from public.vehicle_types where name = 'Remolque / Acoplado';
  select id into vt_auto      from public.vehicle_types where name = 'Automóvil';

  -- ============================================================
  -- 3. PARTICULAR BASE: Corolla ABC123
  -- ============================================================
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_usuario_id, 'Toyota', 'Corolla', 2022, 'ABC123', 58450, 'Nafta', vt_auto, 'U-001', '2022-03-15')
  returning id into v_u1;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_u1, t_service, '2025-04-10'::date, 10000, 'Primer service', 45000, 'Toyota Concesionario', null),
    (v_u1, t_aceite, '2025-10-02'::date, 20000, 'Cambio de aceite sintético 5W30', 32000, 'Taller El Motor', null),
    (v_u1, t_frenos, '2026-02-18'::date, 35000, 'Cambio de pastillas delanteras', 48000, 'Frenos Express', 'Discos en buen estado'),
    (v_u1, t_aceite, '2026-06-25'::date, 48000, 'Cambio de aceite y filtro', 35500, 'Taller El Motor', null);

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_u1, 'Combustible', 'Carga de nafta', 58000, '2026-09-05'),
    (v_u1, 'Combustible', 'Carga de nafta', 61000, '2026-09-20'),
    (v_u1, 'Seguro', 'Cuota mensual seguro todo riesgo', 42000, '2026-09-01'),
    (v_u1, 'Lavado', 'Lavado completo', 12000, '2026-08-14'),
    (v_u1, 'Impuestos', 'Patente semestral', 95000, '2026-07-02'),
    (v_u1, 'Combustible', 'Carga de nafta', 55000, '2026-10-01');

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_u1, 'Seguro', '2026-11-30', 'Seguro todo riesgo - Cooperativa'),
    (v_u1, 'VTV/RTO', '2026-10-20', 'Revisión técnica anual'),
    (v_u1, 'Patente', null, 'Patente al día');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_u1, 'Próximo cambio de aceite', 'Alcanzar 58.000 km o fecha límite', '2026-12-01', 58000, 'pendiente'),
    (v_u1, 'Renovar seguro', 'Vencimiento de la póliza', '2026-11-30', null, 'pendiente'),
    (v_u1, 'Rotar neumáticos', null, null, 60000, 'pendiente');

  insert into public.notifications (user_id, title, message, type)
  values
    (v_usuario_id, 'VTV por vencer', 'Tu VTV vence en pocos días. Agendá el turno.', 'vencimiento'),
    (v_usuario_id, 'Mantenimiento próximo', 'Tu vehículo está próximo al cambio de aceite.', 'mantenimiento');

  -- ============================================================
  -- 4. FLOTA: Logística del Sur (5 unidades, estados mezclados)
  -- ============================================================

  -- ---- V1: Sprinter U-001 (VENCIDA: aceite pasado por km y fecha) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_flota_id, 'Mercedes-Benz', 'Sprinter 515', 2021, 'AE452KX', 128400, 'Diésel', vt_util, 'U-001', '2021-06-10')
  returning id into v_v1;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_v1, t_service, CURRENT_DATE - 320, 98400, 'Service 100.000 km', 185000, 'Concesionario MB', null),
    (v_v1, t_frenos, CURRENT_DATE - 200, 108300, 'Pastillas y discos delanteros', 210000, 'Frenos Express', null),
    (v_v1, t_aceite, CURRENT_DATE - 215, 118200, 'Aceite 10W40 + filtros', 95000, 'Lubricentro Ruta 9', 'VENCIDO a propósito para demo'),
    (v_v1, t_embra, CURRENT_DATE - 90, 124800, 'Reparación embrague', 480000, 'Taller El Motor', 'Garantía 6 meses');

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_v1, 'Combustible', 'Carga diésel infinia', 142000, CURRENT_DATE - 4),
    (v_v1, 'Combustible', 'Carga diésel', 138500, CURRENT_DATE - 12),
    (v_v1, 'Combustible', 'Carga diésel', 141000, CURRENT_DATE - 26),
    (v_v1, 'Peajes', 'Peajes ruta a Córdoba (ida y vuelta)', 38500, CURRENT_DATE - 9),
    (v_v1, 'Peajes', 'Peajes urbanos del mes', 22400, CURRENT_DATE - 40),
    (v_v1, 'Seguro', 'Cuota seguro flota', 98000, CURRENT_DATE - 6),
    (v_v1, 'Reparación', 'Embrague completo', 480000, CURRENT_DATE - 90),
    (v_v1, 'Lavado', 'Lavado de furgón', 18000, CURRENT_DATE - 20),
    (v_v1, 'Impuestos', 'Patente 4ta cuota', 87000, CURRENT_DATE - 65);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_v1, 'Seguro', CURRENT_DATE + 45, 'Póliza flota - San Cristóbal'),
    (v_v1, 'VTV/RTO', CURRENT_DATE + 12, 'RTO carga vigente'),
    (v_v1, 'Patente', null, 'Al día');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_v1, 'Próximo service: Cambio de aceite', 'VENCIDO: pasó los 128.200 km', CURRENT_DATE - 20, 128200, 'pendiente'),
    (v_v1, 'RTO carga', 'Turno revisión técnica', CURRENT_DATE + 12, null, 'pendiente'),
    (v_v1, 'Rotación de neumáticos', null, null, 130000, 'pendiente'),
    (v_v1, 'Cambio de correa poli-V', 'Hecho en service de marzo', CURRENT_DATE - 60, null, 'completado');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_v1, CURRENT_DATE - 70, 121800, 85, 123250, true, 'YPF', null),
    (v_v1, CURRENT_DATE - 55, 122600, 105, 152250, true, 'Shell', null),
    (v_v1, CURRENT_DATE - 40, 123450, 112, 162400, true, 'Axion', null),
    (v_v1, CURRENT_DATE - 33, 124100, 40, 58000, false, 'YPF', 'Carga parcial en ruta'),
    (v_v1, CURRENT_DATE - 26, 124300, 110, 159500, true, 'YPF', null),
    (v_v1, CURRENT_DATE - 12, 125150, 108, 156600, true, 'Shell', null),
    (v_v1, CURRENT_DATE - 4, 126000, 105, 152250, true, 'Axion', null);

  -- ---- V2: Hilux U-002 (PRÓXIMA: aceite al límite, última carga mala) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_flota_id, 'Toyota', 'Hilux DX', 2022, 'AD318QP', 96500, 'Diésel', vt_camioneta, 'U-002', '2022-09-01')
  returning id into v_v2;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_v2, t_neum, CURRENT_DATE - 150, 80000, '2 neumáticos traseros', 320000, 'Neumáticos del Sur', null),
    (v_v2, t_service, CURRENT_DATE - 130, 87500, 'Service 87.500 km', 165000, 'Toyota Concesionario', null),
    (v_v2, t_aceite, CURRENT_DATE - 130, 87500, 'Aceite 5W30 + filtro', 88000, 'Lubricentro Ruta 9', null),
    (v_v2, t_alin, CURRENT_DATE - 130, 87500, 'Alineación y balanceo', 45000, 'Lubricentro Ruta 9', null);

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_v2, 'Combustible', 'Carga diésel', 98000, CURRENT_DATE - 3),
    (v_v2, 'Combustible', 'Carga diésel', 102000, CURRENT_DATE - 17),
    (v_v2, 'Seguro', 'Cuota seguro flota', 76000, CURRENT_DATE - 6),
    (v_v2, 'Peajes', 'Peajes del mes', 15600, CURRENT_DATE - 25),
    (v_v2, 'Estacionamiento', 'Cochera mensual', 65000, CURRENT_DATE - 2);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_v2, 'Seguro', CURRENT_DATE + 45, 'Póliza flota'),
    (v_v2, 'VTV/RTO', CURRENT_DATE + 120, 'Vigente'),
    (v_v2, 'Cédula de identificación', null, 'En guantera U-002');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_v2, 'Próximo service: Cambio de aceite', 'A los 97.500 km', null, 97500, 'pendiente'),
    (v_v2, 'VTV anual', 'Sacar turno con 30 días', CURRENT_DATE + 90, null, 'pendiente');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_v2, CURRENT_DATE - 60, 91000, 78, 113100, true, 'Shell', null),
    (v_v2, CURRENT_DATE - 45, 91750, 78, 113100, true, 'YPF', null),
    (v_v2, CURRENT_DATE - 30, 92500, 80, 116000, true, 'Axion', null),
    (v_v2, CURRENT_DATE - 15, 93250, 77, 111650, true, 'Shell', null),
    (v_v2, CURRENT_DATE - 3, 94000, 98, 142100, true, 'YPF', 'Rindió poco: revisar presión de neumáticos');

  -- ---- V3: Moto XR150 mensajería (AL DÍA) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_flota_id, 'Honda', 'XR 150L', 2023, 'A182BCD', 18400, 'Nafta', vt_moto, 'U-010', '2023-05-20')
  returning id into v_v3;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_v3, t_service, CURRENT_DATE - 100, 12000, 'Service 12.000 km', 42000, 'Moto Service', null),
    (v_v3, t_aceite, CURRENT_DATE - 55, 15000, 'Aceite mineral 20W50', 18000, 'Moto Service', null),
    (v_v3, t_tren, CURRENT_DATE - 55, 15000, 'Ajuste tren delantero', 25000, 'Moto Service', null);

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_v3, 'Combustible', 'Nafta súper', 12500, CURRENT_DATE - 2),
    (v_v3, 'Combustible', 'Nafta súper', 11800, CURRENT_DATE - 10),
    (v_v3, 'Seguro', 'Seguro moto mensual', 14500, CURRENT_DATE - 6),
    (v_v3, 'Reparación', 'Transmisión completa', 38000, CURRENT_DATE - 55);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_v3, 'Seguro', CURRENT_DATE + 200, 'Responsabilidad civil + robo'),
    (v_v3, 'Patente', CURRENT_DATE + 75, 'Al día');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_v3, 'Próximo service: Cambio de aceite', 'A los 25.000 km', null, 25000, 'pendiente');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_v3, CURRENT_DATE - 50, 16200, 8.5, 11050, true, 'YPF', null),
    (v_v3, CURRENT_DATE - 35, 16550, 9.0, 11700, true, 'Shell', null),
    (v_v3, CURRENT_DATE - 20, 16900, 8.8, 11440, true, 'YPF', null),
    (v_v3, CURRENT_DATE - 6, 17250, 9.2, 11960, true, 'Axion', null);

  -- ---- V4: Iveco Daily U-003 (service al día, SEGURO VENCIDO) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_flota_id, 'Iveco', 'Daily 55C16', 2020, 'AE781LM', 201300, 'Diésel', vt_camion, 'U-003', '2020-11-12')
  returning id into v_v4;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_v4, t_service, CURRENT_DATE - 100, 192000, 'Service 192.000 km', 240000, 'Iveco Oficial', null),
    (v_v4, t_frenos, CURRENT_DATE - 100, 192000, 'Frenos traseros completos', 310000, 'Frenos Express', null),
    (v_v4, t_aceite, CURRENT_DATE - 25, 196000, 'Aceite + todos los filtros', 132000, 'Lubricentro Ruta 9', null),
    (v_v4, t_bateria, CURRENT_DATE - 25, 196000, 'Batería 180Ah nueva', 185000, 'Lubricentro Ruta 9', null);

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_v4, 'Combustible', 'Carga diésel', 175000, CURRENT_DATE - 5),
    (v_v4, 'Combustible', 'Carga diésel', 169000, CURRENT_DATE - 15),
    (v_v4, 'Seguro', 'Cuota seguro flota', 121000, CURRENT_DATE - 35),
    (v_v4, 'Peajes', 'Peajes autopista', 48200, CURRENT_DATE - 11),
    (v_v4, 'Impuestos', 'Patente 4ta cuota', 112000, CURRENT_DATE - 65);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_v4, 'Seguro', CURRENT_DATE - 20, 'VENCIDO: renovar urgente'),
    (v_v4, 'VTV/RTO', CURRENT_DATE + 200, 'RTO vigente'),
    (v_v4, 'Patente', null, 'Al día');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_v4, 'Renovar seguro YA', 'Póliza vencida hace 20 días', CURRENT_DATE - 20, null, 'pendiente'),
    (v_v4, 'Próximo service: Cambio de aceite', 'A los 206.000 km', null, 206000, 'pendiente');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_v4, CURRENT_DATE - 55, 197800, 220, 319000, true, 'YPF', null),
    (v_v4, CURRENT_DATE - 40, 198900, 225, 326250, true, 'Axion', null),
    (v_v4, CURRENT_DATE - 25, 200000, 215, 311750, true, 'Shell', null),
    (v_v4, CURRENT_DATE - 8, 201100, 220, 319000, true, 'YPF', null);

  -- ---- V5: Acoplado U-005 (sin patente, datos mínimos) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_flota_id, 'Hermann', 'Acoplado 14m', 2019, '', 0, 'Diésel', vt_acoplado, 'U-005', '2019-08-01')
  returning id into v_v5;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_v5, t_neum, CURRENT_DATE - 170, 0, 'Recapado 4 neumáticos', 260000, 'Neumáticos del Sur', 'Sin odómetro: se registra por fecha');

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_v5, 'Reparación', 'Recapado neumáticos', 260000, CURRENT_DATE - 170),
    (v_v5, 'Otros', 'Revisión frenos de aire', 45000, CURRENT_DATE - 40);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_v5, 'VTV/RTO', CURRENT_DATE + 60, 'RTO acoplado'),
    (v_v5, 'Patente', null, 'Exento por uso interno');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_v5, 'RTO acoplado', 'Turno revisión', CURRENT_DATE + 60, null, 'pendiente');

  -- ---- Notificaciones de la flota (bandeja con contenido) ----
  insert into public.notifications (user_id, title, message, type, is_read)
  values
    (v_flota_id, 'Mantenimiento vencido: Sprinter U-001', 'Cambio de aceite pasado por km y fecha.', 'mantenimiento', false),
    (v_flota_id, 'Documento vencido: Seguro', 'Iveco Daily U-003: póliza vencida hace 20 días.', 'vencimiento', false),
    (v_flota_id, 'Mantenimiento próximo: Hilux U-002', 'Cambio de aceite al límite de kilometraje.', 'mantenimiento', false),
    (v_flota_id, 'Resumen semanal', '5 unidades controladas: 1 vencida, 1 próxima, 3 al día.', 'info', true);

  -- ============================================================
  -- 5. PARTICULAR: Lucía (auto + moto, todo bajo control)
  -- ============================================================

  -- ---- F1: Peugeot 208 (PRÓXIMO por fecha: filtros) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_fami_id, 'Peugeot', '208 Active', 2023, 'AF203ZZ', 31200, 'Nafta', vt_auto, null, '2023-07-05')
  returning id into v_f1;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_f1, t_service, CURRENT_DATE - 30, 29800, 'Service 30.000 km', 110000, 'Peugeot Oficial', null),
    (v_f1, t_aceite, CURRENT_DATE - 60, 27000, 'Aceite 0W20 + filtro', 62000, 'Lubricentro Centro', null),
    (v_f1, t_filtros, CURRENT_DATE - 355, 20000, 'Filtros aire + habitáculo (hace 11 meses y medio)', 28000, 'Lubricentro Centro', null),
    (v_f1, t_bateria, CURRENT_DATE - 40, 29800, 'Control de batería', 0, 'Lubricentro Centro', 'Carga OK');

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_f1, 'Combustible', 'Nafta súper', 48000, CURRENT_DATE - 3),
    (v_f1, 'Combustible', 'Nafta súper', 46500, CURRENT_DATE - 14),
    (v_f1, 'Combustible', 'Nafta súper', 47200, CURRENT_DATE - 28),
    (v_f1, 'Seguro', 'Seguro terceros completo', 54000, CURRENT_DATE - 5),
    (v_f1, 'Lavado', 'Lavado premium', 15000, CURRENT_DATE - 18),
    (v_f1, 'Estacionamiento', 'Cochera mensual', 58000, CURRENT_DATE - 2),
    (v_f1, 'Impuestos', 'Patente 4ta cuota', 62000, CURRENT_DATE - 65);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_f1, 'Seguro', CURRENT_DATE + 25, 'Terceros completo - La Caja'),
    (v_f1, 'VTV/RTO', CURRENT_DATE + 320, 'Vigente'),
    (v_f1, 'Patente', null, 'Al día'),
    (v_f1, 'Cédula de identificación', null, 'Titular');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_f1, 'Próximo service: Filtros', 'Se cumplen 12 meses', CURRENT_DATE + 10, null, 'pendiente'),
    (v_f1, 'Renovar seguro', 'Vence la póliza', CURRENT_DATE + 25, null, 'pendiente'),
    (v_f1, 'Próximo service: Cambio de aceite', 'A los 40.000 km', null, 40000, 'pendiente');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_f1, CURRENT_DATE - 55, 28900, 38, 47800, true, 'Shell', null),
    (v_f1, CURRENT_DATE - 40, 29400, 37, 46550, true, 'YPF', null),
    (v_f1, CURRENT_DATE - 25, 29900, 38, 47800, true, 'Axion', null),
    (v_f1, CURRENT_DATE - 10, 30400, 36, 45300, true, 'Shell', null),
    (v_f1, CURRENT_DATE - 2, 30900, 37, 46550, true, 'YPF', null);

  -- ---- F2: Zanella ZB110 (AL DÍA, historial corto) ----
  insert into public.vehicles
    (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
  values
    (v_fami_id, 'Zanella', 'ZB 110', 2021, 'A094HJK', 12800, 'Nafta', vt_moto, null, '2021-12-18')
  returning id into v_f2;

  insert into public.maintenances
    (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
  values
    (v_f2, t_service, CURRENT_DATE - 250, 6000, 'Service 6.000 km', 28000, 'Moto Service', null),
    (v_f2, t_aceite, CURRENT_DATE - 80, 9000, 'Aceite mineral 20W50', 14000, 'Moto Service', null);

  insert into public.expenses (vehicle_id, category, description, amount, date)
  values
    (v_f2, 'Combustible', 'Nafta súper', 8200, CURRENT_DATE - 4),
    (v_f2, 'Combustible', 'Nafta súper', 7900, CURRENT_DATE - 16),
    (v_f2, 'Seguro', 'Seguro moto mensual', 9800, CURRENT_DATE - 6);

  insert into public.documents (vehicle_id, type, expiration_date, notes)
  values
    (v_f2, 'Seguro', CURRENT_DATE + 150, 'Responsabilidad civil'),
    (v_f2, 'Patente', CURRENT_DATE + 100, 'Al día');

  insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
  values
    (v_f2, 'Próximo service: Cambio de aceite', 'A los 19.000 km', null, 19000, 'pendiente');

  insert into public.fuel_logs (vehicle_id, date, kilometers, liters, amount, full_tank, station, notes)
  values
    (v_f2, CURRENT_DATE - 45, 11900, 3.4, 4420, true, 'YPF', null),
    (v_f2, CURRENT_DATE - 30, 12050, 3.6, 4680, true, 'Shell', null),
    (v_f2, CURRENT_DATE - 15, 12200, 3.5, 4550, true, 'YPF', null),
    (v_f2, CURRENT_DATE - 3, 12350, 3.6, 4680, true, 'Axion', null);

  -- ---- Notificación de bienvenida particular ----
  insert into public.notifications (user_id, title, message, type, is_read)
  values
    (v_fami_id, 'Mantenimiento próximo: Peugeot 208', 'Filtros: se cumplen 12 meses en 10 días.', 'mantenimiento', false),
    (v_fami_id, 'Bienvenida a AutoCheck', 'Cargá tu primer service y activá las alertas.', 'info', true);
end $$;

-- ------------------------------------------------------------
-- Resumen de lo creado (para verificar en el SQL Editor)
-- ------------------------------------------------------------
select 'usuarios_demo' as lote, count(*) as n from auth.users where email in ('usuario@test.com', 'admin@test.com', 'flota@test.com', 'familia@test.com')
union all
select 'vehiculos', count(*) as n from public.vehicles
union all
select 'mantenimientos', count(*) as n from public.maintenances
union all
select 'gastos', count(*) as n from public.expenses
union all
select 'documentos', count(*) as n from public.documents
union all
select 'recordatorios', count(*) as n from public.reminders
union all
select 'cargas_combustible', count(*) as n from public.fuel_logs
union all
select 'notificaciones', count(*) as n from public.notifications;
