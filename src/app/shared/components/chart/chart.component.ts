import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Chart } from 'chart.js/auto';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  tension?: number;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-box" [style.maxHeight]="height + 'px'"><canvas #canvas></canvas></div>`,
  styleUrl: './chart.component.scss',
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() type: 'bar' | 'doughnut' | 'line' | 'pie' = 'bar';
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() height = 240;
  @Input() legend = true;

  @ViewChild('canvas') private canvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    if (this.chart) this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();

    const isPie = this.type === 'doughnut' || this.type === 'pie';
    this.chart = new Chart(this.canvas.nativeElement, {
      type: this.type,
      data: { labels: this.labels, datasets: this.datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: this.legend, position: isPie ? 'right' : 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = Number(ctx.raw ?? 0);
                return `${ctx.dataset.label ?? ''}: $${value.toLocaleString('es-AR')}`;
              },
            },
          },
        },
        scales: isPie
          ? undefined
          : {
              y: {
                ticks: { callback: (value) => `$${Number(value).toLocaleString('es-AR')}` },
              },
              x: {},
            },
      },
    });
  }
}