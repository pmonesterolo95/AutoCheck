/** Tipo de vehículo o automotor del catálogo (auto, moto, camión, etc.). */
export interface VehicleType {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  created_at: string;
}