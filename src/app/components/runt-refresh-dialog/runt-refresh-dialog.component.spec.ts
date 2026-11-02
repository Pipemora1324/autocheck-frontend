import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { garageVehicle, publicConfig } from '../../../testing/garage-fixtures';
import type { RuntRefreshResult } from '../../models/garage';
import { isRuntUnavailable, RuntRefreshDialogComponent } from './runt-refresh-dialog.component';

const API = environment.apiUrl;
const REFRESH = `${API}/garage/ABC-123/refresh-from-runt`;

describe('isRuntUnavailable', () => {
  const error = (status: number, code?: string) => new HttpErrorResponse({ status, error: code ? { message: 'x', code } : null });

  it('reconoce el proveedor sin implementar, apagado o caído', () => {
    expect(isRuntUnavailable(error(501, 'RUNT_PROVIDER_NOT_IMPLEMENTED'))).toBe(true);
    expect(isRuntUnavailable(error(503, 'RUNT_PROVIDER_DISABLED'))).toBe(true);
    expect(isRuntUnavailable(error(503, 'RUNT_UNAVAILABLE'))).toBe(true);
    expect(isRuntUnavailable(error(501))).toBe(true);
  });

  it('no confunde otros errores', () => {
    expect(isRuntUnavailable(error(404, 'RUNT_NOT_FOUND'))).toBe(false);
    expect(isRuntUnavailable(error(400))).toBe(false);
    expect(isRuntUnavailable(error(503, 'EMAIL_NOT_VERIFIED'))).toBe(false);
  });
});

describe('RuntRefreshDialogComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RuntRefreshDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const render = async (runtEnabled: boolean) => {
    const fixture = TestBed.createComponent(RuntRefreshDialogComponent);
    fixture.componentRef.setInput('plate', 'ABC-123');
    fixture.detectChanges();
    http.expectOne(`${API}/config/public`).flush(publicConfig({ runtLookup: { enabled: runtEnabled, provider: runtEnabled ? 'verifik' : 'none' } }));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const fill = (element: HTMLElement, number: string, consent: boolean) => {
    const input = element.querySelector<HTMLInputElement>('#runt-doc-number')!;
    input.value = number;
    input.dispatchEvent(new Event('input'));
    const checkbox = element.querySelector<HTMLInputElement>('#runt-consent')!;
    if (checkbox.checked !== consent) checkbox.click();
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  };

  it('con el proveedor apagado no pide el documento y ofrece editar a mano', async () => {
    const { fixture, element } = await render(false);
    expect(element.querySelector('#runt-doc-number')).toBeNull();
    expect(element.textContent).toContain('todavía no está disponible');

    let edit = false;
    fixture.componentInstance.editManually.subscribe(() => (edit = true));
    element.querySelector<HTMLButtonElement>('.primary-button')!.click();
    expect(edit).toBe(true);
  });

  it('exige el consentimiento explícito antes de consultar', async () => {
    const { fixture, element } = await render(true);
    fill(element, '79123456', false);
    await fixture.whenStable();
    http.expectNone(REFRESH);
    expect(element.textContent).toContain('Debes autorizar la consulta');
  });

  it('envía consent y el documento normalizado, y emite el vehículo actualizado', async () => {
    const { fixture, element } = await render(true);
    let result: RuntRefreshResult | undefined;
    fixture.componentInstance.updated.subscribe((value) => (result = value));

    fill(element, '79.123.456', true);
    const request = http.expectOne(REFRESH);
    expect(request.request.body).toEqual({ consent: true, ownerDocument: { type: 'CC', number: '79123456' } });
    request.flush({ vehicle: garageVehicle({ source: 'runt' }), lookup: { provider: 'verifik', queriedAt: '2026-11-02T17:00:00.000Z', fieldsUpdated: ['soatExpiresOn'] } });

    expect(result?.vehicle.source).toBe('runt');
    expect(fixture.componentInstance.form.controls.number.value).toBe('');
  });

  it('si el backend responde 501 muestra el mensaje amable y olvida el documento', async () => {
    const { fixture, element } = await render(true);
    fill(element, '79123456', true);
    http
      .expectOne(REFRESH)
      .flush({ message: 'El proveedor no está implementado.', code: 'RUNT_PROVIDER_NOT_IMPLEMENTED' }, { status: 501, statusText: 'Not Implemented' });
    await fixture.whenStable();

    expect(element.textContent).toContain('todavía no está disponible');
    expect(element.querySelector('.form-error')).toBeNull();
    expect(fixture.componentInstance.form.controls.number.value).toBe('');
  });
});
