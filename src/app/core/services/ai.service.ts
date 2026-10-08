import { Injectable, inject } from '@angular/core';
import { VehiclesService } from './vehicles.service';
import { VehicleTypesService } from './vehicle-types.service';
import { MaintenancesService } from './maintenances.service';
import { ExpensesService } from './expenses.service';
import { MaintenanceTypesService } from './maintenance-types.service';
import { DocumentsService } from './documents.service';
import { checkMaintenance } from '../../shared/utils/maintenance-status';
import { MaintenanceStatus } from '../models/enums';
import { Vehicle } from '../models/vehicle.interface';

export interface AiMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AiSuggestionCategory {
  title: string;
  items: string[];
}

const SUGGESTION_CATEGORIES: AiSuggestionCategory[] = [
  {
    title: 'Mantenimiento',
    items: [
      '¿Qué mantenimiento debería hacer próximamente?',
      '¿Está vencido algún mantenimiento?',
      '¿Cuándo fue mi último cambio de aceite?',
      '¿Me toca el cambio de filtros?',
      '¿En qué estado están las cubiertas?',
      '¿Tengo que cambiar la correa de distribución?',
      '¿Cuándo cambio las bujías?',
      '¿Qué reviso de los frenos?',
      '¿Cuánto le queda a la batería?',
    ],
  },
  {
    title: 'Gastos y consumo',
    items: [
      '¿Cuánto gasté en mi vehículo este año?',
      '¿Cuánto gasto en combustible al mes?',
      '¿Cuál es el gasto más grande que tuve?',
      'Analizá mis gastos por vehículo.',
      '¿Qué rubro se lleva más plata?',
    ],
  },
  {
    title: 'Historial y análisis',
    items: [
      'Analizá el historial de mantenimiento.',
      'Resumí el estado general de mis vehículos.',
      '¿Cuál vehículo necesita más atención?',
      '¿Cuánto gasté en reparaciones?',
    ],
  },
  {
    title: 'Documentos',
    items: [
      '¿Qué documentos están por vencer?',
      'Analizá mis documentos vigentes y vencidos.',
      '¿Qué vence antes: seguro, VTV o patente?',
    ],
  },
  {
    title: 'Cuidado general',
    items: [
      'Consejos para preparar el auto para un viaje.',
      '¿Cómo preparo el auto para el invierno?',
      '¿Qué mantenimiento hago en verano?',
      '¿Cada cuánto hago alineación y balanceo?',
      '¿Cada cuánto hago el mantenimiento del aire acondicionado?',
    ],
  },
];

const SUGGESTED_QUESTIONS = SUGGESTION_CATEGORIES.flatMap((c) => c.items);

interface TopicGuide {
  label: string;
  keywords: string[];
  guide: string;
}

const TOPIC_GUIDES: TopicGuide[] = [
  {
    label: 'cambio de aceite',
    keywords: ['aceite'],
    guide:
      'El aceite se cambia en general cada **10.000 km o 6-12 meses**, siempre junto con el filtro correspondiente. En motores diésel los intervalos suelen ser más cortos (7.500-10.000 km).',
  },
  {
    label: 'cambio de filtros',
    keywords: ['filtro'],
    guide:
      'Filtro de aire: **15.000-20.000 km**; filtro de cabina/habitáculo: **1 vez al año o cada 15.000 km**; filtro de combustible según fabricante. Un filtro limpio mejora el consumo y el rendimiento.',
  },
  {
    label: 'cubiertas',
    keywords: ['cubierta', 'neumatico', 'rueda', 'goma', 'llanta'],
    guide:
      'Revisá la profundidad del dibujo (mínimo legal 1,6 mm; recomendable reponer a partir de ~3 mm). Rotá las cubiertas cada **10.000 km** y controlá la presión una vez al mes. No te olvides de la rueda de auxilio.',
  },
  {
    label: 'frenos',
    keywords: ['freno'],
    guide:
      'Pastillas de freno: **30.000-40.000 km** (revisión desde ~25.000 km). Líquido de frenos: **cada 2 años**. Ante vibración, chirridos o pedal esponjoso, revisalo ya.',
  },
  {
    label: 'correa de distribución',
    keywords: ['correa', 'distribucion', 'banda'],
    guide:
      'La correa de distribución se cambia en general **60.000-100.000 km o cada 4-6 años** (ver ficha del fabricante). Suele acompañarse del recambio de la bomba de agua.',
  },
  {
    label: 'bujías',
    keywords: ['bujia', 'bujas'],
    guide:
      'Las bujías duran según su material: cobre **30.000 km**, iridio o platino **60.000-100.000 km**. Si el arranque es trabajoso o sentís fallas de encendido, revisalas.',
  },
  {
    label: 'batería',
    keywords: ['bateria'],
    guide:
      'La batería tiene una vida útil de **3 a 5 años**. En climas fríos rinde menos: vigilala antes del invierno. Si el arranque se vuelve lento, hacé revisar la carga y los bornes.',
  },
  {
    label: 'líquido refrigerante',
    keywords: ['refrigerante', 'anticongelante'],
    guide:
      'Nivel de refrigerante: revisá **mensualmente** con el motor frío. Reemplazo sugerido **cada 2 años o 40.000 km**. Ante sobrecalentamiento, no conduzcas y consultá.',
  },
  {
    label: 'alineación y balanceo',
    keywords: ['alineac', 'balanceo', 'paralel'],
    guide:
      'Hacé alineación y balanceo **cada 10.000 km** o ante vibración en el volante, desgaste irregular de cubiertas o después de un golpe fuerte de rueda.',
  },
  {
    label: 'suspensión y amortiguadores',
    keywords: ['suspension', 'amortiguador'],
    guide:
      'Los amortiguadores se revisan **cada 20.000 km** y duran típicamente **60.000-80.000 km**. Señales: rebotes excesivos, ruidos, desgaste irregular de cubiertas.',
  },
  {
    label: 'mantenimiento del aire acondicionado',
    keywords: ['aire acondicionado', 'climatizador'],
    guide:
      'El aire acondicionado se mantiene **1 vez al año**: revisión de la carga del gas y limpieza/recambio del filtro de habitáculo. Usalo unos minutos por semana (aunque sea invierno) para evitar pérdidas de gas.',
  },
];

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly vehiclesService = inject(VehiclesService);
  private readonly maintenancesService = inject(MaintenancesService);
  private readonly expensesService = inject(ExpensesService);
  private readonly typesService = inject(MaintenanceTypesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly vehicleTypes = inject(VehicleTypesService);

  readonly suggestionCategories = SUGGESTION_CATEGORIES;
  readonly suggestedQuestions = SUGGESTED_QUESTIONS;

  /** Asegura tener datos reales cargados antes de responder. */
  async answer(question: string): Promise<string> {
    await this.ensureData();

    const q = this.normalize(question);
    const vehicles = this.vehiclesService.vehicles();

    if (vehicles.length === 0) {
      return `Todavía no registraste vehículos, así que no tengo datos para analizar.\n\n🔧 Registrá un vehículo en la pantalla "Mis vehículos" y comenzá a cargar mantenimientos y gastos.`;
    }

    // Viajes, estaciones y clima
    if (q.includes('viaje') || q.includes('vacacion') || q.includes('ruta')) return this.tripTips();
    if (q.includes('invierno') || q.includes('verano') || q.includes('estacion')) return this.seasonTips(q);

    // Gastos y consumo
    if (q.includes('combust') || q.includes('nafta') || q.includes('gasoil') || q.includes('diesel') || q.includes('consumo')) {
      return this.fuelReport(q);
    }
    if (q.includes('gast') || q.includes('costo') || q.includes('plata') || q.includes('dinero')) return this.expenseReport();

    // Temas por pieza/componente con guía experta
    const part = this.buildPartGuide(q);
    if (part) return part;

    // Recomendación de mantenimientos (por km y fecha, reales)
    if (q.includes('mantenim') || q.includes('service') || q.includes('toque') || q.includes('recomend') || q.includes('proximo') || q.includes('vencid')) {
      return this.maintenanceAdvice();
    }

    // Documentos con vencimiento real
    if (q.includes('document') || q.includes('vtv') || q.includes('seguro') || q.includes('patente') || q.includes('cedula')) {
      return this.documentsReport();
    }

    // Estado general del parque / atención
    if (q.includes('atencion') || q.includes('parque')) return this.attentionReport();
    if (q.includes('general') || q.includes('resumen') || q.includes('todo')) return this.overview();

    // Análisis e historial
    if (q.includes('analiz') || q.includes('historial') || q.includes('resumen')) return this.analysis();

    return this.fallback(question);
  }

  /* ------------------------------------------------------------------ */
  /* Ayudantes                                                           */
  /* ------------------------------------------------------------------ */

  private async ensureData(): Promise<void> {
    await Promise.all([
      this.vehiclesService.list(),
      this.vehicleTypes.ensureLoaded(),
      this.typesService.ensureLoaded(),
      this.maintenancesService.load(null),
      this.expensesService.load(null),
      this.documentsService.load(null),
    ]);
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** Si la consulta menciona una marca, modelo, unidad o tipo, la acota a ese vehículo. */
  private pickVehicle(q: string): Vehicle | null {
    const vehicles = this.vehiclesService.vehicles();
    if (vehicles.length === 1) return vehicles[0];
    return (
      vehicles.find(
        (v) =>
          q.includes(this.normalize(v.brand)) ||
          (v.model && q.includes(this.normalize(v.model))) ||
          (v.unit_number && q.includes(this.normalize(v.unit_number))) ||
          (v.license_plate && q.includes(this.normalize(v.license_plate))),
      ) ?? null
    );
  }

  /* ------------------------------------------------------------------ */
  /* Recomendaciones de mantenimiento (reales, por km y fecha)           */
  /* ------------------------------------------------------------------ */

  private findingsPerVehicle() {
    const vehicles = this.vehiclesService.vehicles();
    const types = this.typesService.types();
    const all = this.maintenancesService.maintenances();
    const rows = vehicles.map((v) => {
      const records = all.filter((m) => m.vehicle_id === v.id);
      const byType = new Map<string, typeof records>();
      for (const m of records) {
        if (!byType.has(m.maintenance_type_id)) byType.set(m.maintenance_type_id, []);
        byType.get(m.maintenance_type_id)!.push(m);
      }
      const findings: { name: string; status: MaintenanceStatus; reason: string }[] = [];
      for (const [typeId, list] of byType) {
        const last = [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        const check = checkMaintenance(types, typeId, v.current_km, last.date, last.kilometers);
        if (check.status !== 'normal') {
          findings.push({
            name: types.find((t) => t.id === typeId)?.name ?? 'Mantenimiento',
            status: check.status,
            reason: check.reason,
          });
        }
      }
      return { v, records, findings };
    });
    const vencidos = rows.reduce((s, r) => s + r.findings.filter((f) => f.status === 'vencido').length, 0);
    const proximos = rows.reduce((s, r) => s + r.findings.filter((f) => f.status === 'proximo').length, 0);
    return { rows, vencidos, proximos };
  }

  private maintenanceAdvice(): string {
    const { rows, vencidos, proximos } = this.findingsPerVehicle();
    const lines: string[] = [];

    for (const { v, records, findings } of rows) {
      if (findings.length > 0) {
        lines.push(`**${v.brand} ${v.model} (${v.license_plate || (v.unit_number ? 'N° ' + v.unit_number : 'sin dominio')}) — ${v.current_km.toLocaleString('es-AR')} km:**`);
        for (const f of findings) {
          const icon = f.status === 'vencido' ? '🔴' : '🟡';
          lines.push(`${icon} **${f.name}**: ${f.reason}`);
        }
        lines.push('');
      } else if (records.length > 0) {
        lines.push(`🟢 **${v.brand} ${v.model}**: todos los mantenimientos registrados están al día.`);
        lines.push('');
      }
    }

    if (lines.length === 0) {
      return `No tengo registros de mantenimiento para calcular próximos servicios.\n\n💡 Cargá un mantenimiento desde el detalle de cada vehículo y te recomiendo cuándo toca el próximo control.`;
    }

    const resumen = `Se detectaron **${vencidos} vencidos** y **${proximos} próximos** en total.\n\n`;
    return `${resumen}${lines.join('\n')}\n\n🔧 Podés registrar los servicios realizados para actualizar estas recomendaciones.`;
  }

  /* ------------------------------------------------------------------ */
  /* Guías por pieza/componente                                          */
  /* ------------------------------------------------------------------ */

  private buildPartGuide(q: string): string | null {
    const all = this.maintenancesService.maintenances();
    const types = this.typesService.types();
    const vehicles = this.vehiclesService.vehicles();

    const topic = TOPIC_GUIDES.find((t) => t.keywords.some((k) => q.includes(this.normalize(k))));
    if (!topic) return null;

    const targetTypes = types.filter((t) => topic.keywords.some((k) => this.normalize(t.name).includes(this.normalize(k))));
    const matches = all
      .filter((m) => targetTypes.some((t) => t.id === m.maintenance_type_id))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    let head: string;
    if (matches.length > 0) {
      const last = matches[0];
      const v = vehicles.find((x) => x.id === last.vehicle_id);
      const ty = targetTypes.find((t) => t.id === last.maintenance_type_id);
      const costLine = Number(last.cost) > 0 ? ` · **$${Number(last.cost).toLocaleString('es-AR')}**` : '';
      head =
        `**Último ${this.normalize(ty?.name ?? topic.label)} registrado:**\n` +
        `• Vehículo: **${v ? `${v.brand} ${v.model}` : '—'}**\n` +
        `• Fecha: **${new Date(last.date).toLocaleDateString('es-AR')}** · KM: **${last.kilometers.toLocaleString('es-AR')}**${costLine}\n\n`;
    } else {
      const word = topic.keywords[0][0].toUpperCase() + topic.keywords[0].slice(1);
      head = `No tengo registros de **${word}** en tu historial. Si ya lo hiciste, cargalo desde el detalle del vehículo.\n\n`;
    }

    return `${head}🔧 **Mi recomendación para ${topic.label}:** ${topic.guide}`;
  }

  /* ------------------------------------------------------------------ */
  /* Gastos y combustible                                                */
  /* ------------------------------------------------------------------ */

  private expenseReport(): string {
    const expenses = this.expensesService.expenses();
    const vehicles = this.vehiclesService.vehicles();
    if (expenses.length === 0) {
      return `Todavía no registraste gastos, así que no puedo mostrarte un reporte.\n\n💰 Registrá gastos (combustible, seguro, etc.) en la pantalla "Gastos" para que pueda analizarlos.`;
    }

    const now = new Date();
    const month = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);

    const year = expenses
      .filter((e) => new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((s, e) => s + Number(e.amount), 0);

    const byCategory = new Map<string, number>();
    for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    const perVehicle = new Map<string, number>();
    for (const e of expenses) perVehicle.set(e.vehicle_id, (perVehicle.get(e.vehicle_id) ?? 0) + Number(e.amount));
    const topVehicle = [...perVehicle.entries()].sort((a, b) => b[1] - a[1])[0];
    const v = topVehicle ? vehicles.find((x) => x.id === topVehicle[0]) : null;

    return [
      '📊 **Reporte de gastos**',
      '',
      `• Gasto del mes actual: **$${month.toLocaleString('es-AR')}**`,
      `• Gasto del año actual: **$${year.toLocaleString('es-AR')}**`,
      `• Rubro más fuerte: **${topCategory[0]}** ($${Number(topCategory[1]).toLocaleString('es-AR')})`,
      topVehicle && v ? `• Vehículo con mayor gasto: **${v.brand} ${v.model}** ($${Number(topVehicle[1]).toLocaleString('es-AR')})` : '',
      '',
      '💡 Querés más detalle? Cargá los gastos al día y preguntame de nuevo.',
    ].filter(Boolean).join('\n');
  }

  private fuelReport(q: string): string {
    const expenses = this.expensesService.expenses();
    const vehicles = this.vehiclesService.vehicles();
    const fuel = expenses.filter((e) => e.category === 'Combustible');

    if (fuel.length === 0) {
      return `No registré cargas de **combustible** todavía.\n\n⛽ Si cargás tus cargas de nafta en la pantalla "Gastos" (categoría Combustible), puedo estimar tu consumo y gasto mensual.`;
    }

    const veh = this.pickVehicle(q);
    const pool = veh ? fuel.filter((e) => e.vehicle_id === veh.id) : fuel;
    if (pool.length === 0) {
      return `No tengo cargas de combustible registradas para **${veh!.brand} ${veh!.model}**.\n\nRegistralas en la pantalla "Gastos" y te calculo el consumo.`;
    }

    const now = new Date();
    const windowMs = 12 * 30 * 24 * 60 * 60 * 1000;
    const recent = pool.filter((e) => now.getTime() - new Date(e.date).getTime() < windowMs);
    const mesesConCarga = new Set(recent.map((e) => `${new Date(e.date).getMonth()}-${new Date(e.date).getFullYear()}`));
    const total = recent.reduce((s, e) => s + Number(e.amount), 0);
    const promedioMensual = mesesConCarga.size > 0 ? total / mesesConCarga.size : total;

    const year = pool
      .filter((e) => new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((s, e) => s + Number(e.amount), 0);

    const lines: string[] = [
      `⛽ **Reporte de combustible${veh ? ` — ${veh.brand} ${veh.model}` : ''}**`,
      '',
      `• Promedio mensual (últimos 12 meses): **$${promedioMensual.toLocaleString('es-AR')}**`,
      `• Gasto en combustible del año: **$${year.toLocaleString('es-AR')}**`,
    ];

    if (!veh && vehicles.length > 1) {
      const perVehicle = new Map<string, number>();
      for (const e of fuel) perVehicle.set(e.vehicle_id, (perVehicle.get(e.vehicle_id) ?? 0) + Number(e.amount));
      const top = [...perVehicle.entries()].sort((a, b) => b[1] - a[1])[0];
      const v = vehicles.find((x) => x.id === top?.[0]);
      if (top && v) lines.push(`• Vehículo con más gasto de combustible: **${v.brand} ${v.model}** ($${Number(top[1]).toLocaleString('es-AR')})`);
    }

    lines.push('', '💡 Si cargás litros en la nota del gasto, puedo estimar el consumo por km.');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Documentos con vencimiento real                                     */
  /* ------------------------------------------------------------------ */

  private documentsReport(): string {
    const docs = this.documentsService.documents();
    const vehicles = this.vehiclesService.vehicles();

    if (docs.length === 0) {
      return `No tenés documentos registrados todavía.\n\n📄 Cargá seguro, VTV/RTO, patente o cédula en la pantalla "Documentación" y voy a avisarte cuándo vencen.`;
    }

    const now = new Date();
    const rows = docs
      .map((d) => {
        const v = vehicles.find((x) => x.id === d.vehicle_id);
        const label = v ? `${v.brand} ${v.model}` : '—';
        let status: 'vencido' | 'proximo' | 'vigente' | 'sinfecha';
        let days = Infinity;
        if (!d.expiration_date) status = 'sinfecha';
        else {
          days = Math.ceil((new Date(d.expiration_date).getTime() - now.getTime()) / 86400000);
          status = days < 0 ? 'vencido' : days <= 30 ? 'proximo' : 'vigente';
        }
        return { d, label, status, days };
      })
      .sort((a, b) => a.days - b.days);

    const vencidos = rows.filter((r) => r.status === 'vencido').length;
    const proximos = rows.filter((r) => r.status === 'proximo').length;

    const statusText = (r: { status: string; days: number }) => {
      if (r.status === 'vencido') return '🔴 vencido';
      if (r.status === 'proximo') return `🟡 vence en ${r.days === 0 ? 'hoy' : `${r.days} día${r.days === 1 ? '' : 's'}`}`;
      if (r.status === 'vigente') return `🟢 vigente (vence en ${r.days} días)`;
      return '⚪ sin fecha de vencimiento';
    };

    const lines: string[] = ['📄 **Estado de tus documentos**', ''];
    for (const r of rows) {
      lines.push(`• **${r.d.type}** (${r.label}) — ${statusText(r)}`);
    }
    lines.push('', `En total: **${vencidos} vencidos**, **${proximos} próximos** y el resto vigentes.`);

    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Análisis, resumen y atención                                        */
  /* ------------------------------------------------------------------ */

  private analysis(): string {
    const vehicles = this.vehiclesService.vehicles();
    const all = this.maintenancesService.maintenances();
    const expenses = this.expensesService.expenses();
    const types = this.typesService.types();

    if (all.length === 0 && expenses.length === 0) {
      return `Aún no hay datos suficientes para un análisis: no registraste mantenimientos ni gastos.`;
    }

    const lines: string[] = ['🧾 **Análisis del historial**', ''];

    if (vehicles.length > 0) {
      lines.push(`**Vehículos registrados:** ${vehicles.length}`);
      for (const v of vehicles) {
        const maint = all.filter((m) => m.vehicle_id === v.id);
        const exp = expenses.filter((e) => e.vehicle_id === v.id);
        const totalMaint = maint.reduce((s, m) => s + Number(m.cost), 0);
        const totalExp = exp.reduce((s, e) => s + Number(e.amount), 0);
        lines.push(
          `• **${v.brand} ${v.model}**: ${maint.length} mantenimientos · inversión en servicio $${totalMaint.toLocaleString('es-AR')} · gastos totales $${totalExp.toLocaleString('es-AR')}.`,
        );
      }
      lines.push('');
    }

    if (all.length > 0) {
      const byType = new Map<string, number>();
      for (const m of all) byType.set(m.maintenance_type_id, (byType.get(m.maintenance_type_id) ?? 0) + 1);
      const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
      const typeName = types.find((t) => t.id === topType?.[0])?.name ?? 'Mantenimiento';
      lines.push(`**Tipo más frecuente:** ${typeName} (${topType?.[1] ?? 0} veces).`);

      const costTotal = all.reduce((s, m) => s + Number(m.cost), 0);
      lines.push(`**Inversión total en mantenimiento:** $${costTotal.toLocaleString('es-AR')}`);
    }

    if (expenses.length > 0) {
      const byCat = new Map<string, number>();
      for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
      const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) lines.push(`**Mayor rubro de gasto:** ${top[0]} ($${Number(top[1]).toLocaleString('es-AR')}).`);
    }

    return lines.join('\n');
  }

  private overview(): string {
    const vehicles = this.vehiclesService.vehicles();
    const { rows, vencidos, proximos } = this.findingsPerVehicle();
    const expenses = this.expensesService.expenses();
    const now = new Date();
    const gastosAnio = expenses
      .filter((e) => new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((s, e) => s + Number(e.amount), 0);
    const kmTotal = vehicles.reduce((s, v) => s + v.current_km, 0);

    const lines: string[] = [
      '🚙 **Vista general de tu parque automotor**',
      '',
      `• Vehículos registrados: **${vehicles.length}** · kilómetros acumulados: **${kmTotal.toLocaleString('es-AR')} km**`,
      `• Mantenimientos: **${vencidos} vencidos** y **${proximos} próximos**`,
      `• Gastos del año: **$${gastosAnio.toLocaleString('es-AR')}**`,
      '',
    ];

    for (const { v, findings } of rows) {
      const pendientes = findings.filter((f) => f.status !== 'normal');
      const icon = pendientes.length > 0 ? (pendientes.some((f) => f.status === 'vencido') ? '🔴' : '🟡') : '🟢';
      lines.push(`${icon} **${v.brand} ${v.model}** (${v.current_km.toLocaleString('es-AR')} km): ${pendientes.length > 0 ? `**${pendientes.length}** pendiente${pendientes.length === 1 ? '' : 's'}` : 'al día'}.`);
    }

    lines.push('', '¿Querés que profundice en alguno? Preguntámelo.', '');
    return lines.join('\n');
  }

  private attentionReport(): string {
    const { rows, vencidos, proximos } = this.findingsPerVehicle();
    const sorted = [...rows].sort((a, b) => {
      const pa = a.findings.filter((f) => f.status !== 'normal').length;
      const pb = b.findings.filter((f) => f.status !== 'normal').length;
      return pb - pa;
    });

    if (vencidos === 0 && proximos === 0) {
      return `🎉 Buenas noticias: **todos tus vehículos están al día**. No hay mantenimientos vencidos ni próximos según lo registrado.\n\nSeguí registrando servicios para mantener el control.`;
    }

    const top = sorted[0];
    const pendientes = top.findings.filter((f) => f.status !== 'normal');
    const lines: string[] = [
      `🎯 El vehículo que **necesita más atención** es **${top.v.brand} ${top.v.model}** (${top.v.current_km.toLocaleString('es-AR')} km) con **${pendientes.length}** pendiente${pendientes.length === 1 ? '' : 's'}:`,
      '',
    ];
    for (const f of pendientes) {
      lines.push(`${f.status === 'vencido' ? '🔴' : '🟡'} **${f.name}**: ${f.reason}`);
    }
    lines.push('', 'Respondeme "¿Qué mantenimiento debería hacer próximamente?" para ver el detalle completo de todos.');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Consejos estacionales y de viaje                                    */
  /* ------------------------------------------------------------------ */

  private seasonTips(q: string): string {
    if (q.includes('invierno')) {
      return [
        '❄️ **Prepárate para el invierno:**',
        '',
        '• **Batería**: el frío la castiga; si tiene más de 3 años, hacé revisar la carga.',
        '• **Anticongelante**: controlá el nivel y que la mezcla aguante bajas temperaturas.',
        '• **Cubiertas**: el dibujo debe estar en buen estado; considerá cubiertas de invierno en zonas de nieve/hielo.',
        '• **Escarcha**: usá líquido limpiaparabrisas concentrado y revisá las escobillas.',
        '• **Luces**: revenes mal tiempo, verificá faros, antiniebla y desempañador.',
        '',
        '¿Querés que te recuerde el próximo mantenimiento de alguno de tus vehículos?',
      ].join('\n');
    }
    return [
      '☀️ **Cuida tu auto en verano:**',
      '',
      '• **Aire acondicionado**: máx usuario; si tarda en enfriar, revisá la carga del gas.',
      '• **Refrigerante**: vigilá la temperatura en viajes largos y el nivel del líquido.',
      '• **Presión de cubiertas**: el calor la aumenta; controlala con el motor en frío y según la carga.',
      '• **Sol e interior**: usá parasol; protege tablero y cueros del deterioro.',
      '• **Lavado en sombra**: evitá el secado rápido con manchas.',
      '',
      '¿Querés que repase el estado de mantenimiento de algún vehículo?',
    ].join('\n');
  }

  private tripTips(): string {
    const { vencidos, proximos } = this.findingsPerVehicle();
    const seguro = this.documentsService.documents().some((d) => /seguro/i.test(d.type));

    const lines: string[] = [
      '🧳 **Checklist para el viaje en tu auto:**',
      '',
      '• **Niveles**: aceite, refrigerante, líquido limpiaparabrisas y frenos.',
      '• **Cubiertas**: presión (incluida la auxilio) y estado del dibujo.',
      '• **Frenos y luces**: probalos antes de salir; llevá repuestos de lámparas.',
      '• **Documentación**: VTV/RTO, cédula de conducción, patente y **seguro** vigente.',
      '• **Seguridad**: balizas, matafuego, botiquín y cubierta/triángulo.',
      '• **Confort**: iniciar el viaje con el tanque lleno y paradas para descansar.',
    ];

    if (seguro) lines.push('', '✅ Tenés registrado un seguro en Documentación.');
    else lines.push('', '⚠️ No detecté un seguro registrado: cargalo en Documentación antes de salir.');
    if (vencidos > 0 || proximos > 0) {
      lines.push(`🔧 Además, tenés **${vencidos} mantenimientos vencidos** y **${proximos} próximos**: considerá regularlos antes del viaje.`);
    } else {
      lines.push('🎉 Y no tenés mantenimientos vencidos: buen momento para salir tranquilo.');
    }

    return lines.join('\n');
  }

  /** Respuesta cuando no se entiende la consulta: ofrece temas con los que sí puede ayudar. */
  private fallback(question: string): string {
    const lines: string[] = [`Entiendo tu consulta: "${question}".`, '', 'Con tus datos puedo ayudarte con:', ''];
    for (const cat of SUGGESTION_CATEGORIES) {
      lines.push(`**${cat.title}**`, ...cat.items.slice(0, 2).map((s) => `• "${s}"`), '');
    }
    lines.push('Elegí una pregunta sugerida o escribime tu consulta con otras palabras.');
    return lines.join('\n');
  }
}