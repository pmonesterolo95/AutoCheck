import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

/** Servicio + modal global de confirmación (se monta en el layout). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly request = signal<ConfirmRequest>({ title: '', message: '' });

  private resolver: ((confirm: boolean) => void) | null = null;

  /** Muestra el diálogo y devuelve una Promise que resuelve a true/false. */
  confirm(request: ConfirmRequest): Promise<boolean> {
    this.request.set({ confirmLabel: 'Confirmar', danger: false, ...request });
    this.open.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(confirm: boolean): void {
    this.open.set(false);
    this.resolver?.(confirm);
    this.resolver = null;
  }
}