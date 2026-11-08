import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      class="theme-toggle"
      type="button"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="isLight()"
      (click)="theme.toggle()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        @if (isLight()) {
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
        } @else {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        }
      </svg>
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly isLight = computed(() => this.theme.theme() === 'light');
  protected readonly label = computed(() =>
    this.isLight() ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro',
  );
}
