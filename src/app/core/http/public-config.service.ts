import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PublicConfig } from '../../models/garage';

/**
 * GET /config/public: texto de consentimiento, aviso del proveedor de lectura y qué funciones opcionales están activas.
 * Se pide una vez; si falla, `config()` queda en null y las pantallas usan su texto por defecto.
 */
@Injectable({ providedIn: 'root' })
export class PublicConfigService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<PublicConfig | null>(null);
  private request$: Observable<PublicConfig | null> | null = null;

  readonly config = this.state.asReadonly();

  load(): Observable<PublicConfig | null> {
    this.request$ ??= this.http.get<PublicConfig>(`${environment.apiUrl}/config/public`).pipe(
      map((config) => {
        this.state.set(config);
        return config;
      }),
      catchError(() => {
        // Se permite reintentar en la siguiente pantalla que lo necesite (por ejemplo, si el servidor estaba despertando).
        this.request$ = null;
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.request$;
  }
}
