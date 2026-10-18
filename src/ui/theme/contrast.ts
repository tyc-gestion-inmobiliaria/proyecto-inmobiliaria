/**
 * El contraste entre dos colores, como lo define WCAG 2.
 *
 * Vive en el kit y no solo en las pruebas porque sirve a quien arma un tema
 * propio: antes de dar por bueno un color de marca se puede preguntar si el
 * texto blanco encima se lee.
 */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un `#rrggbb` (o `#rgb`). */
export function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Color no válido: ${hex}`);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** De 1 (iguales) a 21 (negro sobre blanco). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** El mínimo de WCAG AA para texto normal. */
export const MIN_TEXT_CONTRAST = 4.5;
