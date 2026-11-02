import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from './api-error';
import { serverStatusInterceptor, skipWakeRetry, WAKE_RETRIES, WAKE_RETRY_DELAY_MS } from './server-status.interceptor';
import { isServerWakingError, SERVER_WAKING_MESSAGE, ServerStatusService, SLOW_REQUEST_MS, UNREACHABLE_GIVE_UP_MS } from './server-status.service';

const API = environment.apiUrl;
const badGateway = { status: 502, statusText: 'Bad Gateway' };

describe('isServerWakingError', () => {
  it('reconoce 0, 502, 503 y 504 sin código', () => {
    for (const status of [0, 502, 503, 504]) expect(isServerWakingError(new HttpErrorResponse({ status }))).toBe(true);
  });

  it('no confunde un servicio opcional apagado (503 con code) ni otros errores', () => {
    expect(isServerWakingError(new HttpErrorResponse({ status: 503, error: { message: 'x', code: 'VISION_NOT_CONFIGURED' } }))).toBe(false);
    expect(isServerWakingError(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(isServerWakingError(new HttpErrorResponse({ status: 404 }))).toBe(false);
  });

  it('apiErrorMessage explica que el servidor está despertando', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 504 }), 'x')).toBe(SERVER_WAKING_MESSAGE);
    expect(SERVER_WAKING_MESSAGE).toContain('Conectando con el servidor, puede tardar un minuto');
  });
});

describe('serverStatusInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let status: ServerStatusService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([serverStatusInterceptor])), provideHttpClientTesting()]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    status = TestBed.inject(ServerStatusService);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('una petición lenta activa el estado "despertando" hasta que responde', () => {
    client.get(`${API}/garage`).subscribe();
    expect(status.state()).toBe('ok');
    vi.advanceTimersByTime(SLOW_REQUEST_MS + 1);
    expect(status.state()).toBe('waking');
    http.expectOne(`${API}/garage`).flush({ vehicles: [] });
    expect(status.state()).toBe('ok');
  });

  it('reintenta un GET mientras el servidor despierta y termina con éxito', () => {
    let result: unknown;
    client.get(`${API}/garage`).subscribe((value) => (result = value));

    http.expectOne(`${API}/garage`).flush(null, badGateway);
    expect(status.state()).toBe('waking');
    vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    http.expectOne(`${API}/garage`).flush(null, { status: 504, statusText: 'Gateway Timeout' });
    vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    http.expectOne(`${API}/garage`).flush({ vehicles: [] });

    expect(result).toEqual({ vehicles: [] });
    expect(status.state()).toBe('ok');
  });

  it('se rinde tras los reintentos y propaga el error', () => {
    let error: unknown;
    client.get(`${API}/garage`).subscribe({ error: (value: unknown) => (error = value) });
    for (let attempt = 0; attempt <= WAKE_RETRIES; attempt++) {
      http.expectOne(`${API}/garage`).flush(null, badGateway);
      vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    }
    http.expectNone(`${API}/garage`);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(status.state()).toBe('waking');

    vi.advanceTimersByTime(UNREACHABLE_GIVE_UP_MS);
    expect(status.state()).toBe('down');
  });

  it('no reintenta escrituras para no duplicarlas', () => {
    let error: unknown;
    client.post(`${API}/garage`, {}).subscribe({ error: (value: unknown) => (error = value) });
    http.expectOne(`${API}/garage`).flush(null, badGateway);
    vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    http.expectNone(`${API}/garage`);
    expect(error).toBeInstanceOf(HttpErrorResponse);
  });

  it('no reintenta errores de la aplicación ni peticiones marcadas con skipWakeRetry', () => {
    client.get(`${API}/garage/ABC-123`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/garage/ABC-123`).flush({ message: 'No encontrado.' }, { status: 404, statusText: 'Not Found' });

    client.get(`${API}/health`, { context: skipWakeRetry() }).subscribe({ error: () => undefined });
    http.expectOne(`${API}/health`).flush(null, badGateway);
    vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    http.expectNone(`${API}/health`);
  });

  it('una respuesta de error de la aplicación demuestra que el servidor ya despertó', () => {
    status.markUnreachable();
    client.get(`${API}/garage`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/garage`).flush({ message: 'Confirma tu correo.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403, statusText: 'Forbidden' });
    expect(status.state()).toBe('ok');
  });

  it('no toca peticiones a otros dominios', () => {
    client.get('https://otro-sitio.example/datos').subscribe({ error: () => undefined });
    http.expectOne('https://otro-sitio.example/datos').flush(null, badGateway);
    vi.advanceTimersByTime(WAKE_RETRY_DELAY_MS);
    http.expectNone('https://otro-sitio.example/datos');
    expect(status.state()).toBe('ok');
  });
});
