import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { InspectionUpdate, ScanResult, VehicleData } from '../models/vehicle';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  getVehicles(): Observable<VehicleData[]> {
    return this.http.get<{ vehicles: VehicleData[] }>(`${this.apiUrl}/vehicles`).pipe(
      map(({ vehicles }) => vehicles)
    );
  }

  getVehicle(plate: string): Observable<VehicleData> {
    return this.http.get<VehicleData>(`${this.apiUrl}/vehicles/${encodeURIComponent(plate)}`);
  }

  scanVehicle(plate: string, source: 'image' | 'manual'): Observable<ScanResult> {
    return this.http.post<ScanResult>(`${this.apiUrl}/vehicles/scan`, { plate, source });
  }

  updateInspection(plate: string, update: InspectionUpdate): Observable<VehicleData> {
    return this.http.patch<VehicleData>(`${this.apiUrl}/vehicles/${encodeURIComponent(plate)}/inspections`, update);
  }
}
