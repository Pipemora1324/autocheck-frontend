import type {
  ChatExchange,
  ChatHistory,
  ChatMessage,
  Diagnosed,
  DiagnosedTelltale,
  DiagnosisHistory,
  DiagnosisHistoryItem,
  NeedsBetterInput,
  NotRecognized,
  TelltaleSummary,
} from '../app/models/diagnosis';

const STOP_ACTION =
  'Detente en un lugar seguro en cuanto puedas, apaga el motor y llama a un taller o a una grúa. No sigas manejando.';
const AIRBAG_ACTION =
  'El vehículo puede moverse, pero esta protección puede no funcionar en un choque. No dependas de ella y llévalo a revisión hoy.';

export const telltale = (overrides: Partial<DiagnosedTelltale> = {}): DiagnosedTelltale => ({
  nombre: 'Check engine',
  descripcionSimbolo: 'Silueta de un motor en amarillo.',
  color: 'amarillo',
  parpadeando: null,
  categoria: 'motor_emisiones',
  urgencia: 'amarillo',
  debeDetenerse: false,
  accion: 'Atiéndelo pronto.',
  significado: 'La computadora del motor registró una falla.',
  porQuePasa: ['Tapa del tanque floja', 'Sensor con falla'],
  puedesRevisar: ['Revisa que la tapa del tanque esté bien cerrada.'],
  noHagas: ['No borres el código sin saber qué lo causó.'],
  cuandoIrAlMecanico: 'En los próximos días. Si se ignora, se puede dañar el catalizador.',
  notaDelVehiculo: null,
  confianza: 0.93,
  ...overrides,
});

export const redTelltale = (overrides: Partial<DiagnosedTelltale> = {}): DiagnosedTelltale =>
  telltale({
    nombre: 'Presión de aceite',
    descripcionSimbolo: 'Aceitera roja.',
    color: 'rojo',
    categoria: 'aceite',
    urgencia: 'rojo',
    debeDetenerse: true,
    accion: STOP_ACTION,
    ...overrides,
  });

export const diagnosed = (overrides: Partial<Diagnosed> = {}): Diagnosed => ({
  status: 'diagnosed',
  id: '11111111-1111-4111-8111-111111111111',
  origen: 'ia',
  confianza: 0.93,
  descripcion: null,
  createdAt: '2026-11-04T17:00:00.000Z',
  urgenciaGeneral: 'amarillo',
  debeDetenerse: false,
  accionGeneral: 'Atiéndelo pronto.',
  mensajeGeneral: '',
  mejorFoto: null,
  testigos: [telltale()],
  aviso: 'Orientación general. Un mecánico debe confirmar el diagnóstico.',
  ...overrides,
});

export const diagnosedRed = (overrides: Partial<Diagnosed> = {}): Diagnosed =>
  diagnosed({
    urgenciaGeneral: 'rojo',
    debeDetenerse: true,
    accionGeneral: STOP_ACTION,
    testigos: [redTelltale()],
    ...overrides,
  });

export const diagnosedAirbag = (overrides: Partial<Diagnosed> = {}): Diagnosed =>
  diagnosed({
    urgenciaGeneral: 'rojo',
    debeDetenerse: false,
    accionGeneral: AIRBAG_ACTION,
    testigos: [
      telltale({
        nombre: 'Airbag',
        descripcionSimbolo: 'Persona con un círculo delante del pecho.',
        color: 'rojo',
        categoria: 'airbag',
        urgencia: 'rojo',
        accion: AIRBAG_ACTION,
      }),
    ],
    ...overrides,
  });

export const needsBetterInput = (overrides: Partial<NeedsBetterInput> = {}): NeedsBetterInput => ({
  status: 'needs_better_input',
  reason: 'no_telltales_found',
  pista:
    'La foto está muy oscura. Toma otra foto más cercana, sin reflejos y con el tablero encendido, o elígelo de la lista.',
  avisoSeguridad:
    'Mientras lo identificas: si el testigo es rojo o notas algo raro al manejar, detente en un lugar seguro.',
  puedeElegirDeLaLista: true,
  ...overrides,
});

export const notRecognized = (): NotRecognized => ({
  status: 'not_recognized',
  pista: 'La imagen no muestra un tablero.',
  avisoSeguridad:
    'Mientras lo identificas: si el testigo es rojo o notas algo raro al manejar, detente en un lugar seguro.',
  puedeElegirDeLaLista: true,
});

export const telltales = (): TelltaleSummary[] => [
  {
    id: 'presion_aceite',
    nombre: 'Presión de aceite',
    alias: ['aceitera', 'lámpara de aceite'],
    severidad: 'rojo',
    debeDetenerse: true,
  },
  {
    id: 'check_engine',
    nombre: 'Check engine',
    alias: ['motor', 'luz del motor'],
    severidad: 'amarillo',
    debeDetenerse: false,
  },
  {
    id: 'tpms',
    nombre: 'Presión de llantas (TPMS)',
    alias: ['herradura'],
    severidad: 'amarillo',
    debeDetenerse: false,
  },
  {
    id: 'cinturon',
    nombre: 'Cinturón sin abrochar',
    alias: ['cinturón'],
    severidad: 'informativo',
    debeDetenerse: false,
  },
];

export const historyItem = (
  overrides: Partial<DiagnosisHistoryItem> = {},
): DiagnosisHistoryItem => ({
  id: '22222222-2222-4222-8222-222222222222',
  telltaleId: 'tpms',
  nombre: 'Presión de llantas (TPMS)',
  totalTestigos: 1,
  severidad: 'amarillo',
  debeDetenerse: false,
  origen: 'manual',
  confianza: null,
  descripcion: 'una llanta baja',
  createdAt: '2026-11-04T17:00:00.000Z',
  ...overrides,
});

export const history = (
  items: DiagnosisHistoryItem[] = [],
  overrides: Partial<DiagnosisHistory> = {},
): DiagnosisHistory => ({
  items,
  page: 1,
  limit: 10,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides,
});

export const chatMessage = (
  role: ChatMessage['role'],
  content: string,
  id = `${role}-${content}`,
): ChatMessage => ({ id, role, content, createdAt: '2026-11-04T17:00:00.000Z' });

export const chatHistory = (messages: ChatMessage[] = [], restantes = 20): ChatHistory => ({
  messages,
  restantes,
});

export const chatExchange = (question: string, answer: string, restantes = 19): ChatExchange => ({
  question: chatMessage('user', question),
  answer: chatMessage('assistant', answer),
  restantes,
});
