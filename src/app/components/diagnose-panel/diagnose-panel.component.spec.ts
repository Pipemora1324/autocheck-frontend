import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { diagnosed, diagnosedRed, needsBetterInput, telltales } from '../../../testing/diagnosis-fixtures';
import { publicConfig } from '../../../testing/garage-fixtures';
import { DiagnosePanelComponent, diagnosisErrorView } from './diagnose-panel.component';

const API = environment.apiUrl;
const DIAGNOSES = `${API}/garage/ABC-123/diagnoses`;
const NOTICE = 'La foto del tablero se envía a un proveedor externo de inteligencia artificial.';

const imageFile = (type: string, bytes: number) => {
  const file = new File(['x'], 'tablero.jpg', { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

const httpError = (status: number, body: object | null) => new HttpErrorResponse({ status, error: body });

describe('diagnosisErrorView', () => {
  it('el proveedor ocupado sugiere elegir a mano', () => {
    for (const error of [httpError(503, { code: 'DIAGNOSIS_PROVIDER_BUSY', message: 'x' }), httpError(429, {})]) {
      const view = diagnosisErrorView(error);
      expect(view.message).toContain('cupo gratuito');
      expect(view.message).toContain('elige el testigo de la lista');
      expect(view.suggestList).toBe(true);
    }
  });

  it('la IA apagada o caída dice que la elección manual sigue funcionando', () => {
    for (const code of ['AI_NOT_CONFIGURED', 'DIAGNOSIS_UNAVAILABLE']) {
      const view = diagnosisErrorView(httpError(503, { code, message: 'x' }));
      expect(view.message).toContain('elección manual sigue funcionando');
      expect(view.suggestList).toBe(true);
    }
  });

  it('nuestro límite por hora no sugiere la lista, porque también aplica a la elección manual', () => {
    const view = diagnosisErrorView(httpError(429, { code: 'RATE_LIMITED', message: 'Alcanzaste el máximo de 15 diagnósticos por hora.' }));
    expect(view.message).toContain('15 diagnósticos por hora');
    expect(view.message).toContain('también aplica a la elección manual');
    expect(view.suggestList).toBe(false);
  });

  it('el correo sin confirmar lo pide', () => {
    const view = diagnosisErrorView(httpError(403, { code: 'EMAIL_NOT_VERIFIED', message: 'x' }));
    expect(view.message).toContain('Confirma tu correo');
    expect(view.suggestList).toBe(false);
  });

  it('el servidor dormido avisa que está conectando', () => {
    expect(diagnosisErrorView(httpError(502, null)).message).toContain('Conectando con el servidor');
  });
});

describe('DiagnosePanelComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(globalThis.URL, { createObjectURL: vi.fn(() => 'blob:vista-previa'), revokeObjectURL: vi.fn() }));
    TestBed.configureTestingModule({ imports: [DiagnosePanelComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  const render = async (config = publicConfig({ diagnosis: { enabled: true, provider: 'gemini', manualSelection: true, notice: NOTICE } })) => {
    const fixture = TestBed.createComponent(DiagnosePanelComponent);
    fixture.componentRef.setInput('plate', 'ABC-123');
    fixture.detectChanges();
    http.expectOne(`${API}/config/public`).flush(config);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const choose = (element: HTMLElement, file: File, selector = '#dash-file') => {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  };
  const button = (element: HTMLElement, text: string) => [...element.querySelectorAll('button')].find((item) => item.textContent?.includes(text));
  const acknowledge = (element: HTMLElement) => element.querySelector<HTMLInputElement>('.check-field input')!.click();
  const describeTelltale = (element: HTMLElement, text: string) => {
    const area = element.querySelector<HTMLTextAreaElement>('#dash-description')!;
    area.value = text;
    area.dispatchEvent(new Event('input'));
  };

  it('muestra el aviso de privacidad y pide que sea el tablero propio antes de poder enviar', async () => {
    const { fixture, element } = await render();
    const notices = [...element.querySelectorAll('.provider-notice')].map((item) => item.textContent);
    expect(notices.join(' ')).toContain(NOTICE);
    expect(notices.join(' ')).toContain('tu propio vehículo');
    // El aviso aparece antes de los controles para elegir la foto.
    const notice = element.querySelector('.provider-notice')!;
    expect(notice.compareDocumentPosition(element.querySelector('#dash-camera')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const send = button(element, 'Diagnosticar')!;
    expect(send.disabled).toBe(true);

    choose(element, imageFile('image/jpeg', 1024));
    await fixture.whenStable();
    expect(send.disabled).toBe(true);

    acknowledge(element);
    await fixture.whenStable();
    expect(send.disabled).toBe(false);
  });

  it('ofrece la cámara en móvil, valida tipo y tamaño, y muestra la vista previa', async () => {
    const { fixture, element } = await render();
    expect(element.querySelector('#dash-camera')?.getAttribute('capture')).toBe('environment');
    expect(element.querySelector('#dash-camera')?.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');

    choose(element, imageFile('image/gif', 1024));
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('JPEG, PNG o WEBP');
    expect(element.querySelector('.photo-preview')).toBeNull();

    choose(element, imageFile('image/png', 5 * 1024 * 1024 + 1));
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('5 MB');

    choose(element, imageFile('image/webp', 1024), '#dash-camera');
    await fixture.whenStable();
    expect(element.querySelector('.form-error')).toBeNull();
    expect(element.querySelector('.photo-preview img')?.getAttribute('src')).toBe('blob:vista-previa');

    button(element, 'Quitar foto')!.click();
    await fixture.whenStable();
    expect(element.querySelector('.photo-preview')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa');
  });

  it('envía foto y descripción, y muestra el resultado', async () => {
    const { fixture, element } = await render();
    const emitted: unknown[] = [];
    fixture.componentInstance.diagnosed.subscribe((value) => emitted.push(value));

    choose(element, imageFile('image/jpeg', 1024));
    describeTelltale(element, '  luz naranja  ');
    acknowledge(element);
    await fixture.whenStable();
    button(element, 'Diagnosticar')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Analizando el testigo');

    const request = http.expectOne(DIAGNOSES);
    const form = request.request.body as FormData;
    expect(form.get('image')).toBeInstanceOf(File);
    expect(form.get('description')).toBe('luz naranja');
    expect(form.has('telltaleId')).toBe(false);
    request.flush(diagnosed(), { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(element.querySelector('h3')?.textContent).toContain('Check engine');
    expect(emitted).toHaveLength(1);
    expect(element.querySelector('.photo-preview')).toBeNull();

    button(element, 'Diagnosticar otro testigo')!.click();
    await fixture.whenStable();
    expect(element.querySelector('app-diagnosis-result')).toBeNull();
    expect(element.querySelector<HTMLTextAreaElement>('#dash-description')!.value).toBe('');
  });

  it('con solo descripción funciona sin imagen', async () => {
    const { fixture, element } = await render();
    describeTelltale(element, 'luz naranja');
    acknowledge(element);
    await fixture.whenStable();
    button(element, 'Diagnosticar')!.click();
    const request = http.expectOne(DIAGNOSES);
    expect((request.request.body as FormData).has('image')).toBe(false);
    request.flush(diagnosed(), { status: 201, statusText: 'Created' });
  });

  it('needs_better_input muestra la pista y ofrece repetir la foto o la lista, sin inventar un resultado', async () => {
    const { fixture, element } = await render();
    const emitted: unknown[] = [];
    fixture.componentInstance.diagnosed.subscribe((value) => emitted.push(value));

    choose(element, imageFile('image/jpeg', 1024));
    acknowledge(element);
    await fixture.whenStable();
    button(element, 'Diagnosticar')!.click();
    http.expectOne(DIAGNOSES).flush(needsBetterInput());
    await fixture.whenStable();

    const box = element.querySelector('.better-input')!;
    expect(box.textContent).toContain('otra foto más cercana');
    expect(box.textContent).toContain('detente en un lugar seguro');
    expect(element.querySelector('app-diagnosis-result')).toBeNull();
    expect(emitted).toHaveLength(0);

    [...box.querySelectorAll('button')].find((item) => item.textContent?.includes('Repetir la foto'))!.click();
    await fixture.whenStable();
    expect(element.querySelector('.better-input')).toBeNull();
    expect(element.querySelector('.photo-preview')).toBeNull();
    expect(element.querySelector('#dash-camera')).toBeTruthy();
  });

  it('desde needs_better_input lleva a la lista', async () => {
    const { fixture, element } = await render();
    describeTelltale(element, 'una luz');
    acknowledge(element);
    await fixture.whenStable();
    button(element, 'Diagnosticar')!.click();
    http.expectOne(DIAGNOSES).flush(needsBetterInput());
    await fixture.whenStable();

    [...element.querySelector('.better-input')!.querySelectorAll('button')].find((item) => item.textContent?.includes('Elegir de la lista'))!.click();
    await fixture.whenStable();
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    await fixture.whenStable();
    expect(element.querySelector('#telltale-search')).toBeTruthy();
  });

  it('la elección manual envía solo el testigo y un rojo muestra el banner de detenerse', async () => {
    const { fixture, element } = await render();
    button(element, 'Elegir de la lista')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('no envía nada a la IA');
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    await fixture.whenStable();

    button(element, 'Presión de aceite')!.click();
    await fixture.whenStable();
    const request = http.expectOne(DIAGNOSES);
    const form = request.request.body as FormData;
    expect(form.get('telltaleId')).toBe('presion_aceite');
    expect(form.has('image')).toBe(false);
    request.flush(diagnosedRed({ origen: 'manual', confianza: null }), { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(element.querySelector('.stop-banner')?.textContent).toContain('llama a un taller o a una grúa');
  });

  it('una foto ya elegida no se envía si el usuario elige de la lista', async () => {
    const { fixture, element } = await render();
    choose(element, imageFile('image/jpeg', 1024));
    await fixture.whenStable();
    button(element, 'Elegir de la lista')!.click();
    await fixture.whenStable();
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    await fixture.whenStable();
    button(element, 'Check engine')!.click();
    const request = http.expectOne(DIAGNOSES);
    expect((request.request.body as FormData).has('image')).toBe(false);
    request.flush(diagnosed({ origen: 'manual', confianza: null }), { status: 201, statusText: 'Created' });
  });

  it('si el cupo de la IA está ocupado lo explica y lleva a la lista, y da el aviso de seguridad', async () => {
    const { fixture, element } = await render();
    describeTelltale(element, 'una luz');
    acknowledge(element);
    await fixture.whenStable();
    button(element, 'Diagnosticar')!.click();
    http.expectOne(DIAGNOSES).flush({ message: 'x', code: 'DIAGNOSIS_PROVIDER_BUSY', retryAfterSeconds: 60 }, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    const box = element.querySelector('.diagnose-error')!;
    expect(box.textContent).toContain('cupo gratuito');
    expect(box.textContent).toContain('detente en un lugar seguro');
    [...box.querySelectorAll('button')].find((item) => item.textContent?.includes('Elegir de la lista'))!.click();
    await fixture.whenStable();
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
  });

  it('con la IA apagada abre la lista y lo explica en la pestaña de foto, sin ofrecer subir nada', async () => {
    const { fixture, element } = await render(publicConfig({ diagnosis: { enabled: false, provider: 'none', manualSelection: true, notice: null } }));
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    await fixture.whenStable();
    expect(element.querySelector('#telltale-search')).toBeTruthy();

    button(element, 'Con foto o descripción')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('no está disponible en este momento');
    expect(element.textContent).toContain('elección manual sigue funcionando');
    expect(element.querySelector('#dash-file')).toBeNull();
  });

  it('consult vuelve a consultar un testigo sin IA', async () => {
    const { fixture, element } = await render();
    fixture.componentInstance.consult('tpms');
    const request = http.expectOne(DIAGNOSES);
    expect((request.request.body as FormData).get('telltaleId')).toBe('tpms');
    request.flush(diagnosed({ origen: 'manual', confianza: null }), { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(element.querySelector('app-diagnosis-result')).toBeTruthy();
  });
});
