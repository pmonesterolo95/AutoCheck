import { DocumentStatus } from '../../core/models/enums';

/** Calcula el estado de un documento según su fecha de vencimiento. */
export function documentStatus(expirationDate: string | null): { status: DocumentStatus; label: string } {
  if (!expirationDate) return { status: 'vigente', label: 'Sin vencimiento' };

  const today = new Date();
  const exp = new Date(expirationDate);
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { status: 'vencido', label: `Vencido hace ${Math.abs(daysLeft)} días` };
  if (daysLeft <= 30) return { status: 'proximo', label: `Vence en ${daysLeft} días` };
  return { status: 'vigente', label: `Vigente · vence el ${exp.toLocaleDateString('es-AR')}` };
}