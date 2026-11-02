import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

/** Una petición que tarda más que esto se considera "el servidor está despertando" (Render gratis tarda 30-60 s). */
export const SLOW_REQUEST_MS = 3_000;
/** Si el servidor sigue sin responder pasado este tiempo, se deja de decir "despertando" y se muestra que no responde. */
export const UNREACHABLE_GIVE_UP_MS = 120_000;

export const SERVER_WAKING_MESSAGE = 'Conectando con el servidor, puede tardar un minuto. Inténtalo de nuevo en unos segundos.';

export type ServerState = 'ok' | 'waking' | 'down';

/**
 * Error típico de un backend dormido detrás del rewrite de Vercel: sin respuesta (0) o 502/503/504 del proxy.
 * Un 503 con `code` es un servicio opcional apagado (lectura de tarjeta, RUNT), no un servidor dormido.
 */
export function isServerWakingError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (![0, 502, 503, 504].includes(error.status)) return false;
  const body = error.error;
  return !(body && typeof body === 'object' && 'code' in body);
}

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly slowRequests = signal(0);
  private readonly unreachable = signal(false);
  private readonly gaveUp = signal(false);
  private giveUpTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = computed<ServerState>(() => {
    if (this.gaveUp()) return 'down';
    return this.unreachable() || this.slowRequests() > 0 ? 'waking' : 'ok';
  });

  slowRequestStarted(): void {
    this.slowRequests.update((count) => count + 1);
  }

  slowRequestFinished(): void {
    this.slowRequests.update((count) => Math.max(0, count - 1));
  }

  markUnreachable(): void {
    if (this.unreachable()) return;
    this.unreachable.set(true);
    this.giveUpTimer = setTimeout(() => this.gaveUp.set(true), UNREACHABLE_GIVE_UP_MS);
  }

  markReachable(): void {
    if (this.giveUpTimer) clearTimeout(this.giveUpTimer);
    this.giveUpTimer = null;
    this.unreachable.set(false);
    this.gaveUp.set(false);
  }
}
