// Contrato de /garage y /config/public (ver docs/API.md del backend).

export const FUEL_TYPES = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas natural', 'Gasolina y gas', 'Otro'] as const;
export const SERVICE_TYPES = ['Particular', 'Público', 'Oficial', 'Diplomático', 'Otro'] as const;

export type FuelType = (typeof FUEL_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type VehicleSource = 'manual' | 'scan';

export type ExpirationStatusName = 'Vigente' | 'Por Vencer' | 'Vencido' | 'Sin información';

export interface ExpirationStatus {
  status: ExpirationStatusName;
  expirationDate: string | null;
  daysToExpire: number | null;
  alert: 'verde' | 'amarillo' | 'rojo' | 'gris';
}

/** Campos editables de un vehículo del garaje. Las fechas van en AAAA-MM-DD. */
export interface GarageVehicleFields {
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  cylinderCc: number | null;
  chassis: string | null;
  fuelType: FuelType | null;
  serviceType: ServiceType | null;
  soatExpiresOn: string | null;
  rtmExpiresOn: string | null;
  runtStatus: string | null;
}

export interface GarageVehicle extends GarageVehicleFields {
  plate: string;
  source: VehicleSource;
  kind: 'carro' | 'moto';
  createdAt: string;
  updatedAt: string;
  soat: ExpirationStatus;
  rtm: ExpirationStatus;
}

/** POST /garage. */
export interface NewGarageVehicle extends GarageVehicleFields {
  plate: string;
  source: 'manual' | 'scan';
}

export type GarageVehiclePatch = Partial<GarageVehicleFields>;

export type Verdict = 'Sin alertas' | 'Revisar' | 'No recomendado';

export interface Assessment {
  plate: string;
  verdict: Verdict;
  reasons: Array<{ code: string; severity: 'alta' | 'media' | 'info'; message: string }>;
  missingFields: string[];
  basedOn: {
    source: string;
    dataOrigin: VehicleSource;
    official: boolean;
    evaluatedAt: string;
    evaluatedOn: string;
    timeZone: string;
    disclaimer: string;
  };
}

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
}

/** GET /config/public (sin sesión). */
export interface PublicConfig extends FeatureStatus {
  privacyPolicy: { version: string; registrationConsent: string };
}
