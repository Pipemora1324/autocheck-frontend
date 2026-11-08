import { computed, effect, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ChatExchange, DiagnosisResult } from '../../models/diagnosis';
import { AuthService } from '../auth/auth.service';

export type ConnectionState = 'off' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type DiagnosisStage = 'queued' | 'analyzing' | 'drafting' | 'done' | 'failed';

/** Eventos del servidor (ver docs/API.md del backend). Todo lo que llega ya pasó su validación de seguridad. */
export interface RealtimeEvents {
  'garage:changed': { action: 'created' | 'updated' | 'deleted'; plate: string };
  'diagnosis:changed': { action: 'created' | 'deleted'; plate: string; id: string };
  'diagnosis:progress': {
    requestId: string;
    stage: DiagnosisStage;
    result?: DiagnosisResult;
    status?: string;
  };
  'chat:message': ChatExchange & { diagnosisId: string };
}

const FORWARDED_EVENTS: ReadonlyArray<keyof RealtimeEvents> = [
  'garage:changed',
  'diagnosis:changed',
  'diagnosis:progress',
  'chat:message',
];

/** Tras estos intentos fallidos se muestra "sin conexión"; se sigue intentando igual. */
const ATTEMPTS_BEFORE_OFFLINE = 6;
/** Si el navegador nunca queda libre, se abre igual pasado este tiempo. */
const IDLE_TIMEOUT_MS = 2_000;

export interface RealtimeSocket {
  connect(): unknown;
  disconnect(): unknown;
  on(event: string, listener: (...args: never[]) => void): unknown;
  /** false si el servidor rechazó la conexión: socket.io ya no reintenta por su cuenta. */
  readonly active: boolean;
}

export interface SocketOptions {
  auth: (callback: (data: { token: string | null }) => void) => void;
  autoConnect: false;
  reconnection: true;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  randomizationFactor: number;
  /** Libera el cupo de conexiones al recargar, sin esperar a que el servidor note que murió. */
  closeOnBeforeunload: true;
}

export type SocketFactory = (url: string, options: SocketOptions) => Promise<RealtimeSocket>;

/** Carga diferida: el cliente de socket solo se descarga si hay una sesión verificada. */
export const SOCKET_FACTORY = new InjectionToken<SocketFactory>('SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => async (url, options) => {
    const { io } = await import('socket.io-client');
    return io(url, options);
  },
});

/**
 * Conexión en tiempo real. Es un extra: el diagnóstico y el chat funcionan por HTTP si nunca conecta.
 * Se autentica con el access token en cada intento: vive en memoria, y Vercel no reenvía WebSockets.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly factory = inject(SOCKET_FACTORY);

  private socket: RealtimeSocket | null = null;
  /** Cambia en cada cierre: una creación asíncrona que llega tarde se descarta. */
  private generation = 0;
  private failedAttempts = 0;
  private refreshedThisCycle = false;
  private expired = false;

  private readonly stateSignal = signal<ConnectionState>('off');
  private readonly events = new Subject<{ name: keyof RealtimeEvents; payload: unknown }>();

  readonly state = this.stateSignal.asReadonly();
  private readonly shouldConnect = computed(() => this.auth.user()?.emailVerified === true);

  constructor() {
    effect(() => {
      if (this.shouldConnect()) this.openWhenIdle();
      else this.close();
    });
  }

  on<E extends keyof RealtimeEvents>(name: E): Observable<RealtimeEvents[E]> {
    return this.events.pipe(
      filter((event) => event.name === name),
      map((event) => event.payload as RealtimeEvents[E]),
    );
  }

  /** El cliente de socket no compite con el primer render: se descarga cuando el navegador queda libre. */
  private openWhenIdle(): void {
    const generation = this.generation;
    const run = () => {
      if (generation === this.generation && this.shouldConnect()) this.open();
    };
    if (typeof requestIdleCallback === 'function')
      requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(run, 0);
  }

  private open(): void {
    if (this.socket) return;
    const generation = ++this.generation;
    this.stateSignal.set('connecting');
    this.factory(environment.wsUrl, {
      auth: (callback) => {
        callback({ token: this.auth.getAccessToken() });
      },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      closeOnBeforeunload: true,
    }).then(
      (socket) => {
        if (generation !== this.generation) {
          socket.disconnect();
          return;
        }
        this.socket = socket;
        this.listen(socket);
        socket.connect();
      },
      () => {
        // No se pudo descargar el cliente: la app sigue por HTTP.
        if (generation === this.generation) this.stateSignal.set('offline');
      },
    );
  }

  private close(): void {
    this.generation++;
    const socket = this.socket;
    this.socket = null;
    this.failedAttempts = 0;
    this.refreshedThisCycle = false;
    this.expired = false;
    this.stateSignal.set('off');
    socket?.disconnect();
  }

  private listen(socket: RealtimeSocket): void {
    socket.on('connect', () => {
      this.failedAttempts = 0;
      this.refreshedThisCycle = false;
      this.expired = false;
      this.stateSignal.set('connected');
    });
    socket.on('connect_error', (error: { message?: string }) => {
      this.onConnectError(socket, error.message);
    });
    socket.on('session:expired', () => {
      this.expired = true;
    });
    socket.on('disconnect', (reason: string) => {
      this.onDisconnect(socket, reason);
    });
    for (const name of FORWARDED_EVENTS) {
      socket.on(name, (payload: unknown) => {
        this.events.next({ name, payload });
      });
    }
  }

  private onConnectError(socket: RealtimeSocket, code: string | undefined): void {
    if (code === 'UNAUTHORIZED') {
      this.renewAndReconnect(socket);
      return;
    }
    if (!socket.active) {
      // El servidor la rechazó (por ejemplo, correo sin verificar): reintentar no ayuda.
      this.stateSignal.set('offline');
      return;
    }
    // Sin red o con el servidor dormido, socket.io reintenta con backoff.
    this.failedAttempts++;
    this.stateSignal.set(
      this.failedAttempts >= ATTEMPTS_BEFORE_OFFLINE ? 'offline' : 'reconnecting',
    );
  }

  private onDisconnect(socket: RealtimeSocket, reason: string): void {
    if (socket !== this.socket) return;
    if (this.expired) {
      this.renewAndReconnect(socket);
      return;
    }
    // Cerrada por el servidor sin aviso de vencimiento, como al borrar la cuenta: no se insiste.
    this.stateSignal.set(reason === 'io server disconnect' ? 'offline' : 'reconnecting');
  }

  /** Una sola renovación por ciclo: si el token nuevo también se rechaza, no se entra en un bucle. */
  private renewAndReconnect(socket: RealtimeSocket): void {
    if (this.refreshedThisCycle) {
      this.stateSignal.set('offline');
      return;
    }
    this.refreshedThisCycle = true;
    this.expired = false;
    this.stateSignal.set('reconnecting');
    this.auth.refresh().subscribe({
      next: () => {
        if (socket === this.socket) socket.connect();
      },
      // refresh ya cerró la sesión, y el effect cierra el socket.
      error: () => undefined,
    });
  }
}
