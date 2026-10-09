import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehiclesService } from '../../core/services/vehicles.service';
import { MaintenancesService } from '../../core/services/maintenances.service';
import { DocumentsService } from '../../core/services/documents.service';
import { RemindersService } from '../../core/services/reminders.service';
import { MaintenanceTypesService } from '../../core/services/maintenance-types.service';
import { TimelineItem, buildTimeline } from '../../shared/utils/upcoming';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private readonly vehiclesService = inject(VehiclesService);
  private readonly maintenancesService = inject(MaintenancesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly remindersService = inject(RemindersService);
  private readonly typesService = inject(MaintenanceTypesService);

  readonly ready = signal(false);

  private readonly now = new Date();
  readonly year = signal(this.now.getFullYear());
  readonly month = signal(this.now.getMonth());
  readonly selected = signal<string | null>(null);

  constructor() {
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    await Promise.all([
      this.vehiclesService.list(),
      this.typesService.ensureLoaded(),
      this.maintenancesService.load(null),
      this.documentsService.load(null),
      this.remindersService.load(null),
    ]);
    this.ready.set(true);
  }

  readonly monthLabel = computed(() => `${MONTHS_ES[this.month()]} ${this.year()}`);

  private readonly allItems = computed<TimelineItem[]>(() =>
    buildTimeline(
      {
        vehicles: this.vehiclesService.vehicles(),
        maintenances: this.maintenancesService.maintenances(),
        types: this.typesService.types(),
        documents: this.documentsService.documents(),
        reminders: this.remindersService.reminders(),
        vehicleLabel: (id) => this.vehicleLabel(id),
      },
      370,
      1000,
    ),
  );

  vehicleLabel(id: string): string {
    const v = this.vehiclesService.vehicles().find((item) => item.id === id);
    return v ? `${v.brand} ${v.model}` : 'Vehículo';
  }

  /** Ítems del mes visible, agrupados por día. */
  readonly byDay = computed(() => {
    const map = new Map<number, TimelineItem[]>();
    for (const item of this.allItems()) {
      const d = item.date;
      if (d.getFullYear() !== this.year() || d.getMonth() !== this.month()) continue;
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'vencido' ? -1 : 1));
    }
    return map;
  });

  /** Celdas del mes (múltiplo de 7, lunes primero, null = hueco). */
  readonly cells = computed<(number | null)[]>(() => {
    const y = this.year();
    const m = this.month();
    const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [...Array<number | null>(firstWeekday).fill(null)];
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  });

  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  isoOf(day: number): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${this.year()}-${p(this.month() + 1)}-${p(day)}`;
  }

  isToday(day: number | null): boolean {
    if (day == null) return false;
    return (
      day === this.now.getDate() && this.month() === this.now.getMonth() && this.year() === this.now.getFullYear()
    );
  }

  isSelected(day: number | null): boolean {
    return day != null && this.selected() === this.isoOf(day);
  }

  prev(): void {
    if (this.month() === 0) {
      this.month.set(11);
      this.year.update((y) => y - 1);
    } else {
      this.month.update((m) => m - 1);
    }
    this.selected.set(null);
  }

  next(): void {
    if (this.month() === 11) {
      this.month.set(0);
      this.year.update((y) => y + 1);
    } else {
      this.month.update((m) => m + 1);
    }
    this.selected.set(null);
  }

  today(): void {
    this.year.set(this.now.getFullYear());
    this.month.set(this.now.getMonth());
    this.selected.set(this.isoOf(this.now.getDate()));
  }

  selectDay(day: number | null): void {
    if (day == null) return;
    const iso = this.isoOf(day);
    this.selected.set(this.selected() === iso ? null : iso);
  }

  readonly selectedItems = computed<TimelineItem[]>(() => {
    const iso = this.selected();
    if (!iso) return [];
    const [y, m, d] = iso.split('-').map(Number);
    return this.allItems().filter(
      (t) => t.date.getFullYear() === y && t.date.getMonth() === m - 1 && t.date.getDate() === d,
    );
  });

  readonly selectedLabel = computed(() => {
    const iso = this.selected();
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  });
}
