/** ¿Animar con JavaScript? No si la persona pidió menos movimiento, ni donde no se puede saber. */
export function motionAllowed(): boolean {
  return (
    typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
