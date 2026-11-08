import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorCode, apiErrorMessage, EMAIL_NOT_VERIFIED } from '../../core/http/api-error';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { CountUpComponent } from '../../components/count-up/count-up.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { SeverityBadgeComponent } from '../../components/severity-badge/severity-badge.component';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';
import { ordersStop, type DiagnosisHistoryItem } from '../../models/diagnosis';
import type { GarageVehicle } from '../../models/garage';
import { DiagnosisService } from '../../services/diagnosis.service';
import { GarageService } from '../../services/garage.service';

type LoadState = 'loading' | 'ready' | 'unverified' | 'error';

/** Una consulta por vehículo: se acota para que un garaje grande no dispare decenas de peticiones. */
const MAX_LAST_DIAGNOSES = 12;

@Component({
  selector: 'app-garage-page',
  imports: [
    RouterLink,
    CountUpComponent,
    EmptyStateComponent,
    SeverityBadgeComponent,
    SkeletonComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <span class="eyebrow">Mi garaje</span>
        <h1>Tus vehículos</h1>
        <p>Elige un vehículo para diagnosticar un testigo del tablero.</p>
      </div>
      @if (state() === 'ready' && vehicles().length) {
        <a class="primary-button link-button" routerLink="/garaje/nuevo">Agregar vehículo</a>
      }
    </header>

    @switch (state()) {
      @case ('loading') {
        <app-skeleton label="Cargando tu garaje…" [lines]="3" [blocks]="true" />
      }
      @case ('unverified') {
        <div class="state-box">
          <strong>Confirma tu correo para ver tu garaje.</strong>
          <p>
            Abre el enlace que te enviamos. Si no te llegó, usa el botón "Reenviar correo" del aviso
            de arriba.
          </p>
        </div>
      }
      @case ('error') {
        <div class="state-box error" role="alert">
          <strong>No pudimos cargar tu garaje.</strong>
          <p>{{ error() }}</p>
          <button class="secondary-button" type="button" (click)="load()">Reintentar</button>
        </div>
      }
      @case ('ready') {
        @if (vehicles().length === 0) {
          <app-empty-state illustration="garage" heading="Aún no tienes vehículos en tu garaje.">
            <p>
              Agrega tu carro o moto con una foto de la tarjeta de propiedad o llenando los datos a
              mano.
            </p>
            <a class="primary-button link-button" routerLink="/garaje/nuevo">Agregar vehículo</a>
          </app-empty-state>
        } @else {
          <ul class="vehicle-list">
            @for (vehicle of vehicles(); track vehicle.plate) {
              <li>
                <a class="vehicle-card" [routerLink]="['/garaje', vehicle.plate]">
                  <span class="plate-tag">{{ vehicle.plate }}</span>
                  <span class="vehicle-name">
                    <strong>{{ vehicle.brand }} {{ vehicle.model }}</strong>
                    <small
                      >{{ vehicle.kind === 'moto' ? 'Moto' : 'Carro' }}
                      @if (vehicle.year) {
                        · {{ vehicle.year }}
                      }
                    </small>
                  </span>
                  <span class="vehicle-readouts">
                    <span class="readout">
                      <span class="readout-label">Odómetro</span>
                      <span class="readout-value">
                        @if (vehicle.mileageKm !== null) {
                          <app-count-up [value]="vehicle.mileageKm" suffix=" km" />
                        } @else {
                          —
                        }
                      </span>
                    </span>
                    <span class="readout">
                      <span class="readout-label">Último diagnóstico</span>
                      @if (lastDiagnosis()[vehicle.plate]; as last) {
                        <app-severity-badge [severity]="last.severidad" [stop]="stops(last)" />
                      } @else {
                        <span class="readout-value">—</span>
                      }
                    </span>
                  </span>
                  <span class="vehicle-cta">Fotografiar testigo →</span>
                </a>
              </li>
            }
          </ul>
        }
      }
    }
  `,
})
export class GaragePage {
  private readonly garage = inject(GarageService);
  private readonly diagnosis = inject(DiagnosisService);

  readonly state = signal<LoadState>('loading');
  readonly vehicles = signal<GarageVehicle[]>([]);
  readonly error = signal('');
  readonly lastDiagnosis = signal<Record<string, DiagnosisHistoryItem>>({});
  protected readonly stops = ordersStop;

  constructor() {
    this.load();
    inject(RealtimeService)
      .on('garage:changed')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.load(true);
      });
    inject(RealtimeService)
      .on('diagnosis:changed')
      .pipe(takeUntilDestroyed())
      .subscribe(({ plate, action }) => {
        // Al borrar el último ya no hay nada que mostrar, y el historial responde vacío.
        if (action === 'deleted') this.lastDiagnosis.update(({ [plate]: _gone, ...rest }) => rest);
        this.loadLastDiagnoses(this.vehicles().filter((vehicle) => vehicle.plate === plate));
      });
  }

  /** Pide solo el más reciente de cada uno. Si alguno falla, esa tarjeta simplemente no lo muestra. */
  private loadLastDiagnoses(vehicles: GarageVehicle[]): void {
    for (const { plate } of vehicles.slice(0, MAX_LAST_DIAGNOSES)) {
      this.diagnosis.history(plate, 1, 1).subscribe({
        next: ({ items }) => {
          const last = items.at(0);
          if (last) this.lastDiagnosis.update((current) => ({ ...current, [plate]: last }));
        },
        error: () => undefined,
      });
    }
  }

  /** silent: actualiza desde otro cliente sin mostrar el estado de carga. */
  load(silent = false): void {
    if (!silent) this.state.set('loading');
    this.garage.list().subscribe({
      next: (vehicles) => {
        this.vehicles.set(vehicles);
        this.state.set('ready');
        this.loadLastDiagnoses(vehicles);
      },
      error: (error: unknown) => {
        if (apiErrorCode(error) === EMAIL_NOT_VERIFIED) {
          this.state.set('unverified');
          return;
        }
        this.error.set(apiErrorMessage(error, 'Inténtalo de nuevo en unos segundos.'));
        this.state.set('error');
      },
    });
  }
}
