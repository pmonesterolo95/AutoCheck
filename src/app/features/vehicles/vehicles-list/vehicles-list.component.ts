import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { VehicleTypesService } from '../../../core/services/vehicle-types.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vehicles-list.component.html',
  styleUrl: './vehicles-list.component.scss',
})
export class VehiclesListComponent {
  readonly vehiclesService = inject(VehiclesService);
  readonly vehicleTypes = inject(VehicleTypesService);
  private readonly confirm = inject(ConfirmService);

  readonly typeFilter = signal<string>('');

  readonly filteredVehicles = computed(() => {
    const type = this.typeFilter();
    if (!type) return this.vehiclesService.vehicles();
    return this.vehiclesService.vehicles().filter((v) => v.vehicle_type_id === type);
  });

  constructor() {
    this.vehiclesService.list();
    this.vehicleTypes.ensureLoaded();
  }

  typeIcon(vehicleTypeId: string | null | undefined): string {
    return this.vehicleTypes.iconOf(vehicleTypeId);
  }

  onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  typeName(vehicleTypeId: string | null | undefined): string {
    return this.vehicleTypes.nameOf(vehicleTypeId);
  }

  /** Sugerencia de mantenimiento genérica por kilometraje (todo tipo de automotor). */
  maintenanceHint(km: number): string {
    if (km < 10000) return 'Próximo mantenimiento preventivo cerca de los 10.000 km';
    if (km < 20000) return 'Consultá el plan de servicio del fabricante';
    if (km < 40000) return 'Revisar frenos, fluidos y filtros';
    return 'Verificá cubiertas, correas y batería';
  }

  async deleteVehicle(id: string, label: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar vehículo',
      message: `¿Seguro que querés eliminar ${label}? Se borrará todo su historial.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await this.vehiclesService.delete(id);
    if (error) console.warn('No se pudo eliminar:', error);
  }
}