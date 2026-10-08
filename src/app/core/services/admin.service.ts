import { Injectable, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { Profile } from '../models/profile.interface';
import { Vehicle } from '../models/vehicle.interface';

export interface AdminStats {
  totalUsers: number;
  totalVehicles: number;
  totalMaintenances: number;
  totalExpenses: number;
  monthExpenses: number;
}

export interface UserWithCounters extends Profile {
  vehicle_count: number;
  expense_total: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly users = signal<UserWithCounters[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly loading = signal(false);

  async getStats(): Promise<AdminStats> {
    const [{ count: users }, { count: vehicles }, { count: maintenances }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('maintenances').select('*', { count: 'exact', head: true }),
    ]);

    const { data: expenses } = await supabase.from('expenses').select('amount, date');
    const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

    const now = new Date();
    const monthExpenses = (expenses ?? [])
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);

    return {
      totalUsers: users ?? 0,
      totalVehicles: vehicles ?? 0,
      totalMaintenances: maintenances ?? 0,
      totalExpenses,
      monthExpenses,
    };
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    this.loading.set(false);
    if (error) {
      console.warn('Error al cargar usuarios:', error.message);
      return;
    }
    const users = (data ?? []) as Profile[];

    // Conteo por usuario (vehículos y gastos totales).
    const enriched: UserWithCounters[] = [];
    for (const u of users) {
      const { count: vCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', u.id);
      const total = await this.userExpenseTotal(u.id);
      enriched.push({
        ...u,
        vehicle_count: vCount ?? 0,
        expense_total: total,
      });
    }
    this.users.set(enriched);
  }

  private async userExpenseTotal(userId: string): Promise<number> {
    const { data: vehicles } = await supabase.from('vehicles').select('id').eq('user_id', userId);
    if (!vehicles || vehicles.length === 0) return 0;
    const ids = vehicles.map((v) => v.id);
    const { data, error } = await supabase.from('expenses').select('amount').in('vehicle_id', ids);
    if (error) return 0;
    return (data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  }

  async loadVehicles(): Promise<void> {
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (!error) this.vehicles.set((data ?? []) as Vehicle[]);
  }

  async setUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<{ error: string | null }> {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) return { error: error.message };
    await this.loadUsers();
    return { error: null };
  }
}