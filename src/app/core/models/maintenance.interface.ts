export interface MaintenanceType {
  id: string;
  name: string;
  description: string | null;
  recommended_km: number | null;
  recommended_months: number | null;
  created_at: string;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  maintenance_type_id: string;
  date: string;
  kilometers: number;
  description: string | null;
  cost: number;
  workshop: string | null;
  notes: string | null;
  created_at: string;
}

/** Mantenimiento con el nombre del tipo, para listas e historial. */
export interface MaintenanceWithType extends Maintenance {
  maintenance_type?: { name: string } | null;
}

export interface MaintenancePayload {
  vehicle_id: string;
  maintenance_type_id: string;
  date: string;
  kilometers: number;
  description: string | null;
  cost: number;
  workshop: string | null;
  notes: string | null;
}
