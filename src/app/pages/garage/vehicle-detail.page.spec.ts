import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { diagnosed, history } from '../../../testing/diagnosis-fixtures';
import { garageVehicle, publicConfig } from '../../../testing/garage-fixtures';
import { VehicleDetailPage } from './vehicle-detail.page';

const GARAGE = `${environment.apiUrl}/garage`;

describe('VehicleDetailPage', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [VehicleDetailPage], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  const render = async () => {
    const fixture = TestBed.createComponent(VehicleDetailPage);
    fixture.componentRef.setInput('placa', 'ABC-123');
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(`${GARAGE}/ABC-123`).flush(garageVehicle());
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/config/public`).flush(publicConfig());
    http.expectOne((request) => request.url === `${GARAGE}/ABC-123/diagnoses`).flush(history());
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('muestra los datos del vehículo, sin nada de vigencias ni concepto', async () => {
    const { element } = await render();
    expect(element.querySelector('h1')?.textContent).toContain('Renault Sandero');
    expect(element.textContent).toContain('9FBBSRADDKM123456');
    expect(element.textContent).toContain('85.000 km');
    expect(element.textContent).not.toMatch(/SOAT|RTM|RUNT|Concepto/);
  });

  it('la pantalla principal del vehículo es el diagnóstico, con su historial', async () => {
    const { element } = await render();
    expect(element.querySelector('app-diagnose-panel h2')?.textContent).toBe('Diagnosticar un testigo');
    expect(element.querySelector('app-diagnosis-history h2')?.textContent).toBe('Historial de diagnósticos');
    const panel = element.querySelector('app-diagnose-panel')!;
    expect(panel.compareDocumentPosition(element.querySelector('app-diagnosis-history')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('recarga el historial al crear un diagnóstico', async () => {
    const { fixture, element } = await render();
    const panel = element.querySelector('app-diagnose-panel')!;
    const area = panel.querySelector<HTMLTextAreaElement>('#dash-description')!;
    area.value = 'luz naranja';
    area.dispatchEvent(new Event('input'));
    panel.querySelector<HTMLInputElement>('.check-field input')!.click();
    await fixture.whenStable();
    [...panel.querySelectorAll('button')].find((item) => item.textContent?.includes('Diagnosticar'))!.click();
    http.expectOne((request) => request.url === `${GARAGE}/ABC-123/diagnoses` && request.method === 'POST').flush(diagnosed(), { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http.expectOne((request) => request.url === `${GARAGE}/ABC-123/diagnoses` && request.method === 'GET').flush(history());
    await fixture.whenStable();
    expect(element.querySelector('app-diagnosis-result')).toBeTruthy();
  });

  it('edita enviando solo los campos editables (sin la placa)', async () => {
    const { fixture, element } = await render();
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Editar'))!.click();
    await fixture.whenStable();

    const color = element.querySelector<HTMLInputElement>('#vehicle-color')!;
    expect(color.value).toBe('Gris');
    expect(element.querySelector<HTMLInputElement>('#vehicle-plate')).toBeNull();
    color.value = 'Rojo';
    color.dispatchEvent(new Event('input'));
    const mileage = element.querySelector<HTMLInputElement>('#vehicle-mileage')!;
    expect(mileage.value).toBe('85000');
    mileage.value = '90000';
    mileage.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne(`${GARAGE}/ABC-123`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).not.toHaveProperty('plate');
    expect(request.request.body.color).toBe('Rojo');
    expect(request.request.body.mileageKm).toBe(90000);
    for (const removed of ['soatExpiresOn', 'rtmExpiresOn', 'runtStatus']) expect(request.request.body).not.toHaveProperty(removed);
    request.flush(garageVehicle({ color: 'Rojo' }));
    await fixture.whenStable();
    // Al salir de la edición vuelven el panel y el historial.
    http.expectOne((candidate) => candidate.url === `${GARAGE}/ABC-123/diagnoses`).flush(history());
    await fixture.whenStable();
    expect(element.textContent).toContain('Cambios guardados.');
  });

  it('elimina tras confirmar y vuelve al garaje', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('.page-header .danger-button')!.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('no se puede deshacer');
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('historial de diagnósticos');

    element.querySelector<HTMLButtonElement>('[role="dialog"] .danger-button')!.click();
    const request = http.expectOne(`${GARAGE}/ABC-123`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('muestra un mensaje claro si el vehículo no está en el garaje', async () => {
    const fixture = TestBed.createComponent(VehicleDetailPage);
    fixture.componentRef.setInput('placa', 'ZZZ-999');
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(`${GARAGE}/ZZZ-999`).flush({ message: 'No encontrado.' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no está en tu garaje');
  });
});
