import { Component, computed, input } from '@angular/core';
import type { ExpirationStatus } from '../../models/garage';

const LABELS: Record<ExpirationStatus['status'], string> = {
  Vigente: 'Vigente',
  'Por Vencer': 'Por vencer',
  Vencido: 'Vencido',
  'Sin información': 'Sin fecha'
};

const ICONS: Record<ExpirationStatus['alert'], string> = { verde: '✓', amarillo: '!', rojo: '✕', gris: '–' };

/** Estado de SOAT o RTM con color y texto (el color nunca es la única señal). */
@Component({
  selector: 'app-expiration-badge',
  template: `
    <span class="expiration-badge {{ status().alert }}">
      <span class="badge-icon" aria-hidden="true">{{ icon() }}</span>
      <span><strong>{{ document() }}:</strong> {{ label() }}</span>
    </span>
    @if (detail()) { <small class="expiration-detail">{{ detail() }}</small> }
  `
})
export class ExpirationBadgeComponent {
  readonly document = input.required<'SOAT' | 'RTM'>();
  readonly status = input.required<ExpirationStatus>();
  readonly showDetail = input(false);

  readonly label = computed(() => LABELS[this.status().status]);
  readonly icon = computed(() => ICONS[this.status().alert]);
  readonly detail = computed(() => {
    if (!this.showDetail()) return '';
    const { expirationDate, daysToExpire } = this.status();
    if (!expirationDate || daysToExpire === null) return 'No hay fecha registrada.';
    const date = formatDate(expirationDate);
    if (daysToExpire < 0) return `Venció el ${date} (hace ${-daysToExpire} día${daysToExpire === -1 ? '' : 's'}).`;
    if (daysToExpire === 0) return `Vence hoy, ${date}.`;
    return `Vence el ${date} (en ${daysToExpire} día${daysToExpire === 1 ? '' : 's'}).`;
  });
}

/** AAAA-MM-DD → DD/MM/AAAA, sin pasar por Date para no correr el día por la zona horaria. */
export function formatDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
