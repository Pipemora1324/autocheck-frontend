import { Component, computed, inject } from '@angular/core';
import { RealtimeService, type ConnectionState } from '../../core/realtime/realtime.service';

const LABELS: Record<ConnectionState, string> = {
  off: '',
  connecting: 'Conectando…',
  connected: 'En vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión en vivo',
};

/** Indicador discreto: "sin conexión en vivo" no significa que la app no funcione, porque sigue por HTTP. */
@Component({
  selector: 'app-connection-status',
  template: `
    @if (label(); as text) {
      <span class="connection-status {{ state() }}" role="status">
        <span class="connection-dot" aria-hidden="true"></span>
        {{ text }}
      </span>
    }
  `,
})
export class ConnectionStatusComponent {
  private readonly realtime = inject(RealtimeService);

  protected readonly state = this.realtime.state;
  protected readonly label = computed(() => LABELS[this.state()]);
}
