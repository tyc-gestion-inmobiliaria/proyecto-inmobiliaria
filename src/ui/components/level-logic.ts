/**
 * Las cuentas de `LevelBar`, puras para `node --test`.
 */

/**
 * En qué zona cae un valor contra su rango deseado.
 *
 * - `empty`: en cero o menos. No es "poco": es nada.
 * - `low`: en el piso o por debajo. **El piso cuenta como bajo**: es el punto
 *   en que hay que actuar (pedir, recargar), no el último valor aceptable.
 * - `ok`: por encima del piso y hasta el techo.
 * - `high`: pasado el techo.
 */
export type LevelZone = "empty" | "low" | "ok" | "high";

export function levelZone(value: number, low: number, high: number): LevelZone {
  if (!(value > 0)) return "empty";
  if (value <= low) return "low";
  if (value > high) return "high";
  return "ok";
}

export interface LevelPositions {
  /** Hasta dónde llega el relleno, en % del ancho. */
  fill: number;
  /** Dónde caen las marcas del piso y del techo, en %. */
  low: number;
  high: number;
  /** El valor que ocupa todo el ancho. */
  max: number;
}

/**
 * Dónde se dibuja cada cosa. La escala llega un cuarto más allá del techo,
 * para que "alto" tenga sitio donde verse, o hasta el valor si se pasó más.
 * Un valor chico pero real no desaparece: mínimo 2 %.
 */
export function levelPositions(value: number, low: number, high: number, max?: number): LevelPositions {
  const tope = Math.max(max ?? 0, high * 1.25, value, 1);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / tope) * 100));
  const fill = value > 0 ? Math.max(2, pct(value)) : 0;
  return { fill, low: pct(low), high: pct(high), max: tope };
}
