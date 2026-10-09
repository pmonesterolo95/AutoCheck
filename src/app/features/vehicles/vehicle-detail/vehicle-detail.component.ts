import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { VehicleTypesService } from '../../../core/services/vehicle-types.service';
import { MaintenancesService } from '../../../core/services/maintenances.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { DocumentsService } from '../../../core/services/documents.service';
import { exportVehicleSheetPdf } from '../../../shared/utils/exporter';
import { Vehicle } from '../../../core/models/vehicle.interface';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './vehicle-detail.component.html',
  styleUrl: './vehicle-detail.component.scss',
})
export class VehicleDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly vehicles = inject(VehiclesService);
  private readonly vehicleTypes = inject(VehicleTypesService);
  private readonly maintenancesService = inject(MaintenancesService);
  private readonly expensesService = inject(ExpensesService);
  private readonly documentsService = inject(DocumentsService);

  readonly vehicle = signal<Vehicle | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly vehicleId = this.route.snapshot.params['id'];

  constructor() {
    this.vehicleTypes.ensureLoaded();
    this.loadVehicle();
  }

  typeIcon(vehicleTypeId: string | null | undefined): string {
    return this.vehicleTypes.iconOf(vehicleTypeId);
  }

  typeName(vehicleTypeId: string | null | undefined): string {
    return this.vehicleTypes.nameOf(vehicleTypeId);
  }

  private async loadVehicle(): Promise<void> {
    this.loading.set(true);
    const vehicle = await this.vehicles.getById(this.vehicleId);
    this.loading.set(false);
    if (!vehicle) {
      this.error.set('No se encontró el vehículo o no tenés acceso a él.');
      return;
    }
    this.vehicle.set(vehicle);
  }

  totalLabel(): string {
    return `${this.vehicle()?.brand ?? ''} ${this.vehicle()?.model ?? ''}`;
  }

  /** Descarga la ficha completa del vehículo (libro de service digital) en PDF. */
  async exportSheet(): Promise<void> {
    const v = this.vehicle();
    if (!v || this.exporting()) return;
    this.exporting.set(true);
    try {
      await Promise.all([
        this.maintenancesService.load(v.id),
        this.expensesService.load(v.id),
        this.documentsService.load(v.id),
      ]);
      exportVehicleSheetPdf({
        vehicle: v,
        typeName: this.typeName(v.vehicle_type_id),
        maintenances: this.maintenancesService.maintenances(),
        expenses: this.expensesService.expenses(),
        documents: this.documentsService.documents(),
      });
    } finally {
      this.exporting.set(false);
    }
  }
}