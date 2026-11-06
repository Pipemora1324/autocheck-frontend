import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  CardScanResult,
  GarageVehicle,
  GarageVehiclePatch,
  NewGarageVehicle,
} from '../models/garage';

@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/garage`;

  private plateUrl(plate: string): string {
    return `${this.baseUrl}/${encodeURIComponent(plate)}`;
  }

  list(): Observable<GarageVehicle[]> {
    return this.http
      .get<{ vehicles: GarageVehicle[] }>(this.baseUrl)
      .pipe(map(({ vehicles }) => vehicles));
  }

  get(plate: string): Observable<GarageVehicle> {
    return this.http.get<GarageVehicle>(this.plateUrl(plate));
  }

  create(vehicle: NewGarageVehicle): Observable<GarageVehicle> {
    return this.http.post<GarageVehicle>(this.baseUrl, vehicle);
  }

  /** Solo los campos a cambiar; null borra un dato opcional. La placa no se edita. */
  update(plate: string, patch: GarageVehiclePatch): Observable<GarageVehicle> {
    return this.http.patch<GarageVehicle>(this.plateUrl(plate), patch);
  }

  remove(plate: string): Observable<void> {
    return this.http.delete<undefined>(this.plateUrl(plate));
  }

  /** multipart/form-data con un único archivo en el campo "image". */
  scanCard(image: File): Observable<CardScanResult> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.post<CardScanResult>(`${this.baseUrl}/scan-card`, form);
  }
}
