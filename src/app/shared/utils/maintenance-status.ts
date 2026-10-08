import { MaintenanceStatus } from '../../core/models/enums';
import { MaintenanceType } from '../../core/models/maintenance.interface';

export interface MaintenanceCheck {
  status: MaintenanceStatus;
  label: string;
  reason: string;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula el estado de un tipo de mantenimiento para un vehículo:
 * 🟢 normal, 🟡 próximo a vencer, 🔴 vencido.
 *
 * Se compara el kilometraje actual contra el intervalo recomendado del tipo
 * y la fecha del último servicio contra los meses recomendados.
 */
export function checkMaintenance(
  types: MaintenanceType[],
  typeId: string,
  currentKm: number,
  lastMaintenanceDate: string | null,
  lastMaintenanceKm: number | null,
): MaintenanceCheck {
  const type = types.find((t) => t.id === typeId);
  if (!type) return { status: 'normal', label: 'Normal', reason: 'Tipo de mantenimiento sin configuración.' };

  if (!lastMaintenanceDate && !lastMaintenanceKm) {
    return { status: 'normal', label: 'Sin registro', reason: 'Todavía no se registró este mantenimiento.' };
  }

  const hasIntervalKm = type.recommended_km != null && lastMaintenanceKm != null;
  const hasIntervalMonths = type.recommended_months != null && lastMaintenanceDate != null;

  let overdue = false;
  let upcoming = false;
  const reasons: string[] = [];

  if (hasIntervalKm) {
    const nextKm = lastMaintenanceKm! + type.recommended_km!;
    const remaining = nextKm - currentKm;
    if (remaining <= 0) overdue = true;
    else if (remaining <= Math.max(1000, type.recommended_km! * 0.2)) upcoming = true;
    reasons.push(`próximo cambio a los ${nextKm.toLocaleString('es-AR')} km`);
  }

  if (hasIntervalMonths) {
    const nextDate = addMonths(new Date(lastMaintenanceDate!), type.recommended_months!);
    const remaining = daysBetween(new Date(), nextDate);
    if (remaining <= 0) overdue = true;
    else if (remaining <= 30) upcoming = true;
    reasons.push(`próximo cambio el ${nextDate.toLocaleDateString('es-AR')}`);
  }

  if (overdue) return { status: 'vencido', label: 'Vencido', reason: `Vencido: ${reasons.join(' · ')}.` };
  if (upcoming) return { status: 'proximo', label: 'Próximo a vencer', reason: `Próximo a vencer: ${reasons.join(' · ')}.` };
  return { status: 'normal', label: 'Normal', reason: `Al día: ${reasons.join(' · ')}.` };
}