import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthCardComponent } from './auth-card.component';
import { fieldError, PASSWORD_MAX, safeReturnUrl } from './auth-forms';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Inicia sesión" description="Ingresa para consultar vehículos e informes de peritaje.">
      @if (notice()) {
        <p class="form-notice" role="status">{{ notice() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label class="field-label" for="login-email">Correo electrónico</label>
        <input id="login-email" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="!!error('email')" aria-describedby="login-email-error" />
        @if (error('email'); as message) { <p class="field-error" id="login-email-error">{{ message }}</p> }

        <label class="field-label" for="login-password">Contraseña</label>
        <input id="login-password" type="password" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="!!error('password')" aria-describedby="login-password-error" />
        @if (error('password'); as message) { <p class="field-error" id="login-password-error">{{ message }}</p> }

        @if (serverError()) { <p class="form-error" role="alert">{{ serverError() }}</p> }

        <button class="primary-button" type="submit" [disabled]="submitting()">{{ submitting() ? 'Ingresando…' : 'Iniciar sesión' }}</button>
      </form>
      <div class="auth-links">
        <a routerLink="/olvide-contrasena">¿Olvidaste tu contraseña?</a>
        <span>¿No tienes cuenta? <a routerLink="/registro" [queryParams]="returnQuery">Crear cuenta</a></span>
      </div>
    </app-auth-card>
  `
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(PASSWORD_MAX)]]
  });
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');
  readonly notice = signal(
    this.params.get('sesion') === 'expirada'
      ? 'Tu sesión expiró. Inicia sesión de nuevo.'
      : this.params.get('reset') === 'ok'
        ? 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.'
        : ''
  );
  readonly returnQuery = this.params.get('returnUrl') ? { returnUrl: this.params.get('returnUrl') } : {};

  error(name: 'email' | 'password'): string | null {
    return fieldError(this.form.controls[name], this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    if (this.form.invalid) return;

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.params.get('returnUrl'))),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Correo o contraseña incorrectos.'
            : apiErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.')
        );
      }
    });
  }
}
