export interface FuelLog {
  id: string;
  vehicle_id: string;
  date: string;
  kilometers: number;
  liters: number;
  amount: number;
  full_tank: boolean;
  station: string | null;
  notes: string | null;
  created_at: string;
}

export interface FuelLogPayload {
  vehicle_id: string;
  date: string;
  kilometers: number;
  liters: number;
  amount: number;
  full_tank: boolean;
  station: string | null;
  notes: string | null;
}

/** Un tramo medido entre dos cargas a tanque lleno. */
export interface FuelConsumption {
  logId: string;
  date: string;
  kmPerLiter: number;
  kmDriven: number;
  liters: number;
}

/**
 * Calcula consumos (km/l) entre cargas consecutivas a tanque lleno.
 * Solo los tramos válidos (km crecientes) generan un punto.
 */
export function computeConsumptions(logs: FuelLog[]): FuelConsumption[] {
  const sorted = [...logs].sort((a, b) =>
    a.date === b.date ? a.kilometers - b.kilometers : a.date < b.date ? -1 : 1,
  );
  const out: FuelConsumption[] = [];
  let prev: FuelLog | null = null;
  for (const log of sorted) {
    if (log.full_tank && prev && log.kilometers > prev.kilometers && Number(log.liters) > 0) {
      out.push({
        logId: log.id,
        date: log.date,
        kmDriven: log.kilometers - prev.kilometers,
        liters: Number(log.liters),
        kmPerLiter: (log.kilometers - prev.kilometers) / Number(log.liters),
      });
    }
    if (log.full_tank) prev = log;
  }
  return out;
}
