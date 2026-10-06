import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleScannerComponent } from './components/vehicle-scanner/vehicle-scanner.component';
import { InspectionDashboardComponent } from './components/inspection-dashboard/inspection-dashboard.component';
import type { ScanResult, VehicleData } from './models/vehicle';

@Component({
  selector: 'app-root',
  imports: [CommonModule, VehicleScannerComponent, InspectionDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly selectedVehicle = signal<VehicleData | undefined>(undefined);

  onVehicleScanned(result: ScanResult): void {
    this.selectedVehicle.set(result.vehicle);
    window.setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }
}
