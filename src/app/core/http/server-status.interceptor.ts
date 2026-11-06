import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, retry, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isServerWakingError, ServerStatusService, SLOW_REQUEST_MS } from './server-status.service';

/** Reintentos de un GET mientras el servidor despierta: 4 × 5 s, además de lo que tarde cada intento. */
export const WAKE_RETRIES = 4;
export const WAKE_RETRY_DELAY_MS = 5_000;

/** Para peticiones que manejan su propio sondeo (por ejemplo /health) y no deben reintentarse aquí. */
export const SKIP_WAKE_RETRY = new HttpContextToken<boolean>(() => false);
export const skipWakeRetry = () => new HttpContext().set(SKIP_WAKE_RETRY, true);

const isApiRequest = (url: string) =>
  url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);

/**
 * Detecta cuándo el backend (Render, plan gratuito) está despertando: avisa si una petición tarda y reintenta
 * los GET que fallan con 0/502/503/504. Las escrituras no se reintentan para no duplicarlas.
 */
export const serverStatusInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) return next(request);

  const status = inject(ServerStatusService);
  const retries =
    request.method === 'GET' && !request.context.get(SKIP_WAKE_RETRY) ? WAKE_RETRIES : 0;
  let slow = false;
  const slowTimer = setTimeout(() => {
    slow = true;
    status.slowRequestStarted();
  }, SLOW_REQUEST_MS);

  return next(request).pipe(
    retry({
      count: retries,
      delay: (error: unknown) => {
        if (!isServerWakingError(error)) return throwError(() => error);
        status.markUnreachable();
        return timer(WAKE_RETRY_DELAY_MS);
      },
    }),
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) status.markReachable();
      },
      error: (error: unknown) => {
        if (isServerWakingError(error)) status.markUnreachable();
        // Cualquier otra respuesta HTTP (400, 401, 404…) demuestra que el servidor ya está despierto.
        else if (error instanceof HttpErrorResponse) status.markReachable();
      },
    }),
    finalize(() => {
      clearTimeout(slowTimer);
      if (slow) status.slowRequestFinished();
    }),
  );
};
