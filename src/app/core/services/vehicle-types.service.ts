import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { VehicleType } from '../models/vehicle-type.interface';

@Injectable({ providedIn: 'root' })
export class VehicleTypesService {
  readonly types = signal<VehicleType[]>([]);

  async load(): Promise<void> {
    const { data, error } = await supabase.from('vehicle_types').select('*').order('name', { ascending: true });
    if (error) {
      console.warn('Error al cargar tipos de vehículo:', error.message);
      return;
    }
    this.types.set((data ?? []) as VehicleType[]);
  }

  /** Devuelve la lista cargada (asegurando la primera carga). */
  async ensureLoaded(): Promise<VehicleType[]> {
    if (this.types().length === 0) await this.load();
    return this.types();
  }

  /** Ícono para un vehículo según su tipo (fallback 🚗). */
  iconOf(vehicleTypeId: string | null | undefined): string {
    if (!vehicleTypeId) return '🚗';
    return this.types().find((t) => t.id === vehicleTypeId)?.icon ?? '🚗';
  }

  /** Nombre corto de un tipo (fallback "—"). */
  nameOf(vehicleTypeId: string | null | undefined): string {
    if (!vehicleTypeId) return '—';
    return this.types().find((t) => t.id === vehicleTypeId)?.name ?? '—';
  }

  async create(name: string, icon: string, description: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('vehicle_types').insert({ name, icon, description });
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }

  async update(id: string, changes: { name: string; icon: string; description: string }): Promise<{ error: string | null }> {
    const { error } = await supabase.from('vehicle_types').update(changes).eq('id', id);
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('vehicle_types').delete().eq('id', id);
    if (error) return { error: error.message };
    await this.load();
    return { error: null };
  }
}