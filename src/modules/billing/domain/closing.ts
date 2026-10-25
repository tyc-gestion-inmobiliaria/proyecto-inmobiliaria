/**
 * El cierre mensual de un edificio en cuatro pasos (PB-13): Lecturas,
 * Presupuesto, Revisar recibos y Emitir. El borrador recuerda el paso donde
 * quedó; emitido, ya no cambia.
 */
import type { Periodo } from "./period";

export const PASOS = [
  { paso: 1, clave: "lecturas", titulo: "Lecturas" },
  { paso: 2, clave: "presupuesto", titulo: "Presupuesto" },
  { paso: 3, clave: "revision", titulo: "Revisar recibos" },
  { paso: 4, clave: "emision", titulo: "Emitir" },
] as const;

export type NumeroDePaso = (typeof PASOS)[number]["paso"];
export type ClaveDePaso = (typeof PASOS)[number]["clave"];
export type EstadoDelCierre = "borrador" | "emitido";
export type EstadoDelPaso = "done" | "current" | "blocked" | "upcoming";

export interface Cierre {
  id: string;
  orgId: string;
  edificioId: string;
  periodo: Periodo;
  estado: EstadoDelCierre;
  paso: NumeroDePaso;
  montoAgua: number;
  /** Porcentaje sobre el promedio del edificio a partir del cual un consumo es atípico. */
  umbralAtipico: number;
  vence: string | null;
}

export function esNumeroDePaso(n: unknown): n is NumeroDePaso {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export function claveDePaso(n: NumeroDePaso): ClaveDePaso {
  return PASOS[n - 1].clave;
}

export function pasoDeClave(clave: string): NumeroDePaso | undefined {
  return PASOS.find((p) => p.clave === clave)?.paso;
}

/** Lo que se sabe del avance para decir el estado de cada paso. */
export interface AvanceDelCierre {
  lecturasConError: number;
  montoAguaEscrito: boolean;
  partidas: number;
  bloqueantes: number;
}

/**
 * Qué falta para pasar del paso `paso` al siguiente, o null si nada. Lo dice
 * el botón Continuar en lugar de quedar atenuado sin motivo.
 */
export function queFaltaParaContinuar(paso: NumeroDePaso, avance: AvanceDelCierre): string | null {
  if (paso === 1) {
    if (avance.lecturasConError > 0) {
      return avance.lecturasConError === 1 ? "Corrige la lectura marcada" : `Corrige las ${avance.lecturasConError} lecturas marcadas`;
    }
    if (!avance.montoAguaEscrito) return "Falta el monto del recibo de agua del edificio";
  }
  if (paso === 2 && avance.partidas === 0) return "Agrega al menos una partida al presupuesto";
  if (paso === 3 && avance.bloqueantes > 0) {
    return avance.bloqueantes === 1 ? "Resuelve la validación que bloquea" : `Resuelve las ${avance.bloqueantes} validaciones que bloquean`;
  }
  return null;
}

/** El estado de cada paso para el indicador: lo anterior al guardado, hecho; lo que bloquea, marcado. */
export function estadosDeLosPasos(cierre: Pick<Cierre, "estado" | "paso">, avance: AvanceDelCierre): Record<NumeroDePaso, EstadoDelPaso> {
  const estados = {} as Record<NumeroDePaso, EstadoDelPaso>;
  for (const { paso } of PASOS) {
    if (cierre.estado === "emitido") estados[paso] = "done";
    else if (paso < cierre.paso) estados[paso] = queFaltaParaContinuar(paso, avance) ? "blocked" : "done";
    else if (paso === cierre.paso) estados[paso] = "current";
    else if (paso === 4 && avance.bloqueantes > 0) estados[paso] = "blocked";
    else estados[paso] = "upcoming";
  }
  return estados;
}

/** A qué paso se puede ir desde el indicador: en borrador, hasta el guardado; emitido, a todos (para mirar). */
export function pasoAlcanzable(cierre: Pick<Cierre, "estado" | "paso">, destino: NumeroDePaso): boolean {
  return cierre.estado === "emitido" || destino <= cierre.paso;
}
