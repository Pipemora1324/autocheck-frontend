import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

const body = (error: HttpErrorResponse): ApiErrorBody =>
  error.error && typeof error.error === 'object' ? (error.error as ApiErrorBody) : {};

/** Mensaje en español para mostrar al usuario a partir de un error de la API. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  if (error.status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.';
  const { message, errors } = body(error);
  if (error.status === 400 && errors?.length) return errors[0]!.message;
  return message ?? fallback;
}

/** Errores de validación del backend agrupados por campo. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return {};
  return Object.fromEntries((body(error).errors ?? []).map(({ field, message }) => [field, message]));
}
