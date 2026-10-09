import { Component, computed, input, output } from '@angular/core';

const STORAGE_PREFIX = 'autocheck_pagesize_';

/** Tamaño de página guardado por el usuario (o el default). */
export function loadPageSize(key: string, fallback = 10): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0 && n <= 100) return n;
  } catch {
    /* almacenamiento no disponible */
  }
  return fallback;
}

function storePageSize(key: string, size: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(size));
  } catch {
    /* almacenamiento no disponible */
  }
}

/**
 * Paginador minimalista reutilizable.
 * Uso: `<app-paginator [(page)]="page" [(pageSize)]="pageSize" [total]="list().length" storageKey="pg-x" />`
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  template: `
    @if (totalPages() > 1 || showAlways()) {
      <div class="paginator">
        <span class="pg-range">Mostrando {{ from() }}–{{ to() }} de {{ total() }}</span>
        <div class="pg-controls">
          <label class="pg-size">
            <span>Filas</span>
            <select [value]="pageSize()" (change)="onSize($any($event.target).value)" aria-label="Filas por página">
              @for (s of pageSizes(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </label>
          <div class="pg-pages" role="navigation" aria-label="Paginación">
            <button class="pg-btn" type="button" (click)="go(page() - 1)" [disabled]="page() <= 1" aria-label="Anterior">←</button>
            @for (p of pages(); track $index) {
              @if (p === '…') {
                <span class="pg-ellipsis">…</span>
              } @else {
                <button
                  class="pg-btn"
                  type="button"
                  [class.active]="p === page()"
                  (click)="go($any(p))"
                >{{ p }}</button>
              }
            }
            <button class="pg-btn" type="button" (click)="go(page() + 1)" [disabled]="page() >= totalPages()" aria-label="Siguiente">→</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {
  readonly total = input.required<number>();
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly pageSizes = input([5, 10, 20, 50]);
  readonly storageKey = input('global');
  readonly showAlways = input(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))));

  readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  /** Ventana de páginas: 1 … actual-1 actual actual+1 … última. */
  readonly pages = computed<(number | '…')[]>(() => {
    const total = this.totalPages();
    const current = Math.min(Math.max(1, this.page()), total);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total]);
    const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    for (let i = 0; i < nums.length; i++) {
      if (i > 0 && nums[i] - nums[i - 1] > 1) out.push('…');
      out.push(nums[i]);
    }
    return out;
  });

  go(p: number): void {
    const next = Math.min(Math.max(1, p), this.totalPages());
    if (next !== this.page()) this.pageChange.emit(next);
  }

  onSize(raw: string): void {
    const size = Number(raw);
    if (!Number.isInteger(size) || size <= 0) return;
    storePageSize(this.storageKey(), size);
    this.pageSizeChange.emit(size);
    this.pageChange.emit(1);
  }
}
