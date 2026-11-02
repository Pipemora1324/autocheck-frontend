import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { sessionFor } from '../../../testing/auth-fixtures';
import { AuthService } from './auth.service';

const API = environment.apiUrl;
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  const signIn = (token: string) => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor(token));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('agrega Authorization: Bearer y withCredentials a las peticiones de la API', () => {
    signIn('access-1');
    client.get(`${API}/vehicles`).subscribe();
    const request = http.expectOne(`${API}/vehicles`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ vehicles: [] });
  });

  it('no envía token ni credenciales a otros dominios', () => {
    signIn('access-1');
    client.get('https://otro-sitio.example/datos').subscribe();
    const request = http.expectOne('https://otro-sitio.example/datos');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });

  it('ante un 401 refresca una vez y reintenta con el token nuevo', async () => {
    signIn('access-viejo');
    const result = firstValueFrom(client.get<{ vehicles: unknown[] }>(`${API}/vehicles`));

    http.expectOne(`${API}/vehicles`).flush({ message: 'Debes iniciar sesión.' }, unauthorized);
    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.headers.get('Authorization')).toBe('Bearer access-viejo');
    refresh.flush(sessionFor('access-nuevo'));

    const retry = http.expectOne(`${API}/vehicles`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-nuevo');
    retry.flush({ vehicles: [] });

    expect(await result).toEqual({ vehicles: [] });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('varias peticiones con 401 simultáneo comparten un solo refresh', async () => {
    signIn('access-viejo');
    const first = firstValueFrom(client.get(`${API}/vehicles`));
    const second = firstValueFrom(client.get(`${API}/vehicles/ABC-1234`));
    const third = firstValueFrom(client.post(`${API}/vehicles/scan`, { plate: 'ABC-1234' }));

    http.expectOne(`${API}/vehicles`).flush(null, unauthorized);
    http.expectOne(`${API}/vehicles/ABC-1234`).flush(null, unauthorized);
    http.expectOne(`${API}/vehicles/scan`).flush(null, unauthorized);

    const refreshes = http.match(`${API}/auth/refresh`);
    expect(refreshes.length).toBe(1);
    refreshes[0]!.flush(sessionFor('access-nuevo'));

    for (const url of [`${API}/vehicles`, `${API}/vehicles/ABC-1234`, `${API}/vehicles/scan`]) {
      const retry = http.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer access-nuevo');
      retry.flush({ ok: true });
    }
    await expect(Promise.all([first, second, third])).resolves.toHaveLength(3);
  });

  it('si el refresh falla, cierra la sesión, manda a /login y no reintenta', async () => {
    signIn('access-viejo');
    const result = firstValueFrom(client.get(`${API}/vehicles`));

    http.expectOne(`${API}/vehicles`).flush(null, unauthorized);
    http.expectOne(`${API}/auth/refresh`).flush(null, unauthorized);
    http.expectNone(`${API}/vehicles`);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.status()).toBe('anonymous');
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/', sesion: 'expirada' } });
  });

  it('no entra en bucle si la petición reintentada vuelve a dar 401', async () => {
    signIn('access-viejo');
    const result = firstValueFrom(client.get(`${API}/vehicles`));

    http.expectOne(`${API}/vehicles`).flush(null, unauthorized);
    http.expectOne(`${API}/auth/refresh`).flush(sessionFor('access-nuevo'));
    http.expectOne(`${API}/vehicles`).flush(null, unauthorized);
    http.expectNone(`${API}/auth/refresh`);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.status()).toBe('anonymous');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('no intenta refrescar ante el 401 de un login fallido', async () => {
    const result = firstValueFrom(auth.login('ana@example.com', 'mala'));
    http.expectOne(`${API}/auth/login`).flush({ message: 'Credenciales inválidas.' }, unauthorized);
    http.expectNone(`${API}/auth/refresh`);
    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ante 403 EMAIL_NOT_VERIFIED marca el correo como no verificado sin cerrar la sesión', async () => {
    signIn('access-1');
    expect(auth.user()?.emailVerified).toBe(true);
    const result = firstValueFrom(client.get(`${API}/garage`));
    http
      .expectOne(`${API}/garage`)
      .flush({ message: 'Confirma tu correo para usar esta función.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${API}/auth/refresh`);
    await expect(result).rejects.toMatchObject({ status: 403 });
    expect(auth.user()?.emailVerified).toBe(false);
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no refresca ante un 403 (sin permisos)', async () => {
    signIn('access-1');
    const result = firstValueFrom(client.patch(`${API}/vehicles/ABC-1234/inspections`, {}));
    http.expectOne(`${API}/vehicles/ABC-1234/inspections`).flush({ message: 'No tienes permisos.' }, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${API}/auth/refresh`);
    await expect(result).rejects.toMatchObject({ status: 403 });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.emailVerified).toBe(true);
  });
});
