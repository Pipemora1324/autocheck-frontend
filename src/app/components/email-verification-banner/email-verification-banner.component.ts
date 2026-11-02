import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';

/** Aviso fijo mientras el correo no esté confirmado: el garaje responde 403 EMAIL_NOT_VERIFIED hasta entonces. */
@Component({
  selector: 'app-email-verification-banner',
  template: `
    @if (visible()) {
      <section class="notice-banner" role="status" aria-live="polite">
        <div>
          <strong>Confirma tu correo para usar tu garaje.</strong>
          <span>Te enviamos un enlace a {{ auth.user()?.email }}. Revisa también la carpeta de spam.</span>
          @if (feedback()) { <span class="notice-feedback">{{ feedback() }}</span> }
        </div>
        <button type="button" class="notice-action" (click)="resend()" [disabled]="sending()">
          {{ sending() ? 'Enviando…' : 'Reenviar correo' }}
        </button>
      </section>
    }
  `
})
export class EmailVerificationBannerComponent {
  protected readonly auth = inject(AuthService);
  readonly visible = computed(() => this.auth.user()?.emailVerified === false);
  readonly sending = signal(false);
  readonly feedback = signal('');

  resend(): void {
    const email = this.auth.user()?.email;
    if (!email) return;
    this.sending.set(true);
    this.feedback.set('');
    this.auth.resendVerification(email).subscribe({
      next: ({ message }) => {
        this.sending.set(false);
        this.feedback.set(message);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.feedback.set(apiErrorMessage(error, 'No se pudo reenviar el correo. Inténtalo de nuevo en unos minutos.'));
      }
    });
  }
}
