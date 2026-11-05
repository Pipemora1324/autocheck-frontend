import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { garageVehicle } from '../../../testing/garage-fixtures';
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
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('muestra los datos del vehículo, sin nada de vigencias ni concepto', async () => {
    const { element } = await render();
    expect(element.querySelector('h1')?.textContent).toContain('Renault Sandero');
    expect(element.textContent).toContain('9FBBSRADDKM123456');
    expect(element.textContent).not.toMatch(/SOAT|RTM|RUNT|Concepto/);
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
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne(`${GARAGE}/ABC-123`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).not.toHaveProperty('plate');
    expect(request.request.body.color).toBe('Rojo');
    request.flush(garageVehicle({ color: 'Rojo' }));
    await fixture.whenStable();
    expect(element.textContent).toContain('Cambios guardados.');
  });

  it('elimina tras confirmar y vuelve al garaje', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('.page-header .danger-button')!.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('no se puede deshacer');

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
