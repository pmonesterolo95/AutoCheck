import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehiclesService } from '../../core/services/vehicles.service';
import { MaintenancesService } from '../../core/services/maintenances.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { DocumentsService } from '../../core/services/documents.service';
import { RemindersService } from '../../core/services/reminders.service';
import { MaintenanceTypesService } from '../../core/services/maintenance-types.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { AuthService } from '../../core/services/auth.service';
import { supabase } from '../../core/config/supabase.client';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { checkMaintenance } from '../../shared/utils/maintenance-status';
import { documentStatus } from '../../shared/utils/document-status';
import { Vehicle } from '../../core/models/vehicle.interface';
import { MaintenanceStatus } from '../../core/models/enums';

export interface DashboardAlert {
  type: 'vencimiento' | 'mantenimiento' | 'alerta';
  icon: string;
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, StatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly vehiclesService = inject(VehiclesService);
  private readonly maintenancesService = inject(MaintenancesService);
  private readonly expensesService = inject(ExpensesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly remindersService = inject(RemindersService);
  private readonly typesService = inject(MaintenanceTypesService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly auth = inject(AuthService);

  readonly ready = signal(false);
  readonly profile = this.auth.profile;

  firstName(): string {
    const name = this.profile()?.full_name?.trim();
    return name ? name.split(' ')[0] : 'usuario';
  }

  readonly vehicles = this.vehiclesService.vehicles;
  readonly maintenances = this.maintenancesService.maintenances;
  readonly reminders = this.remindersService.reminders;

  constructor() {
    this.loadAll();
  }

  private async loadAll(): Promise<void> {
    await Promise.all([
      this.vehiclesService.list(),
      this.typesService.ensureLoaded(),
      this.maintenancesService.load(null),
      this.expensesService.load(null),
      this.documentsService.load(null),
      this.remindersService.load(null),
    ]);
    this.ready.set(true);
    await this.syncNotifications();
  }

  readonly monthExpenses = computed(() => {
    const now = new Date();
    return this.expensesService
      .expenses()
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);
  });

  readonly lastMaintenances = computed(() => this.maintenancesService.maintenances().slice(0, 5));

  /** Estado general de un vehículo considerando todos sus mantenimientos. */
  vehicleStatus(vehicle: Vehicle): { status: MaintenanceStatus; label: string; reason: string; pending: number } {
    const types = this.typesService.types();
    const records = this.maintenancesService.maintenances().filter((m) => m.vehicle_id === vehicle.id);

    let worst: MaintenanceStatus = 'normal';
    let worstReason = 'Al día.';
    let pending = 0;

    const byType = new Map<string, typeof records>();
    for (const m of records) {
      if (!byType.has(m.maintenance_type_id)) byType.set(m.maintenance_type_id, []);
      byType.get(m.maintenance_type_id)!.push(m);
    }

    for (const [typeId, list] of byType) {
      const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
      const last = sorted[0];
      const check = checkMaintenance(types, typeId, vehicle.current_km, last.date, last.kilometers);
      if (check.status === 'vencido' || (worst === 'normal' && check.status === 'proximo')) {
        worst = check.status;
        worstReason = check.reason;
      }
      if (check.status === 'vencido') pending += 1;
    }
    if (records.length === 0) {
      worstReason = 'Sin mantenimientos registrados.';
    }

    return { status: worst, label: this.statusLabel(worst), reason: worstReason, pending };
  }

  private statusLabel(s: MaintenanceStatus): string {
    return s === 'vencido' ? 'Vencido' : s === 'proximo' ? 'Próximo a vencer' : 'Normal';
  }

  readonly alerts = computed<DashboardAlert[]>(() => {
    const result: DashboardAlert[] = [];

    for (const doc of this.documentsService.documents()) {
      const st = documentStatus(doc.expiration_date);
      if (st.status === 'vencido') {
        result.push({ type: 'vencimiento', icon: '📄', message: `${this.vehicleLabel(doc.vehicle_id)}: documento ${doc.type} vencido.` });
      } else if (st.status === 'proximo') {
        result.push({ type: 'vencimiento', icon: '📄', message: `${this.vehicleLabel(doc.vehicle_id)}: ${doc.type} ${st.label.toLowerCase()}.` });
      }
    }

    for (const r of this.remindersService.reminders()) {
      if (r.status === 'completado') continue;
      const overdue = r.reminder_date && new Date(r.reminder_date) < new Date();
      if (overdue) {
        result.push({ type: 'alerta', icon: '⏰', message: `Recordatorio "${r.title}" vencido (${this.vehicleLabel(r.vehicle_id)}).` });
      }
    }

    for (const v of this.vehiclesService.vehicles()) {
      const st = this.vehicleStatus(v);
      if (st.status === 'vencido') {
        result.push({ type: 'mantenimiento', icon: '🔧', message: `${v.brand} ${v.model}: ${st.reason}` });
      }
    }

    return result.slice(0, 8);
  });

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  totalPending(): number {
    return this.vehicles().reduce((s, v) => s + this.vehicleStatus(v).pending, 0);
  }

  vencimientosProximos(): number {
    let count = 0;
    for (const doc of this.documentsService.documents()) {
      const st = documentStatus(doc.expiration_date);
      if (st.status === 'vencido' || st.status === 'proximo') count++;
    }
    for (const r of this.remindersService.reminders()) {
      if (r.status === 'completado') continue;
      if (r.reminder_date && new Date(r.reminder_date) <= new Date()) count++;
    }
    return count;
  }

  vehicleOf(id: string): Vehicle | undefined {
    return this.vehiclesService.vehicles().find((v) => v.id === id);
  }

  /** Crea notificaciones para las alertas más importantes (una vez por alerta). */
  private async syncNotifications(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const { data: existing } = await supabase
      .from('notifications')
      .select('title')
      .eq('user_id', user.id)
      .eq('is_read', false);

    const titles = new Set((existing ?? []).map((n: { title: string }) => n.title));

    const candidates: { title: string; message: string; type: string }[] = [];
    for (const doc of this.documentsService.documents()) {
      const st = documentStatus(doc.expiration_date);
      if (st.status === 'vencido') {
        candidates.push({ title: `Documento vencido: ${doc.type}`, message: `${this.vehicleLabel(doc.vehicle_id)}: ${doc.type}.`, type: 'vencimiento' });
      } else if (st.status === 'proximo') {
        candidates.push({ title: `Documento próximo a vencer: ${doc.type}`, message: `${this.vehicleLabel(doc.vehicle_id)}: ${st.label}`, type: 'vencimiento' });
      }
    }
    for (const v of this.vehiclesService.vehicles()) {
      const st = this.vehicleStatus(v);
      if (st.status === 'vencido') {
        candidates.push({ title: `Mantenimiento vencido: ${v.brand} ${v.model}`, message: st.reason, type: 'mantenimiento' });
      }
    }

    for (const c of candidates) {
      if (!titles.has(c.title)) {
        await supabase.from('notifications').insert({ user_id: user.id, ...c });
      }
    }
    this.notificationsService.load();
  }
}