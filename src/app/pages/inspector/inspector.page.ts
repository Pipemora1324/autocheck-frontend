import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InspectionDashboardComponent } from '../../components/inspection-dashboard/inspection-dashboard.component';
import { VehicleScannerComponent } from '../../components/vehicle-scanner/vehicle-scanner.component';
import type { ScanResult, VehicleData } from '../../models/vehicle';

@Component({
  selector: 'app-inspector-page',
  imports: [RouterLink, VehicleScannerComponent, InspectionDashboardComponent],
  templateUrl: './inspector.page.html',
  styleUrl: './inspector.page.scss'
})
export class InspectorPage {
  readonly selectedVehicle = signal<VehicleData | undefined>(undefined);

  onVehicleScanned(result: ScanResult): void {
    this.selectedVehicle.set(result.vehicle);
    window.setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }
}
