import { Component, inject } from '@angular/core';
import { ServerStatusService } from '../../core/http/server-status.service';

/** Aviso mientras el backend despierta (Render gratis tarda 30-60 s) o si deja de responder. */
@Component({
  selector: 'app-server-status-banner',
  template: `
    @switch (server.state()) {
      @case ('waking') {
        <section class="notice-banner info" role="status" aria-live="polite">
          <div>
            <strong
              ><span class="spinner" aria-hidden="true"></span> Conectando con el servidor, puede
              tardar un minuto.</strong
            >
            <span
              >El servidor se apaga cuando no se usa y está despertando. No cierres la página.</span
            >
          </div>
        </section>
      }
      @case ('down') {
        <section class="notice-banner" role="alert">
          <div>
            <strong>El servidor no responde.</strong>
            <span>Revisa tu conexión a internet o inténtalo de nuevo en unos minutos.</span>
          </div>
        </section>
      }
    }
  `,
})
export class ServerStatusBannerComponent {
  protected readonly server = inject(ServerStatusService);
}
