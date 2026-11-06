import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorCode, apiErrorMessage } from '../../core/http/api-error';
import { PublicConfigService } from '../../core/http/public-config.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import type { ChatMessage } from '../../models/diagnosis';
import { DiagnosisService } from '../../services/diagnosis.service';

export const MAX_CHAT_MESSAGE_LENGTH = 500;
export const CHAT_SUGGESTIONS: readonly string[] = [
  '¿Por qué está en rojo?',
  '¿Puedo seguir manejando?',
  '¿Qué le digo al mecánico?',
];

/** Traduce los errores del chat. El mensaje que el usuario escribió no se pierde. */
export function chatErrorMessage(error: unknown): string {
  const code = apiErrorCode(error);
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (code === 'CHAT_LIMIT_REACHED' || code === 'RATE_LIMITED' || status === 429)
    return apiErrorMessage(error, 'Alcanzaste el límite de mensajes. Intenta más tarde.');
  if (code === 'CHAT_PROVIDER_BUSY')
    return 'El servicio gratuito de IA está ocupado. Intenta de nuevo en un minuto.';
  if (code === 'CHAT_UNAVAILABLE' || code === 'AI_NOT_CONFIGURED')
    return 'La IA no pudo responder por un problema del servicio. Intenta más tarde.';
  return apiErrorMessage(error, 'No pudimos enviar tu mensaje. Inténtalo de nuevo.');
}

/** Conversación con la IA sobre un diagnóstico. Lo guardado se puede leer aunque la IA esté apagada. */
@Component({
  selector: 'app-diagnosis-chat',
  template: `
    <section class="diagnosis-chat" aria-labelledby="chat-title">
      <h3 id="chat-title">Pregúntale a la IA sobre este diagnóstico</h3>

      @if (loading()) {
        <div class="state-box" role="status">
          <span class="spinner" aria-hidden="true"></span> Cargando la conversación…
        </div>
      } @else if (loadError()) {
        <div class="form-error" role="alert">
          <p>{{ loadError() }}</p>
          <button class="secondary-button" type="button" (click)="load()">Reintentar</button>
        </div>
      } @else {
        @if (messages().length || sending()) {
          <div class="chat-log" role="log" aria-live="polite" aria-label="Conversación">
            @for (message of messages(); track message.id) {
              <div class="chat-bubble {{ message.role }}">
                <span class="visually-hidden">{{ message.role === 'user' ? 'Tú:' : 'IA:' }}</span>
                {{ message.content }}
              </div>
            }
            @if (sending()) {
              <div class="chat-bubble user pending">{{ pending() }}</div>
              <div class="chat-bubble assistant typing" role="status">La IA está escribiendo…</div>
            }
          </div>
        }

        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }

        @if (!aiEnabled()) {
          <p class="field-hint">El chat con IA no está disponible en este momento.</p>
        } @else if (remaining() === 0) {
          <p class="field-hint">
            Llegaste al máximo de mensajes de este diagnóstico. Puedes hacer un diagnóstico nuevo.
          </p>
        } @else {
          <div class="chat-suggestions" role="group" aria-label="Preguntas sugeridas">
            @for (suggestion of suggestions; track suggestion) {
              <button
                class="chat-suggestion"
                type="button"
                [disabled]="sending()"
                (click)="send(suggestion)"
              >
                {{ suggestion }}
              </button>
            }
          </div>
          <form class="chat-form" (submit)="$event.preventDefault(); send(draft())">
            <label class="visually-hidden" for="chat-message">Tu mensaje</label>
            <textarea
              id="chat-message"
              rows="2"
              [attr.maxlength]="maxLength"
              placeholder="Escribe tu pregunta"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
            ></textarea>
            <button class="primary-button" type="submit" [disabled]="!canSend()">Enviar</button>
          </form>
          <p class="field-hint">
            {{ draft().length }} de {{ maxLength }} caracteres. Tus mensajes se envían al proveedor
            de IA y se guardan hasta que borres el diagnóstico o tu cuenta. No incluyas datos
            personales.
          </p>
        }
      }
    </section>
  `,
})
export class DiagnosisChatComponent {
  private readonly diagnosis = inject(DiagnosisService);
  private readonly publicConfig = inject(PublicConfigService);

  readonly plate = input.required<string>();
  readonly diagnosisId = input.required<string>();

  protected readonly suggestions = CHAT_SUGGESTIONS;
  protected readonly maxLength = MAX_CHAT_MESSAGE_LENGTH;

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly messages = signal<ChatMessage[]>([]);
  readonly remaining = signal<number | null>(null);
  readonly draft = signal('');
  readonly pending = signal('');
  readonly sending = signal(false);
  readonly error = signal('');

  /** Si la configuración no cargó, se ofrece igual: el backend responde 503 y se explica. */
  readonly aiEnabled = computed(() => this.publicConfig.config()?.diagnosis.enabled ?? true);
  readonly canSend = computed(() => !this.sending() && this.draft().trim() !== '');

  constructor() {
    effect(() => {
      this.plate();
      this.diagnosisId();
      untracked(() => {
        this.load();
      });
    });
    inject(RealtimeService)
      .on('chat:message')
      .pipe(takeUntilDestroyed())
      .subscribe(({ diagnosisId, question, answer, restantes }) => {
        if (diagnosisId === this.diagnosisId()) this.addExchange(question, answer, restantes);
      });
  }

  /** La misma respuesta puede llegar por HTTP y por el socket: cada mensaje se muestra una vez. */
  private addExchange(question: ChatMessage, answer: ChatMessage, restantes: number): void {
    this.messages.update((current) => {
      const known = new Set(current.map((message) => message.id));
      return [...current, ...[question, answer].filter((message) => !known.has(message.id))];
    });
    this.remaining.set(restantes);
  }

  load(): void {
    const id = this.diagnosisId();
    this.loading.set(true);
    this.loadError.set('');
    this.diagnosis.messages(this.plate(), id).subscribe({
      next: ({ messages, restantes }) => {
        if (id !== this.diagnosisId()) return;
        this.messages.set(messages);
        this.remaining.set(restantes);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (id !== this.diagnosisId()) return;
        this.loadError.set(apiErrorMessage(error, 'No pudimos cargar la conversación.'));
        this.loading.set(false);
      },
    });
  }

  send(text: string): void {
    const message = text.trim();
    if (!message || this.sending()) return;
    const id = this.diagnosisId();
    this.pending.set(message);
    this.sending.set(true);
    this.error.set('');
    this.diagnosis.sendMessage(this.plate(), id, message).subscribe({
      next: ({ question, answer, restantes }) => {
        this.sending.set(false);
        if (id !== this.diagnosisId()) return;
        this.addExchange(question, answer, restantes);
        this.draft.set('');
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (id !== this.diagnosisId()) return;
        if (apiErrorCode(error) === 'CHAT_LIMIT_REACHED') this.remaining.set(0);
        // Lo escrito se conserva para reintentar.
        this.draft.set(message);
        this.error.set(chatErrorMessage(error));
      },
    });
  }
}
