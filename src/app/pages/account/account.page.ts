import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorCode, apiErrorMessage } from '../../core/http/api-error';
import { PASSWORD_MAX } from '../auth/auth-forms';

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, RouterLink, ModalComponent],
  template: `
    <header class="page-header">
      <div>
        <span class="eyebrow">Mi cuenta</span>
        <h1>Tu cuenta</h1>
      </div>
    </header>

    <section class="panel">
      <h2>Datos</h2>
      <dl class="data-list">
        <div>
          <dt>Correo</dt>
          <dd>{{ auth.user()?.email }}</dd>
        </div>
        <div>
          <dt>Correo confirmado</dt>
          <dd>{{ auth.user()?.emailVerified ? 'Sí' : 'No' }}</dd>
        </div>
      </dl>
      <p class="source-note">
        Consulta cómo tratamos tus datos en la
        <a routerLink="/privacidad">política de privacidad</a>.
      </p>
    </section>

    <section class="panel">
      <h2>Eliminar mi cuenta</h2>
      <p class="source-note">
        Se borran tu cuenta, tus sesiones, todos los vehículos de tu garaje y sus diagnósticos. Con
        esto también revocas la autorización de tratamiento de datos. Esta acción no se puede
        deshacer.
      </p>
      <div class="form-actions">
        <button class="danger-button" type="button" (click)="open()">Eliminar mi cuenta</button>
      </div>
    </section>

    @if (confirming()) {
      <app-modal heading="¿Eliminar tu cuenta?" (closed)="confirming.set(false)">
        <p>
          Escribe tu contraseña para confirmar. Se borrarán tu cuenta, todos tus vehículos y sus
          diagnósticos.
        </p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-field">
            <label for="delete-password">Contraseña</label>
            <input
              id="delete-password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="!!error()"
            />
          </div>
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <div class="form-actions">
            <button class="danger-button" type="submit" [disabled]="deleting()">
              {{ deleting() ? 'Eliminando…' : 'Eliminar definitivamente' }}
            </button>
            <button class="secondary-button" type="button" (click)="confirming.set(false)">
              Cancelar
            </button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required, Validators.maxLength(PASSWORD_MAX)]],
  });
  readonly confirming = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');

  open(): void {
    this.form.reset();
    this.error.set('');
    this.confirming.set(true);
  }

  submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.error.set('Escribe tu contraseña para confirmar.');
      return;
    }
    this.deleting.set(true);
    this.auth.deleteAccount(this.form.getRawValue().password).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { cuenta: 'eliminada' } }),
      error: (error: unknown) => {
        this.deleting.set(false);
        this.form.reset();
        this.error.set(
          apiErrorCode(error) === 'INVALID_PASSWORD'
            ? 'La contraseña no es correcta.'
            : apiErrorMessage(error, 'No se pudo eliminar la cuenta. Inténtalo de nuevo.'),
        );
      },
    });
  }
}
