import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DocumentsService } from '../../../core/services/documents.service';
import { VehiclesService } from '../../../core/services/vehicles.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { documentStatus } from '../../../shared/utils/document-status';
import { DOCUMENT_TYPES } from '../../../core/models/enums';
import { VehicleDocument } from '../../../core/models/document.interface';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, ModalComponent, StatusBadgeComponent],
  templateUrl: './documents-list.component.html',
  styleUrl: './documents-list.component.scss',
})
export class DocumentsListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly documentsService = inject(DocumentsService);
  readonly vehiclesService = inject(VehiclesService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);

  readonly docTypes = DOCUMENT_TYPES;

  readonly vehicleId = this.route.snapshot.params['id'] ?? null;
  readonly list = this.documentsService.documents;
  readonly loading = this.documentsService.loading;

  readonly showModal = signal(false);
  readonly editing = signal<VehicleDocument | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);

  readonly form = this.fb.nonNullable.group({
    vehicle_id: ['', [Validators.required]],
    type: ['', [Validators.required]],
    expiration_date: ['', []],
    notes: ['', [Validators.maxLength(300)]],
  });

  constructor() {
    if (!this.vehicleId) this.vehiclesService.list();
    this.documentsService.load(this.vehicleId);
  }

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  statusOf(doc: VehicleDocument) {
    return documentStatus(doc.expiration_date).status;
  }

  statusLabel(doc: VehicleDocument): string {
    return documentStatus(doc.expiration_date).label;
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFile.set(file);
  }

  openNew(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.selectedFile.set(null);
    this.form.reset({ vehicle_id: this.vehicleId ?? '', type: '', expiration_date: '', notes: '' });
    this.showModal.set(true);
  }

  openEdit(doc: VehicleDocument): void {
    this.editing.set(doc);
    this.formError.set(null);
    this.selectedFile.set(null);
    this.form.patchValue({
      vehicle_id: doc.vehicle_id,
      type: doc.type,
      expiration_date: doc.expiration_date ?? '',
      notes: doc.notes ?? '',
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
    let document_url = this.editing()?.document_url ?? null;

    if (this.selectedFile()) {
      const user = this.auth.user();
      if (!user) {
        this.saving.set(false);
        this.formError.set('No hay sesión activa.');
        return;
      }
      const { path, error } = await this.storage.uploadDocument(user.id, this.selectedFile()!);
      if (error) {
        this.saving.set(false);
        this.formError.set(`No se pudo subir el archivo: ${error}`);
        return;
      }
      document_url = path;
    }

    const payload = {
      vehicle_id: value.vehicle_id,
      type: value.type,
      expiration_date: value.expiration_date || null,
      document_url,
      notes: value.notes || null,
    };

    const result = this.editing()
      ? await this.documentsService.update(this.editing()!.id, payload)
      : await this.documentsService.create(payload);

    this.saving.set(false);
    if (result.error) {
      this.formError.set(AuthService.dbError(result.error));
      return;
    }
    this.closeModal();
    await this.documentsService.load(this.vehicleId);
  }

  async remove(doc: VehicleDocument): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar documento',
      message: `¿Eliminar el documento "${doc.type}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await this.documentsService.delete(doc.id);
    if (error) return;
    this.list.update((items) => items.filter((d) => d.id !== doc.id));
  }

  async download(doc: VehicleDocument): Promise<void> {
    if (!doc.document_url) return;
    const url = await this.storage.getDocumentUrl(doc.document_url);
    if (!url) return;
    window.open(url, '_blank');
  }
}