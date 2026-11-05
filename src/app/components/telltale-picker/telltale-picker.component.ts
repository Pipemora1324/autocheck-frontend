import { Component, computed, inject, input, output, signal } from '@angular/core';
import { apiErrorMessage } from '../../core/http/api-error';
import { ordersStop, SEVERITIES, type TelltaleSeverity, type TelltaleSummary } from '../../models/diagnosis';
import { DiagnosisService } from '../../services/diagnosis.service';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Filtra por nombre y alias (cómo lo llama la gente), sin importar tildes ni mayúsculas, y agrupa por severidad. */
export function groupTelltales(telltales: TelltaleSummary[], query: string): Array<{ severity: TelltaleSeverity; stop: boolean; items: TelltaleSummary[] }> {
  const search = normalize(query);
  const matches = (telltale: TelltaleSummary) => !search || [telltale.nombre, ...telltale.alias].some((text) => normalize(text).includes(search));
  // Los rojos se separan según si el servidor ordena detenerse: el airbag no debe quedar bajo "Detente".
  const groups = SEVERITIES.flatMap((severity): Array<{ severity: TelltaleSeverity; stop: boolean }> =>
    severity === 'rojo' ? [{ severity, stop: true }, { severity, stop: false }] : [{ severity, stop: false }]
  );
  return groups
    .map((group) => ({ ...group, items: telltales.filter((item) => item.severidad === group.severity && (group.severity !== 'rojo' || ordersStop(item) === group.stop) && matches(item)) }))
    .filter((group) => group.items.length > 0);
}

/** Lista buscable de GET /telltales, para elegir el testigo a mano. Elegir no envía nada a la IA. */
@Component({
  selector: 'app-telltale-picker',
  imports: [SeverityBadgeComponent],
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="state-box" role="status"><span class="spinner" aria-hidden="true"></span> Cargando los testigos…</div>
      }
      @case ('error') {
        <div class="state-box error" role="alert">
          <strong>No pudimos cargar la lista de testigos.</strong>
          <p>{{ error() }}</p>
          <button class="secondary-button" type="button" (click)="load()">Reintentar</button>
        </div>
      }
      @case ('ready') {
        <div class="form-field">
          <label for="telltale-search">Busca por nombre o como le dices</label>
          <input id="telltale-search" type="search" autocomplete="off" placeholder="Por ejemplo, aceite, motor o llanta" [value]="query()" (input)="query.set($any($event.target).value)" />
        </div>
        @for (group of groups(); track group.severity + group.stop) {
          <section class="telltale-group" [attr.aria-label]="'Testigos: ' + group.severity">
            <h3><app-severity-badge [severity]="group.severity" [stop]="group.stop" /></h3>
            <ul class="telltale-list">
              @for (telltale of group.items; track telltale.id) {
                <li>
                  <button type="button" class="telltale-option" [disabled]="disabled()" (click)="pick.emit(telltale)">
                    <strong>{{ telltale.nombre }}</strong>
                    <small>{{ telltale.alias.join(' · ') }}</small>
                  </button>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p class="source-note" role="status">No encontramos testigos con esa búsqueda. Prueba con otra palabra.</p>
        }
      }
    }
  `
})
export class TelltalePickerComponent {
  private readonly diagnosis = inject(DiagnosisService);

  readonly disabled = input(false);
  readonly pick = output<TelltaleSummary>();

  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly error = signal('');
  readonly query = signal('');
  private readonly telltales = signal<TelltaleSummary[]>([]);
  readonly groups = computed(() => groupTelltales(this.telltales(), this.query()));

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.diagnosis.telltales().subscribe({
      next: (telltales) => {
        this.telltales.set(telltales);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'Inténtalo de nuevo en unos segundos.'));
        this.state.set('error');
      }
    });
  }
}
