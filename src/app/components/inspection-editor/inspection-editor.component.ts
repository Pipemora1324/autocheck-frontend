import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../core/http/api-error';
import { INSPECTION_STATUSES, type InspectionItem, type InspectionStatus, type VehicleData } from '../../models/vehicle';
import { VehicleService } from '../../services/vehicle.service';

/** Formulario de edición de una inspección. Solo se muestra a usuarios con rol admin. */
@Component({
  selector: 'app-inspection-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './inspection-editor.component.html',
  styleUrl: './inspection-editor.component.scss'
})
export class InspectionEditorComponent implements OnInit {
  private readonly vehicleService = inject(VehicleService);

  readonly plate = input.required<string>();
  readonly item = input.required<InspectionItem>();
  readonly saved = output<VehicleData>();
  readonly cancelled = output<void>();

  readonly statuses = INSPECTION_STATUSES;
  readonly form = inject(NonNullableFormBuilder).group({
    status: ['Aprobado' as InspectionStatus, Validators.required],
    result: ['', [Validators.required, Validators.maxLength(500)]],
    notes: ['', [Validators.required, Validators.maxLength(2000)]]
  });
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    const { status, result, notes } = this.item();
    this.form.setValue({ status, result, notes });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Completa el resultado y las notas.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    const { status, result, notes } = this.form.getRawValue();
    this.vehicleService
      .updateInspection(this.plate(), { inspectionId: this.item().id, status, result: result.trim(), notes: notes.trim() })
      .subscribe({
        next: (vehicle) => {
          this.saving.set(false);
          this.saved.emit(vehicle);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, 'No se pudo guardar la inspección.'));
        }
      });
  }
}
