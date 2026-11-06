import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { VerifyEmailPage } from './verify-email.page';

const API = environment.apiUrl;

describe('VerifyEmailPage', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const render = (token: string | null) => {
    TestBed.configureTestingModule({
      imports: [VerifyEmailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(VerifyEmailPage);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => { http.verify(); });

  it('lee el token, lo borra de la URL y confirma el correo', async () => {
    const enlace = 'token-123';
    const fixture = render(enlace);
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { token: null }, replaceUrl: true }));

    const request = http.expectOne(`${API}/auth/verify-email`);
    expect(request.request.body).toEqual({ token: enlace });
    request.flush({ message: 'Tu correo fue confirmado.', emailVerified: true });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tu correo fue confirmado.');
  });

  it('muestra el error del backend si el enlace venció', async () => {
    const fixture = render('vencido');
    http.expectOne(`${API}/auth/verify-email`).flush({ message: 'El enlace no es válido o expiró.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.form-error')?.textContent).toContain('El enlace no es válido o expiró.');
  });

  it('sin token no llama a la API', async () => {
    const fixture = render(null);
    http.expectNone(`${API}/auth/verify-email`);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('falta el código de confirmación');
  });
});
