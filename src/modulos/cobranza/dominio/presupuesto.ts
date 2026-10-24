/**
 * Las partidas del presupuesto del mes (PB-15): concepto y monto. El total se
 * reparte entre las unidades por participación.
 *
 * Supuesto: el presupuesto es mensual y vive en el paso 2; si además hay uno
 * anual, es pregunta abierta.
 */
import { leerMonto, sumar } from "./dinero";

export interface Partida {
  concepto: string;
  monto: number;
}

/** Una fila del formulario, como se escribe. */
export interface FilaDePartida {
  clave: string;
  concepto: string;
  monto: string;
}

export interface ErroresDePartida {
  concepto?: string;
  monto?: string;
}

export const LARGO_CONCEPTO = 120;

export function validarPartida(fila: Pick<FilaDePartida, "concepto" | "monto">): ErroresDePartida {
  const errores: ErroresDePartida = {};
  const concepto = fila.concepto.trim();
  if (concepto === "") errores.concepto = "Falta el concepto";
  else if (concepto.length > LARGO_CONCEPTO) errores.concepto = `Hasta ${LARGO_CONCEPTO} caracteres`;
  const monto = leerMonto(fila.monto);
  if (fila.monto.trim() === "") errores.monto = "Falta el monto";
  else if (monto === null) errores.monto = "Escribe un monto, por ejemplo 1250.50";
  else if (monto <= 0) errores.monto = "El monto tiene que ser mayor que cero";
  return errores;
}

/** Las partidas listas para guardar, o los errores de cada fila. Las filas del todo vacías no cuentan. */
export function leerPartidas(
  filas: readonly FilaDePartida[],
): { ok: true; partidas: Partida[] } | { ok: false; errores: Record<string, ErroresDePartida> } {
  const errores: Record<string, ErroresDePartida> = {};
  const partidas: Partida[] = [];
  for (const f of filas) {
    if (f.concepto.trim() === "" && f.monto.trim() === "") continue;
    const e = validarPartida(f);
    if (e.concepto || e.monto) errores[f.clave] = e;
    else partidas.push({ concepto: f.concepto.trim().replace(/\s+/g, " "), monto: leerMonto(f.monto) as number });
  }
  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, partidas };
}

/** El total de lo que ya se lee bien, para mostrarlo mientras se escribe. */
export function totalDeFilas(filas: readonly Pick<FilaDePartida, "monto">[]): number {
  return sumar(filas.map((f) => leerMonto(f.monto)).filter((m): m is number => m !== null && m > 0));
}

export function filasDePartidas(partidas: readonly Partida[], nuevaClave: () => string): FilaDePartida[] {
  return partidas.map((p) => ({ clave: nuevaClave(), concepto: p.concepto, monto: p.monto.toFixed(2) }));
}
