import { Component, inject, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { VehicleService } from '../../services/vehicle.service';
import { InspectionEditorComponent } from '../inspection-editor/inspection-editor.component';
import type { InspectionItem, VehicleData } from '../../models/vehicle';

@Component({selector:'app-inspection-dashboard',imports:[CommonModule, InspectionEditorComponent],templateUrl:'./inspection-dashboard.component.html',styleUrl:'./inspection-dashboard.component.scss'})
export class InspectionDashboardComponent implements OnChanges {
  @Input() vehicle?: VehicleData;
  private readonly vehicleService = inject(VehicleService);
  protected readonly auth = inject(AuthService);
  readonly selectedCategory = signal('Todas');
  readonly categories = signal<string[]>(['Todas']);
  readonly inspections = signal<InspectionItem[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle']?.currentValue) this.loadVehicle(changes['vehicle'].currentValue.plate);
  }

  loadVehicle(plate: string): void {
    this.loading.set(true); this.error.set(''); this.editingId.set(null);
    this.vehicleService.getVehicle(plate).subscribe({
      next: (vehicle) => {
        this.applyVehicle(vehicle);
        this.selectedCategory.set('Todas'); this.loading.set(false);
      },
      error: (error: unknown) => { this.error.set(apiErrorMessage(error, 'No se pudo cargar el informe. Inténtalo nuevamente.')); this.loading.set(false); }
    });
  }

  onInspectionSaved(vehicle: VehicleData): void {
    this.applyVehicle(vehicle);
    this.editingId.set(null);
  }

  visibleInspections(): InspectionItem[] {
    return this.selectedCategory() === 'Todas' ? this.inspections() : this.inspections().filter((item) => item.category === this.selectedCategory());
  }

  printReport(): void { window.print(); }

  private applyVehicle(vehicle: VehicleData): void {
    this.vehicle = vehicle;
    this.inspections.set(vehicle.inspections);
    this.categories.set(['Todas', ...new Set(vehicle.inspections.map((item) => item.category))]);
  }
}
