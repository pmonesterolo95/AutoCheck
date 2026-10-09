import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpensesService } from '../../../core/services/expenses.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';
import { EXPENSE_CATEGORIES } from '../../../core/models/enums';
import { Expense, ExpensePayload } from '../../../core/models/expense.interface';
import { exportExpensesExcel, exportExpensesPdf } from '../../../shared/utils/exporter';
import { PaginatorComponent, loadPageSize } from '../../../shared/components/paginator/paginator.component';

const PALETTE = ['#0f4c81', '#f59e0b', '#16a34a', '#dc2626', '#2563eb', '#7c3aed', '#0ea5e9', '#84cc16'];

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, ModalComponent, ChartComponent, PaginatorComponent],
  templateUrl: './expenses-list.component.html',
  styleUrl: './expenses-list.component.scss',
})
export class ExpensesListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly expensesService = inject(ExpensesService);
  readonly vehiclesService = inject(VehiclesService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);

  readonly categories = EXPENSE_CATEGORIES;
  readonly errorMessage = errorMessage;

  readonly vehicleId = this.route.snapshot.params['id'] ?? null;
  readonly list = this.expensesService.expenses;
  readonly loading = this.expensesService.loading;

  readonly showModal = signal(false);
  readonly editing = signal<Expense | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(loadPageSize('pg-exp'));
  readonly pagedList = computed(() =>
    this.list().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()),
  );

  readonly form = this.fb.nonNullable.group({
    vehicle_id: ['', [Validators.required]],
    category: ['Combustible', [Validators.required]],
    description: ['', [Validators.maxLength(200)]],
    amount: ['', [Validators.required, CustomValidators.money]],
    date: ['', [Validators.required]],
  });

  readonly monthTotal = computed(() => {
    const now = new Date();
    return this.list()
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  });

  readonly yearTotal = computed(() => {
    const year = new Date().getFullYear();
    return this.list()
      .filter((e) => new Date(e.date).getFullYear() === year)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  });

  readonly byCategory = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.list()) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([k]) => k),
      values: entries.map(([, v]) => v),
    };
  });

  readonly byMonth = computed(() => {
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }));
      const sum = this.list()
        .filter((e) => {
          const ed = new Date(e.date);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      values.push(sum);
    }
    return { labels, values };
  });

  readonly byVehicle = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.list()) {
      map.set(e.vehicle_id, (map.get(e.vehicle_id) ?? 0) + Number(e.amount));
    }
    return {
      labels: [...map.keys()].map((id) => this.vehicleLabel(id)),
      values: [...map.values()],
    };
  });

  readonly chartColors = VALID_COLORS();

  readonly byCategoryDatasets = computed(() => [
    { label: 'Gastos', data: this.byCategory().values, backgroundColor: PALETTE.slice(0, Math.max(this.byCategory().values.length, 1)) },
  ]);

  readonly byVehicleDatasets = computed(() => [
    {
      label: 'Gastos',
      data: this.byVehicle().values,
      backgroundColor: this.byVehicle().values.map((_, i) => PALETTE[i % PALETTE.length]),
    },
  ]);

  readonly byMonthDatasets = computed(() => [
    {
      label: 'Gastos',
      data: this.byMonth().values,
      borderColor: '#0f4c81',
      backgroundColor: 'rgba(15, 76, 129, 0.15)',
      tension: 0.3,
      borderWidth: 2,
      fill: true,
    },
  ]);

  constructor() {
    if (!this.vehicleId) this.vehiclesService.list();
    this.expensesService.load(this.vehicleId);
  }

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  exportExcel(): void {
    const rows = this.list().map((expense) => ({ expense, vehicleLabel: this.vehicleLabel(expense.vehicle_id) }));
    exportExpensesExcel(rows, this.vehicleId ? this.vehicleLabel(this.vehicleId) : 'flota');
  }

  exportPdf(): void {
    const rows = this.list().map((expense) => ({ expense, vehicleLabel: this.vehicleLabel(expense.vehicle_id) }));
    exportExpensesPdf(rows, this.vehicleId ? this.vehicleLabel(this.vehicleId) : 'Toda la flota');
  }

  openNew(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ vehicle_id: this.vehicleId ?? '', category: 'Combustible', amount: '', date: '' });
    this.showModal.set(true);
  }

  openEdit(expense: Expense): void {
    this.editing.set(expense);
    this.formError.set(null);
    this.form.patchValue({
      vehicle_id: expense.vehicle_id,
      category: expense.category,
      description: expense.description ?? '',
      amount: String(expense.amount),
      date: expense.date,
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
    const payload: ExpensePayload = {
      vehicle_id: value.vehicle_id,
      category: value.category as ExpensePayload['category'],
      description: value.description || null,
      amount: Number(value.amount),
      date: value.date,
    };

    const result = this.editing()
      ? await this.expensesService.update(this.editing()!.id, payload)
      : await this.expensesService.create(payload);

    this.saving.set(false);
    if (result.error) {
      this.formError.set(AuthService.dbError(result.error));
      return;
    }
    this.closeModal();
    await this.expensesService.load(this.vehicleId);
  }

  async remove(expense: Expense): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar gasto',
      message: `¿Eliminar el gasto de ${expense.category} por ${Number(expense.amount).toLocaleString('es-AR')}?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await this.expensesService.delete(expense.id);
    if (error) return;
    this.list.update((items) => items.filter((e) => e.id !== expense.id));
    const max = Math.max(1, Math.ceil(this.list().length / this.pageSize()));
    if (this.page() > max) this.page.set(max);
  }
}

function VALID_COLORS(): string[] {
  return PALETTE;
}