import { Injectable, computed, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'autocheck_theme';
  readonly theme = signal<Theme>('system');

  /** Tema efectivo (resuelve "system" según el SO). */
  readonly effective = computed<Exclude<Theme, 'system'>>(() => {
    const t = this.theme();
    if (t !== 'system') return t;
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  readonly isDark = computed(() => this.effective() === 'dark');

  constructor() {
    this.init();
  }

  private init(): void {
    const stored = localStorage.getItem(this.storageKey) as Theme | null;
    const initial: Theme =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    this.applyTheme(initial);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme() === 'system') this.applyDom(this.effective());
    });
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
  }

  /** Alterna claro/oscuro según el tema efectivo actual. */
  toggle(): void {
    this.applyTheme(this.isDark() ? 'light' : 'dark');
  }

  private applyTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(this.storageKey, theme);
    this.applyDom(theme === 'system' ? this.effective() : theme);
  }

  private applyDom(theme: 'light' | 'dark'): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
  }
}
