import type { Diagnosed, DiagnosisHistory, DiagnosisHistoryItem, NeedsBetterInput, TelltaleSummary } from '../app/models/diagnosis';

export const diagnosed = (overrides: Partial<Diagnosed> = {}): Diagnosed => ({
  status: 'diagnosed',
  id: '11111111-1111-4111-8111-111111111111',
  origen: 'ia',
  confianza: 0.93,
  createdAt: '2026-11-04T17:00:00.000Z',
  telltale: { id: 'check_engine', nombre: 'Check engine', descripcionSimbolo: 'Silueta de un motor en amarillo.' },
  severidad: 'amarillo',
  urgencia: { semaforo: 'amarillo', titulo: 'Revísalo pronto', accion: 'Atiéndelo pronto.', debeDetenerse: false, esFalla: true },
  significado: 'La computadora del motor registró una falla.',
  causasProbables: ['Tapa del tanque floja', 'Sensor con falla'],
  puedesRevisar: ['Revisa que la tapa del tanque esté bien cerrada.'],
  noHagas: ['No borres el código sin saber qué lo causó.'],
  cuandoIrAlMecanico: 'En los próximos días. Si se ignora, se puede dañar el catalizador.',
  notaEspecificaDelVehiculo: null,
  avisoCompatibilidad: null,
  aviso: 'Orientación general. Un mecánico debe confirmar el diagnóstico.',
  ...overrides
});

export const diagnosedRed = (overrides: Partial<Diagnosed> = {}): Diagnosed =>
  diagnosed({
    telltale: { id: 'presion_aceite', nombre: 'Presión de aceite', descripcionSimbolo: 'Aceitera roja.' },
    severidad: 'rojo',
    urgencia: {
      semaforo: 'rojo',
      titulo: 'Detente',
      accion: 'Detente en un lugar seguro en cuanto puedas, apaga el motor y llama a un taller o a una grúa. No sigas manejando.',
      debeDetenerse: true,
      esFalla: true
    },
    ...overrides
  });

export const needsBetterInput = (): NeedsBetterInput => ({
  status: 'needs_better_input',
  pista: 'No pudimos identificar el testigo con seguridad. Toma otra foto más cercana, sin reflejos y con el tablero encendido, o elígelo de la lista.',
  avisoSeguridad: 'Mientras lo identificas: si el testigo es rojo o notas algo raro al manejar, detente en un lugar seguro.',
  puedeElegirDeLaLista: true
});

export const telltales = (): TelltaleSummary[] => [
  { id: 'presion_aceite', nombre: 'Presión de aceite', alias: ['aceitera', 'lámpara de aceite'], severidad: 'rojo' },
  { id: 'check_engine', nombre: 'Check engine', alias: ['motor', 'luz del motor'], severidad: 'amarillo' },
  { id: 'tpms', nombre: 'Presión de llantas (TPMS)', alias: ['herradura'], severidad: 'amarillo' },
  { id: 'cinturon', nombre: 'Cinturón sin abrochar', alias: ['cinturón'], severidad: 'informativo' }
];

export const historyItem = (overrides: Partial<DiagnosisHistoryItem> = {}): DiagnosisHistoryItem => ({
  id: '22222222-2222-4222-8222-222222222222',
  telltaleId: 'tpms',
  nombre: 'Presión de llantas (TPMS)',
  severidad: 'amarillo',
  origen: 'manual',
  confianza: null,
  descripcion: 'una llanta baja',
  createdAt: '2026-11-04T17:00:00.000Z',
  ...overrides
});

export const history = (items: DiagnosisHistoryItem[] = [], overrides: Partial<DiagnosisHistory> = {}): DiagnosisHistory => ({
  items,
  page: 1,
  limit: 10,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
});
