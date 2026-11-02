import { afterNextRender, Component, ElementRef, inject, input, output } from '@angular/core';

let nextId = 0;

/** Diálogo modal accesible: role="dialog", cierra con Escape o clic fuera y enfoca su contenido al abrirse. */
@Component({
  selector: 'app-modal',
  host: { '(document:keydown.escape)': 'close.emit()' },
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <section class="dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="headingId" tabindex="-1" (click)="$event.stopPropagation()">
        <h2 [id]="headingId">{{ heading() }}</h2>
        <ng-content />
      </section>
    </div>
  `
})
export class ModalComponent {
  readonly heading = input.required<string>();
  readonly close = output<void>();
  protected readonly headingId = `modal-title-${++nextId}`;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      const target = host.nativeElement.querySelector<HTMLElement>('input, select, textarea') ?? host.nativeElement.querySelector<HTMLElement>('.dialog');
      target?.focus();
    });
  }
}
