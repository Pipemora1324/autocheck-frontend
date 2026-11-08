import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  chatExchange,
  chatHistory,
  diagnosed,
  history,
  historyItem,
} from '../../../testing/diagnosis-fixtures';
import { garageVehicle, publicConfig } from '../../../testing/garage-fixtures';
import { DiagnosePanelComponent } from '../../components/diagnose-panel/diagnose-panel.component';
import { DiagnosisChatComponent } from '../../components/diagnosis-chat/diagnosis-chat.component';
import { DiagnosisHistoryComponent } from '../../components/diagnosis-history/diagnosis-history.component';
import { GaragePage } from '../../pages/garage/garage.page';
import { VehicleDetailPage } from '../../pages/garage/vehicle-detail.page';
import { RealtimeService, type RealtimeEvents } from './realtime.service';

const API = environment.apiUrl;
const GARAGE = `${API}/garage`;
const DIAGNOSES = `${GARAGE}/ABC-123/diagnoses`;
const ID = '11111111-1111-4111-8111-111111111111';

/** Lo que importa aquí es qué hace cada pantalla cuando llega un evento, no cómo llega. */
class FakeRealtime {
  readonly state = signal('connected');
  private readonly subjects = new Map<string, Subject<unknown>>();

  on(name: string) {
    let subject = this.subjects.get(name);
    if (!subject) {
      subject = new Subject();
      this.subjects.set(name, subject);
    }
    return subject.asObservable();
  }

  fire<E extends keyof RealtimeEvents>(name: E, payload: RealtimeEvents[E]) {
    this.subjects.get(name)?.next(payload);
  }
}

describe('Sincronización en vivo', () => {
  let realtime: FakeRealtime;
  let http: HttpTestingController;

  beforeEach(() => {
    realtime = new FakeRealtime();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RealtimeService, useValue: realtime },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http
      .match((request) => request.url.endsWith('/diagnoses') && request.method === 'GET')
      .forEach((request) => {
        request.flush({ items: [], page: 1, limit: 1, total: 0, totalPages: 0 });
      });
    http
      .match((request) => request.url.endsWith('/messages'))
      .forEach((request) => {
        request.flush(chatHistory());
      });
    http.verify();
  });

  describe('garaje', () => {
    it('se actualiza sin volver a mostrar el estado de carga', async () => {
      const fixture = TestBed.createComponent(GaragePage);
      fixture.detectChanges();
      http.expectOne(GARAGE).flush({ vehicles: [] });
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;

      realtime.fire('garage:changed', { action: 'created', plate: 'ABC-123' });
      await fixture.whenStable();
      expect(element.textContent).not.toContain('Cargando');

      http.expectOne(GARAGE).flush({ vehicles: [garageVehicle()] });
      await fixture.whenStable();
      expect(element.querySelector('.vehicle-card')).toBeTruthy();
    });
  });

  describe('detalle del vehículo', () => {
    const render = async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const fixture = TestBed.createComponent(VehicleDetailPage);
      fixture.componentRef.setInput('placa', 'ABC-123');
      fixture.detectChanges();
      await fixture.whenStable();
      http.expectOne(`${GARAGE}/ABC-123`).flush(garageVehicle());
      await fixture.whenStable();
      http.expectOne(`${API}/config/public`).flush(publicConfig());
      http.expectOne((request) => request.url === DIAGNOSES).flush(history());
      await fixture.whenStable();
      return { fixture, navigate };
    };

    it('si otro cliente lo borra, vuelve al garaje', async () => {
      const { navigate } = await render();
      realtime.fire('garage:changed', { action: 'deleted', plate: 'ABC-123' });
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('si otro cliente lo edita, se actualiza; un evento de otra placa no hace nada', async () => {
      const { fixture } = await render();
      realtime.fire('garage:changed', { action: 'updated', plate: 'OTR-999' });
      http.expectNone(`${GARAGE}/ABC-123`);

      realtime.fire('garage:changed', { action: 'updated', plate: 'ABC-123' });
      http.expectOne(`${GARAGE}/ABC-123`).flush(garageVehicle({ color: 'Azul' }));
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Azul');
    });

    it('no pisa lo que el usuario está editando', async () => {
      const { fixture } = await render();
      fixture.componentInstance.startEditing();
      realtime.fire('garage:changed', { action: 'updated', plate: 'ABC-123' });
      http.expectNone(`${GARAGE}/ABC-123`);
      expect(fixture.componentInstance.editing()).toBe(true);
    });
  });

  describe('historial', () => {
    const render = async (items = [historyItem()]) => {
      const fixture = TestBed.createComponent(DiagnosisHistoryComponent);
      fixture.componentRef.setInput('plate', 'ABC-123');
      fixture.detectChanges();
      await fixture.whenStable();
      http.expectOne((request) => request.url === DIAGNOSES).flush(history(items));
      await fixture.whenStable();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    };

    it('recarga con un diagnóstico de esta placa, y no con el de otra', async () => {
      const { fixture, element } = await render([]);
      realtime.fire('diagnosis:changed', { action: 'created', plate: 'OTR-999', id: ID });
      http.expectNone((request) => request.url === DIAGNOSES);

      realtime.fire('diagnosis:changed', { action: 'created', plate: 'ABC-123', id: ID });
      http.expectOne((request) => request.url === DIAGNOSES).flush(history([historyItem()]));
      await fixture.whenStable();
      expect(element.querySelectorAll('.history-item')).toHaveLength(1);
    });

    it('si otro cliente borra lo que está abierto, cierra el detalle', async () => {
      const item = historyItem();
      const { fixture, element } = await render([item]);
      element.querySelector<HTMLButtonElement>('.history-item')!.click();
      await fixture.whenStable();
      expect(element.querySelector('[role="dialog"]')).toBeTruthy();

      realtime.fire('diagnosis:changed', { action: 'deleted', plate: 'ABC-123', id: item.id });
      http.expectOne((request) => request.url === DIAGNOSES).flush(history());
      await fixture.whenStable();
      expect(element.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe('chat', () => {
    const MESSAGES = `${DIAGNOSES}/${ID}/messages`;
    const render = async () => {
      const fixture = TestBed.createComponent(DiagnosisChatComponent);
      fixture.componentRef.setInput('plate', 'ABC-123');
      fixture.componentRef.setInput('diagnosisId', ID);
      fixture.detectChanges();
      await fixture.whenStable();
      http.expectOne(MESSAGES).flush(chatHistory());
      await fixture.whenStable();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    };

    it('muestra lo que se envió desde otra pestaña', async () => {
      const { fixture, element } = await render();
      realtime.fire('chat:message', {
        diagnosisId: ID,
        ...chatExchange('Hola', 'Respuesta validada.', 18),
      });
      await fixture.whenStable();
      expect(element.querySelector('.chat-bubble.assistant')?.textContent).toContain(
        'Respuesta validada.',
      );
      expect(fixture.componentInstance.remaining()).toBe(18);
    });

    it('ignora los mensajes de otro diagnóstico', async () => {
      const { fixture, element } = await render();
      realtime.fire('chat:message', { diagnosisId: 'otro', ...chatExchange('Hola', 'Ajena.') });
      await fixture.whenStable();
      expect(element.querySelector('.chat-bubble')).toBeNull();
    });

    it('la misma respuesta por HTTP y por el socket se muestra una vez, en cualquier orden', async () => {
      const { fixture, element } = await render();
      const exchange = chatExchange('Pregunta', 'Respuesta.');
      fixture.componentInstance.send('Pregunta');
      realtime.fire('chat:message', { diagnosisId: ID, ...exchange });
      http.expectOne(MESSAGES).flush(exchange, { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      expect(element.querySelectorAll('.chat-bubble')).toHaveLength(2);
    });
  });

  describe('progreso del diagnóstico', () => {
    const render = async () => {
      const fixture = TestBed.createComponent(DiagnosePanelComponent);
      fixture.componentRef.setInput('plate', 'ABC-123');
      fixture.detectChanges();
      http.expectOne(`${API}/config/public`).flush(
        publicConfig({
          diagnosis: {
            enabled: true,
            provider: 'gemini',
            manualSelection: true,
            notice: 'Aviso.',
          },
        }),
      );
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const area = element.querySelector<HTMLTextAreaElement>('#dash-description')!;
      area.value = 'una luz';
      area.dispatchEvent(new Event('input'));
      element.querySelector<HTMLInputElement>('.ack-field input')!.click();
      await fixture.whenStable();
      [...element.querySelectorAll('button')]
        .find((item) => item.textContent?.includes('Diagnosticar'))!
        .click();
      await fixture.whenStable();
      return { fixture, element, request: http.expectOne(DIAGNOSES) };
    };

    it('muestra cada etapa de su solicitud, y el resultado llega por HTTP', async () => {
      const { fixture, element, request } = await render();
      const requestId = request.request.headers.get('x-diagnosis-request')!;
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/);

      for (const [stage, label] of [
        ['queued', 'En cola'],
        ['analyzing', 'Analizando la imagen'],
        ['drafting', 'Redactando la explicación'],
      ] as const) {
        realtime.fire('diagnosis:progress', { requestId, stage });
        await fixture.whenStable();
        expect(element.textContent).toContain(label);
      }
      request.flush(diagnosed(), { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      expect(element.querySelector('app-diagnosis-result')).toBeTruthy();
    });

    it('ignora el progreso de otra solicitud', async () => {
      const { fixture, element, request } = await render();
      realtime.fire('diagnosis:progress', { requestId: 'otra', stage: 'analyzing' });
      await fixture.whenStable();
      expect(element.textContent).not.toContain('Analizando la imagen');
      request.flush(diagnosed(), { status: 201, statusText: 'Created' });
    });

    it('sin ningún evento del socket, el resultado llega igual', async () => {
      const { fixture, element, request } = await render();
      request.flush(diagnosed(), { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      expect(element.querySelector('app-diagnosis-result')).toBeTruthy();
    });
  });
});
