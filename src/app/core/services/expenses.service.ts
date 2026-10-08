import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { Expense, ExpensePayload } from '../models/expense.interface';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);

  async load(vehicleId: string | null = null): Promise<void> {
    this.loading.set(true);

    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;
    this.loading.set(false);
    if (error) {
      console.warn('Error al cargar gastos:', error.message);
      return;
    }
    this.expenses.set((data ?? []) as Expense[]);
  }

  async create(payload: ExpensePayload): Promise<{ error: string | null }> {
    const { error } = await supabase.from('expenses').insert(payload);
    return { error: error?.message ?? null };
  }

  async update(id: string, payload: Partial<ExpensePayload>): Promise<{ error: string | null }> {
    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    return { error: error?.message ?? null };
  }

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    return { error: error?.message ?? null };
  }
}