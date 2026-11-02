import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, timeout, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipWakeRetry } from './server-status.interceptor';
import { ServerStatusService } from './server-status.service';

export type ApiHealth = 'checking' | 'online' | 'offline';

export const HEALTH_POLL_MS = 30_000;
// Render (plan gratuito) puede tardar en despertar: se da margen antes de declarar la API sin conexión.
const HEALTH_TIMEOUT_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly serverStatus = inject(ServerStatusService);
  private readonly state = signal<ApiHealth>('checking');
  private started = false;

  readonly status = this.state.asReadonly();

  start(): void {
    if (this.started) return;
    this.started = true;
    timer(0, HEALTH_POLL_MS)
      .pipe(
        exhaustMap(() =>
          this.http.get<{ status: string }>(`${environment.apiUrl}/health`, { context: skipWakeRetry() }).pipe(
            timeout(HEALTH_TIMEOUT_MS),
            map((response): ApiHealth => (response.status === 'ok' ? 'online' : 'offline')),
            catchError(() => of<ApiHealth>('offline'))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((status) => {
        this.state.set(status);
        // El timeout corta la petición antes de que el interceptor vea un error: se informa aquí.
        if (status === 'online') this.serverStatus.markReachable();
        else this.serverStatus.markUnreachable();
      });
  }
}
