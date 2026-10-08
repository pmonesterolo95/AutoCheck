export type Role = 'USER' | 'ADMIN';

export type FuelType = 'Nafta' | 'Diésel' | 'Eléctrico' | 'Híbrido' | 'GLP' | 'GNC';

export type MaintenanceStatus = 'normal' | 'proximo' | 'vencido';

export type ReminderStatus = 'pendiente' | 'completado' | 'vencido';

export type DocumentStatus = 'vigente' | 'proximo' | 'vencido';

export type NotificationType = 'info' | 'alerta' | 'vencimiento' | 'mantenimiento';

export type ExpenseCategory =
  | 'Combustible'
  | 'Seguro'
  | 'Impuestos'
  | 'Peajes'
  | 'Lavado'
  | 'Reparación'
  | 'Estacionamiento'
  | 'Otros';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Combustible',
  'Seguro',
  'Impuestos',
  'Peajes',
  'Lavado',
  'Reparación',
  'Estacionamiento',
  'Otros',
];

export const FUEL_TYPES: FuelType[] = ['Nafta', 'Diésel', 'Eléctrico', 'Híbrido', 'GLP', 'GNC'];

export const DOCUMENT_TYPES = ['Seguro', 'VTV/RTO', 'Patente', 'Cédula de identificación', 'Otros'];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  vigente: 'Vigente',
  proximo: 'Próximo a vencer',
  vencido: 'Vencido',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  normal: 'Normal',
  proximo: 'Próximo a vencer',
  vencido: 'Vencido',
};
