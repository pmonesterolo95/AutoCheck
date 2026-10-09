import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { FuelLog, FuelLogPayload } from '../models/fuel-log.interface';

@Injectable({ providedIn: 'root' })
export class FuelService {
  readonly logs = signal<FuelLog[]>([]);
  readonly loading = signal(false);
  /** true si falta correr supabase/migration-fuel-logs.sql */
  readonly needsMigration = signal(false);

  async load(vehicleId: string | null = null): Promise<void> {
    this.loading.set(true);
    this.needsMigration.set(false);

    let query = supabase
      .from('fuel_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('kilometers', { ascending: false });
    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;
    this.loading.set(false);
    if (error) {
      // 42P01 = tabla inexistente -> falta la migración, no es un error fatal.
      if ((error as { code?: string }).code === '42P01' || /does not exist|schema cache/i.test(error.message)) {
        this.needsMigration.set(true);
        this.logs.set([]);
        return;
      }
      console.warn('Error al cargar combustible:', error.message);
      return;
    }
    this.logs.set((data ?? []) as FuelLog[]);
  }

  async create(payload: FuelLogPayload): Promise<{ error: string | null }> {
    const { error } = await supabase.from('fuel_logs').insert(payload);
    return { error: error?.message ?? null };
  }

  async update(id: string, payload: Partial<FuelLogPayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from('fuel_logs').update(payload).eq('id', id);
    return { error: error?.message ?? null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}
