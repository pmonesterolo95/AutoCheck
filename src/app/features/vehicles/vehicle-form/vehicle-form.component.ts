import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { VehicleTypesService } from '../../../core/services/vehicle-types.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';
import { FUEL_TYPES, FuelType } from '../../../core/models/enums';
import { Vehicle, VehiclePayload } from '../../../core/models/vehicle.interface';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vehicles = inject(VehiclesService);
  private readonly vehicleTypes = inject(VehicleTypesService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly fuelTypes = FUEL_TYPES;
  readonly vehicleTypeOptions = this.vehicleTypes.types;
  readonly errorMessage = errorMessage;

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedImage = signal<File | null>(null);
  private vehicleId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    brand: ['', [Validators.required, Validators.maxLength(40)]],
    model: ['', [Validators.required, Validators.maxLength(40)]],
    year: ['', [Validators.required, CustomValidators.vehicleYear]],
    license_plate: ['', [CustomValidators.licensePlate]],
    current_km: ['', [Validators.required, CustomValidators.kilometers]],
    fuel_type: ['Nafta', [Validators.required]],
    vehicle_type_id: [null as string | null, [Validators.required]],
    unit_number: ['', [Validators.maxLength(20)]],
    purchase_date: ['', []],
  });

  constructor() {
    this.vehicleTypes.ensureLoaded();
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEdit.set(true);
      this.vehicleId = id;
      this.loadVehicle(id);
    }
  }

  private async loadVehicle(id: string): Promise<void> {
    this.loading.set(true);
    const vehicle = await this.vehicles.getById(id);
    this.loading.set(false);

    if (!vehicle) {
      this.error.set('No se encontró el vehículo solicitado.');
      return;
    }
    this.form.patchValue({
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      license_plate: vehicle.license_plate,
      current_km: String(vehicle.current_km),
      fuel_type: vehicle.fuel_type,
      vehicle_type_id: vehicle.vehicle_type_id,
      unit_number: vehicle.unit_number ?? '',
      purchase_date: vehicle.purchase_date ?? '',
    });
    this.imageUrl = vehicle.image_url;
  }

  fieldError(name: keyof typeof this.form.controls): string | null {
    const control = this.form.get(name);
    if (!control?.invalid || !control?.touched) return null;
    const labels: Record<string, string> = {
      brand: 'La marca',
      model: 'El modelo',
      year: 'El año',
      license_plate: 'La patente',
      current_km: 'El kilometraje',
      fuel_type: 'El combustible',
      vehicle_type_id: 'El tipo de vehículo',
      unit_number: 'El N° de unidad',
    };
    return errorMessage(control.errors, labels[name]);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedImage.set(file);
  }

  imageUrl: string | null = null;

  async submit(): Promise<void> {
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    let image_url = this.imageUrl;

    if (this.selectedImage()) {
      const user = this.auth.user();
      if (!user) {
        this.saving.set(false);
        this.error.set('No hay sesión activa.');
        return;
      }
      const { path, error } = await this.storage.uploadVehicleImage(user.id, this.selectedImage()!);
      if (error) {
        this.saving.set(false);
        this.error.set(`No se pudo subir la imagen: ${error}`);
        return;
      }
      image_url = this.storage.getPublicUrl(path!);
    }

    const payload: VehiclePayload = {
      brand: value.brand.trim(),
      model: value.model.trim(),
      year: Number(value.year),
      license_plate: value.license_plate?.trim().toUpperCase() || '',
      current_km: Number(value.current_km),
      fuel_type: value.fuel_type as FuelType,
      vehicle_type_id: value.vehicle_type_id,
      unit_number: value.unit_number?.trim() || null,
      purchase_date: value.purchase_date || null,
      image_url: image_url ?? (this.isEdit() ? undefined : null),
    };

    this.saving.set(false);
    if (this.isEdit()) {
      const r = await this.vehicles.update(this.vehicleId!, payload);
      if (r.error) {
        this.error.set(AuthService.dbError(r.error));
        return;
      }
      this.router.navigate(['/vehicles', this.vehicleId]);
    } else {
      const r = await this.vehicles.create(payload);
      if (r.error) {
        this.error.set(AuthService.dbError(r.error));
        return;
      }
      this.router.navigate(r.data ? [`/vehicles/${r.data.id}`] : ['/vehicles']);
    }
  }
}