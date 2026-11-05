import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { history, historyItem } from '../../../testing/diagnosis-fixtures';
import { DiagnosisHistoryComponent } from './diagnosis-history.component';

const DIAGNOSES = `${environment.apiUrl}/garage/ABC-123/diagnoses`;
const ITEM_ID = '22222222-2222-4222-8222-222222222222';

describe('DiagnosisHistoryComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DiagnosisHistoryComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const listRequest = () => http.expectOne((request) => request.url === DIAGNOSES && request.method === 'GET');

  const render = async (respond: (request: TestRequest) => void) => {
    const fixture = TestBed.createComponent(DiagnosisHistoryComponent);
    fixture.componentRef.setInput('plate', 'ABC-123');
    fixture.detectChanges();
    await fixture.whenStable();
    respond(listRequest());
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const button = (root: Element, text: string) => [...root.querySelectorAll('button')].find((item) => item.textContent?.includes(text));

  it('sin diagnósticos lo dice', async () => {
    const { element } = await render((request) => request.flush(history()));
    expect(element.textContent).toContain('Aún no hay diagnósticos');
  });

  it('lista con fecha, testigo y semáforo', async () => {
    const { element } = await render((request) => {
      expect(request.request.params.get('page')).toBe('1');
      request.flush(history([
        historyItem(),
        historyItem({ id: 'otro', telltaleId: 'presion_aceite', nombre: 'Presión de aceite', severidad: 'rojo', debeDetenerse: true }),
        historyItem({ id: 'bolsa', telltaleId: 'airbag', nombre: 'Airbag', severidad: 'rojo', debeDetenerse: false })
      ]));
    });
    const items = element.querySelectorAll('.history-item');
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain('Presión de llantas (TPMS)');
    expect(items[0]!.textContent).toContain('04/11/2026');
    expect(items[0]!.textContent).toContain('Revísalo pronto');
    expect(items[1]!.textContent).toContain('Detente');
    expect(items[2]!.textContent).toContain('Revísalo hoy');
    expect(items[2]!.textContent).not.toContain('Detente');
  });

  it('el detalle muestra lo guardado y aclara que la explicación se vuelve a consultar', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem()])));
    const emitted: string[] = [];
    fixture.componentInstance.consult.subscribe((value) => emitted.push(value));

    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('una llanta baja');
    expect(dialog.textContent).toContain('Elegido por ti de la lista');
    expect(dialog.textContent).toContain('se agrega una entrada nueva');
    expect(dialog.textContent).toContain('Orientación general. Un mecánico debe confirmar el diagnóstico.');
    expect(dialog.querySelector('.stop-banner')).toBeNull();

    button(dialog, 'Ver la explicación completa')!.click();
    await fixture.whenStable();
    expect(emitted).toEqual(['tpms']);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('el detalle de un rojo repite la orden de detenerse y muestra la confianza de la IA', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem({ severidad: 'rojo', debeDetenerse: true, origen: 'ia', confianza: 0.8 })])));
    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('.stop-banner')?.textContent).toContain('llama a un taller o a una grúa');
    expect(dialog.textContent).toContain('confianza 80 %');
  });

  it('el detalle de un rojo sin orden de detenerse no muestra el banner', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem({ telltaleId: 'airbag', nombre: 'Airbag', severidad: 'rojo', debeDetenerse: false })])));
    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('.stop-banner')).toBeNull();
    expect(dialog.textContent).toContain('Revísalo hoy');
  });

  it('borra tras confirmar y recarga', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem()])));
    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    button(element.querySelector('[role="dialog"]')!, 'Eliminar')!.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')!.textContent).toContain('no se puede deshacer');
    http.expectNone(`${DIAGNOSES}/${ITEM_ID}`);

    button(element.querySelector('[role="dialog"]')!, 'Sí, eliminar')!.click();
    const removal = http.expectOne(`${DIAGNOSES}/${ITEM_ID}`);
    expect(removal.request.method).toBe('DELETE');
    removal.flush(null, { status: 204, statusText: 'No Content' });
    listRequest().flush(history());
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(element.textContent).toContain('Aún no hay diagnósticos');
  });

  it('si el borrado falla lo dice y no cierra el detalle', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem()])));
    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    button(element.querySelector('[role="dialog"]')!, 'Eliminar')!.click();
    await fixture.whenStable();
    button(element.querySelector('[role="dialog"]')!, 'Sí, eliminar')!.click();
    http.expectOne(`${DIAGNOSES}/${ITEM_ID}`).flush({ message: 'No encontramos ese diagnóstico.' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"] .form-error')?.textContent).toContain('No encontramos ese diagnóstico');
  });

  it('pagina, y si la página queda vacía tras borrar vuelve a la anterior', async () => {
    const { fixture, element } = await render((request) => request.flush(history([historyItem()], { page: 1, totalPages: 2, total: 11 })));
    expect(element.textContent).toContain('Página 1 de 2');
    button(element, 'Siguiente')!.click();
    const second = listRequest();
    expect(second.request.params.get('page')).toBe('2');
    second.flush(history([historyItem()], { page: 2, totalPages: 2, total: 11 }));
    await fixture.whenStable();
    expect(element.textContent).toContain('Página 2 de 2');

    element.querySelector<HTMLButtonElement>('.history-item')!.click();
    await fixture.whenStable();
    button(element.querySelector('[role="dialog"]')!, 'Eliminar')!.click();
    await fixture.whenStable();
    button(element.querySelector('[role="dialog"]')!, 'Sí, eliminar')!.click();
    http.expectOne(`${DIAGNOSES}/${ITEM_ID}`).flush(null, { status: 204, statusText: 'No Content' });
    const empty = listRequest();
    expect(empty.request.params.get('page')).toBe('2');
    empty.flush(history([], { page: 2, totalPages: 1, total: 10 }));
    const previous = listRequest();
    expect(previous.request.params.get('page')).toBe('1');
    previous.flush(history([historyItem()], { page: 1, totalPages: 1, total: 10 }));
    await fixture.whenStable();
    expect(element.querySelectorAll('.history-item')).toHaveLength(1);
  });

  it('recarga cuando se crea un diagnóstico', async () => {
    const { fixture } = await render((request) => request.flush(history()));
    fixture.componentRef.setInput('refreshKey', 1);
    fixture.detectChanges();
    await fixture.whenStable();
    listRequest().flush(history([historyItem()]));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.history-item')).toHaveLength(1);
  });

  it('muestra los estados de correo sin confirmar y de error', async () => {
    const { element } = await render((request) => request.flush({ code: 'EMAIL_NOT_VERIFIED', message: 'x' }, { status: 403, statusText: 'Forbidden' }));
    expect(element.textContent).toContain('Confirma tu correo para ver tu historial');
  });

  it('ante un error permite reintentar', async () => {
    const { fixture, element } = await render((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));
    button(element, 'Reintentar')!.click();
    listRequest().flush(history());
    await fixture.whenStable();
    expect(element.textContent).toContain('Aún no hay diagnósticos');
  });
});
