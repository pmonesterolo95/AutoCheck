import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { Maintenance, MaintenancePayload, MaintenanceWithType } from '../models/maintenance.interface';

@Injectable({ providedIn: 'root' })
export class MaintenancesService {
  readonly maintenances = signal<MaintenanceWithType[]>([]);
  readonly loading = signal(false);

  /** Carga el historial de un vehículo (o de todos los vehículos si id es null). */
  async load(vehicleId: string | null = null): Promise<void> {
    this.loading.set(true);

    let query = supabase
      .from('maintenances')
      .select('*, maintenance_type:maintenance_types(name)')
      .order('date', { ascending: false });

    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;

    this.loading.set(false);
    if (error) {
      console.warn('Error al cargar mantenimientos:', error.message);
      return;
    }
    this.maintenances.set((data ?? []) as MaintenanceWithType[]);
  }

  async getById(id: string): Promise<Maintenance | null> {
    const { data, error } = await supabase.from('maintenances').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return (data as Maintenance) ?? null;
  }

  async create(payload: MaintenancePayload): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenances').insert(payload);
    return { error: error?.message ?? null };
  }

  async update(id: string, payload: Partial<MaintenancePayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenances').update(payload).eq('id', id);
    return { error: error?.message ?? null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}