/**
 * Repartir un monto entre unidades según un peso (la participación, o el
 * consumo de agua), al céntimo.
 *
 * Es la misma regla que aplica la base (`private.repartir`): cada parte se
 * baja al céntimo y los céntimos que faltan para el total van, de a uno, a
 * las partes con mayor resto; a igual resto, por el orden en que se pasan (el
 * número de la unidad). La suma de las partes es exactamente el total. Acá
 * sirve para que el paso 2 muestre la cuota mientras se escribe; el recibo lo
 * calcula la base.
 *
 * Supuesto: el redondeo es por resto mayor (pregunta abierta en PB-15).
 */
import { aCentimos, deCentimos } from "./money";

export interface Peso<K extends string = string> {
  clave: K;
  peso: number;
}

export function repartir<K extends string>(total: number, pesos: readonly Peso<K>[]): Map<K, number> {
  const resultado = new Map<K, number>();
  const sumaPesos = pesos.reduce((n, p) => n + Math.max(0, p.peso), 0);
  const centimos = aCentimos(total);
  if (sumaPesos <= 0 || centimos <= 0) {
    for (const p of pesos) resultado.set(p.clave, 0);
    return resultado;
  }
  const brutos = pesos.map((p, orden) => {
    const exacto = (centimos * Math.max(0, p.peso)) / sumaPesos;
    // El redondeo a 9 decimales evita que 0.1 + 0.2 deje un resto fantasma.
    const limpio = Math.round(exacto * 1e9) / 1e9;
    const base = Math.floor(limpio);
    return { clave: p.clave, base, resto: limpio - base, orden };
  });
  let faltan = centimos - brutos.reduce((n, b) => n + b.base, 0);
  const porResto = [...brutos].sort((a, b) => b.resto - a.resto || a.orden - b.orden);
  const extra = new Set<K>();
  for (const b of porResto) {
    if (faltan <= 0) break;
    extra.add(b.clave);
    faltan -= 1;
  }
  for (const b of brutos) resultado.set(b.clave, deCentimos(b.base + (extra.has(b.clave) ? 1 : 0)));
  return resultado;
}
