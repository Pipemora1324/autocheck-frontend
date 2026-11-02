import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorCode, apiErrorMessage } from '../../core/http/api-error';
import { PublicConfigService } from '../../core/http/public-config.service';
import { OWNER_DOCUMENT_TYPES, type OwnerDocumentType, type RuntRefreshResult } from '../../models/garage';
import { GarageService } from '../../services/garage.service';
import { ModalComponent } from '../modal/modal.component';

/** Respuestas que significan "el proveedor RUNT no está disponible todavía" (apagado, sin implementar o caído). */
const UNAVAILABLE_CODES = new Set(['RUNT_PROVIDER_NOT_IMPLEMENTED', 'RUNT_PROVIDER_DISABLED', 'RUNT_UNAVAILABLE']);

export function isRuntUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  const code = apiErrorCode(error);
  return code ? UNAVAILABLE_CODES.has(code) : error.status === 501 || error.status === 503;
}

const DOCUMENT_LABELS: Record<OwnerDocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  NIT: 'NIT',
  RC: 'Registro civil'
};

/** Consulta al proveedor RUNT con consentimiento explícito. El documento solo vive en este formulario y no se guarda. */
@Component({
  selector: 'app-runt-refresh-dialog',
  imports: [ReactiveFormsModule, ModalComponent, RouterLink],
  template: `
    <app-modal heading="Actualizar desde RUNT" (close)="close.emit()">
      @if (unavailable()) {
        <p class="form-notice" role="status">
          La actualización desde el RUNT todavía no está disponible. Puedes mantener tus datos al día editándolos a mano.
        </p>
        <div class="form-actions">
          <button class="primary-button" type="button" (click)="editManually.emit()">Editar a mano</button>
          <button class="secondary-button" type="button" (click)="close.emit()">Cerrar</button>
        </div>
      } @else {
        <p>
          Consultaremos la placa <strong>{{ plate() }}</strong> en un proveedor autorizado de información RUNT para actualizar marca, vigencias y estado.
        </p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="dialog-row">
            <div class="form-field">
              <label for="runt-doc-type">Tipo</label>
              <select id="runt-doc-type" formControlName="type">
                @for (type of documentTypes; track type) { <option [value]="type" [title]="labels[type]">{{ type }}</option> }
              </select>
            </div>
            <div class="form-field">
              <label for="runt-doc-number">Documento del propietario</label>
              <input id="runt-doc-number" formControlName="number" inputmode="numeric" autocomplete="off" [attr.aria-invalid]="!!numberError()" />
            </div>
          </div>
          @if (numberError()) { <p class="field-error">{{ numberError() }}</p> }

          <label class="check-field" for="runt-consent">
            <input id="runt-consent" type="checkbox" formControlName="consent" />
            <span>
              Autorizo enviar la placa y el documento del propietario al proveedor solo para esta consulta. Soy el propietario o tengo su autorización.
              AutoCheck-CO no guarda el documento. <a routerLink="/privacidad" target="_blank" rel="noopener">Más información</a>.
            </span>
          </label>
          @if (consentError()) { <p class="field-error">{{ consentError() }}</p> }
          @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }

          <div class="form-actions">
            <button class="primary-button" type="submit" [disabled]="sending()">{{ sending() ? 'Consultando…' : 'Consultar' }}</button>
            <button class="secondary-button" type="button" (click)="close.emit()">Cancelar</button>
          </div>
        </form>
      }
    </app-modal>
  `
})
export class RuntRefreshDialogComponent {
  private readonly garage = inject(GarageService);
  private readonly publicConfig = inject(PublicConfigService);

  readonly plate = input.required<string>();
  readonly close = output<void>();
  readonly editManually = output<void>();
  readonly updated = output<RuntRefreshResult>();

  protected readonly documentTypes = OWNER_DOCUMENT_TYPES;
  protected readonly labels = DOCUMENT_LABELS;

  readonly form = inject(NonNullableFormBuilder).group({
    type: ['CC' as OwnerDocumentType],
    number: ['', [Validators.required, Validators.pattern(/^[\d.\s-]{3,25}$/)]],
    consent: [false, [Validators.requiredTrue]]
  });
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  private readonly providerUnavailable = signal(false);

  /** Si la configuración pública dice que está apagada, ni siquiera se pide el documento. */
  readonly unavailable = computed(() => this.providerUnavailable() || this.publicConfig.config()?.runtLookup.enabled === false);

  constructor() {
    this.publicConfig.load().subscribe();
  }

  numberError(): string | null {
    const control = this.form.controls.number;
    if (control.valid || !(control.touched || this.submitted())) return null;
    return control.hasError('required') ? 'Escribe el número de documento.' : 'Solo números (puede llevar puntos o guiones).';
  }

  consentError(): string | null {
    return this.form.controls.consent.invalid && this.submitted() ? 'Debes autorizar la consulta para continuar.' : null;
  }

  submit(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) return;

    const { type, number } = this.form.getRawValue();
    this.sending.set(true);
    this.garage.refreshFromRunt(this.plate(), { type, number: number.replace(/[\s.-]/g, '') }).subscribe({
      next: (result) => {
        this.form.controls.number.reset('');
        this.updated.emit(result);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (isRuntUnavailable(error)) {
          this.form.controls.number.reset('');
          this.providerUnavailable.set(true);
          return;
        }
        this.error.set(
          apiErrorCode(error) === 'RUNT_NOT_FOUND'
            ? 'El proveedor no encontró este vehículo con ese documento. Revisa los datos.'
            : apiErrorMessage(error, 'No se pudo hacer la consulta. Inténtalo de nuevo.')
        );
      }
    });
  }
}
