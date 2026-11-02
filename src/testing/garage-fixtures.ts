import type { Assessment, CardScanResult, GarageVehicle, NewGarageVehicle, PublicConfig } from '../app/models/garage';

export const garageVehicle = (overrides: Partial<GarageVehicle> = {}): GarageVehicle => ({
  plate: 'ABC-123',
  brand: 'Renault',
  model: 'Sandero',
  year: 2019,
  color: 'Gris',
  cylinderCc: 1598,
  chassis: '9FBBSRADDKM123456',
  fuelType: 'Gasolina',
  serviceType: 'Particular',
  soatExpiresOn: '2027-06-30',
  rtmExpiresOn: null,
  runtStatus: null,
  source: 'manual',
  kind: 'carro',
  createdAt: '2026-11-02T17:00:00.000Z',
  updatedAt: '2026-11-02T17:00:00.000Z',
  soat: { status: 'Vigente', expirationDate: '2027-06-30', daysToExpire: 240, alert: 'verde' },
  rtm: { status: 'Sin información', expirationDate: null, daysToExpire: null, alert: 'gris' },
  ...overrides
});

export const newGarageVehicle = (overrides: Partial<NewGarageVehicle> = {}): NewGarageVehicle => ({
  plate: 'ABC-123',
  brand: 'Renault',
  model: 'Sandero',
  year: 2019,
  color: null,
  cylinderCc: null,
  chassis: null,
  fuelType: null,
  serviceType: null,
  soatExpiresOn: null,
  rtmExpiresOn: null,
  runtStatus: null,
  source: 'manual',
  ...overrides
});

export const assessment = (overrides: Partial<Assessment> = {}): Assessment => ({
  plate: 'ABC-123',
  verdict: 'Revisar',
  reasons: [{ code: 'RTM_MISSING', severity: 'media', message: 'No registraste la fecha de la revisión técnico-mecánica.' }],
  missingFields: ['rtmExpiresOn'],
  basedOn: {
    source: 'datos_registrados_por_el_usuario',
    dataOrigin: 'manual',
    official: false,
    evaluatedAt: '2026-11-02T17:00:00.000Z',
    evaluatedOn: '2026-11-02',
    timeZone: 'America/Bogota',
    disclaimer: 'Concepto calculado únicamente con los datos registrados en tu garaje. No es una consulta oficial al RUNT.'
  },
  ...overrides
});

export const cardScanResult = (): CardScanResult => ({
  vehicle: {
    plate: { value: 'ABC-123', confidence: 0.98 },
    brand: { value: 'RENAULT', confidence: 0.95 },
    model: { value: 'SANDERO', confidence: 0.9 },
    year: { value: 2019, confidence: 0.92 },
    color: { value: 'GRIS ESTRELLA', confidence: 0.9 },
    cylinderCc: { value: 1598, confidence: 0.8 },
    chassis: { value: '9FBBSRADDKM123456', confidence: 0.6 },
    fuelType: { value: 'Gasolina', confidence: 0.9 },
    serviceType: { value: null, confidence: 0 }
  },
  kind: 'carro',
  ownerDocument: { value: 'C.C. 79123456', confidence: 0.85 },
  warnings: ['La esquina inferior está borrosa.']
});

export const publicConfig = (overrides: Partial<PublicConfig> = {}): PublicConfig => ({
  privacyPolicy: { version: '2026-11-02.2', registrationConsent: 'Autorizo a AutoCheck-CO a tratar mis datos personales.' },
  cardScan: { enabled: true, provider: 'gemini', notice: 'La foto de la tarjeta se envía a Google (Gemini API).' },
  runtLookup: { enabled: false, provider: 'none' },
  ...overrides
});
