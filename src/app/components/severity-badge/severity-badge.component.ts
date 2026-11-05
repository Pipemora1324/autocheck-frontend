import { Component, computed, input } from '@angular/core';
import { SEVERITY_LABEL, type TelltaleSeverity } from '../../models/diagnosis';

const ICON: Record<TelltaleSeverity, string> = { rojo: '■', amarillo: '▲', informativo: 'i' };

/** Semáforo con color, forma y texto: nunca depende solo del color. */
@Component({
  selector: 'app-severity-badge',
  template: `<span class="severity-badge {{ severity() }}"><span class="severity-icon" aria-hidden="true">{{ icon() }}</span> {{ label() }}</span>`
})
export class SeverityBadgeComponent {
  readonly severity = input.required<TelltaleSeverity>();
  readonly label = computed(() => SEVERITY_LABEL[this.severity()]);
  protected readonly icon = computed(() => ICON[this.severity()]);
}
