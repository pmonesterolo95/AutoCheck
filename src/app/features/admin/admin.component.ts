import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminStats, UserWithCounters } from '../../core/services/admin.service';
import { MaintenanceTypesService } from '../../core/services/maintenance-types.service';
import { VehicleTypesService } from '../../core/services/vehicle-types.service';
import { ConfirmService } from '../../shared/components/confirm-dialog/confirm.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

type Tab = 'stats' | 'users' | 'vehicles' | 'types' | 'vehicleTypes';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, ModalComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly admin = inject(AdminService);
  private readonly typesService = inject(MaintenanceTypesService);
  private readonly vehicleTypesService = inject(VehicleTypesService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);

  readonly tab = signal<Tab>('stats');
  readonly stats = signal<AdminStats | null>(null);
  readonly loadingStats = signal(false);

  readonly users = this.admin.users;
  readonly vehicles = this.admin.vehicles;
  readonly types = this.typesService.types;
  readonly vehicleTypes = this.vehicleTypesService.types;

  readonly showTypeModal = signal(false);
  readonly editingType = signal<{ id: string; name: string } | null>(null);
  readonly savingType = signal(false);
  readonly typeError = signal<string | null>(null);

  readonly showVTypeModal = signal(false);
  readonly editingVType = signal<{ id: string; name: string } | null>(null);
  readonly savingVType = signal(false);
  readonly vTypeError = signal<string | null>(null);

  readonly typeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['', [Validators.maxLength(200)]],
    recommended_km: ['', []],
    recommended_months: ['', []],
  });

  readonly vTypeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    icon: ['🚗', [Validators.required, Validators.maxLength(4)]],
    description: ['', [Validators.maxLength(200)]],
  });

  readonly userCountByRole = computed(() => {
    const list = this.users();
    const admins = list.filter((u) => u.role === 'ADMIN').length;
    return { admins, users: list.length - admins };
  });

  constructor() {
    this.typesService.ensureLoaded();
    this.vehicleTypesService.ensureLoaded();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'stats') this.loadStats();
    if (t === 'users') this.admin.loadUsers();
    if (t === 'vehicles') this.admin.loadVehicles();
  }

  private async loadStats(): Promise<void> {
    this.loadingStats.set(true);
    this.stats.set(await this.admin.getStats());
    this.loadingStats.set(false);
  }

  ownerOf(userId: string): string {
    const u = this.users().find((x) => x.id === userId);
    return u ? (u.full_name || u.email) : 'Usuario';
  }

  vehicleTypeLabel(vehicleTypeId: string | null | undefined): string {
    const t = this.vehicleTypes().find((x) => x.id === vehicleTypeId);
    return t ? `${t.icon} ${t.name}` : '—';
  }

  async toggleRole(user: UserWithCounters): Promise<void> {
    const next = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const ok = await this.confirm.confirm({
      title: 'Cambiar rol',
      message: `¿Cambiar el rol de ${user.email} a ${next === 'ADMIN' ? 'Administrador' : 'Usuario'}?`,
      confirmLabel: 'Cambiar',
    });
    if (!ok) return;
    const { error } = await this.admin.setUserRole(user.id, next);
    if (error) console.warn(error);
  }

  openNewType(): void {
    this.editingType.set(null);
    this.typeError.set(null);
    this.typeForm.reset({ name: '', description: '', recommended_km: '', recommended_months: '' });
    this.showTypeModal.set(true);
  }

  openEditType(id: string, name: string): void {
    const t = this.types().find((x) => x.id === id);
    this.editingType.set({ id, name });
    this.typeError.set(null);
    this.typeForm.patchValue({
      name: t?.name ?? name,
      description: t?.description ?? '',
      recommended_km: t?.recommended_km != null ? String(t.recommended_km) : '',
      recommended_months: t?.recommended_months != null ? String(t.recommended_months) : '',
    });
    this.showTypeModal.set(true);
  }

  async saveType(): Promise<void> {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }
    this.savingType.set(true);
    this.typeError.set(null);

    const raw = this.typeForm.getRawValue();
    const km = raw.recommended_km ? Number(raw.recommended_km) : null;
    const months = raw.recommended_months ? Number(raw.recommended_months) : null;

    const result = this.editingType()
      ? await this.typesService.update(this.editingType()!.id, {
          name: raw.name.trim(),
          description: raw.description || '',
          recommended_km: km,
          recommended_months: months,
        })
      : await this.typesService.create(raw.name.trim(), raw.description || '', km, months);

    this.savingType.set(false);
    if (result.error) {
      this.typeError.set(AuthService.dbError(result.error));
      return;
    }
    this.showTypeModal.set(false);
  }

  async removeType(id: string, name: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar tipo de mantenimiento',
      message: `¿Eliminar "${name}"? Solo se eliminará si no tiene mantenimientos asociados.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await this.typesService.delete(id);
  }

  openNewVType(): void {
    this.editingVType.set(null);
    this.vTypeError.set(null);
    this.vTypeForm.reset({ name: '', icon: '🚗', description: '' });
    this.showVTypeModal.set(true);
  }

  openEditVType(id: string, name: string): void {
    const t = this.vehicleTypes().find((x) => x.id === id);
    this.editingVType.set({ id, name });
    this.vTypeError.set(null);
    this.vTypeForm.patchValue({
      name: t?.name ?? name,
      icon: t?.icon ?? '🚗',
      description: t?.description ?? '',
    });
    this.showVTypeModal.set(true);
  }

  async saveVType(): Promise<void> {
    if (this.vTypeForm.invalid) {
      this.vTypeForm.markAllAsTouched();
      return;
    }
    this.savingVType.set(true);
    this.vTypeError.set(null);

    const raw = this.vTypeForm.getRawValue();
    const result = this.editingVType()
      ? await this.vehicleTypesService.update(this.editingVType()!.id, {
          name: raw.name.trim(),
          icon: raw.icon.trim() || '🚗',
          description: raw.description || '',
        })
      : await this.vehicleTypesService.create(raw.name.trim(), raw.icon.trim() || '🚗', raw.description || '');

    this.savingVType.set(false);
    if (result.error) {
      this.vTypeError.set(AuthService.dbError(result.error));
      return;
    }
    this.showVTypeModal.set(false);
  }

  async removeVType(id: string, name: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar tipo de vehículo',
      message: `¿Eliminar "${name}"? Solo se eliminará si no tiene vehículos asociados.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await this.vehicleTypesService.delete(id);
  }
}