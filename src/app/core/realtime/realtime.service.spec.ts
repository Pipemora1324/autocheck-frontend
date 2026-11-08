import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  RealtimeService,
  SOCKET_FACTORY,
  type RealtimeSocket,
  type SocketOptions,
} from './realtime.service';

/** Socket simulado: la prueba dispara los eventos del servidor. */
class FakeSocket implements RealtimeSocket {
  readonly listeners = new Map<string, Array<(...args: never[]) => void>>();
  active = true;
  connects = 0;
  disconnects = 0;

  connect() {
    this.connects++;
  }
  disconnect() {
    this.disconnects++;
  }
  on(event: string, listener: (...args: never[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }
  fire(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? [])
      (listener as (...a: unknown[]) => void)(...args);
  }
}

const session = (emailVerified: boolean, accessToken = 'token-1') => ({
  user: { id: 'u1', email: 'a@b.co', role: 'user', emailVerified },
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
});
const REFRESH = `${environment.apiUrl}/auth/refresh`;
const LOGIN = `${environment.apiUrl}/auth/login`;

describe('RealtimeService', () => {
  let socket: FakeSocket;
  let created: Array<{ url: string; options: SocketOptions }>;
  let factoryResult: () => Promise<RealtimeSocket>;
  let http: HttpTestingController;
  let auth: AuthService;

  /** Las tareas que esperan a que el navegador quede libre: la prueba decide cuándo correrlas. */
  let idle: Array<() => void>;
  const runIdle = () => {
    for (const task of idle.splice(0)) task();
  };

  beforeEach(() => {
    idle = [];
    vi.stubGlobal('requestIdleCallback', (task: () => void) => idle.push(task));
    socket = new FakeSocket();
    created = [];
    factoryResult = () => Promise.resolve(socket);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SOCKET_FACTORY,
          useValue: (url: string, options: SocketOptions) => {
            created.push({ url, options });
            return factoryResult();
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  const start = async (emailVerified = true) => {
    const service = TestBed.inject(RealtimeService);
    auth.login('a@b.co', 'x').subscribe();
    http.expectOne(LOGIN).flush(session(emailVerified));
    TestBed.tick();
    runIdle();
    await Promise.resolve();
    await Promise.resolve();
    return service;
  };

  it('sin sesión no descarga ni abre nada', () => {
    const service = TestBed.inject(RealtimeService);
    TestBed.tick();
    expect(created).toHaveLength(0);
    expect(service.state()).toBe('off');
  });

  it('no compite con el primer render: abre el socket cuando el navegador queda libre', () => {
    TestBed.inject(RealtimeService);
    auth.login('a@b.co', 'x').subscribe();
    http.expectOne(LOGIN).flush(session(true));
    TestBed.tick();
    expect(created).toHaveLength(0);
    runIdle();
    expect(created).toHaveLength(1);
  });

  it('si la sesión se cierra antes de quedar libre, no abre nada', () => {
    TestBed.inject(RealtimeService);
    auth.login('a@b.co', 'x').subscribe();
    http.expectOne(LOGIN).flush(session(true));
    TestBed.tick();
    auth.clearSession();
    TestBed.tick();
    runIdle();
    expect(created).toHaveLength(0);
  });

  it('con el correo sin verificar tampoco conecta', async () => {
    const service = await start(false);
    expect(created).toHaveLength(0);
    expect(service.state()).toBe('off');
  });

  it('conecta directo a wsUrl y envía el access token en el handshake, no en cookies', async () => {
    const service = await start();
    expect(created[0].url).toBe(environment.wsUrl);
    expect(service.state()).toBe('connecting');
    expect(socket.connects).toBe(1);

    let handshake: unknown;
    created[0].options.auth((data) => {
      handshake = data;
    });
    expect(handshake).toEqual({ token: 'token-1' });
    expect(created[0].options).not.toHaveProperty('withCredentials');

    socket.fire('connect');
    expect(service.state()).toBe('connected');
  });

  it('usa reconexión con backoff', async () => {
    await start();
    const { reconnection, reconnectionDelay, reconnectionDelayMax } = created[0].options;
    expect(reconnection).toBe(true);
    expect(reconnectionDelayMax).toBeGreaterThan(reconnectionDelay);
  });

  it('con el servidor dormido muestra reconectando y, si sigue, sin conexión', async () => {
    const service = await start();
    socket.fire('connect_error', { message: 'xhr poll error' });
    expect(service.state()).toBe('reconnecting');
    for (let attempt = 0; attempt < 6; attempt++)
      socket.fire('connect_error', { message: 'timeout' });
    expect(service.state()).toBe('offline');

    socket.fire('connect');
    expect(service.state()).toBe('connected');
    socket.fire('connect_error', { message: 'timeout' });
    expect(service.state()).toBe('reconnecting');
  });

  it('un token vencido se renueva y reconecta con el token nuevo', async () => {
    const service = await start();
    socket.fire('connect');
    socket.fire('session:expired');
    socket.fire('disconnect', 'io server disconnect');
    expect(service.state()).toBe('reconnecting');

    http.expectOne(REFRESH).flush(session(true, 'token-2'));
    expect(socket.connects).toBe(2);
    let handshake: unknown;
    created[0].options.auth((data) => {
      handshake = data;
    });
    expect(handshake).toEqual({ token: 'token-2' });
  });

  it('un UNAUTHORIZED renueva una sola vez: si insiste, no entra en un bucle', async () => {
    const service = await start();
    socket.active = false;
    socket.fire('connect_error', { message: 'UNAUTHORIZED' });
    http.expectOne(REFRESH).flush(session(true, 'token-2'));
    expect(socket.connects).toBe(2);

    socket.fire('connect_error', { message: 'UNAUTHORIZED' });
    http.expectNone(REFRESH);
    expect(service.state()).toBe('offline');
  });

  it('si renovar falla, la sesión se cierra y el socket también', async () => {
    const service = await start();
    socket.fire('connect_error', { message: 'UNAUTHORIZED' });
    http.expectOne(REFRESH).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    TestBed.tick();
    expect(service.state()).toBe('off');
    expect(socket.disconnects).toBe(1);
  });

  it('un rechazo definitivo del servidor no reintenta: la app sigue por HTTP', async () => {
    const service = await start();
    socket.active = false;
    socket.fire('connect_error', { message: 'EMAIL_NOT_VERIFIED' });
    expect(service.state()).toBe('offline');
    http.expectNone(REFRESH);
  });

  it('el servidor cierra sin aviso de vencimiento, como al borrar la cuenta: no insiste', async () => {
    const service = await start();
    socket.fire('connect');
    socket.fire('disconnect', 'io server disconnect');
    expect(service.state()).toBe('offline');
    expect(socket.connects).toBe(1);
  });

  it('una caída de red pasa a reconectando', async () => {
    const service = await start();
    socket.fire('connect');
    socket.fire('disconnect', 'transport close');
    expect(service.state()).toBe('reconnecting');
  });

  it('cerrar sesión cierra el socket', async () => {
    const service = await start();
    socket.fire('connect');
    auth.clearSession();
    TestBed.tick();
    expect(socket.disconnects).toBe(1);
    expect(service.state()).toBe('off');
  });

  it('si el cliente tarda en descargar y se cierra la sesión, se descarta', async () => {
    let finish: (value: RealtimeSocket) => void = () => undefined;
    factoryResult = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const service = TestBed.inject(RealtimeService);
    auth.login('a@b.co', 'x').subscribe();
    http.expectOne(LOGIN).flush(session(true));
    TestBed.tick();
    runIdle();
    auth.clearSession();
    TestBed.tick();
    finish(socket);
    await Promise.resolve();
    await Promise.resolve();
    expect(socket.connects).toBe(0);
    expect(socket.disconnects).toBe(1);
    expect(service.state()).toBe('off');
  });

  it('si no se puede descargar el cliente, queda sin conexión y nada falla', async () => {
    factoryResult = () => Promise.reject(new Error('sin red'));
    const service = await start();
    await Promise.resolve();
    expect(service.state()).toBe('offline');
  });

  it('entrega los eventos a quien los pida, y solo esos', async () => {
    const service = await start();
    const garage: unknown[] = [];
    const chat: unknown[] = [];
    service.on('garage:changed').subscribe((event) => garage.push(event));
    service.on('chat:message').subscribe((event) => chat.push(event));

    socket.fire('garage:changed', { action: 'created', plate: 'ABC-123' });
    expect(garage).toEqual([{ action: 'created', plate: 'ABC-123' }]);
    expect(chat).toEqual([]);
  });
});
