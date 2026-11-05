import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { telltales } from '../../../testing/diagnosis-fixtures';
import type { TelltaleSummary } from '../../models/diagnosis';
import { groupTelltales, TelltalePickerComponent } from './telltale-picker.component';

const URL = `${environment.apiUrl}/telltales`;

describe('groupTelltales', () => {
  it('el airbag queda en su propio grupo rojo, fuera de los que ordenan detenerse', () => {
    const airbag = { id: 'airbag', nombre: 'Airbag', alias: ['bolsa de aire'], severidad: 'rojo' as const, debeDetenerse: false };
    const groups = groupTelltales([...telltales(), airbag], '');
    expect(groups.map((group) => [group.severity, group.stop, group.items[0]!.id])).toEqual([
      ['rojo', true, 'presion_aceite'],
      ['rojo', false, 'airbag'],
      ['amarillo', false, 'check_engine'],
      ['informativo', false, 'cinturon']
    ]);
  });

  const ids = (query: string) => groupTelltales(telltales(), query).flatMap((group) => group.items.map((item) => item.id));

  it('agrupa de más a menos urgente', () => {
    expect(groupTelltales(telltales(), '').map((group) => group.severity)).toEqual(['rojo', 'amarillo', 'informativo']);
  });

  it('busca por nombre y por alias, sin importar tildes ni mayúsculas', () => {
    expect(ids('ACEITE')).toEqual(['presion_aceite']);
    expect(ids('presion')).toEqual(['presion_aceite', 'tpms']);
    expect(ids('herradura')).toEqual(['tpms']);
    expect(ids('cinturon')).toEqual(['cinturon']);
    expect(ids('  motor ')).toEqual(['check_engine']);
  });

  it('omite los grupos sin resultados', () => {
    expect(groupTelltales(telltales(), 'herradura').map((group) => group.severity)).toEqual(['amarillo']);
    expect(groupTelltales(telltales(), 'nada que ver')).toEqual([]);
  });
});

describe('TelltalePickerComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TelltalePickerComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const render = () => {
    const fixture = TestBed.createComponent(TelltalePickerComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('muestra la carga y luego la lista agrupada con el semáforo en texto', async () => {
    const { fixture, element } = render();
    expect(element.textContent).toContain('Cargando los testigos');
    http.expectOne(URL).flush({ telltales: telltales() });
    await fixture.whenStable();

    const groups = element.querySelectorAll('.telltale-group');
    expect(groups).toHaveLength(3);
    expect(groups[0]!.textContent).toContain('Detente');
    expect(groups[0]!.textContent).toContain('Presión de aceite');
    expect(groups[1]!.textContent).toContain('Revísalo pronto');
    expect(groups[2]!.textContent).toContain('No es una falla');
  });

  it('filtra al escribir, avisa si no hay resultados y emite el testigo elegido', async () => {
    const { fixture, element } = render();
    const picked: TelltaleSummary[] = [];
    fixture.componentInstance.pick.subscribe((value) => picked.push(value));
    http.expectOne(URL).flush({ telltales: telltales() });
    await fixture.whenStable();

    const search = element.querySelector<HTMLInputElement>('#telltale-search')!;
    search.value = 'no existe';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.textContent).toContain('No encontramos testigos');

    search.value = 'llanta';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const options = element.querySelectorAll<HTMLButtonElement>('.telltale-option');
    expect(options).toHaveLength(1);
    options[0]!.click();
    expect(picked.map((item) => item.id)).toEqual(['tpms']);
  });

  it('si falla permite reintentar', async () => {
    const { fixture, element } = render();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(element.querySelector('.state-box.error')).toBeTruthy();

    element.querySelector<HTMLButtonElement>('.state-box.error button')!.click();
    http.expectOne(URL).flush({ telltales: telltales() });
    await fixture.whenStable();
    expect(element.querySelector('#telltale-search')).toBeTruthy();
  });
});
