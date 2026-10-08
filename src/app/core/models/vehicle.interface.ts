import { FuelType, MaintenanceStatus } from './enums';

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  current_km: number;
  fuel_type: FuelType;
  vehicle_type_id: string | null;
  unit_number: string | null;
  purchase_date: string | null;
  image_url: string | null;
  created_at: string;
}

/** Vehículo con datos calculados para mostrar en listas y dashboard. */
export interface VehicleStatus {
  vehicle: Vehicle;
  status: MaintenanceStatus;
  statusMessage: string;
  pendingMaintenance: number;
  nextDueDate: string | null;
}

export interface VehiclePayload {
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  current_km: number;
  fuel_type: FuelType;
  vehicle_type_id?: string | null;
  unit_number?: string | null;
  purchase_date: string | null;
  image_url?: string | null;
}
