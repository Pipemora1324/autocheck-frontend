import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Envuelve un <input type="password"> y le agrega un botón para mostrar u ocultar lo escrito.
 * El input se proyecta tal cual: conserva su id, formControlName, autocomplete y validaciones.
 * Vuelve a ocultarse al enviar el formulario, al salir de la pantalla y cuando la pestaña queda oculta.
 */
@Component({
  selector: 'app-password-field',
  host: { class: 'password-field' },
  // Sin encapsulación para alcanzar el input proyectado; todo queda bajo .password-field.
  encapsulation: ViewEncapsulation.None,
  styles: `
    .password-field {
      position: relative;
      display: block;
    }
    .password-field > input {
      padding-right: calc(var(--touch) + 0.25rem);
    }
    .password-toggle {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      display: grid;
      place-items: center;
      width: var(--touch);
      min-height: var(--touch);
      padding: 0;
      border: 0;
      border-radius: var(--radius-m);
      color: var(--muted);
      background: transparent;
      cursor: pointer;
      transition:
        color var(--fast),
        background-color var(--fast);
    }
    .password-toggle:hover {
      color: var(--text);
      background: var(--surface-3);
    }
    .password-toggle[aria-pressed='true'] {
      color: var(--text);
    }
    .password-toggle svg {
      width: 20px;
      height: 20px;
    }
  `,
  template: `
    <ng-content />
    <button
      class="password-toggle"
      type="button"
      [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="inputId()"
      (mousedown)="$event.preventDefault()"
      (click)="toggle()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        @if (visible()) {
          <path class="password-toggle-slash" d="M4 4l16 16" />
        }
      </svg>
    </button>
  `,
})
export class PasswordFieldComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  readonly visible = signal(false);
  protected readonly inputId = signal<string | null>(null);

  constructor() {
    const hideOnSubmit = () => {
      this.hide();
    };
    const hideWhenHidden = () => {
      if (this.document.visibilityState === 'hidden') this.hide();
    };
    let form: HTMLFormElement | null = null;

    afterNextRender(() => {
      const input = this.input();
      this.inputId.set(input?.id || null);
      form = input?.form ?? null;
      form?.addEventListener('submit', hideOnSubmit);
    });
    this.document.addEventListener('visibilitychange', hideWhenHidden);

    inject(DestroyRef).onDestroy(() => {
      form?.removeEventListener('submit', hideOnSubmit);
      this.document.removeEventListener('visibilitychange', hideWhenHidden);
      this.hide();
    });
  }

  toggle(): void {
    this.setVisible(!this.visible());
  }

  hide(): void {
    this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    const input = this.input();
    if (!input) return;
    // Cambiar el tipo no borra el valor; la posición del cursor se guarda y se restaura.
    const { selectionStart, selectionEnd, selectionDirection } = input;
    const focused = this.document.activeElement === input;
    this.visible.set(visible);
    input.type = visible ? 'text' : 'password';
    if (focused && selectionStart !== null && selectionEnd !== null)
      input.setSelectionRange(selectionStart, selectionEnd, selectionDirection ?? undefined);
  }

  private input(): HTMLInputElement | null {
    return this.host.nativeElement.querySelector('input');
  }
}
