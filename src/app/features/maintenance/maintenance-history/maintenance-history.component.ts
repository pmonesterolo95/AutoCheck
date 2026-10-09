import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MaintenancesService } from '../../../core/services/maintenances.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { PaginatorComponent, loadPageSize } from '../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-maintenance-history',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, PaginatorComponent],
  templateUrl: './maintenance-history.component.html',
  styleUrl: './maintenance-history.component.scss',
})
export class MaintenanceHistoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly maintenances = inject(MaintenancesService);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly confirm = inject(ConfirmService);

  /** Vehículo filtrado (null = todos los vehículos). */
  readonly vehicleId = this.route.snapshot.params['id'] ?? null;
  readonly list = this.maintenances.maintenances;
  readonly loading = this.maintenances.loading;
  readonly deleting = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(loadPageSize('pg-maint'));
  readonly pagedList = computed(() =>
    this.list().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()),
  );

  constructor() {
    if (!this.vehicleId) {
      this.vehiclesService.list();
    }
    this.maintenances.load(this.vehicleId);
  }

  goCreate(): void {
    const first = this.vehiclesService.vehicles()[0];
    if (first) {
      this.router.navigate(['/vehicles', first.id, 'maintenance', 'new']);
    } else {
      this.router.navigate(['/vehicles']);
    }
  }

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model} (${v.license_plate})` : 'Vehículo';
  }

  async remove(id: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar mantenimiento',
      message: '¿Querés eliminar este registro de mantenimiento? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.deleting.set(id);
    const { error } = await this.maintenances.delete(id);
    this.deleting.set(null);
    if (error) return;
    await this.maintenances.load(this.vehicleId);
    this.clampPage();
  }

  /** Si al borrar quedó una página vacía, vuelve a la última con datos. */
  private clampPage(): void {
    const max = Math.max(1, Math.ceil(this.list().length / this.pageSize()));
    if (this.page() > max) this.page.set(max);
  }
}