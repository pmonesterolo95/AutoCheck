import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaintenancesService } from '../../../core/services/maintenances.service';
import { MaintenanceTypesService } from '../../../core/services/maintenance-types.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './maintenance-form.component.html',
  styleUrl: './maintenance-form.component.scss',
})
export class MaintenanceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly maintenances = inject(MaintenancesService);
  private readonly typesService = inject(MaintenanceTypesService);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly typeOptions = this.typesService.types;
  readonly errorMessage = errorMessage;

  readonly vehicleId = this.route.snapshot.params['id'];
  readonly maintenanceId = this.route.snapshot.params['mid'] ?? null;
  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    maintenance_type_id: ['', [Validators.required]],
    date: ['', [Validators.required, CustomValidators.notTooOld]],
    kilometers: ['', [Validators.required, CustomValidators.kilometers]],
    description: ['', [Validators.maxLength(200)]],
    cost: ['', [Validators.required, CustomValidators.money]],
    workshop: ['', [Validators.maxLength(100)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    this.typesService.ensureLoaded().then(() => {
      if (this.isEdit()) {
        this.form.get('maintenance_type_id')?.enable();
      }
    });

    if (this.maintenanceId) {
      this.isEdit.set(true);
      this.loadMaintenance();
    }
  }

  private async loadMaintenance(): Promise<void> {
    this.loading.set(true);
    const m = await this.maintenances.getById(this.maintenanceId!);
    this.loading.set(false);
    if (!m) {
      this.error.set('No se encontró el mantenimiento.');
      return;
    }
    this.typesService.ensureLoaded();
    this.form.patchValue({
      maintenance_type_id: m.maintenance_type_id,
      date: m.date,
      kilometers: String(m.kilometers),
      description: m.description ?? '',
      cost: String(m.cost),
      workshop: m.workshop ?? '',
      notes: m.notes ?? '',
    });
  }

  fieldError(name: string): string | null {
    const control = this.form.get(name);
    if (!control?.invalid || !control?.touched) return null;
    const labels: Record<string, string> = {
      maintenance_type_id: 'El tipo de mantenimiento',
      date: 'La fecha',
      kilometers: 'El kilometraje',
      cost: 'El costo',
    };
    return errorMessage(control.errors, labels[name] ?? 'El campo');
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const payload = {
      vehicle_id: this.vehicleId,
      maintenance_type_id: value.maintenance_type_id,
      date: value.date,
      kilometers: Number(value.kilometers),
      description: value.description || null,
      cost: Number(value.cost),
      workshop: value.workshop || null,
      notes: value.notes || null,
    };

    const result = this.isEdit()
      ? await this.maintenances.update(this.maintenanceId!, payload)
      : await this.maintenances.create(payload);

    this.saving.set(false);
    if (result.error) {
      this.error.set(AuthService.dbError(result.error));
      return;
    }

    // Actualiza el kilometraje actual del vehículo si el nuevo registro es mayor.
    const vehicle = await this.vehiclesService.getById(this.vehicleId);
    if (vehicle && Number(value.kilometers) > vehicle.current_km) {
      await this.vehiclesService.updateKm(this.vehicleId, Number(value.kilometers));
    }

    this.router.navigate(['/vehicles', this.vehicleId, 'maintenances']);
  }
}