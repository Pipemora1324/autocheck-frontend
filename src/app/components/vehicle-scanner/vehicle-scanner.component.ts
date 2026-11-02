import { Component, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../../core/http/api-error';
import { VehicleService } from '../../services/vehicle.service';
import type { ScanResult } from '../../models/vehicle';

/** Placas ficticias que carga la migración de demostración del backend. */
export const DEMO_PLATES = ['ABC-1234', 'DEF-5678', 'GHI-9012'];

@Component({
  selector: 'app-vehicle-scanner',
  imports: [FormsModule],
  templateUrl: './vehicle-scanner.component.html',
  styleUrl: './vehicle-scanner.component.scss'
})
export class VehicleScannerComponent {
  private readonly vehicleService = inject(VehicleService);
  readonly result = output<ScanResult>();
  readonly demoPlates = DEMO_PLATES;
  plate = '';
  // Signals: la app es zoneless, así que cambios hechos dentro de un subscribe no se pintarían.
  readonly isLoading = signal(false);
  readonly error = signal('');

  scan(): void {
    const normalizedPlate = this.plate.trim().toUpperCase();
    if (!/^[A-Z]{3}-\d{4}$/.test(normalizedPlate)) {
      this.error.set(`Ingresa una placa de demostración, por ejemplo ${DEMO_PLATES[0]}.`);
      return;
    }

    this.error.set('');
    this.isLoading.set(true);
    this.vehicleService.scanVehicle(normalizedPlate, 'manual').subscribe({
      next: (scanResult) => {
        this.isLoading.set(false);
        this.result.emit(scanResult);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.error.set(error instanceof HttpErrorResponse && error.status === 404
          ? `${normalizedPlate} no está entre las placas de demostración (${DEMO_PLATES.join(', ')}).`
          : apiErrorMessage(error, 'No se pudo consultar la placa. Inténtalo de nuevo.'));
      }
    });
  }
}
