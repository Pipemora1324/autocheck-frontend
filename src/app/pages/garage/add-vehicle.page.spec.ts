import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { cardScanResult, garageVehicle, publicConfig } from '../../../testing/garage-fixtures';
import { imageFileError } from '../../core/image-file';
import { AddVehiclePage, prefillFromScan } from './add-vehicle.page';

const API = environment.apiUrl;

const imageFile = (type: string, bytes: number) => {
  const file = new File(['x'], 'tarjeta', { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

describe('imageFileError', () => {
  it('acepta JPEG, PNG y WEBP de hasta 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(imageFileError(imageFile(type, 1024))).toBeNull();
    expect(imageFileError(imageFile('image/jpeg', 5 * 1024 * 1024))).toBeNull();
  });

  it('rechaza otros tipos y archivos de más de 5 MB', () => {
    expect(imageFileError(imageFile('image/gif', 1024))).toContain('JPEG, PNG o WEBP');
    expect(imageFileError(imageFile('application/pdf', 1024))).toContain('JPEG, PNG o WEBP');
    expect(imageFileError(imageFile('image/png', 5 * 1024 * 1024 + 1))).toContain('5 MB');
  });
});

describe('prefillFromScan', () => {
  it('precarga los valores con su confianza', () => {
    const { initial, confidence } = prefillFromScan(cardScanResult());
    expect(initial.plate).toBe('ABC-123');
    expect(confidence.chassis).toBe(0.6);
    expect(confidence.serviceType).toBe(0);
  });
});

describe('AddVehiclePage', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AddVehiclePage], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => { http.verify(); });

  const render = async (config = publicConfig()) => {
    const fixture = TestBed.createComponent(AddVehiclePage);
    fixture.detectChanges();
    http.expectOne(`${API}/config/public`).flush(config);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const choose = (element: HTMLElement, file: File) => {
    const input = element.querySelector<HTMLInputElement>('#card-file')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  };

  it('ofrece la cámara en móvil con capture y valida la foto antes de subirla', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('.choice-card')!.click();
    await fixture.whenStable();

    expect(element.querySelector('#card-camera')?.getAttribute('capture')).toBe('environment');
    expect(element.querySelector('.provider-notice')?.textContent).toContain('Gemini');

    choose(element, imageFile('image/gif', 1024));
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('JPEG, PNG o WEBP');
    http.expectNone(`${API}/garage/scan-card`);
  });

  it('precarga el formulario, resalta los campos dudosos y guarda con source "scan"', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('.choice-card')!.click();
    await fixture.whenStable();

    choose(element, imageFile('image/jpeg', 2048));
    http.expectOne(`${API}/garage/scan-card`).flush(cardScanResult());
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.value).toBe('ABC-123');
    expect(element.querySelector('#vehicle-chassis')!.closest('.form-field')!.classList).toContain('low-confidence');
    expect(element.querySelector('#vehicle-brand')!.closest('.form-field')!.classList).not.toContain('low-confidence');
    expect(element.querySelector('#vehicle-service')!.closest('.form-field')!.textContent).toContain('No se pudo leer');
    expect(element.textContent).toContain('La esquina inferior está borrosa.');

    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const request = http.expectOne(`${API}/garage`);
    expect(request.request.body).toMatchObject({ plate: 'ABC-123', brand: 'RENAULT', chassis: '9FBBSRADDKM123456', source: 'scan' });
    request.flush(garageVehicle({ source: 'scan' }), { status: 201, statusText: 'Created' });
    expect(navigate).toHaveBeenCalledWith(['/garaje', 'ABC-123'], { state: { created: true } });
  });

  it('si el escáner no está disponible (503) lo explica y deja seguir a mano', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('.choice-card')!.click();
    await fixture.whenStable();

    choose(element, imageFile('image/png', 2048));
    http
      .expectOne(`${API}/garage/scan-card`)
      .flush(
        { message: 'El servicio gratuito de lectura está ocupado. Intenta en un minuto o ingresa los datos a mano.', code: 'SCAN_PROVIDER_BUSY' },
        { status: 503, statusText: 'Service Unavailable' }
      );
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('ingresa los datos a mano');
    expect(element.textContent).toContain('Prefiero llenarlo a mano');
  });

  it('desactiva la opción de foto si el backend la tiene apagada', async () => {
    const { element } = await render(publicConfig({ cardScan: { enabled: false, provider: 'none', notice: null } }));
    const photo = element.querySelector<HTMLButtonElement>('.choice-card')!;
    expect(photo.disabled).toBe(true);
    expect(photo.textContent).toContain('no está disponible');
  });

  it('el alta manual muestra el error de placa repetida', async () => {
    const { fixture, element } = await render();
    element.querySelectorAll<HTMLButtonElement>('.choice-card')[1].click();
    await fixture.whenStable();

    const type = (selector: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('#vehicle-plate', 'abc123');
    type('#vehicle-brand', 'Mazda');
    type('#vehicle-model', '3');
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne(`${API}/garage`);
    expect(request.request.body).toMatchObject({ plate: 'ABC123', brand: 'Mazda', model: '3', year: null, mileageKm: null, source: 'manual' });
    for (const removed of ['soatExpiresOn', 'rtmExpiresOn', 'runtStatus']) expect(request.request.body).not.toHaveProperty(removed);
    request.flush({ message: 'Ya tienes un vehículo con la placa ABC-123.', code: 'DUPLICATE_PLATE' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('Ya tienes un vehículo');
  });
});
