import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  host: { class: 'auth-page' },
  template: `
    <section class="auth-card" [attr.aria-labelledby]="headingId">
      <span class="eyebrow">{{ eyebrow() }}</span>
      <h1 [id]="headingId">{{ heading() }}</h1>
      @if (description()) {
        <p class="auth-description">{{ description() }}</p>
      }
      <ng-content />
    </section>
  `
})
export class AuthCardComponent {
  readonly eyebrow = input('Cuenta AutoCheck-CO');
  readonly heading = input.required<string>();
  readonly description = input('');
  protected readonly headingId = `auth-title-${Math.random().toString(36).slice(2, 8)}`;
}
