import { Component, computed, input } from '@angular/core';
import {
  DIAGNOSIS_DISCLAIMER,
  type Diagnosed,
  type DiagnosedTelltale,
} from '../../models/diagnosis';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';

/** Por debajo de esto se avisa que el símbolo no es seguro. */
const DOUBTFUL_CONFIDENCE = 0.6;

/** Resultado del diagnóstico: una tarjeta por testigo. Todo el texto y la urgencia vienen del servidor. */
@Component({
  selector: 'app-diagnosis-result',
  imports: [SeverityBadgeComponent],
  template: `
    @let r = result();
    @if (r.debeDetenerse) {
      <div class="stop-banner" role="alert">
        <strong>Detente ahora</strong>
        <span>{{ r.accionGeneral }}</span>
      </div>
    }

    <div class="diagnosis-summary {{ r.urgenciaGeneral }}">
      <div class="diagnosis-summary-head">
        <strong>Urgencia general</strong>
        <app-severity-badge [severity]="r.urgenciaGeneral" [stop]="r.debeDetenerse" />
      </div>
      @if (!r.debeDetenerse) {
        <p class="diagnosis-action">{{ r.accionGeneral }}</p>
      }
      @if (r.mensajeGeneral) {
        <p>{{ r.mensajeGeneral }}</p>
      }
      <p class="source-note">{{ origin() }}</p>
      @if (r.mejorFoto) {
        <p class="diagnosis-warning">{{ r.mejorFoto }}</p>
      }
    </div>

    @for (t of r.testigos; track $index) {
      <article class="diagnosis-card {{ t.urgencia }}">
        <header class="diagnosis-header">
          <div>
            <h3>{{ t.nombre }}</h3>
            @if (t.descripcionSimbolo) {
              <p class="source-note">{{ t.descripcionSimbolo }}</p>
            }
          </div>
          <app-severity-badge [severity]="t.urgencia" [stop]="t.debeDetenerse" />
        </header>

        <p class="diagnosis-action">{{ t.accion }}</p>
        @if (t.parpadeando) {
          <p class="diagnosis-warning">Este testigo está parpadeando.</p>
        }
        @if (doubtful(t)) {
          <p class="diagnosis-warning">
            No estamos seguros de este símbolo. Compáralo con el manual o toma una foto más cercana
            de este testigo.
          </p>
        }

        @if (t.significado) {
          <h4>Qué significa</h4>
          <p>{{ t.significado }}</p>
        }
        @if (t.porQuePasa.length) {
          <h4>Por qué pasa</h4>
          <ul>
            @for (item of t.porQuePasa; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        }
        @if (t.puedesRevisar.length) {
          <h4>Qué puedes revisar tú</h4>
          <ul>
            @for (item of t.puedesRevisar; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        }
        @if (t.noHagas.length) {
          <h4>Qué NO hacer</h4>
          <ul class="dont-list">
            @for (item of t.noHagas; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        }
        @if (t.cuandoIrAlMecanico) {
          <h4>Cuándo ir al mecánico</h4>
          <p>{{ t.cuandoIrAlMecanico }}</p>
        }
        @if (t.notaDelVehiculo) {
          <h4>Sobre tu vehículo</h4>
          <p>{{ t.notaDelVehiculo }}</p>
        }
      </article>
    }

    <p class="diagnosis-disclaimer">{{ disclaimer }}</p>
  `,
})
export class DiagnosisResultComponent {
  readonly result = input.required<Diagnosed>();
  protected readonly disclaimer = DIAGNOSIS_DISCLAIMER;

  readonly origin = computed(() => {
    const { origen, testigos } = this.result();
    if (origen === 'manual') return 'Elegiste este testigo de la lista.';
    return testigos.length === 1
      ? 'Identificado con inteligencia artificial.'
      : `La inteligencia artificial identificó ${testigos.length} testigos.`;
  });

  protected doubtful(telltale: DiagnosedTelltale): boolean {
    return this.result().origen === 'ia' && telltale.confianza < DOUBTFUL_CONFIDENCE;
  }
}
