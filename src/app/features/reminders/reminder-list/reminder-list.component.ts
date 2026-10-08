import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RemindersService } from '../../../core/services/reminders.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CustomValidators } from '../../../shared/forms/validators';
import { Reminder, ReminderPayload } from '../../../core/models/reminder.interface';
import { ReminderStatus } from '../../../core/models/enums';

@Component({
  selector: 'app-reminder-list',
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule, ModalComponent],
  templateUrl: './reminder-list.component.html',
  styleUrl: './reminder-list.component.scss',
})
export class ReminderListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly remindersService = inject(RemindersService);
  readonly vehiclesService = inject(VehiclesService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);

  readonly vehicleId = this.route.snapshot.params['id'] ?? null;
  readonly list = this.remindersService.reminders;
  readonly loading = this.remindersService.loading;

  readonly showModal = signal(false);
  readonly editing = signal<Reminder | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    vehicle_id: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(300)]],
    reminder_date: ['', []],
    reminder_km: ['', [CustomValidators.kilometers]],
  }, { validators: [this.requireDateOrKm] });

  private requireDateOrKm(group: { get: (key: string) => { value: string } | null }) {
    const date = group.get('reminder_date')?.value;
    const km = group.get('reminder_km')?.value;
    return !date && !km ? { dateOrKm: true } : null;
  }

  constructor() {
    if (!this.vehicleId) this.vehiclesService.list();
    this.remindersService.load(this.vehicleId);
  }

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  /** Estado derivado automáticamente del recordatorio. */
  effectiveStatus(r: Reminder): ReminderStatus {
    if (r.status === 'completado') return 'completado';
    if (r.reminder_date && new Date(r.reminder_date) < new Date()) return 'vencido';

    const vehicle = this.vehiclesService.vehicles().find((v) => v.id === r.vehicle_id);
    if (r.reminder_km != null && vehicle && vehicle.current_km >= r.reminder_km) return 'vencido';

    return r.status === 'vencido' ? 'vencido' : 'pendiente';
  }

  isDueSoon(r: Reminder): boolean {
    if (r.reminder_date) {
      const days = Math.ceil((new Date(r.reminder_date).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 7;
    }
    const vehicle = this.vehiclesService.vehicles().find((v) => v.id === r.vehicle_id);
    return !!vehicle && r.reminder_km != null && vehicle.current_km >= r.reminder_km - 1000;
  }

  openNew(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ vehicle_id: this.vehicleId ?? '', title: '', description: '', reminder_date: '', reminder_km: '' });
    this.showModal.set(true);
  }

  openEdit(r: Reminder): void {
    this.editing.set(r);
    this.formError.set(null);
    this.form.patchValue({
      vehicle_id: r.vehicle_id,
      title: r.title,
      description: r.description ?? '',
      reminder_date: r.reminder_date ?? '',
      reminder_km: r.reminder_km != null ? String(r.reminder_km) : '',
    });
    this.form.get('vehicle_id')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.get('vehicle_id')?.enable();
  }

  async submit(): Promise<void> {
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.form.get('reminder_date')?.value && !this.form.get('reminder_km')?.value) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    const raw = this.form.getRawValue();
    const payload: ReminderPayload = {
      vehicle_id: raw.vehicle_id,
      title: raw.title.trim(),
      description: raw.description || null,
      reminder_date: raw.reminder_date || null,
      reminder_km: raw.reminder_km ? Number(raw.reminder_km) : null,
      status: 'pendiente',
    };

    const result = this.editing()
      ? await this.remindersService.update(this.editing()!.id, payload)
      : await this.remindersService.create(payload);

    this.saving.set(false);
    if (result.error) {
      this.formError.set(AuthService.dbError(result.error));
      return;
    }
    this.closeModal();
    await this.remindersService.load(this.vehicleId);
  }

  async toggleComplete(r: Reminder): Promise<void> {
    await this.remindersService.setStatus(r.id, r.status === 'completado' ? 'pendiente' : 'completado');
  }

  async remove(r: Reminder): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar recordatorio',
      message: `¿Eliminar el recordatorio "${r.title}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await this.remindersService.delete(r.id);
    if (error) return;
    this.list.update((items) => items.filter((x) => x.id !== r.id));
  }
}