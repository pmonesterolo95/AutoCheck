import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaintenancesService } from '../../../core/services/maintenances.service';
import { MaintenanceTypesService } from '../../../core/services/maintenance-types.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { RemindersService } from '../../../core/services/reminders.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';
import { ReminderStatus } from '../../../core/models/enums';

export interface NextServiceDue {
  typeName: string;
  nextKm: number | null;
  nextDate: string | null;
}

/** Suma meses a una fecha 'yyyy-mm-dd' (limita al último día del mes destino). */
function addMonthsIso(iso: string, months: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const monthIndex = Number(m[2]) - 1 + months;
  const targetYear = y + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(Number(m[3]), lastDay);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${targetYear}-${p(targetMonth + 1)}-${p(day)}`;
}

/** 'yyyy-mm-dd' -> 'dd/mm/yyyy'. */
function fmtIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

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
  private readonly remindersService = inject(RemindersService);
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

  /** Borrador reactivo del form para previsualizar el próximo service. */
  readonly draft = signal({ maintenance_type_id: '', date: '', kilometers: '' });
  readonly autoReminder = signal(true);

  /** Próximo service calculado según el intervalo del tipo elegido. */
  readonly nextDue = computed<NextServiceDue | null>(() => {
    const d = this.draft();
    const type = this.typeOptions().find((t) => t.id === d.maintenance_type_id);
    if (!type) return null;
    const km = Number(d.kilometers);
    let nextKm: number | null = null;
    let nextDate: string | null = null;
    if (type.recommended_km != null && Number.isFinite(km) && km > 0) {
      nextKm = km + type.recommended_km;
    }
    if (type.recommended_months != null && d.date) {
      nextDate = addMonthsIso(d.date, type.recommended_months);
    }
    if (nextKm == null && nextDate == null) return null;
    return { typeName: type.name, nextKm, nextDate };
  });

  constructor() {
    this.typesService.ensureLoaded().then(() => {
      if (this.isEdit()) {
        this.form.get('maintenance_type_id')?.enable();
      }
    });

    this.form.valueChanges.subscribe(() => {
      const v = this.form.getRawValue();
      this.draft.set({
        maintenance_type_id: v.maintenance_type_id,
        date: v.date,
        kilometers: v.kilometers,
      });
    });

    // Precarga para no duplicar el recordatorio automático.
    void this.remindersService.load(this.vehicleId);

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

    // Programa el próximo service como recordatorio (solo en altas).
    if (!this.isEdit() && this.autoReminder()) {
      await this.scheduleNextService(value.date, Number(value.kilometers));
    }

    // Actualiza el kilometraje actual del vehículo si el nuevo registro es mayor.
    const vehicle = await this.vehiclesService.getById(this.vehicleId);
    if (vehicle && Number(value.kilometers) > vehicle.current_km) {
      await this.vehiclesService.updateKm(this.vehicleId, Number(value.kilometers));
    }

    this.router.navigate(['/vehicles', this.vehicleId, 'maintenances']);
  }

  /** Crea el recordatorio del próximo service según el intervalo del tipo. */
  private async scheduleNextService(serviceDate: string, serviceKm: number): Promise<void> {
    const due = this.nextDue();
    if (!due || (due.nextKm == null && due.nextDate == null)) return;

    const title = `Próximo service: ${due.typeName}`;
    const already = this.remindersService
      .reminders()
      .some((r) => r.vehicle_id === this.vehicleId && r.title === title && r.status === 'pendiente');
    if (already) return;

    const parts: string[] = [];
    if (due.nextKm != null) parts.push(`${due.nextKm.toLocaleString('es-AR')} km`);
    if (due.nextDate) parts.push(fmtIso(due.nextDate));

    await this.remindersService.create({
      vehicle_id: this.vehicleId,
      title,
      description:
        `Generado al registrar "${due.typeName}" del ${fmtIso(serviceDate)} ` +
        `(${serviceKm.toLocaleString('es-AR')} km). Próximo: ${parts.join(' / ')}.`,
      reminder_date: due.nextDate,
      reminder_km: due.nextKm,
      status: 'pendiente' as ReminderStatus,
    });
  }
}