import { Component, Input } from '@angular/core';

export type StatusValue = 'normal' | 'proximo' | 'vencido' | 'vigente' | 'pendiente' | 'completado';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge"
          [class.badge-success]="status === 'normal' || status === 'vigente' || status === 'completado'"
          [class.badge-warning]="status === 'proximo' || status === 'pendiente'"
          [class.badge-danger]="status === 'vencido'">
      {{ labelText() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: StatusValue;
  @Input() label?: string;

  readonly labels: Record<StatusValue, string> = {
    normal: 'Normal',
    proximo: 'Próximo',
    vencido: 'Vencido',
    vigente: 'Vigente',
    pendiente: 'Pendiente',
    completado: 'Completado',
  };

  labelText(): string {
    const base = this.labels[this.status] ?? this.status;
    return this.label ? `${base} · ${this.label}` : base;
  }
}