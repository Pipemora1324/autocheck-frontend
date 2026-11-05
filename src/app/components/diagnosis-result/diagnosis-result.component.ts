import { Component, computed, input } from '@angular/core';
import { DIAGNOSIS_DISCLAIMER, type Diagnosed } from '../../models/diagnosis';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';

/** Resultado del diagnóstico. Todo el texto viene del servidor; aquí no se redacta ni se interpreta nada. */
@Component({
  selector: 'app-diagnosis-result',
  imports: [SeverityBadgeComponent],
  template: `
    @let r = result();
    <article class="diagnosis-card {{ r.severidad }}" aria-labelledby="diagnosis-title">
      @if (mustStop()) {
        <div class="stop-banner" role="alert">
          <strong>Detente en un lugar seguro y llama a un taller o a una grúa.</strong>
          <span>{{ r.urgencia.accion }}</span>
        </div>
      }

      <header class="diagnosis-header">
        <div>
          <h3 id="diagnosis-title">{{ r.telltale.nombre }}</h3>
          <p class="source-note">{{ r.telltale.descripcionSimbolo }}</p>
        </div>
        <app-severity-badge [severity]="r.severidad" />
      </header>

      @if (!mustStop()) { <p class="diagnosis-action">{{ r.urgencia.accion }}</p> }
      <p class="source-note">{{ origin() }}</p>

      @if (r.avisoCompatibilidad) { <p class="diagnosis-warning">{{ r.avisoCompatibilidad }}</p> }

      <h4>Qué significa</h4>
      <p>{{ r.significado }}</p>

      <h4>Causas probables</h4>
      <ul>@for (item of r.causasProbables; track item) { <li>{{ item }}</li> }</ul>

      <h4>Qué puedes revisar tú</h4>
      <ul>@for (item of r.puedesRevisar; track item) { <li>{{ item }}</li> }</ul>

      <h4>Qué NO hacer</h4>
      <ul class="dont-list">@for (item of r.noHagas; track item) { <li>{{ item }}</li> }</ul>

      <h4>Cuándo ir al mecánico</h4>
      <p>{{ r.cuandoIrAlMecanico }}</p>

      @if (r.notaEspecificaDelVehiculo) {
        <h4>Sobre tu vehículo</h4>
        <p>{{ r.notaEspecificaDelVehiculo }}</p>
      }

      <p class="diagnosis-disclaimer">{{ disclaimer }}</p>
    </article>
  `
})
export class DiagnosisResultComponent {
  readonly result = input.required<Diagnosed>();
  protected readonly disclaimer = DIAGNOSIS_DISCLAIMER;

  readonly mustStop = computed(() => this.result().severidad === 'rojo' || this.result().urgencia.debeDetenerse);

  readonly origin = computed(() => {
    const { origen, confianza } = this.result();
    if (origen === 'manual') return 'Elegiste este testigo de la lista.';
    return confianza === null ? 'Identificado con inteligencia artificial.' : `Identificado con inteligencia artificial (confianza ${Math.round(confianza * 100)} %).`;
  });
}
