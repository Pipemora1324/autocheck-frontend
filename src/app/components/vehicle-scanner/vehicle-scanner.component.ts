import { Component, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../../core/http/api-error';
import { VehicleService } from '../../services/vehicle.service';
import type { ScanResult } from '../../models/vehicle';

@Component({
  selector: 'app-vehicle-scanner',
  imports: [FormsModule],
  templateUrl: './vehicle-scanner.component.html',
  styleUrl: './vehicle-scanner.component.scss'
})
export class VehicleScannerComponent {
  private readonly vehicleService = inject(VehicleService);
  readonly result = output<ScanResult>();
  plate = '';
  source: 'image' | 'manual' = 'manual';
  // Signals: la app es zoneless, así que cambios hechos dentro de un subscribe no se pintarían.
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly selectedFileName = signal('');

  scan(): void {
    const normalizedPlate = this.plate.trim().toUpperCase();
    if (!/^[A-Z]{3}-\d{4}$/.test(normalizedPlate)) {
      this.error.set('Ingresa una placa válida, por ejemplo ABC-1234.');
      return;
    }

    this.error.set('');
    this.isLoading.set(true);
    this.vehicleService.scanVehicle(normalizedPlate, this.source).subscribe({
      next: (scanResult) => {
        this.isLoading.set(false);
        this.result.emit(scanResult);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.error.set(error instanceof HttpErrorResponse && error.status === 404
          ? `No encontramos un vehículo con la placa ${normalizedPlate}.`
          : apiErrorMessage(error, 'No se pudo consultar la placa. Inténtalo de nuevo.'));
      }
    });
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.source = 'image';
    this.plate = '';
    this.error.set('');
  }

  clearImage(): void {
    this.selectedFileName.set('');
    this.source = 'manual';
    this.plate = '';
  }
}
