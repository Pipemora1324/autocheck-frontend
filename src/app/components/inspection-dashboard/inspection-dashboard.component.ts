import { Component, inject, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleService } from '../../services/vehicle.service';
import type { InspectionItem, VehicleData } from '../../models/vehicle';

@Component({selector:'app-inspection-dashboard',imports:[CommonModule],templateUrl:'./inspection-dashboard.component.html',styleUrl:'./inspection-dashboard.component.scss'})
export class InspectionDashboardComponent implements OnChanges {
  @Input() vehicle?: VehicleData;
  private readonly vehicleService = inject(VehicleService);
  readonly selectedCategory = signal('Todas');
  readonly categories = signal<string[]>(['Todas']);
  readonly inspections = signal<InspectionItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle']?.currentValue) this.loadVehicle(changes['vehicle'].currentValue.plate);
  }

  loadVehicle(plate: string): void {
    this.loading.set(true); this.error.set('');
    this.vehicleService.getVehicle(plate).subscribe({
      next: (vehicle) => {
        this.vehicle = vehicle;
        this.inspections.set(vehicle.inspections);
        this.categories.set(['Todas', ...new Set(vehicle.inspections.map((item) => item.category))]);
        this.selectedCategory.set('Todas'); this.loading.set(false);
      },
      error: () => { this.error.set('No se pudo cargar el informe. Inténtalo nuevamente.'); this.loading.set(false); }
    });
  }

  visibleInspections(): InspectionItem[] {
    return this.selectedCategory() === 'Todas' ? this.inspections() : this.inspections().filter((item) => item.category === this.selectedCategory());
  }

  printReport(): void { window.print(); }
}
