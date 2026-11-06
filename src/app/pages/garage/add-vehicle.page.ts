import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  VehicleFormComponent,
  type VehicleFormField,
  type VehicleFormInitial,
  type VehicleFormValue
} from '../../components/vehicle-form/vehicle-form.component';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error';
import { IMAGE_ACCEPT, imageFileError } from '../../core/image-file';
import { PublicConfigService } from '../../core/http/public-config.service';
import type { CardScanResult } from '../../models/garage';
import { GarageService } from '../../services/garage.service';

type Step = 'choose' | 'photo' | 'reading' | 'review' | 'manual';

/** Convierte la lectura de la tarjeta en valores del formulario y su confianza por campo. */
export function prefillFromScan(scan: CardScanResult): { initial: VehicleFormInitial; confidence: Partial<Record<VehicleFormField, number>> } {
  const initial: VehicleFormInitial = {};
  const confidence: Partial<Record<VehicleFormField, number>> = {};
  for (const [field, prefilled] of Object.entries(scan.vehicle) as Array<[VehicleFormField, { value: unknown; confidence: number }]>) {
    (initial as Record<string, unknown>)[field] = prefilled.value;
    confidence[field] = prefilled.value === null ? 0 : prefilled.confidence;
  }
  return { initial, confidence };
}

@Component({
  selector: 'app-add-vehicle-page',
  imports: [RouterLink, VehicleFormComponent],
  template: `
    <a class="back-link" routerLink="/">← Volver a mi garaje</a>
    <header class="page-header">
      <div>
        <span class="eyebrow">Mi garaje</span>
        <h1>Agregar vehículo</h1>
        <p>Llena los datos a mano o, si prefieres, usa una foto de la tarjeta de propiedad (licencia de tránsito).</p>
      </div>
    </header>

    @switch (step()) {
      @case ('choose') {
        <div class="choice-grid">
          <button type="button" class="choice-card" (click)="step.set('photo')" [disabled]="!scanEnabled()">
            <span class="choice-icon" aria-hidden="true">📷</span>
            <strong>Con foto de la tarjeta (opcional)</strong>
            @if (scanEnabled()) {
              <span>Tomamos los datos de la foto y tú los revisas antes de guardar.</span>
            } @else {
              <span>La lectura automática no está disponible en este momento. Puedes llenarlo a mano.</span>
            }
          </button>
          <button type="button" class="choice-card" (click)="startManual()">
            <span class="choice-icon" aria-hidden="true">✍️</span>
            <strong>Llenar a mano</strong>
            <span>Escribe la placa, la marca, la línea y los demás datos que quieras.</span>
          </button>
        </div>
      }
      @case ('photo') {
        <section class="panel">
          <h2>Foto de la tarjeta de propiedad</h2>
          <p class="provider-notice">
            {{ providerNotice() }}
          </p>
          <div class="file-actions">
            <label class="primary-button link-button" for="card-camera">Tomar foto</label>
            <input id="card-camera" class="visually-hidden" type="file" [accept]="imageAccept" capture="environment" (change)="onFile($event)" />
            <label class="secondary-button" for="card-file">Subir imagen</label>
            <input id="card-file" class="visually-hidden" type="file" [accept]="imageAccept" (change)="onFile($event)" />
          </div>
          <p class="field-hint">JPEG, PNG o WEBP, máximo 5 MB. Toma la foto de frente, con buena luz y sin reflejos.</p>
          @if (photoError()) {
            <p class="form-error" role="alert">{{ photoError() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="secondary-button" (click)="startManual()">Prefiero llenarlo a mano</button>
            <button type="button" class="secondary-button" (click)="step.set('choose')">Cancelar</button>
          </div>
        </section>
      }
      @case ('reading') {
        <div class="state-box" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <strong>Leyendo la tarjeta…</strong>
          <p>Puede tardar unos segundos.</p>
        </div>
      }
      @case ('review') {
        <section class="panel">
          <h2>Revisa los datos antes de guardar</h2>
          <p class="provider-notice">Los campos resaltados se leyeron con poca claridad o no se pudieron leer. Corrige lo que haga falta: solo se guarda lo que confirmes.</p>
          @if (warnings().length) {
            <ul class="warning-list">
              @for (warning of warnings(); track warning) { <li>{{ warning }}</li> }
            </ul>
          }
          <app-vehicle-form
            [initial]="initial()"
            [confidence]="confidence()"
            submitLabel="Confirmar y guardar"
            [submitting]="saving()"
            [serverError]="saveError()"
            [serverFieldErrors]="fieldErrors()"
            (save)="save($event, 'scan')"
          >
            <button type="button" class="secondary-button" (click)="step.set('photo')">Tomar otra foto</button>
          </app-vehicle-form>
        </section>
      }
      @case ('manual') {
        <section class="panel">
          <h2>Datos del vehículo</h2>
          <app-vehicle-form
            [submitting]="saving()"
            [serverError]="saveError()"
            [serverFieldErrors]="fieldErrors()"
            (save)="save($event, 'manual')"
          >
            <a class="secondary-button" routerLink="/">Cancelar</a>
          </app-vehicle-form>
        </section>
      }
    }
  `
})
export class AddVehiclePage {
  private readonly garage = inject(GarageService);
  private readonly router = inject(Router);
  private readonly publicConfig = inject(PublicConfigService);
  protected readonly imageAccept = IMAGE_ACCEPT;

  readonly step = signal<Step>('choose');
  readonly photoError = signal('');
  readonly initial = signal<VehicleFormInitial>({});
  readonly confidence = signal<Partial<Record<VehicleFormField, number>> | null>(null);
  readonly warnings = signal<string[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});

  /** Si la configuración no cargó, se ofrece la foto igual: el backend responde 503 y se cae al flujo manual. */
  readonly scanEnabled = computed(() => this.publicConfig.config()?.cardScan.enabled ?? true);
  readonly providerNotice = computed(
    () =>
      this.publicConfig.config()?.cardScan.notice ??
      'La foto se envía a un proveedor externo de lectura solo para extraer los datos; AutoCheck-CO no la guarda.'
  );

  constructor() {
    this.publicConfig.load().subscribe();
  }

  startManual(): void {
    this.confidence.set(null);
    this.initial.set({});
    this.resetSaveState();
    this.step.set('manual');
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const invalid = imageFileError(file);
    this.photoError.set(invalid ?? '');
    if (invalid) return;

    this.step.set('reading');
    this.garage.scanCard(file).subscribe({
      next: (scan) => {
        const { initial, confidence } = prefillFromScan(scan);
        this.initial.set(initial);
        this.confidence.set(confidence);
        this.warnings.set(scan.warnings);
        this.resetSaveState();
        this.step.set('review');
      },
      error: (error: unknown) => {
        this.photoError.set(apiErrorMessage(error, 'No pudimos leer la tarjeta. Intenta con otra foto o llena los datos a mano.'));
        this.step.set('photo');
      }
    });
  }

  save(value: VehicleFormValue, source: 'manual' | 'scan'): void {
    this.resetSaveState();
    this.saving.set(true);
    this.garage.create({ ...value, source }).subscribe({
      next: (vehicle) => void this.router.navigate(['/garaje', vehicle.plate], { state: { created: true } }),
      error: (error: unknown) => {
        this.saving.set(false);
        this.fieldErrors.set(apiFieldErrors(error));
        this.saveError.set(apiErrorMessage(error, 'No se pudo guardar el vehículo. Inténtalo de nuevo.'));
      }
    });
  }

  private resetSaveState(): void {
    this.saving.set(false);
    this.saveError.set('');
    this.fieldErrors.set({});
  }
}
