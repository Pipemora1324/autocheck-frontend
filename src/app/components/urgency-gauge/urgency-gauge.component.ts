import { Component, computed, input } from '@angular/core';
import { RED_NO_STOP_LABEL, SEVERITY_LABEL, type TelltaleSeverity } from '../../models/diagnosis';

const NEEDLE_ANGLE: Record<TelltaleSeverity, number> = { informativo: -58, amarillo: 0, rojo: 58 };
/** Ordenar detenerse lleva la aguja al tope. */
const STOP_ANGLE = 80;

/** Medidor de urgencia. Su texto va en aria-label, y el semáforo con texto siempre está al lado. */
@Component({
  selector: 'app-urgency-gauge',
  template: `
    <svg class="urgency-gauge" viewBox="0 0 200 118" role="img" [attr.aria-label]="label()">
      <path
        class="gauge-zone informativo"
        [class.active]="severity() === 'informativo'"
        d="M18 100a82 82 0 0 1 24-58"
      />
      <path
        class="gauge-zone amarillo"
        [class.active]="severity() === 'amarillo'"
        d="M48 36a82 82 0 0 1 104 0"
      />
      <path
        class="gauge-zone rojo"
        [class.active]="severity() === 'rojo'"
        d="M158 42a82 82 0 0 1 24 58"
      />
      <g class="gauge-needle" [style.--needle-angle]="angle()">
        <path class="gauge-hand" d="M96 100 100 26l4 74z" />
      </g>
      <circle class="gauge-hub" cx="100" cy="100" r="10" />
    </svg>
  `,
})
export class UrgencyGaugeComponent {
  readonly severity = input.required<TelltaleSeverity>();
  readonly stop = input(false);

  protected readonly angle = computed(
    () => `${this.stop() ? STOP_ANGLE : NEEDLE_ANGLE[this.severity()]}deg`,
  );
  protected readonly label = computed(() => {
    const text =
      this.severity() === 'rojo' && !this.stop()
        ? RED_NO_STOP_LABEL
        : SEVERITY_LABEL[this.severity()];
    return `Medidor de urgencia: ${text}`;
  });
}
