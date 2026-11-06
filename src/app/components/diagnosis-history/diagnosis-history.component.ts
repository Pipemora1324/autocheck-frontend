import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { formatDateTime } from '../../core/format-date';
import { apiErrorCode, apiErrorMessage, EMAIL_NOT_VERIFIED } from '../../core/http/api-error';
import { DIAGNOSIS_DISCLAIMER, ordersStop, type Diagnosed, type DiagnosisHistoryItem } from '../../models/diagnosis';
import { DiagnosisService } from '../../services/diagnosis.service';
import { DiagnosisChatComponent } from '../diagnosis-chat/diagnosis-chat.component';
import { DiagnosisResultComponent } from '../diagnosis-result/diagnosis-result.component';
import { ModalComponent } from '../modal/modal.component';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';

/** Historial del vehículo, con detalle y borrado. La explicación se pide al abrirla, sin crear otra entrada. */
@Component({
  selector: 'app-diagnosis-history',
  imports: [DiagnosisChatComponent, DiagnosisResultComponent, ModalComponent, SeverityBadgeComponent],
  template: `
    <section class="panel" aria-labelledby="history-title">
      <h2 id="history-title">Historial de diagnósticos</h2>

      @switch (state()) {
        @case ('loading') {
          <div class="state-box" role="status"><span class="spinner" aria-hidden="true"></span> Cargando el historial…</div>
        }
        @case ('unverified') {
          <div class="state-box"><strong>Confirma tu correo para ver tu historial.</strong></div>
        }
        @case ('error') {
          <div class="state-box error" role="alert">
            <strong>No pudimos cargar el historial.</strong>
            <p>{{ error() }}</p>
            <button class="secondary-button" type="button" (click)="load(page())">Reintentar</button>
          </div>
        }
        @case ('ready') {
          @if (items().length === 0) {
            <p class="source-note">Aún no hay diagnósticos de este vehículo.</p>
          } @else {
            <ul class="history-list">
              @for (item of items(); track item.id) {
                <li>
                  <button type="button" class="history-item" (click)="open(item)">
                    <span class="history-main">
                      <strong>{{ name(item) }}</strong>
                      <small>{{ date(item.createdAt) }}</small>
                    </span>
                    <app-severity-badge [severity]="item.severidad" [stop]="stops(item)" />
                  </button>
                </li>
              }
            </ul>
            @if (totalPages() > 1) {
              <nav class="pagination" aria-label="Páginas del historial">
                <button class="secondary-button" type="button" [disabled]="page() <= 1" (click)="load(page() - 1)">Anterior</button>
                <span>Página {{ page() }} de {{ totalPages() }}</span>
                <button class="secondary-button" type="button" [disabled]="page() >= totalPages()" (click)="load(page() + 1)">Siguiente</button>
              </nav>
            }
          }
        }
      }
    </section>

    @if (selected(); as item) {
      <app-modal heading="Detalle del diagnóstico" (closed)="closeDetail()">
        @if (item.severidad === 'rojo' && stops(item) && !detail()) {
          <div class="stop-banner" role="alert"><strong>Si sigue encendido: detente en un lugar seguro y llama a un taller o a una grúa.</strong></div>
        }
        <dl class="data-list">
          <div><dt>Testigo</dt><dd>{{ name(item) }}</dd></div>
          <div><dt>Fecha</dt><dd>{{ date(item.createdAt) }}</dd></div>
          <div><dt>Semáforo</dt><dd><app-severity-badge [severity]="item.severidad" [stop]="stops(item)" /></dd></div>
          <div><dt>Cómo se identificó</dt><dd>{{ origin(item) }}</dd></div>
          @if (item.descripcion) { <div><dt>Tu descripción</dt><dd>{{ item.descripcion }}</dd></div> }
        </dl>
        @if (detail(); as explanation) {
          <app-diagnosis-result [result]="explanation" />
          <app-diagnosis-chat [plate]="plate()" [diagnosisId]="explanation.id" />
        } @else {
          <p class="source-note">{{ disclaimer }}</p>
        }
        @if (detailLoading()) {
          <div class="state-box" role="status"><span class="spinner" aria-hidden="true"></span> Cargando la explicación…</div>
        }
        @if (detailError()) { <p class="form-error" role="alert">{{ detailError() }}</p> }
        @if (deleteError()) { <p class="form-error" role="alert">{{ deleteError() }}</p> }
        @if (confirmingDelete()) {
          <p><strong>¿Eliminar este diagnóstico? Esta acción no se puede deshacer.</strong></p>
          <div class="form-actions">
            <button class="danger-button" type="button" [disabled]="deleting()" (click)="remove(item)">{{ deleting() ? 'Eliminando…' : 'Sí, eliminar' }}</button>
            <button class="secondary-button" type="button" (click)="confirmingDelete.set(false)">Cancelar</button>
          </div>
        } @else {
          <div class="form-actions">
            @if (!detail()) {
              <button class="secondary-button" type="button" [disabled]="detailLoading()" (click)="loadDetail(item)">Ver la explicación completa</button>
            }
            <button class="danger-button" type="button" (click)="confirmingDelete.set(true)">Eliminar</button>
            <button class="secondary-button" type="button" (click)="closeDetail()">Cerrar</button>
          </div>
        }
      </app-modal>
    }
  `
})
export class DiagnosisHistoryComponent {
  private readonly diagnosis = inject(DiagnosisService);

  readonly plate = input.required<string>();
  /** Cambia cuando se crea un diagnóstico, para volver a la primera página. */
  readonly refreshKey = input(0);

  protected readonly date = formatDateTime;
  protected readonly stops = ordersStop;
  protected readonly disclaimer = DIAGNOSIS_DISCLAIMER;

  readonly state = signal<'loading' | 'ready' | 'unverified' | 'error'>('loading');
  readonly error = signal('');
  readonly items = signal<DiagnosisHistoryItem[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly selected = signal<DiagnosisHistoryItem | null>(null);
  readonly detail = signal<Diagnosed | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    effect(() => {
      this.plate();
      this.refreshKey();
      untracked(() => { this.load(1); });
    });
  }

  name(item: DiagnosisHistoryItem): string {
    const name = item.nombre ?? item.telltaleId ?? 'Diagnóstico';
    const others = item.totalTestigos - 1;
    return others > 0 ? `${name} y ${others} más` : name;
  }

  origin(item: DiagnosisHistoryItem): string {
    if (item.origen === 'manual') return 'Elegido por ti de la lista';
    return item.confianza === null ? 'Inteligencia artificial' : `Inteligencia artificial (confianza ${Math.round(item.confianza * 100)} %)`;
  }

  load(page: number): void {
    this.state.set('loading');
    this.diagnosis.history(this.plate(), page).subscribe({
      next: ({ items, page: current, totalPages }) => {
        // Si se borró lo último de una página, se muestra la anterior.
        if (items.length === 0 && current > 1) {
          this.load(current - 1);
          return;
        }
        this.items.set(items);
        this.page.set(current);
        this.totalPages.set(totalPages);
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

  open(item: DiagnosisHistoryItem): void {
    this.confirmingDelete.set(false);
    this.deleteError.set('');
    this.resetDetail();
    this.selected.set(item);
  }

  closeDetail(): void {
    this.selected.set(null);
    this.resetDetail();
  }

  loadDetail(item: DiagnosisHistoryItem): void {
    this.detailLoading.set(true);
    this.detailError.set('');
    this.diagnosis.detail(this.plate(), item.id).subscribe({
      next: (detail) => {
        // Si ya se cerró o se abrió otra entrada, esta respuesta no le corresponde.
        if (this.selected()?.id !== item.id) return;
        this.detailLoading.set(false);
        this.detail.set(detail);
      },
      error: (error: unknown) => {
        if (this.selected()?.id !== item.id) return;
        this.detailLoading.set(false);
        this.detailError.set(apiErrorMessage(error, 'No pudimos cargar la explicación. Inténtalo de nuevo.'));
      }
    });
  }

  private resetDetail(): void {
    this.detail.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
  }

  remove(item: DiagnosisHistoryItem): void {
    this.deleting.set(true);
    this.deleteError.set('');
    this.diagnosis.remove(this.plate(), item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDetail();
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(apiErrorMessage(error, 'No se pudo eliminar el diagnóstico.'));
      }
    });
  }
}
