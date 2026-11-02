import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthCardComponent } from './auth-card.component';

type VerifyState = 'missing' | 'verifying' | 'done' | 'failed';

@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Confirmación de correo">
      @switch (state()) {
        @case ('verifying') {
          <p class="form-notice" role="status"><span class="spinner" aria-hidden="true"></span> Confirmando tu correo…</p>
        }
        @case ('done') {
          <p class="form-notice" role="status">{{ message() }} Ya puedes usar tu garaje.</p>
        }
        @case ('missing') {
          <p class="form-error" role="alert">El enlace no es válido: falta el código de confirmación.</p>
        }
        @case ('failed') {
          <p class="form-error" role="alert">{{ message() }}</p>
          <p class="field-hint">El enlace vence a las 24 horas y solo sirve una vez. Puedes pedir uno nuevo desde el aviso de la parte superior cuando inicies sesión.</p>
        }
      }
      <div class="auth-links">
        @if (auth.isAuthenticated()) {
          <a routerLink="/">Ir a mi garaje</a>
        } @else {
          <a routerLink="/login">Iniciar sesión</a>
        }
      </div>
    </app-auth-card>
  `
})
export class VerifyEmailPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<VerifyState>('verifying');
  readonly message = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.state.set('missing');
      return;
    }
    // Se quita el token de la barra de direcciones y del historial apenas se lee.
    void this.router.navigate([], { relativeTo: this.route, queryParams: { token: null }, replaceUrl: true });
    this.auth.verifyEmail(token).subscribe({
      next: ({ message }) => {
        this.message.set(message);
        this.state.set('done');
      },
      error: (error: unknown) => {
        this.message.set(apiErrorMessage(error, 'No se pudo confirmar el correo. Inténtalo de nuevo.'));
        this.state.set('failed');
      }
    });
  }
}
