# AutoCheck — Documentación del Negocio

> Documento orientado a entender **qué** resuelve el producto, **para quién** y **cómo** se monetiza. Complementa a [`SISTEMA.md`](./SISTEMA.md) (contexto técnico) y a [`MODULOS.md`](./MODULOS.md) (detalle por sección de la app).

## 1. Propósito del producto

AutoCheck es una aplicación web para **gestión inteligente del mantenimiento de vehículos y flotas**. Permite registrar, seguir y anticipar todo lo que un vehículo necesita (servicios, gastos, documentos y vencimientos) en un solo lugar, sin planillas sueltas ni papeles.

La propuesta de valor central es **prevención por datos**: el sistema compara el kilometraje y las fechas reales de cada vehículo contra los intervalos recomendados (por tipo de mantenimiento) y avisa con anticipación cuándo corresponde actuar.

## 2. Problema que resuelve

- **Olvido de services**: no se sabe cuándo toca cambiar aceite, filtros, correa, cubiertas, etc. → desperfectos costosos y pérdida de valor de reventa.
- **Descontrol de costos**: el gasto por vehículo (combustible, taller, seguro, patente) es disperso y no se analiza.
- **Vencimientos sueltos**: VTV, seguro, patente, ITV y documentos vencidos implican multas y problemas legales.
- **Historial fragmentado**: papeles sueltos imposibilitan saber qué se hizo, cuándo y a qué costo, al momento de vender o auditar una flota.
- **Flotas sin control unitario**: las empresas no identifican cada unidad (N° de unidad) dentro de un parque de vehículos heterogéneo (autos, camionetas, motos, camiones, maquinaria).

## 3. ¿A quién está dirigido? Quiénes pueden usarlo

AutoCheck está pensado para **cualquier persona u organización que tenga uno o más vehículos de cualquier tipo**. No exige ser una empresa: sirve igual para un auto familiar, una moto o un parque mixto con decenas de unidades.

### 3.1 Perfiles de usuario principales

| Perfil | Ejemplo | Problema que resuelve |
|---|---|---|
| **Particular** | Un auto o una moto del hogar | No perderse el service, la VTV ni el seguro; todo el historial en un solo lugar |
| **Familia** | Varios vehículos de la casa compartidos | Múltiples vehículos y tipos bajo una misma cuenta, control de vencimientos |
| **Flota PYME/empresa** | Logística, transporte, construcción, agro, delivery | Control unitario (N° de unidad), costo por vehículo y cumplimiento legal |
| **Taller / gestor** | Seguimiento del parque de sus clientes | Visión administrativa global (rol ADMIN) de todos los vehículos registrados |

### 3.2 Negocios y rubros concretos que pueden aprovecharlo

| Rubro / negocio | Vehículos típicos | Uso principal en AutoCheck |
|---|---|---|
| **Logística y transporte de carga** | Camiones, articulados, semirremolques, furgones, tráilers | Services por km, vencimientos, costo por unidad |
| **Distribución y reparto** (delivery, mensajería, mudanzas, fletes) | Furgones, utilitarios, camionetas, motos, ciclomotores | Parque heterogéneo con N° de unidad y control de costos |
| **Construcción y vialidad** | Maquinaria pesada, excavadoras, grúas, mixers, camionetas | Preventivo de máquinas costosas y control de inspecciones |
| **Agro y campo** | Tractores, cosechadoras, pulverizadoras, pickups | Planificar services por km/horas y parque mixto |
| **Pasajeros y movilidad** | Colectivos/ómnibus, minibuses, taxis/remises, rent-a-car | VTV/RTO por unidad, seguros al día, rotación de flota |
| **Servicios y emergencias** | Ambulancias, móviles, vehículos de emergencia, camionetas de servicio | Disponibilidad operativa: nada fuera de service cuando se necesita |
| **Comercios y servicios técnicos** | Camionetas y utilitarios de reparto/provisión | Gastos por vehículo y recordatorios por km |
| **Municipios y entes públicos** | Flota municipal mixta | Inventario, estado por unidad, cumplimiento |
| **Talleres mecánicos / gestores** (uso interno) | Parque de clientes que atienden | Panel de administración global con historial por vehículo |
| **Micromovilidad / eléctricos / recreativos** | Bicicletas, e-bikes, monopatines, cuatriciclos, motos náuticas, golf | Registrar cualquier rodado: pieces y services |

La extensión del catálogo a **todo tipo de automotor (~46 tipos en el seed)** es lo que convierte a AutoCheck de una app de auto particular a una **herramienta de gestión de flota vendible a empresas**, sin perder la simplicidad para el uso personal.

## 4. Módulos del producto (valor de negocio)

1. **Vehículos** — Alta de cualquier tipo de automotor con **tipo** (catálogo), dominio o **N° de unidad**, kilometraje, combustible y foto. Base de todo el sistema.
2. **Mantenimientos** — Historial por vehículo o global con estado 🟢/🟡/🔴 según intervalos (km y meses).
3. **Gastos y estadísticas** — Costo mensual, por categoría y por vehículo con gráficos.
4. **Documentos** — Carga de archivos (VTV, seguro, patente) con estados vigente/próximo/vencido.
5. **Recordatorios** — Alertas por fecha o kilometraje, completables.
6. **Notificaciones** — Bandeja en el encabezado, auto-sincronizada con las alertas reales.
7. **Panel (Dashboard)** — Resumen del estado del parque:
   - total de vehículos, mantenimientos pendientes/cercanos/vencidos, documentos por vencer,
   - tabla de unidades con su estado y acceso directo al detalle.
8. **AutoCheck IA** — Chat que responde consultas con base en **los datos reales** del usuario (no inventa). Responde sobre mantenimientos, gastos, vencimientos y ofrece consejos.
9. **Administración** (solo rol ADMIN) — Visión global: estadísticas, usuarios (cambio de rol), vehículos de todos los usuarios, **tipos de vehículo** y tipos de mantenimiento.
10. **Perfil** — Datos personales y cambio de contraseña.

## 5. Roles y permiso implícito

No hay suscripciones ni planes: toda la funcionalidad está disponible para cualquier cuenta. El único diferenciador es el **rol ADMIN**, pensado para el operador/empresa que administra la plataforma.

| Rol | Permisos |
|---|---|
| `USER` | CRUD de sus propios vehículos y de todo lo asociado (mantenimientos, gastos, documentos, recordatorios). Lectura de catálogos compartidos (tipos de mantenimiento y tipos de vehículo). |
| `ADMIN` | Todo lo del rol USER **+** visión de todos los perfiles y vehículos, cambio de roles, y CRUD de los catálogos globales (tipos de mantenimiento y **tipos de vehículo**). |

## 6. Metodología de alertas

- Cada **tipo de mantenimiento** define un intervalo `recommended_km` y/o `recommended_months`.
- El estado de un mantenimiento se calcula comparando el **último registro real** (fecha y km) contra esos intervalos:
  - 🟢 **Normal** — dentro de los plazos.
  - 🟡 **Próximo** — se acerca al límite (umbral de anticipación).
  - 🔴 **Vencido** — supera el intervalo.
- Los **documentos** tienen su propio estado según `expiration_date` (vigente / por vencer / vencido).
- Los **recordatorios** se marcan como vencidos si pasaron `reminder_date`.

## 7. Métricas clave del negocio (KPIs)

- Vehículos activos por cuenta y tipos más usados.
- % de mantenimientos vencidos (salud de la flota → señal de retención).
- % de documentos vencidos (riesgo legal cubierto).
- Costo promedio mensual por vehículo y por tipo (mezcla de flota).
- Uso del asistente IA (consultas/sesión → feature que diferencia el producto).

## 8. Camino a una oferta comercial

Estado actual: **producto funcional de una sola cuenta** (un usuario administra sus vehículos). Para vender a empresas de flota en serio, los siguientes pasos naturales son:

1. **Multi-tenant / organizaciones**: una empresa con varios usuarios que comparten una misma flota (rol "owner de la flota" + "conductor").
2. **Reportes exportables** por unidad (PDF/Excel) y costo por km.
3. **Recordatorios por email/WhatsApp** además de la bandeja interna.
4. **Geolocalización / scores de salud** por unidad.
5. Planes de suscripción (Gratis / Pro / Flota) con límites de vehículos.

## 9. Glosario

- **Dominio / patente**: identificador legal de patente (opcional en el sistema; maquinaria o remolques pueden no tener).
- **N° de unidad**: identificador interno que usa la empresa para una unidad de su flota (ej: `U-001`).
- **Tipo de vehículo**: categoría del parque (Automóvil, Camioneta, Motocicleta, Camión, etc.).
- **Service / mantenimiento**: intervención registrada sobre un vehículo, asociada a un tipo de mantenimiento.
- **ITV / VTV / RTO**: inspección técnica oficial vehicular de Argentina (riesgo legal cubierto por Documentos).