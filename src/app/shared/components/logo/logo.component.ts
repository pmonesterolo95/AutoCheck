import { Component, input } from '@angular/core';

/**
 * Marca de AutoCheck: tile redondeado navy con un "check" sobre una línea
 * de ruta/road y un punto ámbar de acento. Escala desde 16px (favicon) hasta
 * tamaños de héroe sin perder nitidez (SVG, sin defs ni gradientes duplicados).
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.aria-label]="label()"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img">
      <rect x="4" y="4" width="40" height="40" rx="12" fill="#0f4c81" />
      <path
        d="M14 6h12a16 16 0 0 1 16 16v2a10 10 0 0 0-6-2A20 20 0 0 0 14 22V6z"
        fill="rgba(255,255,255,0.14)"
      />
      <path
        d="M10.5 33.5c5.5-3.5 9-3.5 13.5-1.5 4.5 2 8 2 13.5-1.5"
        stroke="rgba(255,255,255,0.32)"
        stroke-width="2.2"
        fill="none"
        stroke-linecap="round"
      />
      <path
        d="M15.5 24l5.4 5.4L33 16.5"
        stroke="#ffffff"
        stroke-width="4.6"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="35.5" cy="14" r="3" fill="#f59e0b" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      line-height: 0;
      flex-shrink: 0;
    }
  `,
})
export class LogoComponent {
  readonly size = input<number>(40);
  readonly label = input<string>('AutoCheck');
}