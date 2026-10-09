import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-sm rounded-full px-2.5"
      (click)="toggle()"
      [attr.aria-label]="label()"
      [title]="label()"
    >
      @if (isDark()) {
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path
            fill-rule="evenodd"
            d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm4.598 2.652a.75.75 0 011.06 0l1.062 1.06a.75.75 0 11-1.06 1.061l-1.062-1.06a.75.75 0 010-1.061zM17.25 9.25h-1.5a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5zM10 14.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zm-4.598-3.152a.75.75 0 010-1.061L6.464 9.23a.75.75 0 11-1.06-1.06L4.34 7.347a.75.75 0 011.06-1.061l1.062 1.06a.75.75 0 010 1.061zM5.75 9.25h-1.5a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5zM13.536 13.536a.75.75 0 011.06 0l1.061 1.061a.75.75 0 11-1.06 1.061l-1.061-1.06a.75.75 0 010-1.061zM8.464 6.464a.75.75 0 011.06 0L10 6.94l.476-.476a.75.75 0 111.06 1.061L11.06 8l.476.476a.75.75 0 11-1.06 1.06L10 9.06l-.476.476a.75.75 0 11-1.06-1.061L8.94 8l-.476-.476a.75.75 0 010-1.06zM10 5a5 5 0 100 10 5 5 0 000-10z"
            clip-rule="evenodd"
          />
        </svg>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class ThemeToggleComponent {
  private readonly themeSvc = inject(ThemeService);

  readonly isDark = computed(() => this.themeSvc.isDark());

  readonly label = computed(() => (this.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'));

  toggle(): void {
    this.themeSvc.toggle();
  }
}
