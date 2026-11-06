import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthCardComponent } from './auth-card.component';
import { fieldError, PASSWORD_MAX, PASSWORD_MIN, passwordsMatch } from './auth-forms';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card
      heading="Crea una nueva contraseña"
      description="Elige una contraseña que no hayas usado antes en AutoCheck-CO."
    >
      @if (!token) {
        <p class="form-error" role="alert">
          El enlace no es válido: falta el código de recuperación.
        </p>
        <div class="auth-links">
          <a routerLink="/olvide-contrasena">Solicitar un nuevo enlace</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field-label" for="reset-password">Nueva contraseña</label>
          <input
            id="reset-password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            [attr.aria-invalid]="!!passwordError()"
            aria-describedby="reset-password-hint"
          />
          <p class="field-hint" id="reset-password-hint">Mínimo {{ min }} caracteres.</p>
          @if (passwordError(); as message) {
            <p class="field-error">{{ message }}</p>
          }

          <label class="field-label" for="reset-confirm">Confirma la contraseña</label>
          <input
            id="reset-confirm"
            type="password"
            formControlName="confirm"
            autocomplete="new-password"
            [attr.aria-invalid]="!!confirmError()"
            aria-describedby="reset-confirm-error"
          />
          @if (confirmError(); as message) {
            <p class="field-error" id="reset-confirm-error">{{ message }}</p>
          }

          @if (serverError()) {
            <p class="form-error" role="alert">{{ serverError() }}</p>
            <div class="auth-links">
              <a routerLink="/olvide-contrasena">Solicitar un nuevo enlace</a>
            </div>
          }

          <button class="primary-button" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
      }
    </app-auth-card>
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly min = PASSWORD_MIN;
  readonly form = inject(NonNullableFormBuilder).group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN),
          Validators.maxLength(PASSWORD_MAX),
        ],
      ],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');

  constructor() {
    // Se quita el token de la barra de direcciones y del historial apenas se lee.
    if (this.token)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { token: null },
        replaceUrl: true,
      });
  }

  passwordError(): string | null {
    return fieldError(this.form.controls.password, this.submitted());
  }

  confirmError(): string | null {
    const control = this.form.controls.confirm;
    const own = fieldError(control, this.submitted());
    if (own) return own;
    return this.form.hasError('passwordsMismatch') && (control.touched || this.submitted())
      ? 'Las contraseñas no coinciden.'
      : null;
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { reset: 'ok' } }),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          apiErrorMessage(error, 'No se pudo restablecer la contraseña. Inténtalo de nuevo.'),
        );
      },
    });
  }
}
