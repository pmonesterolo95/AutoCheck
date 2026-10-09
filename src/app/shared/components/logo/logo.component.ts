import { Component, input } from '@angular/core';

/**
 * Marca de AutoCheck (v2): aro de rueda + check de verificación
 * con un segmento ámbar de acento, sobre tile redondeado con
 * degradado navy. SVG minimalista, nítido de 16px a hero.
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
      <defs>
        <linearGradient id="autocheckLogoGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0f4c81" />
          <stop offset="1" stop-color="#1d6fb8" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#autocheckLogoGrad)" />
      <rect x="4" y="4" width="40" height="40" rx="12" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
      <circle cx="24" cy="24" r="10.5" fill="none" stroke="#ffffff" stroke-width="3.4" />
      <path
        d="M29.3 14.9 A10.5 10.5 0 0 1 34.3 22.2"
        fill="none"
        stroke="#f59e0b"
        stroke-width="3.4"
        stroke-linecap="round"
      />
      <path
        d="M19 24.2l3.6 3.6L29.4 20"
        fill="none"
        stroke="#ffffff"
        stroke-width="3.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
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
