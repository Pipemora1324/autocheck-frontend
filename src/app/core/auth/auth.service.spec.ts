import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { sessionFor } from '../../../testing/auth-fixtures';
import { AuthService } from './auth.service';

const API = environment.apiUrl;

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('empieza sin sesión conocida', () => {
    expect(auth.status()).toBe('unknown');
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getAccessToken()).toBeNull();
  });

  it('login guarda el usuario y el token solo en memoria', async () => {
    const clave = 'clave-correcta';
    const result = firstValueFrom(auth.login('ana@example.com', clave));
    const request = http.expectOne(`${API}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@example.com', password: clave });
    expect(request.request.withCredentials).toBe(true);
    request.flush(sessionFor('access-1'));

    expect((await result).email).toBe('ana@example.com');
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getAccessToken()).toBe('access-1');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('isAdmin depende del rol', () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1', 'admin'));
    expect(auth.isAdmin()).toBe(true);
  });

  it('register envía acceptedTerms, inicia sesión y propaga el 409 si el correo existe', async () => {
    const failed = firstValueFrom(auth.register('ana@example.com', 'clave-larga', true));
    http.expectOne(`${API}/auth/register`).flush({ message: 'Ya existe una cuenta con este correo.' }, { status: 409, statusText: 'Conflict' });
    await expect(failed).rejects.toMatchObject({ status: 409 });
    expect(auth.isAuthenticated()).toBe(false);

    const clave = 'clave-larga';
    auth.register('nuevo@example.com', clave, true).subscribe();
    const request = http.expectOne(`${API}/auth/register`);
    expect(request.request.body).toEqual({ email: 'nuevo@example.com', password: clave, acceptedTerms: true });
    expect(request.request.withCredentials).toBe(true);
    request.flush(sessionFor('access-2', 'user', false));
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.emailVerified).toBe(false);
  });

  it('verifyEmail confirma el correo y actualiza al usuario en sesión', async () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1', 'user', false));

    const enlace = 'token-123';
    const result = firstValueFrom(auth.verifyEmail(enlace));
    const request = http.expectOne(`${API}/auth/verify-email`);
    expect(request.request.body).toEqual({ token: enlace });
    request.flush({ message: 'Tu correo fue confirmado.', emailVerified: true });
    await result;
    expect(auth.user()?.emailVerified).toBe(true);
  });

  it('verifyEmail sin sesión no falla y propaga el 400 de un token vencido', async () => {
    const result = firstValueFrom(auth.verifyEmail('vencido'));
    http.expectOne(`${API}/auth/verify-email`).flush({ message: 'El enlace no es válido o expiró.' }, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toMatchObject({ status: 400 });
    expect(auth.user()).toBeNull();
  });

  it('resendVerification envía el correo', async () => {
    const result = firstValueFrom(auth.resendVerification('ana@example.com'));
    const request = http.expectOne(`${API}/auth/resend-verification`);
    expect(request.request.body).toEqual({ email: 'ana@example.com' });
    request.flush({ message: 'Si el correo está registrado…' }, { status: 202, statusText: 'Accepted' });
    expect((await result).message).toContain('Si el correo');
  });

  it('deleteAccount envía la contraseña y cierra la sesión local', async () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1'));

    const clave = 'mi-clave';
    const done = firstValueFrom(auth.deleteAccount(clave), { defaultValue: undefined });
    const request = http.expectOne(`${API}/auth/me`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: clave });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await done;
    expect(auth.status()).toBe('anonymous');
  });

  it('deleteAccount con contraseña errada (403) conserva la sesión', async () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1'));

    const done = firstValueFrom(auth.deleteAccount('mala'));
    http.expectOne(`${API}/auth/me`).flush({ message: 'La contraseña no es correcta.', code: 'INVALID_PASSWORD' }, { status: 403, statusText: 'Forbidden' });
    await expect(done).rejects.toMatchObject({ status: 403 });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('refresh comparte una sola petición entre llamadas simultáneas', async () => {
    const first = firstValueFrom(auth.refresh());
    const second = firstValueFrom(auth.refresh());
    const requests = http.match(`${API}/auth/refresh`);
    expect(requests.length).toBe(1);
    expect(requests[0]!.request.withCredentials).toBe(true);
    requests[0]!.flush(sessionFor('access-nuevo'));

    expect(await first).toBe('access-nuevo');
    expect(await second).toBe('access-nuevo');

    // Terminada la primera, una nueva llamada hace otra petición.
    auth.refresh().subscribe();
    http.expectOne(`${API}/auth/refresh`).flush(sessionFor('access-3'));
    expect(auth.getAccessToken()).toBe('access-3');
  });

  it('si refresh falla, cierra la sesión y propaga el error', async () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1'));

    const result = firstValueFrom(auth.refresh());
    http.expectOne(`${API}/auth/refresh`).flush({ message: 'La sesión no es válida o expiró.' }, { status: 401, statusText: 'Unauthorized' });
    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.status()).toBe('anonymous');
    expect(auth.getAccessToken()).toBeNull();
  });

  it('restoreSession hace un solo intento y nunca falla', async () => {
    const restore = firstValueFrom(auth.restoreSession());
    const again = firstValueFrom(auth.restoreSession());
    http.expectOne(`${API}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(restore).resolves.toBeUndefined();
    await expect(again).resolves.toBeUndefined();
    expect(auth.status()).toBe('anonymous');

    await firstValueFrom(auth.restoreSession());
    http.expectNone(`${API}/auth/refresh`);
  });

  it('restoreSession recupera la sesión con la cookie', async () => {
    const restore = firstValueFrom(auth.restoreSession());
    http.expectOne(`${API}/auth/refresh`).flush(sessionFor('access-restaurado'));
    await restore;
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.email).toBe('ana@example.com');
  });

  it('logout avisa al backend y limpia la sesión aunque el servidor falle', async () => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1'));

    const done = firstValueFrom(auth.logout(), { defaultValue: undefined });
    const request = http.expectOne(`${API}/auth/logout`);
    expect(request.request.withCredentials).toBe(true);
    request.flush(null, { status: 500, statusText: 'Server Error' });
    await done;

    expect(auth.status()).toBe('anonymous');
    expect(auth.getAccessToken()).toBeNull();
  });
});
