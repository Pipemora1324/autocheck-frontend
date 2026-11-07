import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeedometerComponent } from '../../components/speedometer/speedometer.component';
import { TelltaleIconComponent } from '../../components/telltale-icon/telltale-icon.component';

const ROW = [
  { category: 'motor_emisiones', tone: 'amarillo' },
  { category: 'aceite', tone: 'rojo' },
  { category: 'bateria_carga', tone: 'rojo' },
  { category: 'temperatura', tone: 'rojo' },
  { category: 'frenos', tone: 'rojo' },
  { category: 'airbag', tone: 'rojo' },
  { category: 'llantas', tone: 'amarillo' },
  { category: 'combustible', tone: 'amarillo' },
  { category: 'luces', tone: 'verde' },
  { category: 'informativo', tone: 'azul' },
] as const;

/** Portada pública: la ve quien entra sin sesión. */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, SpeedometerComponent, TelltaleIconComponent],
  template: `
    <article class="landing">
      <section class="landing-hero">
        <div>
          <span class="eyebrow">Tu garaje con diagnóstico de testigos</span>
          <h1>¿Se prendió una luz en el tablero? <em>Entiende qué es y qué hacer.</em></h1>
          <p class="landing-lead">
            Antes de asustarte o de ignorarla, tómale una foto. AutoCheck te explica qué significa,
            qué tan urgente es, qué puedes revisar tú con seguridad y cuándo ir al mecánico, con el
            motivo concreto.
          </p>
          <div class="landing-actions">
            <a class="primary-button link-button" routerLink="/registro">Crear cuenta</a>
            <a class="secondary-button" routerLink="/login">Ya tengo cuenta</a>
          </div>
        </div>
        <div class="cluster">
          <app-speedometer />
          <ul class="telltale-row" aria-hidden="true">
            @for (lamp of row; track lamp.category; let index = $index) {
              <li class="{{ lamp.tone }}" [style.--i]="index">
                <app-telltale-icon [category]="lamp.category" />
              </li>
            }
          </ul>
        </div>
      </section>

      <ol class="landing-steps">
        <li>
          <strong>1. Registra tu vehículo</strong>A mano o con una foto de la tarjeta de propiedad,
          y tú confirmas los datos.
        </li>
        <li>
          <strong>2. Muestra el testigo</strong>Con una foto del tablero, una descripción o
          eligiéndolo de la lista.
        </li>
        <li>
          <strong>3. Entiende qué hacer</strong>Un semáforo con texto: Detente, Revísalo pronto o No
          es una falla. Y si te queda una duda, pregúntale a la IA.
        </li>
      </ol>

      <p class="landing-note">
        Orientación general. Un mecánico debe confirmar el diagnóstico. Si un testigo rojo se
        enciende mientras manejas, detente en un lugar seguro. Consulta cómo tratamos tus datos en
        la <a routerLink="/privacidad">política de privacidad</a>.
      </p>
    </article>
  `,
})
export class LandingPage {
  protected readonly row = ROW;
}
