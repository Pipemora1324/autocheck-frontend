import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorCode, apiErrorMessage, EMAIL_NOT_VERIFIED } from '../../core/http/api-error';
import { PublicConfigService } from '../../core/http/public-config.service';
import { IMAGE_ACCEPT, imageFileError } from '../../core/image-file';
import { RealtimeService, type DiagnosisStage } from '../../core/realtime/realtime.service';
import type {
  BetterInputReason,
  Diagnosed,
  DiagnosisInput,
  NeedsBetterInput,
  NotRecognized,
  TelltaleSummary,
} from '../../models/diagnosis';
import { DiagnosisService } from '../../services/diagnosis.service';
import { DiagnosisChatComponent } from '../diagnosis-chat/diagnosis-chat.component';
import { DiagnosisResultComponent } from '../diagnosis-result/diagnosis-result.component';
import { TelltalePickerComponent } from '../telltale-picker/telltale-picker.component';

export const MAX_DESCRIPTION_LENGTH = 500;

const DEFAULT_NOTICE =
  'La foto del tablero y tu descripción se envían a un proveedor externo de inteligencia artificial para identificar los testigos. La foto no se guarda en nuestros servidores.';

/** Progreso en vivo, si hay socket. Sin él, se queda el texto inicial y el resultado llega igual. */
const STAGE_LABEL: Partial<Record<DiagnosisStage, string>> = {
  queued: 'En cola…',
  analyzing: 'Analizando la imagen…',
  drafting: 'Redactando la explicación…',
};

/** Pista adicional según por qué no se pudo leer la foto. */
export const REASON_HINT: Record<BetterInputReason, string> = {
  no_telltales_found:
    'Asegúrate de que el tablero esté encendido y de que los testigos se vean en la foto.',
  low_confidence:
    'Vimos algo, pero no lo suficiente: acércate más al testigo y evita los reflejos.',
};
const WHILE_WAITING =
  'Mientras tanto: si el testigo es rojo o notas algo raro al manejar, detente en un lugar seguro.';

type Mode = 'photo' | 'list';

export interface DiagnosisErrorView {
  message: string;
  /** Si tiene sentido ofrecer la lista: no lo tiene cuando la elección manual fallaría igual. */
  suggestList: boolean;
}

/** Qué contador se agotó en un 429 de diagnósticos. Solo con el de la IA tiene sentido ofrecer la lista. */
const limitScope = (error: unknown): unknown =>
  error instanceof HttpErrorResponse
    ? (error.error as { limite?: unknown } | null)?.limite
    : undefined;

/**
 * Traduce los errores de POST /garage/:plate/diagnoses.
 * 503 DIAGNOSIS_PROVIDER_BUSY (provider_busy): Gemini respondió 429 por su plan gratuito, no por este usuario.
 * 503 DIAGNOSIS_UNAVAILABLE (provider_error): falló el servicio, no la foto: nunca se pide repetirla.
 * 429 RATE_LIMITED: el usuario superó uno de nuestros límites por hora.
 */
export function diagnosisErrorView(error: unknown): DiagnosisErrorView {
  const code = apiErrorCode(error);
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (code === EMAIL_NOT_VERIFIED) {
    return {
      message:
        'Confirma tu correo para diagnosticar. Abre el enlace que te enviamos o usa "Reenviar correo" en el aviso de arriba.',
      suggestList: false,
    };
  }
  if (code === 'RATE_LIMITED' || status === 429) {
    return {
      message: apiErrorMessage(
        error,
        'Alcanzaste el límite de diagnósticos por hora. Intenta más tarde.',
      ),
      suggestList: limitScope(error) === 'ia',
    };
  }
  if (code === 'DIAGNOSIS_PROVIDER_BUSY') {
    return {
      message:
        'El cupo gratuito de la IA está ocupado en este momento. Intenta en un minuto o elige el testigo de la lista.',
      suggestList: true,
    };
  }
  if (code === 'DIAGNOSIS_UNAVAILABLE') {
    return {
      message:
        'La IA falló por un problema del servicio, no por tu foto. Intenta más tarde. La elección manual sigue funcionando: elige el testigo de la lista.',
      suggestList: true,
    };
  }
  if (code === 'AI_NOT_CONFIGURED') {
    return {
      message:
        'La IA no está disponible en este momento. La elección manual sigue funcionando: elige el testigo de la lista.',
      suggestList: true,
    };
  }
  return {
    message: apiErrorMessage(error, 'No pudimos hacer el diagnóstico. Inténtalo de nuevo.'),
    suggestList: false,
  };
}

/** Pantalla principal del vehículo: foto o descripción con IA, o elección manual de la lista. */
@Component({
  selector: 'app-diagnose-panel',
  imports: [DiagnosisChatComponent, DiagnosisResultComponent, TelltalePickerComponent],
  template: `
    <section class="panel diagnose-panel" aria-labelledby="diagnose-title">
      <h2 id="diagnose-title">Diagnosticar un testigo</h2>

      @if (result(); as diagnosis) {
        <app-diagnosis-result [result]="diagnosis" />
        <app-diagnosis-chat [plate]="plate()" [diagnosisId]="diagnosis.id" />
        <div class="form-actions">
          <button class="primary-button" type="button" (click)="reset()">
            Diagnosticar otro testigo
          </button>
        </div>
      } @else if (sending()) {
        <div class="state-box" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <strong>{{ sendingLabel() }}</strong>
          <p>Puede tardar unos segundos.</p>
        </div>
      } @else {
        <div class="tab-list" role="group" aria-label="Cómo quieres identificar el testigo">
          <button
            type="button"
            class="tab"
            [class.active]="mode() === 'photo'"
            [attr.aria-pressed]="mode() === 'photo'"
            (click)="setMode('photo')"
          >
            Con foto o descripción
          </button>
          <button
            type="button"
            class="tab"
            [class.active]="mode() === 'list'"
            [attr.aria-pressed]="mode() === 'list'"
            (click)="setMode('list')"
          >
            Elegir de la lista
          </button>
        </div>

        @if (betterInput(); as better) {
          <div class="better-input" role="status">
            <strong>{{ better.pista }}</strong>
            @if (reasonHint(); as hint) {
              <span>{{ hint }}</span>
            }
            <span>{{ better.avisoSeguridad }}</span>
            <div class="form-actions">
              <button class="secondary-button" type="button" (click)="retryPhoto()">
                Repetir la foto
              </button>
              <button class="secondary-button" type="button" (click)="setMode('list')">
                Elegir de la lista
              </button>
            </div>
          </div>
        }

        @if (errorView(); as view) {
          <div class="form-error diagnose-error" role="alert">
            <p>{{ view.message }}</p>
            <p>{{ whileWaiting }}</p>
            @if (view.suggestList && mode() !== 'list') {
              <button class="secondary-button" type="button" (click)="setMode('list')">
                Elegir de la lista
              </button>
            }
          </div>
        }

        @if (mode() === 'photo') {
          @if (aiEnabled()) {
            <p class="provider-notice">{{ notice() }}</p>
            <p class="provider-notice">
              Usa solo fotos del tablero de tu propio vehículo o de uno que estés autorizado a usar.
            </p>

            <div class="capture-actions">
              <label class="primary-button capture-button" for="dash-camera">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8h4l2-3h6l2 3h4v12H3zM12 10a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z"
                  />
                </svg>
                Fotografiar testigo
              </label>
              <input
                id="dash-camera"
                class="visually-hidden"
                type="file"
                [accept]="imageAccept"
                capture="environment"
                (change)="onFile($event)"
              />
            </div>
            <label class="secondary-button capture-secondary" for="dash-file">Subir imagen</label>
            <input
              id="dash-file"
              class="visually-hidden"
              type="file"
              [accept]="imageAccept"
              (change)="onFile($event)"
            />
            <p class="field-hint">
              JPEG, PNG o WEBP, máximo 5 MB. Acércate al testigo, con el tablero encendido y sin
              reflejos.
            </p>
            @if (photoError()) {
              <p class="form-error" role="alert">{{ photoError() }}</p>
            }

            @if (previewUrl(); as url) {
              <figure class="photo-preview">
                <img [src]="url" alt="Vista previa de la foto del tablero" />
                <figcaption>
                  <button class="secondary-button" type="button" (click)="clearPhoto()">
                    Quitar foto
                  </button>
                </figcaption>
              </figure>
            }

            <div class="form-field">
              <label for="dash-description">Descripción (opcional si tienes foto)</label>
              <textarea
                id="dash-description"
                rows="3"
                [attr.maxlength]="maxDescription"
                placeholder="Por ejemplo, una luz naranja con forma de motor"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
              ></textarea>
              <p class="field-hint">
                {{ description().length }} de {{ maxDescription }} caracteres.
              </p>
            </div>

            <label class="check-field blink-field">
              <input
                type="checkbox"
                [checked]="blinking()"
                (change)="blinking.set($any($event.target).checked)"
              />
              <span
                >¿El testigo parpadea? Márcalo si alguno parpadea: una foto no lo muestra, y puede
                ser más urgente.</span
              >
            </label>

            <label class="check-field ack-field">
              <input
                type="checkbox"
                [checked]="acknowledged()"
                (change)="acknowledged.set($any($event.target).checked)"
              />
              <span
                >Leí el aviso y es el tablero de mi propio vehículo o de uno que estoy autorizado a
                usar.</span
              >
            </label>

            <div class="form-actions">
              <button class="primary-button" type="button" [disabled]="!canSend()" (click)="send()">
                Diagnosticar
              </button>
            </div>
            @if (!hasInput()) {
              <p class="field-hint">Agrega una foto o una descripción para continuar.</p>
            }
          } @else {
            <div class="state-box">
              <strong>El diagnóstico con IA no está disponible en este momento.</strong>
              <p>La elección manual sigue funcionando: busca el testigo en la lista.</p>
              <button class="primary-button" type="button" (click)="setMode('list')">
                Elegir de la lista
              </button>
            </div>
          }
        } @else {
          <p class="field-hint list-hint">Elegir de la lista no envía nada a la IA.</p>
          <app-telltale-picker (pick)="choose($event)" />
        }
      }
    </section>
  `,
})
export class DiagnosePanelComponent {
  private readonly diagnosis = inject(DiagnosisService);
  private readonly publicConfig = inject(PublicConfigService);

  readonly plate = input.required<string>();
  /** Se creó un diagnóstico: el historial debe recargarse. */
  readonly diagnosed = output<Diagnosed>();

  protected readonly imageAccept = IMAGE_ACCEPT;
  protected readonly maxDescription = MAX_DESCRIPTION_LENGTH;
  protected readonly whileWaiting = WHILE_WAITING;

  private activeRequest: string | null = null;

  readonly mode = signal<Mode>('photo');
  readonly photo = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly photoError = signal('');
  readonly description = signal('');
  readonly acknowledged = signal(false);
  readonly sending = signal(false);
  readonly sendingLabel = signal('');
  readonly result = signal<Diagnosed | null>(null);
  readonly blinking = signal(false);
  readonly betterInput = signal<NeedsBetterInput | NotRecognized | null>(null);
  readonly errorView = signal<DiagnosisErrorView | null>(null);

  readonly reasonHint = computed(() => {
    const better = this.betterInput();
    return better?.status === 'needs_better_input' ? REASON_HINT[better.reason] : null;
  });

  /** Si la configuración no cargó, se ofrece la IA igual: el backend responde 503 y se ofrece la lista. */
  readonly aiEnabled = computed(() => this.publicConfig.config()?.diagnosis.enabled ?? true);
  readonly notice = computed(() => this.publicConfig.config()?.diagnosis.notice ?? DEFAULT_NOTICE);
  readonly hasInput = computed(() => this.photo() !== null || this.description().trim() !== '');
  readonly canSend = computed(() => this.hasInput() && this.acknowledged());

  constructor() {
    inject(RealtimeService)
      .on('diagnosis:progress')
      .pipe(takeUntilDestroyed())
      .subscribe(({ requestId, stage }) => {
        const label = STAGE_LABEL[stage];
        if (requestId === this.activeRequest && this.sending() && label)
          this.sendingLabel.set(label);
      });
    this.publicConfig.load().subscribe((config) => {
      if (config && !config.diagnosis.enabled) this.mode.set('list');
    });
    inject(DestroyRef).onDestroy(() => {
      this.revokePreview();
    });
  }

  setMode(mode: Mode): void {
    this.mode.set(mode);
    this.betterInput.set(null);
    this.errorView.set(null);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const invalid = imageFileError(file);
    this.photoError.set(invalid ?? '');
    if (invalid) return;

    this.revokePreview();
    this.photo.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.betterInput.set(null);
    this.errorView.set(null);
  }

  clearPhoto(): void {
    this.revokePreview();
    this.previewUrl.set(null);
    this.photo.set(null);
    this.photoError.set('');
  }

  retryPhoto(): void {
    this.clearPhoto();
    this.setMode('photo');
  }

  send(): void {
    if (!this.canSend()) return;
    const description = this.description().trim();
    const photo = this.photo();
    this.submit(
      {
        ...(photo ? { image: photo } : {}),
        ...(description ? { description } : {}),
        ...(this.blinking() ? { blinking: true } : {}),
      },
      'Analizando los testigos…',
    );
  }

  choose(telltale: TelltaleSummary): void {
    this.submit({ telltaleId: telltale.id }, 'Preparando la explicación…');
  }

  reset(): void {
    this.clearPhoto();
    this.description.set('');
    this.blinking.set(false);
    this.result.set(null);
    this.betterInput.set(null);
    this.errorView.set(null);
  }

  private submit(input: DiagnosisInput, label: string): void {
    this.sendingLabel.set(label);
    this.sending.set(true);
    this.result.set(null);
    this.betterInput.set(null);
    this.errorView.set(null);
    // La elección manual no pasa por la IA: no hay progreso que mostrar.
    const requestId = input.telltaleId ? undefined : crypto.randomUUID();
    this.activeRequest = requestId ?? null;
    this.diagnosis.diagnose(this.plate(), input, requestId).subscribe({
      next: (response) => {
        this.sending.set(false);
        if (response.status === 'diagnosed') {
          this.clearPhoto();
          this.description.set('');
          this.blinking.set(false);
          this.result.set(response);
          this.diagnosed.emit(response);
        } else {
          this.betterInput.set(response);
        }
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.errorView.set(diagnosisErrorView(error));
      },
    });
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
