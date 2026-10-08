import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { Reminder, ReminderPayload } from '../models/reminder.interface';
import { ReminderStatus } from '../models/enums';

@Injectable({ providedIn: 'root' })
export class RemindersService {
  readonly reminders = signal<Reminder[]>([]);
  readonly loading = signal(false);

  async load(vehicleId: string | null = null): Promise<void> {
    this.loading.set(true);

    let query = supabase.from('reminders').select('*').order('created_at', { ascending: false });
    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;
    this.loading.set(false);
    if (error) {
      console.warn('Error al cargar recordatorios:', error.message);
      return;
    }
    this.reminders.set((data ?? []) as Reminder[]);
  }

  async create(payload: ReminderPayload): Promise<{ error: string | null }> {
    const { error } = await supabase.from('reminders').insert(payload);
    return { error: error?.message ?? null };
  }

  async update(id: string, payload: Partial<ReminderPayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from('reminders').update(payload).eq('id', id);
    return { error: error?.message ?? null };
  }

  async setStatus(id: string, status: ReminderStatus): Promise<void> {
    await supabase.from('reminders').update({ status }).eq('id', id);
    this.reminders.update((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}