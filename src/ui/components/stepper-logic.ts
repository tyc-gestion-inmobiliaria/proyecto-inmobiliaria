/**
 * La lógica del `Stepper`, sin React Native, para probarla con `node --test`.
 */

/** El valor después de un paso, sin salirse de los topes. */
export function stepValue(value: number, delta: number, min: number, max: number): number {
  const base = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, base + delta));
}

/** Si todavía se puede bajar o subir. */
export function canStep(value: number, min: number, max: number): { down: boolean; up: boolean } {
  return { down: value > min, up: value < max };
}
