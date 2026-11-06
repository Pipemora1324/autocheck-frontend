import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { AuthCardComponent } from './auth-card.component';
import { fieldError } from './auth-forms';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Recupera tu contraseña" description="Te enviaremos un enlace para crear una nueva contraseña. El enlace vence en 30 minutos.">
      @if (sentMessage()) {
        <p class="form-notice" role="status">{{ sentMessage() }}</p>
        <p class="field-hint">Revisa también la carpeta de spam. Si no llega, puedes solicitar otro enlace en unos minutos.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field-label" for="forgot-email">Correo electrónico</label>
          <input id="forgot-email" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="!!error()" aria-describedby="forgot-email-error" />
          @if (error(); as message) { <p class="field-error" id="forgot-email-error">{{ message }}</p> }

          @if (serverError()) { <p class="form-error" role="alert">{{ serverError() }}</p> }

          <button class="primary-button" type="submit" [disabled]="submitting()">{{ submitting() ? 'Enviando…' : 'Enviar enlace' }}</button>
        </form>
      }
      <div class="auth-links">
        <a routerLink="/login">Volver a iniciar sesión</a>
      </div>
    </app-auth-card>
  `
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  readonly form = inject(NonNullableFormBuilder).group({ email: ['', [Validators.required, Validators.email]] });
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');
  readonly sentMessage = signal('');

  error(): string | null {
    return fieldError(this.form.controls.email, this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email.trim()).subscribe({
      // El backend responde lo mismo exista o no el correo; se muestra tal cual.
      next: ({ message }) => { this.sentMessage.set(message); },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverError.set(apiErrorMessage(error, 'No se pudo enviar la solicitud. Inténtalo de nuevo.'));
      }
    });
  }
}
