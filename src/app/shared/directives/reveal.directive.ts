import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';

/**
 * Reveal on scroll: agrega `.is-visible` cuando el elemento entra al viewport.
 * Uso: `<div appReveal>` o con stagger `<div [appReveal]="120">` (delay en ms).
 * Respeta `prefers-reduced-motion` vía CSS (ver landing.component.scss).
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @Input('appReveal') delay: number | string = 0;

  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const native = this.el.nativeElement;
    this.renderer.addClass(native, 'reveal');
    this.renderer.setStyle(native, '--reveal-delay', `${Number(this.delay) || 0}ms`);

    if (typeof IntersectionObserver === 'undefined') {
      this.renderer.addClass(native, 'is-visible');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.renderer.addClass(native, 'is-visible');
            this.observer?.unobserve(native);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    this.observer.observe(native);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
