import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { MaintenanceType } from '../models/maintenance.interface';

@Injectable({ providedIn: 'root' })
export class MaintenanceTypesService {
  readonly types = signal<MaintenanceType[]>([]);

  async load(): Promise<void> {
    const { data, error } = await supabase
      .from('maintenance_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error al cargar tipos de mantenimiento:', error.message);
      return;
    }
    this.types.set((data ?? []) as MaintenanceType[]);
  }

  /** Devuelve la lista cargada (asegurando la primera carga). */
  async ensureLoaded(): Promise<MaintenanceType[]> {
    if (this.types().length === 0) await this.load();
    return this.types();
  }

  async create(name: string, description: string, recommendedKm: number | null, recommendedMonths: number | null): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenance_types').insert({ name, description, recommended_km: recommendedKm, recommended_months: recommendedMonths });
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }

  async update(id: string, changes: { name: string; description: string; recommended_km: number | null; recommended_months: number | null }): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenance_types').update(changes).eq('id', id);
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('maintenance_types').delete().eq('id', id);
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }
}