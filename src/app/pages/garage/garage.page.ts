import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExpirationBadgeComponent } from '../../components/expiration-badge/expiration-badge.component';
import { apiErrorCode, apiErrorMessage, EMAIL_NOT_VERIFIED } from '../../core/http/api-error';
import type { GarageVehicle } from '../../models/garage';
import { GarageService } from '../../services/garage.service';

type LoadState = 'loading' | 'ready' | 'unverified' | 'error';

@Component({
  selector: 'app-garage-page',
  imports: [RouterLink, ExpirationBadgeComponent],
  template: `
    <header class="page-header">
      <div>
        <span class="eyebrow">Mi garaje</span>
        <h1>Tus vehículos</h1>
        <p>Vigencias de SOAT y revisión técnico-mecánica calculadas con los datos que registras.</p>
      </div>
      @if (state() === 'ready' && vehicles().length) {
        <a class="primary-button link-button" routerLink="/garaje/nuevo">Agregar vehículo</a>
      }
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="state-box" role="status"><span class="spinner" aria-hidden="true"></span> Cargando tu garaje…</div>
      }
      @case ('unverified') {
        <div class="state-box">
          <strong>Confirma tu correo para ver tu garaje.</strong>
          <p>Abre el enlace que te enviamos. Si no te llegó, usa el botón "Reenviar correo" del aviso de arriba.</p>
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
          <div class="state-box empty">
            <span class="empty-icon" aria-hidden="true">🚗</span>
            <strong>Aún no tienes vehículos en tu garaje.</strong>
            <p>Agrega tu carro o moto con una foto de la tarjeta de propiedad o llenando los datos a mano.</p>
            <a class="primary-button link-button" routerLink="/garaje/nuevo">Agregar vehículo</a>
          </div>
        } @else {
          <ul class="vehicle-list">
            @for (vehicle of vehicles(); track vehicle.plate) {
              <li>
                <a class="vehicle-card" [routerLink]="['/garaje', vehicle.plate]">
                  <span class="plate-tag">{{ vehicle.plate }}</span>
                  <span class="vehicle-name">
                    <strong>{{ vehicle.brand }} {{ vehicle.model }}</strong>
                    <small>{{ vehicle.kind === 'moto' ? 'Moto' : 'Carro' }}@if (vehicle.year) { · {{ vehicle.year }} }</small>
                  </span>
                  <span class="vehicle-badges">
                    <app-expiration-badge document="SOAT" [status]="vehicle.soat" />
                    <app-expiration-badge document="RTM" [status]="vehicle.rtm" />
                  </span>
                </a>
              </li>
            }
          </ul>
        }
      }
    }
  `
})
export class GaragePage {
  private readonly garage = inject(GarageService);

  readonly state = signal<LoadState>('loading');
  readonly vehicles = signal<GarageVehicle[]>([]);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.garage.list().subscribe({
      next: (vehicles) => {
        this.vehicles.set(vehicles);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (apiErrorCode(error) === EMAIL_NOT_VERIFIED) {
          this.state.set('unverified');
          return;
        }
        this.error.set(apiErrorMessage(error, 'Inténtalo de nuevo en unos segundos.'));
        this.state.set('error');
      }
    });
  }
}
