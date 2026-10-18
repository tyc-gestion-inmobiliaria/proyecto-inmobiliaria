/**
 * Las cuentas de `CellWithBar` y `FitNumber`, puras para `node --test`.
 */

/** El ancho de la barra en %. Un valor chico pero real no desaparece: mínimo 2 %. */
export function barWidth(ratio: number): number {
  if (!(ratio > 0)) return 0;
  return Math.min(Math.max(ratio * 100, 2), 100);
}

/** Lo que avanza un carácter monoespaciado, en emes. */
export const CHAR_ADVANCE = 0.6;

/** El tamaño de letra con el que `text` entra en `width`, entre `min` y `size`. */
export function fitFontSize(text: string, width: number, size: number, min: number): number {
  if (width <= 0 || text.length === 0) return size;
  const fits = Math.floor(width / (text.length * CHAR_ADVANCE));
  return Math.max(min, Math.min(size, fits));
}
