import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ChatExchange, ChatHistory, Diagnosed, DiagnosisHistory, DiagnosisInput, DiagnosisResult, TelltaleSummary } from '../models/diagnosis';

export const HISTORY_PAGE_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class DiagnosisService {
  private readonly http = inject(HttpClient);
  private telltales$: Observable<TelltaleSummary[]> | null = null;

  private url(plate: string): string {
    return `${environment.apiUrl}/garage/${encodeURIComponent(plate)}/diagnoses`;
  }

  /** El catálogo no cambia durante la sesión: se pide una vez, y si falla se permite reintentar. */
  telltales(): Observable<TelltaleSummary[]> {
    this.telltales$ ??= this.http.get<{ telltales: TelltaleSummary[] }>(`${environment.apiUrl}/telltales`).pipe(
      map(({ telltales }) => telltales),
      catchError((error: unknown) => {
        this.telltales$ = null;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.telltales$;
  }

  /** multipart/form-data con image, description, telltaleId y/o parpadea. */
  diagnose(plate: string, { image, description, telltaleId, blinking }: DiagnosisInput): Observable<DiagnosisResult> {
    const form = new FormData();
    if (telltaleId) form.append('telltaleId', telltaleId);
    if (description) form.append('description', description);
    if (blinking !== undefined) form.append('parpadea', String(blinking));
    if (image) form.append('image', image, image.name);
    return this.http.post<DiagnosisResult>(this.url(plate), form);
  }

  history(plate: string, page = 1, limit = HISTORY_PAGE_SIZE): Observable<DiagnosisHistory> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<DiagnosisHistory>(this.url(plate), { params });
  }

  /** Solo lee: no crea otra entrada ni cuenta para ningún límite. */
  detail(plate: string, id: string): Observable<Diagnosed> {
    return this.http.get<Diagnosed>(`${this.url(plate)}/${encodeURIComponent(id)}`);
  }

  messages(plate: string, id: string): Observable<ChatHistory> {
    return this.http.get<ChatHistory>(`${this.url(plate)}/${encodeURIComponent(id)}/messages`);
  }

  sendMessage(plate: string, id: string, message: string): Observable<ChatExchange> {
    return this.http.post<ChatExchange>(`${this.url(plate)}/${encodeURIComponent(id)}/messages`, { message });
  }

  remove(plate: string, id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.url(plate)}/${encodeURIComponent(id)}`);
  }
}
