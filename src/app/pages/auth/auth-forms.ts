import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Valida que `confirm` coincida con `password` dentro del mismo grupo. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
};

/** Mensaje de error del control si ya fue tocado o se intentó enviar el formulario. */
export function fieldError(control: AbstractControl | null, submitted: boolean): string | null {
  if (!control || control.valid || !(control.touched || submitted)) return null;
  const errors = control.errors ?? {};
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['email']) return 'Ingresa un correo válido, por ejemplo nombre@dominio.com.';
  if (errors['minlength']) return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength']) return `No puede superar ${errors['maxlength'].requiredLength} caracteres.`;
  return 'Revisa este campo.';
}

/** Solo rutas internas, para evitar redirecciones abiertas a otros sitios. */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/';
}
