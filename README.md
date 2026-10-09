# AutoCheck – Gestión Inteligente de Mantenimiento Vehicular

Aplicación web responsive para registrar y controlar el mantenimiento de **vehículos y flotas de todo tipo** (autos, camionetas, motos, camiones, maquinaria, etc.): mantenimientos, gastos, documentación, recordatorios, notificaciones, panel de administración y un asistente virtual (AutoCheck IA).

## Documentación

- [`docs/NEGOCIO.md`](docs/NEGOCIO.md) — documentación del negocio: problema, **público objetivo (particulares, familias y rubros con flota)**, segmentos, módulos, roles, KPI y oferta comercial.
- [`docs/SISTEMA.md`](docs/SISTEMA.md) — contexto completo del sistema para otro orquestador: stack, arquitectura, modelo de datos, seguridad y setup.
- [`docs/MODULOS.md`](docs/MODULOS.md) — documentación completa por módulo/sección de la app (rutas, componentes, servicios y lógica).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Angular 20 (standalone components, signals, Reactive Forms, Charts.js) |
| Backend / Datos | Supabase (Auth, PostgreSQL, Storage, Row Level Security) |
| Estilos | SCSS con sistema de diseño propio (variables CSS, componentes, responsive) |

## Requisitos

- Node.js **22.12.0** (o superior en rama 22) y npm
- Angular CLI 20 (`npm i -g @angular/cli@20` o usar `npx -y @angular/cli@20`)
- Una cuenta gratuita en [Supabase](https://supabase.com)

## Instalación

```bash
npm install
```

## Configuración de Supabase (obligatorio)

1. Crear un proyecto nuevo en Supabase.
2. Abrir **SQL Editor** y ejecutar en orden:
   - `supabase/schema.sql` → **borra todo lo existente y recrea** tablas, funciones, RLS y buckets de Storage (¡destructivo!).
    - `supabase/seed.sql` → **borra la demo anterior y regenera todo**: catálogos, usuarios de prueba y datos de ejemplo (se puede correr N veces).
> Si tu base ya existía y solo te falta la tabla de combustible: `supabase/migration-fuel-logs.sql` (incluida en `schema.sql` para instalaciones nuevas).
3. Copiar la **URL del proyecto** y la **anon key pública** (Settings → API).
4. Pegarlas en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-CLAVE-ANON-PUBLICA',
};
```

> La anon key es pública por diseño. Nunca se usa el **service_role key** en el frontend.

### Cuentas de prueba (creadas por `seed.sql`, contraseña `AutoCheck2024!` en todas)

| Uso | Email | Contraseña |
|---|---|---|
| Particular (1 auto) | `usuario@test.com` | `AutoCheck2024!` |
| Admin | `admin@test.com` | `AutoCheck2024!` |
| Flota (5 unidades con alertas) | `flota@test.com` | `AutoCheck2024!` |
| Particular (auto + moto) | `familia@test.com` | `AutoCheck2024!` |

### Solución de problemas de setup

- **El selector de tipo de vehículo sale vacío / la API devuelve 404 `PGRST205`**: el `schema.sql`/`seed.sql` se ejecutó en un **proyecto de Supabase distinto** al que usa la app. Comprobá que el ref del proyecto (URL del Dashboard) coincida con el ref de tu `supabaseUrl` y corré ambos scripts en el proyecto correcto. Si la tabla ya existía, refrescá el schema cache con `notify pgrst, 'reload schema';` (o Dashboard → Settings → API → **"Reload schema cache"**).
- **Error `42703 column ... does not exist`**: ese proyecto no tiene el `schema.sql` actual; volvé a ejecutarlo (es destructivo) en el proyecto correcto.

## Ejecutar la aplicación

```bash
npm start        # o: npx ng serve
```

Abrir `http://localhost:4200`. Build de producción:

```bash
npx ng build
```

## Funcionalidades

- **Autenticación**: login, registro, recuperación y cambio de contraseña (en español).
- **Vehículos**: alta/baja/edición de **todo tipo de automotor** (catálogo de **~46 tipos** administrable), con dominio o **N° de unidad**, foto, kilometraje, filtro por tipo y estado por vehículo.
- **Mantenimientos**: historial por vehículo o global con estado 🟢/🟡/🔴 según km/fecha.
- **Gastos**: carga mensual, gráficos (doughnut por categoría, barras por vehículo, línea 6 meses).
- **Documentación**: upload/download de archivos con URL firmada, estado vigente/próximo/vencido.
- **Recordatorios**: por fecha o kilometraje, completables.
- **Notificaciones**: bandeja en el header (se auto-sincroniza según alertas reales).
- **Panel de Estadísticas**: dashboard con resumen general y alertas.
- **Administración** (solo admin): estadísticas, usuarios (cambio de rol), vehículos, **tipos de vehículo** y tipos de mantenimiento.
- **AutoCheck IA**: chat con motor local de reglas que responde sobre mantenimiento, gastos, último servicio y análisis del historial usando los datos reales del usuario (los resultados dependen de la información cargada, no inventa datos).

## Seguridad

- **Row Level Security** en todas las tablas (`supabase/schema.sql`).
- Funciones `is_admin()`, `owns_vehicle()` y `my_role()` para evitar recursión infinita en las políticas.
- Trigger `handle_new_user` que crea el perfil automáticamente al registrarse.
- Storage: bucket `vehicle-images` público y `documents` privado (descarga por URL firmada), ambos con carpetas por usuario (`{userId}/...`).
- Las claves sensibles nunca viajan en el bundle.

## Estructura del proyecto

```
docs/          # NEGOCIO.md, SISTEMA.md, MODULOS.md
src/app/
  core/         # config (Supabase), models, services, guards
  shared/       # layout, componentes reutilizables, validators, utils
  features/     # auth, landing, dashboard, vehicles, maintenance, expenses, documents,
                # reminders, admin, profile, ai-chat
  environments/ # SupabaseUrl + anon key
supabase/
  schema.sql    # DDL, RLS, Storage (destructivo: reinicia la base)
  seed.sql      # catálogos, usuarios de prueba y datos de ejemplo (idempotente)
```