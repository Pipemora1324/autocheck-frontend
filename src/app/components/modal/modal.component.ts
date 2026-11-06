import { afterNextRender, Component, ElementRef, inject, input, output } from '@angular/core';

let nextId = 0;

/** Diálogo modal accesible: role="dialog", cierra con Escape o clic fuera y enfoca su contenido al abrirse. */
@Component({
  selector: 'app-modal',
  host: { '(document:keydown.escape)': 'closed.emit()', '(click)': 'closeOnBackdrop($event)' },
  template: `
    <div class="modal-backdrop">
      <section class="dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="headingId" tabindex="-1">
        <h2 [id]="headingId">{{ heading() }}</h2>
        <ng-content />
      </section>
    </div>
  `
})
export class ModalComponent {
  readonly heading = input.required<string>();
  readonly closed = output();
  protected readonly headingId = `modal-title-${++nextId}`;

  /** Un clic dentro del diálogo no cierra: solo el que cae directamente en el fondo. */
  protected closeOnBackdrop(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      const target = host.nativeElement.querySelector<HTMLElement>('input, select, textarea') ?? host.nativeElement.querySelector<HTMLElement>('.dialog');
      target?.focus();
    });
  }
}
