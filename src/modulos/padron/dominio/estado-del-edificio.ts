/**
 * Qué le falta al padrón de un edificio para poder cobrarle, en palabras:
 * para la tarjeta de cada edificio en la lista (PB-07). Es la misma regla que
 * usa el cierre para dejar emitir: unidades, participación que suma 100 % y
 * una cuenta bancaria donde pagar.
 */
import { textoDePorcentaje, type ResumenParticipacion } from "./participacion";

export interface EstadoDelPadron {
  listo: boolean;
  /** "Padrón completo" o lo primero que falta. */
  texto: string;
  /** Todo lo que falta, en orden. */
  faltan: string[];
}

export function estadoDelPadron(participacion: ResumenParticipacion, cuentas: number): EstadoDelPadron {
  const faltan: string[] = [];
  if (participacion.unidades === 0) faltan.push("Sin unidades");
  else if (participacion.sinParticipacion > 0) {
    faltan.push(`${participacion.sinParticipacion} ${participacion.sinParticipacion === 1 ? "unidad" : "unidades"} sin participación`);
  } else if (!participacion.sumaCien) faltan.push(`La participación suma ${textoDePorcentaje(participacion.total)}`);
  if (cuentas === 0) faltan.push("Sin cuenta bancaria");
  return { listo: faltan.length === 0, texto: faltan[0] ?? "Padrón completo", faltan };
}
