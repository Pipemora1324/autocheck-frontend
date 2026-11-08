import type {
  CardScanResult,
  GarageVehicle,
  NewGarageVehicle,
  PublicConfig,
} from '../app/models/garage';

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
  mileageKm: 85000,
  source: 'manual',
  kind: 'carro',
  createdAt: '2026-11-02T17:00:00.000Z',
  updatedAt: '2026-11-02T17:00:00.000Z',
  ...overrides,
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
  mileageKm: null,
  source: 'manual',
  ...overrides,
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
    serviceType: { value: null, confidence: 0 },
  },
  kind: 'carro',
  warnings: ['La esquina inferior está borrosa.'],
});

export const publicConfig = (overrides: Partial<PublicConfig> = {}): PublicConfig => ({
  privacyPolicy: {
    version: '2026-11-04.1',
    registrationConsent: 'Autorizo a AutoCheck-CO a tratar mis datos personales.',
  },
  cardScan: {
    enabled: true,
    provider: 'gemini',
    notice: 'La foto de la tarjeta se envía a Google (Gemini API).',
  },
  diagnosis: {
    enabled: true,
    provider: 'gemini',
    manualSelection: true,
    notice:
      'La foto del tablero se envía a un proveedor externo de inteligencia artificial. No se guarda en nuestros servidores.',
  },
  ...overrides,
});
