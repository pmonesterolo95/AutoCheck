# AutoCheck — Contexto completo del sistema

> Documento de **handoff a otro orquestador**: describe el stack, la arquitectura, la estructura del repo, el modelo de datos, la seguridad y el setup. Para el detalle del negocio leer [`NEGOCIO.md`](./NEGOCIO.md) y para el detalle por módulo [`MODULOS.md`](./MODULOS.md).

## 1. Resumen

AutoCheck es una **SPA (single-page app) en Angular 20** que consume **Supabase** (PostgreSQL + Auth + Storage + Row Level Security) como backend. No existe backend propio: las reglas de acceso viven en las políticas RLS de la base de datos.

- **Frontend**: Angular 20, **standalone components**, **signals**, Reactive Forms, Charts.js, SCSS con sistema de diseño propio.
- **Backend**: Supabase — Auth (email/password), PostgreSQL, Storage (2 buckets), RLS.
- **Idioma**: español rioplatense (es-AR). Valores monetarios formateados con `toLocaleString('es-AR')`.

## 2. Stack y versiones

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 22.x (rama 22; se usa 22.12.0) |
| Framework | Angular | 20 (standalone) |
| Charts | `ng2-charts` / Charts.js | según `package.json` |
| Estilos | SCSS (variables CSS, componentes, responsive) | — |
| Backend/Datos | Supabase (Auth, PostgreSQL 15+, Storage, RLS) | — |

## 3. Arquitectura

```
Browser ──► Angular SPA (nestjs of routing, signals, standalone)
               │  supabase-js (anon key, sesión en localStorage)
               ▼
        Supabase
          ├─ Auth (email/password, recuperación)
          ├─ PostgreSQL (tablas, funciones, triggers)
          ├─ Storage (buckets vehicle-images [público] y documents [privado])
          └─ RLS (reglas de acceso por fila)
```

- Toda consulta de datos pasa por `supabase/` client (`src/app/core/config/supabase.client.ts`).
- El frontend usa únicamente la **anon key pública**; nunca el service_role key.
- Los servicios core mantienen estado en **signals** (p.ej. `vehiclesService.vehicles()`), obtenido de la sesión del usuario autenticado.

## 4. Estructura del repositorio

```
AutoCheck/
  .angular/                  # caché del CLI (no versionar)
  docs/                      # NEGOCIO.md, SISTEMA.md, MODULOS.md
  src/
    app/
      app.routes.ts          # rutas raíz + guards
      app.config.ts          # providers (Supabase, Charts, etc.)
      core/
        config/              # supabase.client.ts (URL + anon key)
        guards/              # authGuard, noAuthGuard, roleGuard
        models/              # interfaces (vehicle, vehicle-type, maintenance, expense, document, reminder, enums)
        services/            # auth, vehicles, vehicle-types, maintenances, maintenance-types,
                             # expenses, documents, reminders, notifications, ai
      shared/
        layout/              # app-layout (*, sidebar, header)
        components/          # status-badge, confirm-dialog, logo
        forms/validators.ts  # validadores compartidos
        utils/               # maintenance-status.ts (estados 🟢/🟡/🔴)
      features/              # cada módulo: auth, landing, dashboard, vehicles, maintenance,
                             # expenses, documents, reminders, ai, profile, admin
    environments/            # environment.ts (Supabase URL + anon key)
  supabase/
    schema.sql               # DDL, funciones, triggers, RLS, Storage
    seed.sql                 # catálogos + usuarios demo + datos de ejemplo
  angular.json, package.json, tsconfig*.json, styles.scss
```

## 5. Modelo de datos (PostgreSQL)

### Tablas

| Tabla | Propósito | Columnas principales |
|---|---|---|
| `profiles` | Perfil por usuario (rol USER/ADMIN) | `id` → `auth.users.id`, `full_name`, `email`, `role` |
| `vehicles` | Vehículos del usuario (todo tipo de automotor) | `user_id`, `brand`, `model`, `year`, `license_plate` (default `''`, opcional), `current_km`, `fuel_type`, **`vehicle_type_id`**, **`unit_number`**, `purchase_date`, `image_url` |
| `vehicle_types` | Catálogo de tipos (compartido) | `name` (único), `icon` (emoji), `description` |
| `maintenance_types` | Catálogo de mantenimientos administrable | `name`, `description`, `recommended_km`, `recommended_months` |
| `maintenances` | Registros de service | `vehicle_id`, `maintenance_type_id`, `date`, `kilometers`, `cost`, `workshop`, `notes` |
| `expenses` | Gastos por vehículo | `vehicle_id`, `category`, `description`, `amount`, `date` |
| `documents` | Documentos y vencimientos | `vehicle_id`, `type`, `expiration_date`, `document_url` |
| `reminders` | Recordatorios | `vehicle_id`, `title`, `reminder_date`/`reminder_km`, `status` |
| `notifications` | Bandeja de alertas | `user_id`, `title`, `message`, `type`, `is_read` |

**Detalle vehículos (soporte de flota)** — columnas añadidas por migración idempotente:
```sql
alter table public.vehicles add column if not exists vehicle_type_id uuid references public.vehicle_types (id);
alter table public.vehicles add column if not exists unit_number text;
alter table public.vehicles alter column license_plate set default '';
```
Índices nuevos: `idx_vehicles_type`, `idx_vehicles_unit` (además de `idx_vehicles_user_id`, `idx_vehicles_plate`).

**Catálogo de tipos** (seed expansivo con `on conflict (name) do nothing`, agrupado por categoría): autos y livianos (Automóvil 🚗, Auto deportivo 🏎️, SUV/4x4 🚙, Camioneta 🛻, Utilitario/Furgón 🚐, Minivan/Monovolumen 🚐); dos ruedas (Motocicleta 🏍️, Moto deportiva, Moto todoterreno, Scooter 🛵, Ciclomotor, Cuatriciclo/UTV 🛵, Triciclo 🛺); carga pesada (Camión 🚚, Camión articulado, Semirremolque/Tráiler 🚛, Remolque/Acoplado 🚛); pasajeros y servicios (Colectivo/Ómnibus 🚌, Micro/Minibús, Ambulancia 🚑, Vehículo de emergencia 🚒, Móvil policial 🚓); agro (Maquinaria agrícola 🚜, Tractor agrícola, Cosechadora 🌾, Pulverizadora, Sembradora 🌱); construcción/vial (Maquinaria pesada 🏗️, Excavadora, Cargadora, Topadora, Motoniveladora, Compactadora, Grúa, Mixer); industrial (Autoelevador 🏭, Manipulador telescópico, Motonieve 🎿); micromovilidad/eléctrico (Bicicleta 🚲, Bicicleta eléctrica, Monopatín eléctrico 🛴, Carro de golf ⛳, Moto náutica 🚤); y Otros 🔧. Aproximadamente 46 tipos; mantenido como fuente única en `seed.sql`.

> **IMPORTANTE (setup manual)**: Supabase no ejecuta migraciones automáticas; `schema.sql` y `seed.sql` se ejecutan a mano en **SQL Editor**. **`schema.sql` es destructivo**: la sección inicial (reinicio total) elimina todo lo existente —tablas de la app, funciones, triggers y políticas de Storage— y regenera el esquema desde cero (los objetos se crean de nuevo con `create ... if not exists` como resguardo adicional). Los buckets de Storage **no** se borran (Supabase bloquea el delete directo) sino que se reutilizan. **NO correr sobre una base con datos a conservar.** `seed.sql` sí es idempotente (`on conflict do nothing`, `if not exists`).

## 6. Seguridad

### Funciones de base
- `is_admin()` — true si el usuario autenticado es ADMIN (`security definer`).
- `owns_vehicle(id)` — true si el vehículo pertenece al usuario (`security definer`).
- `my_role()` — rol del usuario (evita recursión RLS en `profiles`).
- `handle_new_user()` — trigger `after insert on auth.users` que crea el `profile` al registrarse.

### RLS por tabla
- **profiles**: select propio o admin; update propio (rol inmutable) o admin.
- **vehicles / maintenances / expenses / documents / reminders**: select/insert/update/delete solo del dueño (`owns_vehicle`) o admin.
- **maintenance_types / vehicle_types** (catálogos): select para cualquier autenticado; CRUD solo ADMIN.
- **notifications**: propias o admin.

### Storage (buckets)
- `vehicle-images` — **público**; carpetas por usuario (`{userId}/...`).
- `documents` — **privado**; descarga por **URL firmada**; carpetas por usuario.

### Regla de oro
- La anon key es pública por diseño y el frontend confía en RLS. **No** exponer service_role key en el bundle.

## 7. Setup local

Requisitos: Node 22 + npm, `npx @angular/cli@20`, cuenta gratuita de Supabase.

```bash
npm install
```

1. Crear proyecto en Supabase.
2. En **SQL Editor** ejecutar en orden: `supabase/schema.sql`, luego `supabase/seed.sql`.
3. Copiar URL del proyecto y anon key → `src/environments/environment.ts`:
   ```ts
   export const environment = {
     production: false,
     supabaseUrl: 'https://TU-PROYECTO.supabase.co',
     supabaseAnonKey: 'TU-CLAVE-ANON-PUBLICA',
   };
   ```

**Cuentas demo** (creadas por seed):

| Rol | Email | Contraseña |
|---|---|---|
| Usuario | `usuario@test.com` | `AutoCheck2024!` |
| Admin | `admin@test.com` | `AutoCheck2024!` |

### Verificación rápida del setup

- En el **SQL Editor del mismo proyecto que usa la app**, validar que existe el catálogo y las columnas de flota:
  ```sql
  select count(*) from public.vehicle_types;              -- ~46
  select column_name from information_schema.columns
  where table_name = 'vehicles' and column_name in ('vehicle_type_id','unit_number');
  ```
- El **ref del proyecto** en el Dashboard (barra de dirección: `.../project/<ref>/...`) debe coincidir con el ref de la `supabaseUrl` y con el segmento `ref` de la anon key. **Síntoma de refs distintos**: en el SQL Editor todo parece correcto (46 tipos, grants OK) pero la API responde 404 `PGRST205` para `vehicle_types` o `42703 column ... does not exist` para las columnas nuevas de `vehicles` (la app consulta otra base).

### Comandos

```bash
npx ng serve        # dev en http://localhost:4200
npx ng build        # build de producción (verificar que termine "bundle generation complete")
```

## 8. Extensiones típicas

- **Multi-tenant (organizaciones)**: requeriría nueva tabla `organizations` + `organization_members`, ampliar RLS (`owns_vehicle` → pertenencia a org) y sumar roles owner/conductor.
- **Notificaciones externas**: email/SMS/WhatsApp (hoy solo bandeja interna).
- **Reportes exportables** por unidad (PDF/Excel).
- **Más catálogos**: talleres, proveedores, tarjetas de combustible, etc.

## 9. Preguntas frecuentes de handoff

- **¿Dónde está la lógica de alertas?** En `shared/utils/maintenance-status.ts` (frontend) + datos en `maintenances`/`maintenance_types`.
- **¿Cómo sé si un usuario es admin?** Perfil `role = 'ADMIN'` (guard `roleGuard`); la base red valida con `is_admin()`.
- **¿Puedo tirar otra vez el schema?** Sí, `schema.sql` empieza con un **reinicio total** (drop de tablas, funciones, triggers y storage) y luego regenera todo; al hacerlo se pierden todos los datos. `seed.sql` puede re-ejecutarse sin duplicar catálogos (`on conflict do nothing`).
- **¿Qué hago si un vehículo no tiene patente?** El sistema usa `unit_number` como identificador (badge `N° U-001`) y etiquetas de fallback `S/D`/`Sin dominio`.
- **El catálogo de tipos sale vacío en la app pero en el SQL Editor existe (API → 404 `PGRST205`)?** Casi siempre es haber ejecutado `schema.sql`/`seed.sql` en **otro proyecto de Supabase** distinto al que apunta `environment.ts`. Comprobá el ref del proyecto (Dashboard vs URL/anon key), volvé a correr ambos scripts en el proyecto correcto y refrescá el schema cache si la tabla existía: `notify pgrst, 'reload schema';` o Dashboard → Settings → API → **"Reload schema cache"**.
- **Error `42703 column ... does not exist`?** Es un error de la base: ese proyecto no tiene aplicado el `schema.sql` actual (columnas nuevas/versionadas). Re-ejecutalo (es destructivo) en el proyecto correcto.