import { Injectable, inject, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { AuthService } from './auth.service';
import { Vehicle, VehiclePayload } from '../models/vehicle.interface';

const TABLE = 'vehicles';

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  private readonly auth = inject(AuthService);

  readonly vehicles = signal<Vehicle[]>([]);
  readonly loading = signal(false);

  async list(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.loading.set(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    this.loading.set(false);
    if (error) {
      console.warn('Error al listar vehículos:', error.message);
      return;
    }
    this.vehicles.set((data ?? []) as Vehicle[]);
  }

  async getById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) {
      console.warn('Error al obtener vehículo:', error.message);
      return null;
    }
    return (data as Vehicle) ?? null;
  }

  async create(payload: VehiclePayload): Promise<{ data: Vehicle | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'No hay sesión activa.' };

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    await this.list();
    return { data: data as Vehicle, error: null };
  }

  async update(id: string, payload: Partial<VehiclePayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from(TABLE).update(payload).eq('id', id);
    if (error) return { error: error.message };
    await this.list();
    return { error: null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) return { error: error.message };
    this.vehicles.update((list) => list.filter((v) => v.id !== id));
    return { error: null };
  }

  /** Actualiza el kilometraje registrado del vehículo. */
  async updateKm(id: string, km: number): Promise<void> {
    await supabase.from(TABLE).update({ current_km: km }).eq('id', id);
  }
}