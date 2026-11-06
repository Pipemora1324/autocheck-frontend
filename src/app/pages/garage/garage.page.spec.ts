import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { garageVehicle } from '../../../testing/garage-fixtures';
import { GaragePage } from './garage.page';

const GARAGE = `${environment.apiUrl}/garage`;

describe('GaragePage', () => {
  let http: HttpTestingController;

  const render = async (respond: (request: ReturnType<HttpTestingController['expectOne']>) => void) => {
    TestBed.configureTestingModule({ imports: [GaragePage], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GaragePage);
    fixture.detectChanges();
    respond(http.expectOne(GARAGE));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => { http.verify(); });

  it('sin vehículos muestra el estado vacío con "Agregar vehículo"', async () => {
    const element = await render((request) => { request.flush({ vehicles: [] }); });
    expect(element.textContent).toContain('Aún no tienes vehículos');
    expect(element.querySelector('a[href="/garaje/nuevo"]')?.textContent).toContain('Agregar vehículo');
  });

  it('lista los vehículos y enlaza a cada uno', async () => {
    const vehicles = [garageVehicle(), garageVehicle({ plate: 'XYZ-98D', kind: 'moto', brand: 'Yamaha', model: 'NMAX', mileageKm: null })];
    const element = await render((request) => { request.flush({ vehicles }); });
    const cards = element.querySelectorAll('.vehicle-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Renault Sandero');
    expect(cards[0].textContent).toContain('85.000 km');
    expect(cards[0].textContent).toContain('Diagnosticar un testigo');
    expect(cards[1].textContent).toContain('Moto');
    expect(cards[1].getAttribute('href')).toBe('/garaje/XYZ-98D');
  });

  it('con el correo sin confirmar pide confirmarlo en vez de mostrar un error', async () => {
    const element = await render((request) => { request.flush({ message: 'Confirma tu correo.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403, statusText: 'Forbidden' }); }
    );
    expect(element.textContent).toContain('Confirma tu correo para ver tu garaje');
    expect(element.querySelector('.state-box.error')).toBeNull();
  });

  it('ante un error permite reintentar', async () => {
    const element = await render((request) => { request.flush(null, { status: 500, statusText: 'Server Error' }); });
    expect(element.querySelector('.state-box.error')).toBeTruthy();
    element.querySelector<HTMLButtonElement>('.state-box.error button')!.click();
    http.expectOne(GARAGE).flush({ vehicles: [] });
  });
});
