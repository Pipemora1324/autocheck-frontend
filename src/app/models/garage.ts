// Contrato de /garage y /config/public (ver docs/API.md del backend).

export const FUEL_TYPES = [
  'Gasolina',
  'Diésel',
  'Eléctrico',
  'Híbrido',
  'Gas natural',
  'Gasolina y gas',
  'Otro',
] as const;
export const SERVICE_TYPES = ['Particular', 'Público', 'Oficial', 'Diplomático', 'Otro'] as const;

export type FuelType = (typeof FUEL_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type VehicleSource = 'manual' | 'scan';

/** Campos editables de un vehículo del garaje. model es la línea y year el modelo (año). */
export interface GarageVehicleFields {
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  cylinderCc: number | null;
  chassis: string | null;
  fuelType: FuelType | null;
  serviceType: ServiceType | null;
  mileageKm: number | null;
}

export interface GarageVehicle extends GarageVehicleFields {
  plate: string;
  source: VehicleSource;
  kind: 'carro' | 'moto';
  createdAt: string;
  updatedAt: string;
}

/** POST /garage. */
export interface NewGarageVehicle extends GarageVehicleFields {
  plate: string;
  source: 'manual' | 'scan';
}

export type GarageVehiclePatch = Partial<GarageVehicleFields>;

export interface Prefilled<T> {
  value: T | null;
  confidence: number;
}

/** Respuesta de POST /garage/scan-card. No crea el vehículo: el usuario confirma con POST /garage. */
export interface CardScanResult {
  vehicle: {
    plate: Prefilled<string>;
    brand: Prefilled<string>;
    model: Prefilled<string>;
    year: Prefilled<number>;
    color: Prefilled<string>;
    cylinderCc: Prefilled<number>;
    chassis: Prefilled<string>;
    fuelType: Prefilled<FuelType>;
    serviceType: Prefilled<ServiceType>;
  };
  kind: 'carro' | 'moto' | null;
  warnings: string[];
}

export interface FeatureStatus {
  cardScan: { enabled: boolean; provider?: string; notice?: string | null };
  /** enabled se refiere a la IA: elegir el testigo de la lista siempre funciona. */
  diagnosis: {
    enabled: boolean;
    provider: 'gemini' | 'none';
    manualSelection: boolean;
    notice: string | null;
  };
}

/** GET /config/public (sin sesión). */
export interface PublicConfig extends FeatureStatus {
  privacyPolicy: { version: string; registrationConsent: string };
}
