-- ============================================================
-- AutoCheck - FASE 3: Datos de prueba
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de Supabase
-- ============================================================

-- pgcrypto habilita crypt() y gen_salt() para las contraseñas.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Tipos de mantenimiento (catálogo)
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
  ('Reparación', 'Reparación puntual o correctiva', null, null),
  ('Otros', 'Otro mantenimiento no listado', null, null)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 1b. Tipos de vehículo / automotores (catálogo)
--    Ampliable desde el Panel de administración.
--    Lista exhaustiva cubriendo todos los tipos de vehículos y
--    automotores: particulares, flotas, carga, pasajeros, maquinaria,
--    industriales, recreativos y eléctricos.
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
-- 2. Usuarios de prueba (login directo con email y contraseña)
--    Contraseña de ambos: AutoCheck2024!
--    Alternativa: registrarlos desde la pantalla de la aplicación.
-- ------------------------------------------------------------
do $$
declare
  v_user_id uuid;
  v_vehicle_id uuid;
  v_type_aceite uuid;
  v_type_service uuid;
  v_type_frenos uuid;
begin
  -- Usuario normal -------------------------------------------------
  if not exists (select 1 from auth.users where email = 'usuario@test.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'usuario@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
      now(), '{"provider":"email","providers":["email"]}',
      '{"full_name":"Usuario de Prueba"}', now(), now(), '', '', '', ''
    );
  end if;

  -- Usuario administrador ------------------------------------------
  if not exists (select 1 from auth.users where email = 'admin@test.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'admin@test.com', crypt('AutoCheck2024!', gen_salt('bf', 10)),
      now(), '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrador AutoCheck"}', now(), now(), '', '', '', ''
    );
  end if;

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
  where u.email in ('usuario@test.com', 'admin@test.com')
    and not exists (select 1 from auth.identities i where i.user_id = u.id);

  -- Garantizar perfiles para los usuarios de prueba ---------------------
  -- Necesario si el usuario ya existía en auth.users pero la tabla
  -- profiles se recreó al volver a ejecutar schema.sql (el trigger
  -- handle_new_user solo crea el perfil cuando el usuario es NUEVO).
  insert into public.profiles (id, full_name, email, role)
  select
    u.id,
    coalesce(u.raw_user_meta_data ->> 'full_name', ''),
    coalesce(u.email, ''),
    'USER'
  from auth.users u
  where u.email in ('usuario@test.com', 'admin@test.com')
    and not exists (select 1 from public.profiles p where p.id = u.id);

  -- Asignar rol ADMIN ------------------------------------------------
  update public.profiles set role = 'ADMIN' where email = 'admin@test.com';

  select id into v_user_id from auth.users where email = 'usuario@test.com';

  -- ---------------------------------------------------------------
  -- 3. Vehículo de prueba (solo si aún no existe)
  -- ---------------------------------------------------------------
  if v_user_id is not null and not exists (
    select 1 from public.vehicles where user_id = v_user_id and license_plate = 'ABC123'
  ) then
    insert into public.vehicles
      (user_id, brand, model, year, license_plate, current_km, fuel_type, vehicle_type_id, unit_number, purchase_date)
    values
      (v_user_id, 'Toyota', 'Corolla', 2022, 'ABC123', 58450, 'Nafta',
       (select id from public.vehicle_types where name = 'Automóvil'), 'U-001', '2022-03-15');

    select id into v_vehicle_id from public.vehicles where user_id = v_user_id and license_plate = 'ABC123';

    select id into v_type_aceite from public.maintenance_types where name = 'Cambio de aceite';
    select id into v_type_service from public.maintenance_types where name = 'Service';
    select id into v_type_frenos from public.maintenance_types where name = 'Frenos';

    -- Mantenimientos -------------------------------------------------
    insert into public.maintenances
      (vehicle_id, maintenance_type_id, date, kilometers, description, cost, workshop, notes)
    values
      (v_vehicle_id, v_type_service, '2025-04-10'::date, 10000, 'Primer service', 45000, 'Toyota Concesionario', null),
      (v_vehicle_id, v_type_aceite, '2025-10-02'::date, 20000, 'Cambio de aceite sintético 5W30', 32000, 'Taller El Motor', null),
      (v_vehicle_id, v_type_frenos, '2026-02-18'::date, 35000, 'Cambio de pastillas delanteras', 48000, 'Frenos Express', 'Discos en buen estado'),
      (v_vehicle_id, v_type_aceite, '2026-06-25'::date, 48000, 'Cambio de aceite y filtro', 35500, 'Taller El Motor', null);

    -- Gastos ---------------------------------------------------------
    insert into public.expenses (vehicle_id, category, description, amount, date)
    values
      (v_vehicle_id, 'Combustible', 'Carga de nafta', 58000, '2026-09-05'),
      (v_vehicle_id, 'Combustible', 'Carga de nafta', 61000, '2026-09-20'),
      (v_vehicle_id, 'Seguro', 'Cuota mensual seguro todo riesgo', 42000, '2026-09-01'),
      (v_vehicle_id, 'Lavado', 'Lavado completo', 12000, '2026-08-14'),
      (v_vehicle_id, 'Impuestos', 'Patente semestral', 95000, '2026-07-02'),
      (v_vehicle_id, 'Combustible', 'Carga de nafta', 55000, '2026-10-01');

    -- Documentos -----------------------------------------------------
    insert into public.documents (vehicle_id, type, expiration_date, notes)
    values
      (v_vehicle_id, 'Seguro', '2026-11-30', 'Seguro todo riesgo - Cooperativa'),
      (v_vehicle_id, 'VTV/RTO', '2026-10-20', 'Revisión técnica anual'),
      (v_vehicle_id, 'Patente', null, 'Patente al día');

    -- Recordatorios ---------------------------------------------------
    insert into public.reminders (vehicle_id, title, description, reminder_date, reminder_km, status)
    values
      (v_vehicle_id, 'Próximo cambio de aceite', 'Alcanzar 58.000 km o fecha límite', '2026-12-01', 58000, 'pendiente'),
      (v_vehicle_id, 'Renovar seguro', 'Vencimiento de la póliza', '2026-11-30', null, 'pendiente'),
      (v_vehicle_id, 'Rotar neumáticos', null, null, 60000, 'pendiente');

    -- Notificaciones ---------------------------------------------------
    insert into public.notifications (user_id, title, message, type)
    values
      (v_user_id, 'VTV por vencer', 'Tu VTV vence en pocos días. Agendá el turno.', 'vencimiento'),
      (v_user_id, 'Mantenimiento próximo', 'Tu vehículo está próximo al cambio de aceite.', 'mantenimiento');
  end if;
end $$;
