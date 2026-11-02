import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ExpirationBadgeComponent, formatDate } from '../../components/expiration-badge/expiration-badge.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { VehicleFormComponent, type VehicleFormValue } from '../../components/vehicle-form/vehicle-form.component';
import { apiErrorCode, apiErrorMessage, apiFieldErrors, EMAIL_NOT_VERIFIED } from '../../core/http/api-error';
import type { Assessment, GarageVehicle } from '../../models/garage';
import { GarageService } from '../../services/garage.service';

type LoadState = 'loading' | 'ready' | 'not-found' | 'unverified' | 'error';

const VERDICT_CLASS: Record<Assessment['verdict'], string> = { 'Sin alertas': 'ok', Revisar: 'review', 'No recomendado': 'bad' };
const VERDICT_ICON: Record<Assessment['verdict'], string> = { 'Sin alertas': '✓', Revisar: '!', 'No recomendado': '✕' };
const SOURCE_LABEL: Record<GarageVehicle['source'], string> = {
  manual: 'registrados a mano',
  scan: 'leídos de la tarjeta de propiedad y confirmados por ti',
  runt: 'actualizados desde el proveedor RUNT'
};

@Component({
  selector: 'app-vehicle-detail-page',
  imports: [RouterLink, ExpirationBadgeComponent, VehicleFormComponent, ModalComponent],
  template: `
    <a class="back-link" routerLink="/">← Volver a mi garaje</a>

    @switch (state()) {
      @case ('loading') {
        <div class="state-box" role="status"><span class="spinner" aria-hidden="true"></span> Cargando el vehículo…</div>
      }
      @case ('not-found') {
        <div class="state-box">
          <strong>Este vehículo no está en tu garaje.</strong>
          <a class="primary-button link-button" routerLink="/">Ir a mi garaje</a>
        </div>
      }
      @case ('unverified') {
        <div class="state-box"><strong>Confirma tu correo para ver tus vehículos.</strong></div>
      }
      @case ('error') {
        <div class="state-box error" role="alert">
          <strong>No pudimos cargar el vehículo.</strong>
          <p>{{ loadError() }}</p>
          <button class="secondary-button" type="button" (click)="load()">Reintentar</button>
        </div>
      }
      @case ('ready') {
        @if (vehicle(); as v) {
          <header class="page-header">
            <div>
              <span class="plate-tag">{{ v.plate }}</span>
              <h1>{{ v.brand }} {{ v.model }}</h1>
              <p class="source-note">{{ v.kind === 'moto' ? 'Moto' : 'Carro' }} · datos {{ sourceLabel() }} · actualizado el {{ updatedOn() }}</p>
            </div>
            @if (!editing()) {
              <div class="form-actions">
                <button class="secondary-button" type="button" (click)="startEditing()">Editar</button>
                <button class="danger-button" type="button" (click)="confirmingDelete.set(true)">Eliminar</button>
              </div>
            }
          </header>

          @if (notice()) { <p class="form-notice" role="status">{{ notice() }}</p> }

          @if (editing()) {
            <section class="panel">
              <h2>Editar datos</h2>
              <app-vehicle-form
                mode="edit"
                [initial]="v"
                submitLabel="Guardar cambios"
                [submitting]="saving()"
                [serverError]="saveError()"
                [serverFieldErrors]="fieldErrors()"
                (save)="saveChanges($event)"
              >
                <button type="button" class="secondary-button" (click)="editing.set(false)">Cancelar</button>
              </app-vehicle-form>
            </section>
          } @else {
            <div class="detail-grid">
              <div>
                <section class="panel">
                  <h2>Vigencias</h2>
                  <div class="expiration-list">
                    <app-expiration-badge document="SOAT" [status]="v.soat" [showDetail]="true" />
                    <app-expiration-badge document="RTM" [status]="v.rtm" [showDetail]="true" />
                  </div>
                </section>
                <section class="panel">
                  <h2>Concepto para compra</h2>
                  @if (assessment(); as a) {
                    <span class="verdict {{ verdictClass() }}"><span aria-hidden="true">{{ verdictIcon() }}</span> {{ a.verdict }}</span>
                    @if (a.reasons.length) {
                      <ul class="reason-list">
                        @for (reason of a.reasons; track reason.code + reason.message) { <li>{{ reason.message }}</li> }
                      </ul>
                    } @else {
                      <p class="source-note">No encontramos alertas con los datos registrados.</p>
                    }
                    <p class="disclaimer">
                      <strong>Se basa solo en los datos registrados en tu garaje; no es una consulta oficial al RUNT.</strong>
                      {{ a.basedOn.disclaimer }}
                    </p>
                  } @else if (assessmentError()) {
                    <p class="form-error" role="alert">{{ assessmentError() }}</p>
                    <button class="secondary-button" type="button" (click)="loadAssessment()">Reintentar</button>
                  } @else {
                    <p class="source-note" role="status"><span class="spinner" aria-hidden="true"></span> Calculando concepto…</p>
                  }
                </section>
              </div>
              <section class="panel">
                <h2>Datos del vehículo</h2>
                <dl class="data-list">
                  <div><dt>Placa</dt><dd>{{ v.plate }}</dd></div>
                  <div><dt>Marca</dt><dd>{{ v.brand }}</dd></div>
                  <div><dt>Modelo o línea</dt><dd>{{ v.model }}</dd></div>
                  <div><dt>Año</dt><dd>{{ v.year ?? '—' }}</dd></div>
                  <div><dt>Color</dt><dd>{{ v.color ?? '—' }}</dd></div>
                  <div><dt>Cilindraje</dt><dd>{{ v.cylinderCc ? v.cylinderCc + ' cc' : '—' }}</dd></div>
                  <div><dt>Chasis</dt><dd>{{ v.chassis ?? '—' }}</dd></div>
                  <div><dt>Combustible</dt><dd>{{ v.fuelType ?? '—' }}</dd></div>
                  <div><dt>Servicio</dt><dd>{{ v.serviceType ?? '—' }}</dd></div>
                  <div><dt>Vence SOAT</dt><dd>{{ format(v.soatExpiresOn) }}</dd></div>
                  <div><dt>Vence RTM</dt><dd>{{ format(v.rtmExpiresOn) }}</dd></div>
                  <div><dt>Estado RUNT</dt><dd>{{ v.runtStatus ?? 'Sin consultar' }}</dd></div>
                </dl>
              </section>
            </div>
          }

          @if (confirmingDelete()) {
            <app-modal heading="¿Eliminar este vehículo?" (close)="confirmingDelete.set(false)">
              <p>Se borrará {{ v.plate }} ({{ v.brand }} {{ v.model }}) de tu garaje. Esta acción no se puede deshacer.</p>
              @if (deleteError()) { <p class="form-error" role="alert">{{ deleteError() }}</p> }
              <div class="form-actions">
                <button class="danger-button" type="button" (click)="remove()" [disabled]="deleting()">{{ deleting() ? 'Eliminando…' : 'Sí, eliminar' }}</button>
                <button class="secondary-button" type="button" (click)="confirmingDelete.set(false)">Cancelar</button>
              </div>
            </app-modal>
          }
        }
      }
    }
  `
})
export class VehicleDetailPage {
  private readonly garage = inject(GarageService);
  private readonly router = inject(Router);

  /** Parámetro :placa de la ruta (withComponentInputBinding). */
  readonly placa = input.required<string>();

  readonly state = signal<LoadState>('loading');
  readonly vehicle = signal<GarageVehicle | null>(null);
  readonly assessment = signal<Assessment | null>(null);
  readonly loadError = signal('');
  readonly assessmentError = signal('');
  readonly notice = signal(this.router.currentNavigation()?.extras.state?.['created'] ? 'Vehículo agregado a tu garaje.' : '');

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly verdictClass = computed(() => (this.assessment() ? VERDICT_CLASS[this.assessment()!.verdict] : ''));
  readonly verdictIcon = computed(() => (this.assessment() ? VERDICT_ICON[this.assessment()!.verdict] : ''));
  readonly sourceLabel = computed(() => (this.vehicle() ? SOURCE_LABEL[this.vehicle()!.source] : ''));
  readonly updatedOn = computed(() => formatDate(this.vehicle()?.updatedAt.slice(0, 10) ?? null));

  protected readonly format = formatDate;

  constructor() {
    toObservable(this.placa).subscribe(() => this.load());
  }

  load(): void {
    this.state.set('loading');
    this.garage.get(this.placa()).subscribe({
      next: (vehicle) => {
        this.vehicle.set(vehicle);
        this.state.set('ready');
        this.loadAssessment();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) this.state.set('not-found');
        else if (apiErrorCode(error) === EMAIL_NOT_VERIFIED) this.state.set('unverified');
        else {
          this.loadError.set(apiErrorMessage(error, 'Inténtalo de nuevo en unos segundos.'));
          this.state.set('error');
        }
      }
    });
  }

  loadAssessment(): void {
    this.assessment.set(null);
    this.assessmentError.set('');
    this.garage.assessment(this.placa()).subscribe({
      next: (assessment) => this.assessment.set(assessment),
      error: (error: unknown) => this.assessmentError.set(apiErrorMessage(error, 'No se pudo calcular el concepto.'))
    });
  }

  /** Para que otras acciones (por ejemplo, la actualización desde RUNT) reemplacen el vehículo mostrado. */
  replaceVehicle(vehicle: GarageVehicle, notice: string): void {
    this.vehicle.set(vehicle);
    this.notice.set(notice);
    this.loadAssessment();
  }

  startEditing(): void {
    this.saveError.set('');
    this.fieldErrors.set({});
    this.notice.set('');
    this.editing.set(true);
  }

  saveChanges(value: VehicleFormValue): void {
    const { plate: _plate, ...patch } = value;
    this.saving.set(true);
    this.saveError.set('');
    this.fieldErrors.set({});
    this.garage.update(this.placa(), patch).subscribe({
      next: (vehicle) => {
        this.saving.set(false);
        this.editing.set(false);
        this.replaceVehicle(vehicle, 'Cambios guardados.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.fieldErrors.set(apiFieldErrors(error));
        this.saveError.set(apiErrorMessage(error, 'No se pudieron guardar los cambios.'));
      }
    });
  }

  remove(): void {
    this.deleting.set(true);
    this.deleteError.set('');
    this.garage.remove(this.placa()).subscribe({
      next: () => void this.router.navigate(['/']),
      error: (error: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(apiErrorMessage(error, 'No se pudo eliminar el vehículo.'));
      }
    });
  }
}
