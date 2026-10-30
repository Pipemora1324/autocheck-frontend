import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthCardComponent } from './auth-card.component';
import { fieldError, PASSWORD_MAX, PASSWORD_MIN, passwordsMatch, safeReturnUrl } from './auth-forms';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Crea tu cuenta" description="Regístrate con tu correo para consultar informes de peritaje.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label class="field-label" for="register-email">Correo electrónico</label>
        <input id="register-email" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="!!error('email')" aria-describedby="register-email-error" />
        @if (error('email'); as message) { <p class="field-error" id="register-email-error">{{ message }}</p> }

        <label class="field-label" for="register-password">Contraseña</label>
        <input id="register-password" type="password" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="!!error('password')" aria-describedby="register-password-hint" />
        <p class="field-hint" id="register-password-hint">Mínimo {{ min }} caracteres.</p>
        @if (error('password'); as message) { <p class="field-error">{{ message }}</p> }

        <label class="field-label" for="register-confirm">Confirma la contraseña</label>
        <input id="register-confirm" type="password" formControlName="confirm" autocomplete="new-password" [attr.aria-invalid]="!!confirmError()" aria-describedby="register-confirm-error" />
        @if (confirmError(); as message) { <p class="field-error" id="register-confirm-error">{{ message }}</p> }

        @if (serverError()) { <p class="form-error" role="alert">{{ serverError() }}</p> }

        <button class="primary-button" type="submit" [disabled]="submitting()">{{ submitting() ? 'Creando cuenta…' : 'Crear cuenta' }}</button>
      </form>
      <div class="auth-links">
        <span>¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></span>
      </div>
    </app-auth-card>
  `
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

  readonly min = PASSWORD_MIN;
  readonly form = inject(NonNullableFormBuilder).group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)]],
      confirm: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');

  error(name: 'email' | 'password'): string | null {
    return fieldError(this.form.controls[name], this.submitted());
  }

  confirmError(): string | null {
    const control = this.form.controls.confirm;
    const own = fieldError(control, this.submitted());
    if (own) return own;
    return this.form.hasError('passwordsMismatch') && (control.touched || this.submitted()) ? 'Las contraseñas no coinciden.' : null;
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    if (this.form.invalid) return;

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.register(email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl)),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(apiErrorMessage(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
      }
    });
  }
}
