export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  type: string;
  expiration_date: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface DocumentPayload {
  vehicle_id: string;
  type: string;
  expiration_date: string | null;
  document_url: string | null;
  notes: string | null;
}
