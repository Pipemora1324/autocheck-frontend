export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Valida la foto antes de subirla; el backend vuelve a validar la firma real del archivo. */
export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'La foto debe ser JPEG, PNG o WEBP.';
  if (file.size > IMAGE_MAX_BYTES) return 'La foto pesa más de 5 MB. Toma una con menor resolución o recórtala.';
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}
