export type VehicleStatus = 'Vigente' | 'Por Vencer' | 'Vencido';
export type AlertLevel = 'verde' | 'amarillo' | 'rojo';

export interface InspectionItem {
  id: string;
  category: string;
  name: string;
  status: 'Aprobado' | 'Atención' | 'No aprobado';
  result: string;
  notes: string;
}

export interface InspectionUpdate {
  inspectionId: string;
  status: InspectionItem['status'];
  result: string;
  notes: string;
  updatedBy: string;
}

export interface VehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  cylinder: string;
  chassis: string;
  owner: string;
  ownerDocument: string;
  color: string;
  fuelType: string;
  transmission: string;
  mileage: number;
  registrationDate: string;
  runt: { number: string; status: VehicleStatus; expirationDate: string; alert: AlertLevel };
  soat: { number: string; status: VehicleStatus; expirationDate: string; alert: AlertLevel };
  rtm: { number: string; status: VehicleStatus; expirationDate: string; alert: AlertLevel };
  inspections: InspectionItem[];
  overallStatus: VehicleStatus;
  lastUpdated: string;
}

export interface ScanResult {
  plate: string;
  source: 'image' | 'manual';
  confidence: number;
  detectedAt: string;
  vehicle: VehicleData;
}
