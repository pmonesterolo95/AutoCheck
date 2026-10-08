import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { VehicleDocument, DocumentPayload } from '../models/document.interface';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  readonly documents = signal<VehicleDocument[]>([]);
  readonly loading = signal(false);

  async load(vehicleId: string | null = null): Promise<void> {
    this.loading.set(true);

    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;
    this.loading.set(false);
    if (error) {
      console.warn('Error al cargar documentos:', error.message);
      return;
    }
    this.documents.set((data ?? []) as VehicleDocument[]);
  }

  async create(payload: DocumentPayload): Promise<{ error: string | null }> {
    const { error } = await supabase.from('documents').insert(payload);
    return { error: error?.message ?? null };
  }

  async update(id: string, payload: Partial<DocumentPayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from('documents').update(payload).eq('id', id);
    return { error: error?.message ?? null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}