import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { garageVehicle, newGarageVehicle } from '../../testing/garage-fixtures';
import { GarageService } from './garage.service';

const GARAGE = `${environment.apiUrl}/garage`;

describe('GarageService', () => {
  let service: GarageService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GarageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list devuelve el arreglo de vehículos', async () => {
    const result = firstValueFrom(service.list());
    http.expectOne(GARAGE).flush({ vehicles: [garageVehicle()] });
    expect((await result).map((vehicle) => vehicle.plate)).toEqual(['ABC-123']);
  });

  it('create envía el vehículo sin documento del propietario', async () => {
    const result = firstValueFrom(service.create(newGarageVehicle({ source: 'scan' })));
    const request = http.expectOne(GARAGE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.source).toBe('scan');
    expect(request.request.body).not.toHaveProperty('ownerDocument');
    request.flush(garageVehicle(), { status: 201, statusText: 'Created' });
    expect((await result).plate).toBe('ABC-123');
  });

  it('update, remove y assessment codifican la placa en la URL', () => {
    service.update('ABC-12D', { color: null }).subscribe();
    const patch = http.expectOne(`${GARAGE}/ABC-12D`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ color: null });
    patch.flush(garageVehicle());

    service.remove('ABC-123').subscribe();
    const removal = http.expectOne(`${GARAGE}/ABC-123`);
    expect(removal.request.method).toBe('DELETE');
    removal.flush(null, { status: 204, statusText: 'No Content' });

    service.assessment('ABC-123').subscribe();
    http.expectOne(`${GARAGE}/ABC-123/assessment`).flush({});
  });

  it('scanCard sube la foto como multipart en el campo image', () => {
    const file = new File(['x'], 'tarjeta.jpg', { type: 'image/jpeg' });
    service.scanCard(file).subscribe();
    const request = http.expectOne(`${GARAGE}/scan-card`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('image')).toBeInstanceOf(File);
    request.flush({});
  });

  it('refreshFromRunt envía consent: true y el documento', () => {
    service.refreshFromRunt('ABC-123', { type: 'CC', number: '79123456' }).subscribe();
    const request = http.expectOne(`${GARAGE}/ABC-123/refresh-from-runt`);
    expect(request.request.body).toEqual({ consent: true, ownerDocument: { type: 'CC', number: '79123456' } });
    request.flush({});
  });
});
