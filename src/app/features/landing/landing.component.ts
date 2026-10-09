import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LogoComponent, ThemeToggleComponent, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  @ViewChild('heroSection', { read: ElementRef }) private hero?: ElementRef<HTMLElement>;
  @ViewChild('mockTilt', { read: ElementRef }) private mock?: ElementRef<HTMLElement>;

  private raf = 0;
  private readonly reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Spotlight + tilt 3D del hero siguiendo el mouse (fuera de la detección de cambios). */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.reduceMotion) return;
    const hero = this.hero?.nativeElement;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const margin = 140;
    if (
      event.clientX < rect.left - margin ||
      event.clientX > rect.right + margin ||
      event.clientY < rect.top - margin ||
      event.clientY > rect.bottom + margin
    ) {
      return;
    }
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      hero.style.setProperty('--mx', `${x.toFixed(1)}px`);
      hero.style.setProperty('--my', `${y.toFixed(1)}px`);
      const mock = this.mock?.nativeElement;
      if (mock) {
        const nx = (x - rect.width / 2) / (rect.width / 2);
        const ny = (y - rect.height / 2) / (rect.height / 2);
        mock.style.setProperty('--ry', `${(nx * 7).toFixed(2)}deg`);
        mock.style.setProperty('--rx', `${(-ny * 7).toFixed(2)}deg`);
      }
    });
  }

  /** Vuelve el mock a su posición al salir del hero. */
  @HostListener('document:mouseleave')
  onMouseLeave(): void {
    cancelAnimationFrame(this.raf);
    const mock = this.mock?.nativeElement;
    if (mock) {
      mock.style.setProperty('--rx', '0deg');
      mock.style.setProperty('--ry', '0deg');
    }
  }
}
