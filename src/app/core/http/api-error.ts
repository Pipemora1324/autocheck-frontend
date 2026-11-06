import { HttpErrorResponse } from '@angular/common/http';
import { isServerWakingError, SERVER_WAKING_MESSAGE } from './server-status.service';

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Códigos de error que el frontend trata de forma especial (ver docs/API.md del backend). */
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

const body = (error: HttpErrorResponse): ApiErrorBody =>
  error.error && typeof error.error === 'object' ? (error.error as ApiErrorBody) : {};

/** Campo `code` del cuerpo de error, si lo hay. */
export function apiErrorCode(error: unknown): string | undefined {
  return error instanceof HttpErrorResponse ? body(error).code : undefined;
}

/** Mensaje en español para mostrar al usuario a partir de un error de la API. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  // Render (plan gratuito) se duerme: en vez de un error seco se explica que está despertando.
  if (isServerWakingError(error)) return SERVER_WAKING_MESSAGE;
  const { message, errors, code } = body(error);
  // Los 5xx con código (servicio opcional apagado u ocupado) traen un mensaje pensado para el usuario.
  if (error.status >= 500) return code && message ? message : 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.';
  if (error.status === 400 && errors?.length) return errors[0].message;
  return message ?? fallback;
}

/** Errores de validación del backend agrupados por campo. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return {};
  return Object.fromEntries((body(error).errors ?? []).map(({ field, message }) => [field, message]));
}
