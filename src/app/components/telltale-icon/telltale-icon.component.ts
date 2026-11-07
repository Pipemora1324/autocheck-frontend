import { Component, computed, input } from '@angular/core';

/** Íconos originales y simples, trazados a mano sobre una rejilla de 24. Sin símbolos de ninguna marca. */
const PATHS: Record<string, string> = {
  // Aceitera con su gota.
  aceite:
    'M3 11h5l2 2h6l5-3-4 7H8l-5-3zM8 11V8h3M6 8h7M20 15c0 1-.7 2-1.5 2S17 16 17 15s1.5-2.6 1.5-2.6S20 14 20 15z',
  // Termómetro en el agua.
  temperatura:
    'M12 3a1.8 1.8 0 0 0-1.8 1.8v8.4a3 3 0 1 0 3.6 0V4.8A1.8 1.8 0 0 0 12 3zM13.8 7H16M13.8 10H16M3 20c1.5 0 1.5 1 3 1s1.5-1 3-1M15 20c1.5 0 1.5 1 3 1s1.5-1 3-1',
  // Círculo con admiración, entre paréntesis.
  frenos:
    'M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM12 8.5v4.4M12 15.4v.1M4.3 6.5a10 10 0 0 0 0 11M19.7 6.5a10 10 0 0 1 0 11',
  // El mismo círculo, con una P.
  freno_mano:
    'M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM10.2 15.5v-7h2.3a2.1 2.1 0 0 1 0 4.2h-2.3M4.3 6.5a10 10 0 0 0 0 11M19.7 6.5a10 10 0 0 1 0 11',
  // Volante con admiración.
  direccion:
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.8 11c3-1 5-1.5 8.2-1.5s5.2.5 8.2 1.5M9.5 20c.3-3 .8-4.5 2.5-4.5s2.2 1.5 2.5 4.5M12 12.2v.1',
  // Persona sentada con el círculo delante.
  airbag:
    'M9 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM8 9l-1 7h6l3 5M7 16l-2 5M8 11.5l4.5 1M17 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
  // Batería con sus bornes.
  bateria_carga: 'M3 8h18v11H3zM6.5 8V5.5h3V8M14.5 8V5.5h3V8M6 13.5h4M8 11.5v4M14 13.5h4',
  // Bloque de motor.
  motor_emisiones:
    'M7 7h6v2h3l2 2.5h2v-1h2v7h-2v-1h-2V19H9l-3-3H4v2H2v-7h2v2h1v-3l2-2.5zM9.5 7V5h3v2',
  // Engranaje de la transmisión.
  transmision:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  // Corte de llanta con admiración.
  llantas:
    'M6 5c-2 2.5-3 5-3 8 0 2.5.7 4.7 2 6h14c1.3-1.3 2-3.5 2-6 0-3-1-5.5-3-8M4 20.5l1.5-1.5M8 20.5 9 19M16 20.5 15 19M20 20.5 18.5 19M12 7v6.5M12 16v.1',
  // Letras dentro del círculo.
  estabilidad_abs:
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM6 15l1.7-6L9.4 15M6.6 13h2.2M11 9v6h1.3a1.5 1.5 0 0 0 0-3H11h1a1.5 1.5 0 0 0 0-3zM18 10c-.3-.7-1-1-1.6-1-.9 0-1.4.6-1.4 1.4 0 1.9 3 1.2 3 3.2 0 .9-.7 1.4-1.6 1.4-.7 0-1.4-.4-1.6-1.1',
  // Surtidor de combustible.
  combustible:
    'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M2.5 21h13M7 7h4v4H7zM14 12h2a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 0 3 0V9l-3-3',
  // Faro con sus rayos.
  luces:
    'M13 5c4.5 0 8 3 8 7s-3.500 7-8 7c-1.200-2-1.800-4.500-1.800-7S11.800 7 13 5zM8 7 3 6M8 12H3M8 17l-5 1',
  // Información.
  informativo: 'M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17zM12 11v5.500M12 7.800v.1',
  // Triángulo de advertencia, para lo que no se identificó.
  otro: 'M12 3.500 22 20.500H2zM12 10v5M12 17.800v.1',
};

/** Testigo encendido. Es decorativo: el nombre y el semáforo siempre van en texto al lado. */
@Component({
  selector: 'app-telltale-icon',
  template: `
    <span class="telltale-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path [attr.d]="path()" />
      </svg>
    </span>
  `,
})
export class TelltaleIconComponent {
  readonly category = input.required<string>();
  protected readonly path = computed(() => PATHS[this.category()] ?? PATHS['otro']);
}
