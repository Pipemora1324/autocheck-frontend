import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { chatExchange, chatHistory, chatMessage } from '../../../testing/diagnosis-fixtures';
import { chatErrorMessage, DiagnosisChatComponent } from './diagnosis-chat.component';

const ID = '11111111-1111-4111-8111-111111111111';
const MESSAGES = `${environment.apiUrl}/garage/ABC-123/diagnoses/${ID}/messages`;

describe('chatErrorMessage', () => {
  const error = (status: number, body: object) => new HttpErrorResponse({ status, error: body });

  it('explica cada error en español', () => {
    expect(chatErrorMessage(error(503, { code: 'CHAT_PROVIDER_BUSY', message: 'x' }))).toContain(
      'ocupado',
    );
    expect(chatErrorMessage(error(503, { code: 'CHAT_UNAVAILABLE', message: 'x' }))).toContain(
      'problema del servicio',
    );
    expect(
      chatErrorMessage(error(429, { code: 'RATE_LIMITED', message: 'Máximo de 40 por hora.' })),
    ).toBe('Máximo de 40 por hora.');
    expect(
      chatErrorMessage(
        error(429, { code: 'CHAT_LIMIT_REACHED', message: 'Máximo de 20 mensajes.' }),
      ),
    ).toBe('Máximo de 20 mensajes.');
  });
});

describe('DiagnosisChatComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DiagnosisChatComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
  });

  const render = async (history = chatHistory()) => {
    const fixture = TestBed.createComponent(DiagnosisChatComponent);
    fixture.componentRef.setInput('plate', 'ABC-123');
    fixture.componentRef.setInput('diagnosisId', ID);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(MESSAGES).flush(history);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };
  const button = (element: HTMLElement, text: string) =>
    [...element.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!;
  const type = (element: HTMLElement, text: string) => {
    const area = element.querySelector<HTMLTextAreaElement>('#chat-message')!;
    area.value = text;
    area.dispatchEvent(new Event('input'));
  };

  it('al reabrir un diagnóstico muestra la conversación guardada, sin HTML del mensaje', async () => {
    const { element } = await render(
      chatHistory(
        [chatMessage('user', '<img src=x>'), chatMessage('assistant', 'Respuesta guardada.')],
        19,
      ),
    );
    const bubbles = element.querySelectorAll('.chat-bubble');
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].classList).toContain('user');
    expect(bubbles[0].textContent).toContain('<img src=x>');
    expect(element.querySelector('.chat-bubble img')).toBeNull();
    expect(bubbles[1].classList).toContain('assistant');
  });

  it('envía el mensaje, muestra "escribiendo" y agrega la respuesta', async () => {
    const { fixture, element } = await render();
    expect(button(element, 'Enviar').disabled).toBe(true);
    type(element, '  ¿qué hago?  ');
    await fixture.whenStable();
    button(element, 'Enviar').click();
    await fixture.whenStable();

    expect(element.querySelector('.typing')?.textContent).toContain('escribiendo');
    expect(element.querySelector('.pending')?.textContent).toContain('¿qué hago?');
    expect(button(element, 'Enviar').disabled).toBe(true);
    const request = http.expectOne(MESSAGES);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: '¿qué hago?' });
    request.flush(chatExchange('¿qué hago?', 'Revisa la tapa.'), {
      status: 201,
      statusText: 'Created',
    });
    await fixture.whenStable();

    expect(element.querySelector('.typing')).toBeNull();
    expect(element.querySelectorAll('.chat-bubble')).toHaveLength(2);
    expect(element.querySelector('.chat-bubble.assistant')?.textContent).toContain(
      'Revisa la tapa.',
    );
    expect(element.querySelector<HTMLTextAreaElement>('#chat-message')!.value).toBe('');
  });

  it('las sugerencias rápidas envían la pregunta', async () => {
    const { fixture, element } = await render();
    for (const text of [
      '¿Por qué está en rojo?',
      '¿Puedo seguir manejando?',
      '¿Qué le digo al mecánico?',
    ])
      expect(button(element, text)).toBeTruthy();
    button(element, '¿Puedo seguir manejando?').click();
    await fixture.whenStable();
    const request = http.expectOne(MESSAGES);
    expect(request.request.body).toEqual({ message: '¿Puedo seguir manejando?' });
    request.flush(chatExchange('¿Puedo seguir manejando?', 'No.'), {
      status: 201,
      statusText: 'Created',
    });
  });

  it('limita el mensaje a 500 caracteres', async () => {
    const { element } = await render();
    expect(element.querySelector('#chat-message')?.getAttribute('maxlength')).toBe('500');
  });

  it('si falla, explica el error y conserva lo escrito', async () => {
    const { fixture, element } = await render();
    type(element, 'mi pregunta');
    await fixture.whenStable();
    button(element, 'Enviar').click();
    http
      .expectOne(MESSAGES)
      .flush(
        { code: 'CHAT_PROVIDER_BUSY', message: 'x' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('ocupado');
    expect(element.querySelector<HTMLTextAreaElement>('#chat-message')!.value).toBe('mi pregunta');
    expect(element.querySelector('.chat-bubble')).toBeNull();
  });

  it('al llegar al máximo deja leer pero no escribir', async () => {
    const { element } = await render(
      chatHistory([chatMessage('assistant', 'Última respuesta.')], 0),
    );
    expect(element.querySelector('#chat-message')).toBeNull();
    expect(element.textContent).toContain('máximo de mensajes');
    expect(element.textContent).toContain('Última respuesta.');
  });

  it('si el servidor dice que se agotó, deja de ofrecer el formulario', async () => {
    const { fixture, element } = await render();
    type(element, 'hola');
    await fixture.whenStable();
    button(element, 'Enviar').click();
    http
      .expectOne(MESSAGES)
      .flush(
        {
          code: 'CHAT_LIMIT_REACHED',
          message: 'Alcanzaste el máximo de 20 mensajes de este diagnóstico.',
        },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();
    expect(element.querySelector('#chat-message')).toBeNull();
    expect(element.querySelector('.form-error')?.textContent).toContain('20 mensajes');
  });

  it('si no carga la conversación permite reintentar', async () => {
    const fixture = TestBed.createComponent(DiagnosisChatComponent);
    fixture.componentRef.setInput('plate', 'ABC-123');
    fixture.componentRef.setInput('diagnosisId', ID);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(MESSAGES).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    button(element, 'Reintentar').click();
    http.expectOne(MESSAGES).flush(chatHistory());
    await fixture.whenStable();
    expect(element.querySelector('#chat-message')).toBeTruthy();
  });
});
