import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Portada pública: la ve quien entra sin sesión. */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <article class="landing">
      <span class="eyebrow">Tu garaje con diagnóstico de testigos</span>
      <h1>¿Se prendió una luz en el tablero? Entiende qué es y qué hacer.</h1>
      <p class="landing-lead">
        Registra tus vehículos, toma una foto del testigo encendido o búscalo en la lista, y
        AutoCheck te explica qué significa, qué tan urgente es, qué puedes revisar tú con seguridad
        y cuándo ir al mecánico, con el motivo concreto.
      </p>
      <div class="landing-actions">
        <a class="primary-button link-button" routerLink="/registro">Crear cuenta</a>
        <a class="secondary-button" routerLink="/login">Ya tengo cuenta</a>
      </div>

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
          es una falla.
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
export class LandingPage {}
