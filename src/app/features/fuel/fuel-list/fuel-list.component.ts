import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FuelService } from '../../../core/services/fuel.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { PaginatorComponent, loadPageSize } from '../../../shared/components/paginator/paginator.component';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';
import { FuelLog, FuelLogPayload, computeConsumptions } from '../../../core/models/fuel-log.interface';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, DecimalPipe, ReactiveFormsModule, ModalComponent, ChartComponent, PaginatorComponent],
  templateUrl: './fuel-list.component.html',
  styleUrl: './fuel-list.component.scss',
})
export class FuelListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fuelService = inject(FuelService);
  readonly vehiclesService = inject(VehiclesService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);

  readonly errorMessage = errorMessage;

  readonly vehicleId = this.route.snapshot.params['id'] ?? null;
  readonly list = this.fuelService.logs;
  readonly loading = this.fuelService.loading;
  readonly needsMigration = this.fuelService.needsMigration;

  readonly showModal = signal(false);
  readonly editing = signal<FuelLog | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(loadPageSize('pg-fuel'));
  readonly pagedList = computed(() =>
    this.list().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()),
  );

  readonly form = this.fb.nonNullable.group({
    vehicle_id: ['', [Validators.required]],
    date: ['', [Validators.required, CustomValidators.notTooOld]],
    kilometers: ['', [Validators.required, CustomValidators.kilometers]],
    liters: [0, [Validators.required, Validators.min(0.01)]],
    amount: ['', [Validators.required, CustomValidators.money]],
    full_tank: [true],
    station: ['', [Validators.maxLength(100)]],
    notes: ['', [Validators.maxLength(200)]],
  });

  /** Consumos medidos entre tanques llenos, ordenados por fecha. */
  readonly consumptions = computed(() => computeConsumptions(this.list()));

  readonly avgConsumption = computed(() => {
    const last5 = this.consumptions().slice(-5);
    if (last5.length === 0) return null;
    return last5.reduce((s, c) => s + c.kmPerLiter, 0) / last5.length;
  });

  readonly lastConsumption = computed(() => {
    const all = this.consumptions();
    return all.length > 0 ? all[all.length - 1] : null;
  });

  /** Alerta si el último consumo cayó >15% respecto del promedio. */
  readonly dropAlert = computed(() => {
    const avg = this.avgConsumption();
    const last = this.lastConsumption();
    if (avg == null || last == null || this.consumptions().length < 3) return null;
    const drop = (avg - last.kmPerLiter) / avg;
    return drop > 0.15 ? Math.round(drop * 100) : null;
  });

  readonly totalLiters = computed(() => this.list().reduce((s, l) => s + (Number(l.liters) || 0), 0));

  readonly monthFuelSpend = computed(() => {
    const now = new Date();
    return this.list()
      .filter((l) => {
        const d = new Date(l.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);
  });

  readonly chartData = computed(() => {
    const all = this.consumptions().slice(-12);
    return {
      labels: all.map((c) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.date);
        return m ? `${m[3]}/${m[2]}` : c.date;
      }),
      values: all.map((c) => Math.round(c.kmPerLiter * 100) / 100),
    };
  });

  readonly chartDatasets = computed(() => [
    {
      label: 'km/l',
      data: this.chartData().values,
      borderColor: '#0f4c81',
      backgroundColor: 'rgba(15, 76, 129, 0.15)',
      tension: 0.3,
      borderWidth: 2,
      fill: true,
    },
  ]);

  constructor() {
    if (!this.vehicleId) this.vehiclesService.list();
    void this.fuelService.load(this.vehicleId);
  }

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  consumptionOf(logId: string): number | null {
    return this.consumptions().find((c) => c.logId === logId)?.kmPerLiter ?? null;
  }

  perLiter(log: FuelLog): number | null {
    const liters = Number(log.liters);
    if (!liters) return null;
    return Number(log.amount) / liters;
  }

  openNew(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ vehicle_id: this.vehicleId ?? '', liters: 0, amount: '', full_tank: true, date: '' });
    this.showModal.set(true);
  }

  openEdit(log: FuelLog): void {
    this.editing.set(log);
    this.formError.set(null);
    this.form.patchValue({
      vehicle_id: log.vehicle_id,
      date: log.date,
      kilometers: String(log.kilometers),
      liters: Number(log.liters),
      amount: String(log.amount),
      full_tank: log.full_tank,
      station: log.station ?? '',
      notes: log.notes ?? '',
    });
    this.form.get('vehicle_id')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.get('vehicle_id')?.enable();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    const value = this.form.getRawValue();
    const payload: FuelLogPayload = {
      vehicle_id: value.vehicle_id,
      date: value.date,
      kilometers: Number(value.kilometers),
      liters: Number(value.liters),
      amount: Number(value.amount),
      full_tank: value.full_tank,
      station: value.station || null,
      notes: value.notes || null,
    };

    const result = this.editing()
      ? await this.fuelService.update(this.editing()!.id, payload)
      : await this.fuelService.create(payload);

    this.saving.set(false);
    if (result.error) {
      this.formError.set(AuthService.dbError(result.error));
      return;
    }
    this.closeModal();
    await this.fuelService.load(this.vehicleId);
  }

  async remove(log: FuelLog): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar carga',
      message: `¿Eliminar la carga de ${Number(log.liters).toLocaleString('es-AR')} l del ${log.date}?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await this.fuelService.delete(log.id);
    if (error) return;
    this.list.update((items) => items.filter((l) => l.id !== log.id));
    const max = Math.max(1, Math.ceil(this.list().length / this.pageSize()));
    if (this.page() > max) this.page.set(max);
  }
}
