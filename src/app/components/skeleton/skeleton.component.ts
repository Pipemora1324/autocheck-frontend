import { Component, computed, input } from '@angular/core';

/** Esqueleto de carga. El texto lo escuchan los lectores de pantalla: lo visual no dice nada. */
@Component({
  selector: 'app-skeleton',
  template: `
    <div class="skeleton" role="status">
      <span class="visually-hidden">{{ label() }}</span>
      @for (line of lineList(); track line) {
        <span class="skeleton-line" [class.block]="blocks()" aria-hidden="true"></span>
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly label = input.required<string>();
  readonly lines = input(3);
  readonly blocks = input(false);
  protected readonly lineList = computed(() => Array.from({ length: this.lines() }, (_, i) => i));
}
