# AutoCheck — Documentación por módulo/sección de la app

> Detalle de cada módulo o sección de la aplicación: rutas, componentes, servicios involucrados, lógica de negocio y datos. Se asume familiaridad con el stack descrito en `SISTEMA.md`.

## 0. Mapa de rutas

| Ruta | Componente | Guard | Título |
|---|---|---|---|
| `/auth/*` | pantallas de auth | `noAuthGuard` | Acceso |
| `/` | `LandingComponent` | `noAuthGuard` | Página pública |
| `/dashboard` | `DashboardComponent` | `authGuard` | Dashboard |
| `/vehicles` | `VehiclesListComponent` | `authGuard` | Mis vehículos |
| `/vehicles/new` | `VehicleFormComponent` | `authGuard` | Registrar vehículo |
| `/vehicles/:id` | `VehicleDetailComponent` | `authGuard` | Detalle |
| `/vehicles/:id/edit` | `VehicleFormComponent` | `authGuard` | Editar vehículo |
| `/vehicles/:id/maintenances` | `MaintenanceHistoryComponent` | `authGuard` | Historial |
| `/vehicles/:id/maintenance/new` | `MaintenanceFormComponent` | `authGuard` | Nuevo service |
| `/vehicles/:id/maintenance/:mid/edit` | `MaintenanceFormComponent` | `authGuard` | Editar service |
| `/vehicles/:id/expenses` | `ExpensesListComponent` | `authGuard` | Gastos del vehículo |
| `/vehicles/:id/documents` | `DocumentsListComponent` | `authGuard` | Documentación |
| `/vehicles/:id/reminders` | `ReminderListComponent` | `authGuard` | Recordatorios |
| `/maintenances` | `MaintenanceHistoryComponent` (global) | `authGuard` | Mantenimientos |
| `/expenses` | `ExpensesListComponent` (global) | `authGuard` | Gastos |
| `/documents` | `DocumentsListComponent` (global) | `authGuard` | Documentación |
| `/reminders` | `ReminderListComponent` (global) | `authGuard` | Recordatorios |
| `/ai` | `AiChatComponent` | `authGuard` | AutoCheck IA |
| `/profile` | `ProfileComponent` | `authGuard` | Mi perfil |
| `/admin` | `AdminComponent` | `authGuard` + `roleGuard` (ADMIN) | Administración |

Todos los módulos tras el login se renderizan dentro de `AppLayoutComponent` (sidebar + header + main). El sidebar muestra el título de la ruta activa y permite **colapsarse** (persistencia en `localStorage`).

---

## 1. Landing (/)

- **Componente**: `features/landing/landing.component.ts|html|scss`
- **Función**: página pública de marketing. Hero, franja de confianza, funciones, "cómo funciona", CTA final y footer.
- **Nota flota**: el copy promociona "todos tus vehículos" (autos, camionetas, motos, camiones, maquinaria) y el control de flotas en vez de un enfoque de auto particular.
- **Salidas**: botones hacia `/auth/register` y `/auth/login`.

---

## 2. Autenticación (/auth)

- **Componentes**: `features/auth/*` (login, registro, recuperación, reset de contraseña).
- **Guard**: `noAuthGuard` redirige a `/dashboard` si ya hay sesión.
- **Servicio**: `core/services/auth.service.ts` — usa Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, sesión persistente en localStorage).
- **Flujo de registro**: al crear la cuenta, el trigger de base `handle_new_user` inserta automáticamente el `profile` con rol `USER`.
- **Perfil**: `features/profile/profile.component.ts|html` — nombre completo, email y cambio de contraseña.

---

## 3. Dashboard (/dashboard)

- **Componente**: `features/dashboard/dashboard.component.ts|html|scss`
- **Datos que muestra**:
  - Card resumen: total de vehículos, mantenimientos vencidos/próximos al día, documentos por vencer.
  - Tabla de unidades: marca y modelo, dominio o **N° de unidad** (fallback `N° U-001`/`Sin dominio`), kilometraje y **estado** (badge 🟢/🟡/🔴) con link "Ver".
- **Servicios**: `VehiclesService`, `MaintenancesService`, `DocumentsService`.
- **Utilidad**: `checkMaintenance` (`shared/utils/maintenance-status.ts`) calcula el estado de cada mantenimiento por km/fecha.
- **Frecuencia de datos**: carga todos los mantenimientos y documentos del usuario para derivar alertas.

---

## 4. Vehículos (/vehicles)

### 4.1 Lista (`VehiclesListComponent`)
- Muestra cards con foto (thumbnail), marca/modelo, tipo con ícono, dominio o unidad, km y estado.
- **Filtro por tipo de vehículo** (select "Todo tipo de vehículo" + el catálogo de `vehicle_types`).
- Acciones: ver detalle, editar, eliminar (con diálogo de confirmación).
- `maintenanceHint(km)`: sugerencia genérica de mantenimiento por kilometraje (válida para todo tipo de automotor).
- `deleteVehicle` usa como etiqueta `license_plate || unit_number || brand`.

### 4.2 Formulario (alta/edición) (`VehicleFormComponent`)
- **Campos**:
  - **Tipo de vehículo*** (select desde `VehicleTypesService`, con ícono) — nuevo campo de flota.
  - Marca*, Modelo*, Año* (1950-2100), Patente/dominio (**opcional** desde la última mejora), **N° de unidad** (opcional, max 20, placeholder `U-001`), Kilometraje actual, Combustible, Fecha de compra, Foto (storage `vehicle-images`).
- **Validaciones** (`shared/forms/validators.ts`):
  - Patente: regex `^[A-Z0-9]{4,10}$` (relajada para maquinaria/remolques) y ya **no es requerida**.
  - Payload: `license_plate` se envía en mayúsculas y `''` si viene vacío; `vehicle_type_id` requerido; `unit_number` puede ir vacío.
- **Servicio**: `VehiclesService.create/update` (inserta `user_id` en alta).

### 4.3 Detalle (`VehicleDetailComponent`)
- Header con foto, marca/modelo, tipo (icono + nombre), dominio o N° de unidad, km, combustible, compra.
- Quick links a mantenimientos, gastos, documentos y recordatorios del vehículo.
- Badge de identidad con fallback: `license_plate` → `N° unit_number` → `S/D`.

### 4.4 Catálogo de tipos (`VehicleTypesService`)
- **Archivos**: `core/models/vehicle-type.interface.ts`, `core/services/vehicle-types.service.ts`.
- Carga el catálogo `vehicle_types` una sola vez (`ensureLoaded`), expone `types()` y helpers `iconOf(id)` / `nameOf(id)` (con fallback `🚗` / `Otros`).
- CRUD solo alcanzable desde tab de Administración (el cliente verifica permisos; la base los refuerza con RLS).
- **Si el catálogo sale vacío aunque las filas existan**, la app apunta a un proyecto de Supabase distinto del que se inicializó (síntoma típico: 404 `PGRST205`). Ver `SISTEMA.md` → FAQ de setup.

---

## 5. Mantenimientos (/maintenances, /vehicles/:id/maintenances)

- **Componentes**: `MaintenanceHistoryComponent` (historial global o por vehículo según param `vehicle_id`), `MaintenanceFormComponent` (alta/edición).
- **Modelo**: cada mantenimiento se asocia a `vehicle_id` + `maintenance_type_id`, con `date`, `kilometers`, `cost`, `workshop`, `description`, `notes`.
- **Estado visual** por registro o por tipo: calculado por `checkMaintenance(types, typeId, currentKm, lastDate, lastKm)` → `normal | proximo | vencido` (🟢/🟡/🔴).
- **Registrar service**: al cargar un mantenimiento se actualiza el `current_km` del vehículo (mejora para que el estado sea siempre consistente).
- **Servicio**: `MaintenancesService` (CRUD); `MaintenanceTypesService` para el catálogo de tipos con `recommended_km`/`recommended_months`.

---

## 6. Gastos (/expenses, /vehicles/:id/expenses)

- **Componente**: `ExpensesListComponent` (global o por vehículo).
- **Modelo**: `category`, `description`, `amount`, `date`, `vehicle_id`.
- **Gráficos** (Charts.js):
  - Doughnut por categoría de gasto.
  - Barras por vehículo.
  - Línea de evolución 6 meses.
- **Formulario**: select de vehículo con etiqueta `marca modelo (dominio o N° de unidad)`.
- **Servicio**: `ExpensesService`.

---

## 7. Documentación (/documents, /vehicles/:id/documents)

- **Componente**: `DocumentsListComponent`.
- **Modelo**: `type` (VTV, seguro, patente, cédula…), `expiration_date`, `document_url`, `notes`, `vehicle_id`.
- **Estado**: vigente / por vencer / vencido según `expiration_date`.
- **Storage**: bucket privado `documents` con carpeta por usuario; descarga por URL firmada.
- **Servicio**: `DocumentsService`.

---

## 8. Recordatorios (/reminders, /vehicles/:id/reminders)

- **Componente**: `ReminderListComponent`.
- **Modelo**: `title`, `description`, `reminder_date` o `reminder_km`, `status` (`pendiente|completado|vencido`), `vehicle_id`.
- **Lógica**: se marcan como vencidos al vencer la fecha; completables con un clic.
- **Servicio**: `RemindersService`.

---

## 9. Notificaciones (bandeja del header)

- **Servicio**: `core/services/notifications.service.ts`.
- **Función**: crea alertas reales (mantenimiento vencido/próximo, documento por vencer) y las sincroniza en el header. La bandeja acompaña al layout (`AppLayoutComponent`).
- **Datos**: tabla `notifications` (`user_id`, `title`, `message`, `type`, `is_read`).

---

## 10. AutoCheck IA (/ai)

- **Componente**: `AiChatComponent` (`features/ai/ai-chat/*`).
- **Servicio**: `core/services/ai.service.ts` — **motor local de reglas** (no consume APIs externas).
- **Interfaz del chat**:
  - Mensajes user/assistant con estado de escritura y scroll automático.
  - **Sugerencias por categorías** (`SUGGESTION_CATEGORIES`): Mantenimiento, Gastos y consumo, Historial y análisis, Documentos, Cuidado general (26 preguntas). Click en una sugerencia → ejecuta la consulta.
  - **Píldora flotante** "💡 Ver preguntas sugeridas / 🙈 Ocultar sugerencias" (`showSuggestions` signal + `toggleSuggestions()`), fija entre el área del chat y el composer.
- **Rutas de respuesta** (`answer(question)`):
  - detecta intentos: resumen general (`overview`), recomendaciones de mantenimiento, análisis de gastos, documentos por vencer, consejos por tema (`TOPIC_GUIDES`), etc. El chequeo de overview se evalúa antes que el de análisis y no requiere parámetros.
  - `pickVehicle(q)` acota la respuesta al vehículo mencionado (marca, modelo, **N° de unidad o dominio**); si hay un solo vehículo, responde por él.
  - Las respuestas siempre se construyen con los datos reales del usuario (`ensureData`); si no hay datos, explica qué cargar.
- **Nota flota**: los textos usan etiqueta `dominio | N° unidad | "sin dominio"` y el reconocimiento de unidades se agregó para flotas.

---

## 11. Administración (/admin) — solo rol ADMIN

- **Componente**: `AdminComponent` (`features/admin/*`) — acceso con `roleGuard` (ADMIN).
- **Tabs**:
  1. **Estadísticas**: resumen de la plataforma.
  2. **Usuarios**: listado con cambio de rol (USER/ADMIN).
  3. **Vehículos**: tabla de vehículos de todos los usuarios, con **columna Tipo** (icono + nombre vía `vehicleTypeLabel()`).
  4. **Tipos de vehículo** 🚙: CRUD del catálogo `vehicle_types` (modal con nombre, emoji ícono máx 4 chars, descripción) — nuevo tab de flota.
  5. **Tipos de mantenimiento**: CRUD con `recommended_km`/`recommended_months`.
- **Seguridad**: el cliente esconde la ruta para no-ADMIN; la base garantiza el acceso con `is_admin()` en políticas RLS.

---

## 12. Layout y componentes compartidos

- **`AppLayoutComponent`** (`shared/layout/*`):
  - Sidebar (`sidebar.component.ts|html`) con colapso: botón «/», ancho 76 px solo íconos, hidden < 900 px; estado persistido en `localStorage` (`autocheck.sidebarCollapsed`).
  - Header con notificaciones y menú de usuario.
- **Reutilizables** (`shared/components/`):
  - `status-badge` — badge 🟢/🟡/🔴 para mantenimientos y documentos.
  - `confirm-dialog` — diálogo de confirmación (`ConfirmService`).
  - `logo` — logo de la marca.
- **Utils**: `shared/utils/maintenance-status.ts` (estados), `shared/forms/validators.ts` (patente relajada, números, fechas).
- **Estilos globales** (`styles.scss`): sistema de diseño propio (variables CSS: `--primary`, `--primary-dark`, etc.), grid responsive, botones. `a:hover` sin subrayado (cambio de color).

---

## 13. Dashboard/Admin: lectura rápida por módulo (resumen visual)

```
Landing ──► Auth ──► [Layout: Sidebar + Header] ──► Módulos:
              │                                        ├─ Dashboard (resumen + estados)
              │                                        ├─ Vehículos (tipos, unidad, filtro)
              │                                        ├─ Mantenimientos (historial + estados)
              │                                        ├─ Gastos (gráficos)
              │                                        ├─ Documentos (vencimientos)
              │                                        ├─ Recordatorios
              │                                        ├─ AutoCheck IA (chat con datos reales)
              │                                        ├─ Perfil
              │                                        └─ Admin (estadísticas, usuarios, vehículos,
              │                                           tipos de vehículo, tipos de mantenimiento)
```