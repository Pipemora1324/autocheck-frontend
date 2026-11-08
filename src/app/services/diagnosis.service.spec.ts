import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { diagnosed, history, telltales } from '../../testing/diagnosis-fixtures';
import { DiagnosisService } from './diagnosis.service';

const API = environment.apiUrl;
const DIAGNOSES = `${API}/garage/ABC-123/diagnoses`;

describe('DiagnosisService', () => {
  let service: DiagnosisService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DiagnosisService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('detail pide la entrada con GET', () => {
    TestBed.inject(DiagnosisService).detail('ABC-123', 'id-1').subscribe();
    const controller = TestBed.inject(HttpTestingController);
    const request = controller.expectOne(`${DIAGNOSES}/id-1`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('telltales pide el catálogo una sola vez', async () => {
    const first = firstValueFrom(service.telltales());
    const second = firstValueFrom(service.telltales());
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    expect((await first).map((item) => item.id)).toContain('presion_aceite');
    await second;

    await firstValueFrom(service.telltales());
    http.expectNone(`${API}/telltales`);
  });

  it('telltales permite reintentar si falla', async () => {
    const failed = firstValueFrom(service.telltales());
    http.expectOne(`${API}/telltales`).flush(null, { status: 500, statusText: 'Server Error' });
    await expect(failed).rejects.toMatchObject({ status: 500 });

    const retry = firstValueFrom(service.telltales());
    http.expectOne(`${API}/telltales`).flush({ telltales: telltales() });
    expect(await retry).toHaveLength(4);
  });

  it('diagnose envía foto y descripción como multipart, sin telltaleId', () => {
    const image = new File(['x'], 'tablero.jpg', { type: 'image/jpeg' });
    service.diagnose('ABC-123', { image, description: 'luz naranja' }).subscribe();
    const request = http.expectOne(DIAGNOSES);
    expect(request.request.method).toBe('POST');
    const form = request.request.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('image')).toBeInstanceOf(File);
    expect(form.get('description')).toBe('luz naranja');
    expect(form.has('telltaleId')).toBe(false);
    request.flush(diagnosed(), { status: 201, statusText: 'Created' });
  });

  it('diagnose con elección manual envía solo telltaleId', () => {
    service.diagnose('ABC-123', { telltaleId: 'tpms' }).subscribe();
    const request = http.expectOne(DIAGNOSES);
    const form = request.request.body as FormData;
    expect(form.get('telltaleId')).toBe('tpms');
    expect(form.has('image')).toBe(false);
    expect(form.has('description')).toBe(false);
    request.flush(diagnosed({ origen: 'manual', confianza: null }), {
      status: 201,
      statusText: 'Created',
    });
  });

  it('diagnose solo envía parpadea si se indica', () => {
    service.diagnose('ABC-123', { description: 'luz', blinking: true }).subscribe();
    const request = http.expectOne(DIAGNOSES);
    expect((request.request.body as FormData).get('parpadea')).toBe('true');
    request.flush(diagnosed(), { status: 201, statusText: 'Created' });
  });

  it('messages lee la conversación y sendMessage envía el texto', () => {
    service.messages('ABC-123', 'id-1').subscribe();
    const read = http.expectOne(`${DIAGNOSES}/id-1/messages`);
    expect(read.request.method).toBe('GET');
    read.flush({ messages: [], restantes: 20 });

    service.sendMessage('ABC-123', 'id-1', 'hola').subscribe();
    const sent = http.expectOne(`${DIAGNOSES}/id-1/messages`);
    expect(sent.request.method).toBe('POST');
    expect(sent.request.body).toEqual({ message: 'hola' });
    sent.flush({});
  });

  it('history pide la página con page y limit', async () => {
    const result = firstValueFrom(service.history('ABC-123', 2));
    const request = http.expectOne((candidate) => candidate.url === DIAGNOSES);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush(history());
    expect((await result).total).toBe(0);
  });

  it('remove borra por id y codifica la placa', () => {
    service.remove('ABC-12D', '22222222-2222-4222-8222-222222222222').subscribe();
    const request = http.expectOne(
      `${API}/garage/ABC-12D/diagnoses/22222222-2222-4222-8222-222222222222`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
