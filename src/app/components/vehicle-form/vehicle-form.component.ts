import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { FUEL_TYPES, SERVICE_TYPES, type GarageVehicleFields } from '../../models/garage';

/** Confianza por debajo de la cual un dato leído de la tarjeta se resalta para que el usuario lo revise. */
export const LOW_CONFIDENCE = 0.8;

export type VehicleFormValue = GarageVehicleFields & { plate: string };
export type VehicleFormField = keyof VehicleFormValue;
export type VehicleFormInitial = Partial<{ [K in VehicleFormField]: VehicleFormValue[K] | null }>;

const PLATE_PATTERN = /^\s*[A-Za-z]{3}[\s-]?\d{2}[0-9A-Za-z]\s*$/;
const CHASSIS_PATTERN = /^[A-Za-z0-9-]{5,30}$/;

const LABELS: Record<VehicleFormField, string> = {
  plate: 'Placa',
  brand: 'Marca',
  model: 'Línea',
  year: 'Modelo (año)',
  color: 'Color',
  cylinderCc: 'Cilindraje (cc)',
  chassis: 'Número de chasis',
  fuelType: 'Combustible',
  serviceType: 'Servicio',
  mileageKm: 'Kilometraje',
};

const text = (value: string) => value.trim() || null;
const integer = (value: string) => (value.trim() === '' ? null : Number(value));

/** Formulario de alta y edición. Los campos de baja confianza (lectura de la tarjeta) se resaltan. */
interface LengthError {
  requiredLength: number;
}

@Component({
  selector: 'app-vehicle-form',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form-grid">
        @if (mode() === 'create') {
          <div class="form-field" [class.low-confidence]="isLow('plate')">
            <label for="vehicle-plate">{{ labels.plate }} *</label>
            <input
              id="vehicle-plate"
              formControlName="plate"
              autocomplete="off"
              placeholder="ABC-123 o ABC-12D"
              [attr.aria-invalid]="!!error('plate')"
            />
            <ng-container
              [ngTemplateOutlet]="hints"
              [ngTemplateOutletContext]="{ $implicit: 'plate' }"
            />
          </div>
        }
        <div class="form-field" [class.low-confidence]="isLow('brand')">
          <label for="vehicle-brand">{{ labels.brand }} *</label>
          <input
            id="vehicle-brand"
            formControlName="brand"
            maxlength="60"
            [attr.aria-invalid]="!!error('brand')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'brand' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('model')">
          <label for="vehicle-model">{{ labels.model }} *</label>
          <input
            id="vehicle-model"
            formControlName="model"
            maxlength="80"
            placeholder="Por ejemplo, Sandero"
            [attr.aria-invalid]="!!error('model')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'model' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('year')">
          <label for="vehicle-year">{{ labels.year }}</label>
          <input
            id="vehicle-year"
            formControlName="year"
            inputmode="numeric"
            placeholder="Por ejemplo, 2019"
            [attr.aria-invalid]="!!error('year')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'year' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('color')">
          <label for="vehicle-color">{{ labels.color }}</label>
          <input
            id="vehicle-color"
            formControlName="color"
            maxlength="40"
            [attr.aria-invalid]="!!error('color')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'color' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('cylinderCc')">
          <label for="vehicle-cc">{{ labels.cylinderCc }}</label>
          <input
            id="vehicle-cc"
            formControlName="cylinderCc"
            inputmode="numeric"
            [attr.aria-invalid]="!!error('cylinderCc')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'cylinderCc' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('chassis')">
          <label for="vehicle-chassis">{{ labels.chassis }}</label>
          <input
            id="vehicle-chassis"
            formControlName="chassis"
            maxlength="30"
            autocomplete="off"
            [attr.aria-invalid]="!!error('chassis')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'chassis' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('fuelType')">
          <label for="vehicle-fuel">{{ labels.fuelType }}</label>
          <select id="vehicle-fuel" formControlName="fuelType">
            <option value="">Sin especificar</option>
            @for (fuel of fuelTypes; track fuel) {
              <option [value]="fuel">{{ fuel }}</option>
            }
          </select>
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'fuelType' }"
          />
        </div>
        <div class="form-field" [class.low-confidence]="isLow('serviceType')">
          <label for="vehicle-service">{{ labels.serviceType }}</label>
          <select id="vehicle-service" formControlName="serviceType">
            <option value="">Sin especificar</option>
            @for (service of serviceTypes; track service) {
              <option [value]="service">{{ service }}</option>
            }
          </select>
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'serviceType' }"
          />
        </div>
        <div class="form-field">
          <label for="vehicle-mileage">{{ labels.mileageKm }} (opcional)</label>
          <input
            id="vehicle-mileage"
            formControlName="mileageKm"
            inputmode="numeric"
            placeholder="Solo números, en km"
            [attr.aria-invalid]="!!error('mileageKm')"
          />
          <ng-container
            [ngTemplateOutlet]="hints"
            [ngTemplateOutletContext]="{ $implicit: 'mileageKm' }"
          />
        </div>
      </div>

      <ng-template #hints let-field>
        @if (error(field); as message) {
          <p class="field-error">{{ message }}</p>
        } @else if (isMissing(field)) {
          <p class="confidence-hint">No se pudo leer: complétalo a mano.</p>
        } @else if (isLow(field)) {
          <p class="confidence-hint">Revisa este dato: la lectura no fue del todo clara.</p>
        }
      </ng-template>

      @if (serverError()) {
        <p class="form-error" role="alert">{{ serverError() }}</p>
      }

      <div class="form-actions">
        <button class="primary-button" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Guardando…' : submitLabel() }}
        </button>
        <ng-content />
      </div>
    </form>
  `,
})
export class VehicleFormComponent {
  readonly mode = input<'create' | 'edit'>('create');
  readonly initial = input<VehicleFormInitial>({});
  /** Confianza por campo cuando los datos vienen de la lectura de la tarjeta. */
  readonly confidence = input<Partial<Record<VehicleFormField, number>> | null>(null);
  readonly submitting = input(false);
  readonly submitLabel = input('Guardar vehículo');
  readonly serverError = input('');
  readonly serverFieldErrors = input<Record<string, string>>({});
  readonly save = output<VehicleFormValue>();

  protected readonly labels = LABELS;
  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly serviceTypes = SERVICE_TYPES;
  private readonly submitted = signal(false);

  readonly form = inject(NonNullableFormBuilder).group({
    plate: ['', [Validators.required, Validators.pattern(PLATE_PATTERN)]],
    brand: ['', [Validators.required, Validators.maxLength(60)]],
    model: ['', [Validators.required, Validators.maxLength(80)]],
    year: [
      '',
      [
        Validators.pattern(/^\d{4}$/),
        Validators.min(1950),
        Validators.max(new Date().getFullYear() + 1),
      ],
    ],
    color: ['', [Validators.maxLength(40)]],
    cylinderCc: ['', [Validators.pattern(/^\d+$/), Validators.min(1), Validators.max(20000)]],
    chassis: ['', [Validators.pattern(CHASSIS_PATTERN)]],
    fuelType: [''],
    serviceType: [''],
    mileageKm: ['', [Validators.pattern(/^\d+$/), Validators.max(9_999_999)]],
  });

  private readonly lowFields = computed(() => {
    const confidence = this.confidence();
    if (!confidence) return new Set<string>();
    return new Set(
      Object.entries(confidence)
        .filter(([, value]) => value < LOW_CONFIDENCE)
        .map(([field]) => field),
    );
  });

  constructor() {
    effect(() => {
      const initial = this.initial();
      const values = Object.fromEntries(
        Object.entries(initial).map(([key, value]) => [
          key,
          String((value) ?? ''),
        ]),
      );
      this.form.reset({ ...this.form.getRawValue(), ...values });
      if (this.mode() === 'edit') this.form.controls.plate.disable();
    });
  }

  isLow(field: VehicleFormField): boolean {
    return this.lowFields().has(field);
  }

  isMissing(field: VehicleFormField): boolean {
    return this.isLow(field) && this.confidence()?.[field] === 0;
  }

  error(field: VehicleFormField): string | null {
    const server = this.serverFieldErrors()[field] as string | undefined;
    const control: AbstractControl = this.form.controls[field];
    if (control.valid || !(control.touched || this.submitted())) return server ?? null;
    const errors = control.errors ?? {};
    if (errors['required']) return `${LABELS[field]} es obligatorio.`;
    if (field === 'plate')
      return 'Ingresa una placa colombiana válida: ABC-123 (carro) o ABC-12D (moto).';
    if (field === 'year') return `Ingresa un año entre 1950 y ${new Date().getFullYear() + 1}.`;
    if (field === 'cylinderCc') return 'El cilindraje va en cc, sin decimales (máximo 20000).';
    if (field === 'mileageKm') return 'El kilometraje va en km, solo números (máximo 9.999.999).';
    if (field === 'chassis') return 'Solo letras, números y guiones (5 a 30 caracteres).';
    if (errors['maxlength'])
      return `No puede superar ${(errors['maxlength'] as LengthError).requiredLength} caracteres.`;
    return 'Revisa este campo.';
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.save.emit({
      plate: raw.plate.trim().toUpperCase(),
      brand: raw.brand.trim(),
      model: raw.model.trim(),
      year: integer(raw.year),
      color: text(raw.color),
      cylinderCc: integer(raw.cylinderCc),
      chassis: text(raw.chassis)?.toUpperCase() ?? null,
      fuelType: (raw.fuelType || null) as VehicleFormValue['fuelType'],
      serviceType: (raw.serviceType || null) as VehicleFormValue['serviceType'],
      mileageKm: integer(raw.mileageKm),
    });
  }
}
