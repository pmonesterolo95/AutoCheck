import type { MaintenanceType } from '../../core/models/maintenance.interface';
import type { MaintenanceWithType } from '../../core/models/maintenance.interface';
import type { Vehicle } from '../../core/models/vehicle.interface';
import type { VehicleDocument } from '../../core/models/document.interface';
import type { Reminder } from '../../core/models/reminder.interface';

export interface TimelineItem {
  date: Date;
  dateLabel: string;
  title: string;
  detail: string;
  kind: 'documento' | 'recordatorio' | 'service';
  severity: 'vencido' | 'proximo';
  link: string[];
}

export interface TimelineInput {
  vehicles: Vehicle[];
  maintenances: MaintenanceWithType[];
  types: MaintenanceType[];
  documents: VehicleDocument[];
  reminders: Reminder[];
  vehicleLabel: (id: string) => string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

function addMonthsTo(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

/**
 * Fusiona documentos, recordatorios y próximos services en una
 * línea de tiempo ordenada (vencidos primero). Reusado por el
 * dashboard y el calendario.
 */
export function buildTimeline(input: TimelineInput, horizonDays = 90, limit = 10): TimelineItem[] {
  const { vehicles, maintenances, types, documents, reminders, vehicleLabel } = input;
  const items: TimelineItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + horizonDays * DAY_MS);

  for (const doc of documents) {
    if (!doc.expiration_date) continue;
    const date = parseIsoDate(doc.expiration_date);
    if (date > horizon) continue;
    const overdue = date < today;
    items.push({
      date,
      dateLabel: overdue
        ? `Vencido el ${date.toLocaleDateString('es-AR')}`
        : `Vence el ${date.toLocaleDateString('es-AR')}`,
      title: `${doc.type}`,
      detail: vehicleLabel(doc.vehicle_id),
      kind: 'documento',
      severity: overdue ? 'vencido' : 'proximo',
      link: ['/vehicles', doc.vehicle_id, 'documents'],
    });
  }

  for (const r of reminders) {
    if (r.status === 'completado' || !r.reminder_date) continue;
    const date = parseIsoDate(r.reminder_date);
    if (date > horizon) continue;
    const overdue = date < today;
    const kmPart = r.reminder_km != null ? ` · ${Number(r.reminder_km).toLocaleString('es-AR')} km` : '';
    items.push({
      date,
      dateLabel: overdue
        ? `Vencido el ${date.toLocaleDateString('es-AR')}${kmPart}`
        : `${date.toLocaleDateString('es-AR')}${kmPart}`,
      title: r.title,
      detail: vehicleLabel(r.vehicle_id),
      kind: 'recordatorio',
      severity: overdue ? 'vencido' : 'proximo',
      link: ['/vehicles', r.vehicle_id, 'reminders'],
    });
  }

  for (const v of vehicles) {
    const records = maintenances.filter((m) => m.vehicle_id === v.id);
    const byType = new Map<string, typeof records>();
    for (const m of records) {
      if (!byType.has(m.maintenance_type_id)) byType.set(m.maintenance_type_id, []);
      byType.get(m.maintenance_type_id)!.push(m);
    }
    for (const [typeId, list] of byType) {
      const type = types.find((t) => t.id === typeId);
      if (!type?.recommended_months) continue;
      const last = [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const next = addMonthsTo(parseIsoDate(last.date), type.recommended_months);
      if (next > horizon) continue;
      const overdue = next < today;
      items.push({
        date: next,
        dateLabel: overdue
          ? `Vencido el ${next.toLocaleDateString('es-AR')}`
          : `Toca el ${next.toLocaleDateString('es-AR')}`,
        title: `Próximo service: ${type.name}`,
        detail: vehicleLabel(v.id),
        kind: 'service',
        severity: overdue ? 'vencido' : 'proximo',
        link: ['/vehicles', v.id, 'maintenances'],
      });
    }
  }

  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'vencido' ? -1 : 1;
    return a.date.getTime() - b.date.getTime();
  });
  return items.slice(0, limit);
}
