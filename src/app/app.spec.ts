import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { sessionFor } from '../testing/auth-fixtures';
import { App } from './app';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

const API = environment.apiUrl;
const nextTick = () => new Promise((resolve) => setTimeout(resolve));

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const render = async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await nextTick();
    return fixture;
  };

  it('muestra "API conectada" solo si /health responde', async () => {
    const fixture = await render();
    const status = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.system-status')!.textContent.trim();
    expect(status()).toBe('Comprobando API…');

    http.expectOne(`${API}/health`).flush({ status: 'ok', service: 'AutoCheck-CO' });
    await fixture.whenStable();
    expect(status()).toBe('API conectada');
  });

  it('si /health falla dice que está conectando con el servidor y muestra el aviso de espera', async () => {
    const fixture = await render();
    http.expectOne(`${API}/health`).error(new ProgressEvent('error'));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.system-status')!.textContent).toContain(
      'Conectando con el servidor',
    );
    expect(element.querySelector('app-server-status-banner')!.textContent).toContain(
      'Conectando con el servidor, puede tardar un minuto.',
    );
  });

  it('muestra el usuario y el botón de cerrar sesión', async () => {
    const auth = TestBed.inject(AuthService);
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1', 'user'));

    const fixture = await render();
    http.expectOne(`${API}/health`).flush({ status: 'ok' });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.user-text strong')?.textContent).toBe('ana@example.com');
    expect(element.querySelector('.logout-button')).toBeTruthy();
    expect([...element.querySelectorAll('.main-nav a')].map((link) => link.textContent)).toEqual([
      'Mi garaje',
      'Mi cuenta',
    ]);
    expect(element.querySelector('footer')?.textContent).toContain(
      'un mecánico debe confirmar el diagnóstico',
    );
  });

  it('no distingue a un administrador en la barra superior', async () => {
    const auth = TestBed.inject(AuthService);
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1', 'admin'));

    const fixture = await render();
    http.expectOne(`${API}/health`).flush({ status: 'ok' });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.user-text strong')?.textContent).toBe('ana@example.com');
    expect(element.querySelector('.topbar')?.textContent).not.toContain('Admin');
  });
});
