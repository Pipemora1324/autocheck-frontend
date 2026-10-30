import { Component, inject, output } from '@angular/core';
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
  isLoading = false;
  error = '';
  selectedFileName = '';

  scan(): void {
    const normalizedPlate = this.plate.trim().toUpperCase();
    if (!/^[A-Z]{3}-\d{4}$/.test(normalizedPlate)) {
      this.error = 'Ingresa una placa válida, por ejemplo ABC-1234.';
      return;
    }

    this.error = '';
    this.isLoading = true;
    this.vehicleService.scanVehicle(normalizedPlate, this.source).subscribe({
      next: (scanResult) => {
        this.isLoading = false;
        this.result.emit(scanResult);
      },
      error: (error: unknown) => {
        this.isLoading = false;
        this.error = error instanceof HttpErrorResponse && error.status === 404
          ? `No encontramos un vehículo con la placa ${normalizedPlate}.`
          : apiErrorMessage(error, 'No se pudo consultar la placa. Inténtalo de nuevo.');
      }
    });
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFileName = file.name;
    this.source = 'image';
    this.plate = '';
    this.error = '';
  }

  clearImage(): void {
    this.selectedFileName = '';
    this.source = 'manual';
    this.plate = '';
  }
}
