/**
 * La participación de cada unidad en los gastos del edificio, en porcentaje
 * con hasta cuatro decimales (`numeric(7,4)` en la tabla `unidad`).
 *
 * La suma oficial la da la vista `participacion_por_edificio`; esta copia
 * existe para avisar mientras se escribe, sin ir al servidor. Para no
 * arrastrar errores de coma flotante (0.1 + 0.2), se suma en diezmilésimas
 * enteras.
 */

const ESCALA = 10_000;
const CIEN = 100 * ESCALA;

export interface ResumenParticipacion {
  unidades: number;
  /** Unidades a las que todavía no se les puso participación. */
  sinParticipacion: number;
  /** Suma de las participaciones puestas. */
  total: number;
  /** Lo que falta para 100 (negativa si se pasa). */
  diferencia: number;
  /** Todas las unidades tienen participación y suman exactamente 100. */
  sumaCien: boolean;
}

function aDiezmilesimas(valor: number): number {
  return Math.round(valor * ESCALA);
}

export function resumirParticipacion(participaciones: readonly (number | null)[]): ResumenParticipacion {
  let total = 0;
  let sinParticipacion = 0;
  for (const p of participaciones) {
    if (p === null) sinParticipacion += 1;
    else total += aDiezmilesimas(p);
  }
  const unidades = participaciones.length;
  return {
    unidades,
    sinParticipacion,
    total: total / ESCALA,
    diferencia: (CIEN - total) / ESCALA,
    sumaCien: unidades > 0 && sinParticipacion === 0 && total === CIEN,
  };
}

export type LecturaParticipacion = { ok: true; valor: number | null } | { ok: false; error: string };

/**
 * Lee lo que la persona escribió en el campo. Vacío es "todavía sin
 * participación". Acepta coma o punto decimal y el signo % al final.
 */
export function leerParticipacion(texto: string): LecturaParticipacion {
  const limpio = texto.trim().replace(/\s*%$/, "").replace(",", ".");
  if (limpio === "") return { ok: true, valor: null };
  if (!/^\d{1,3}(\.\d+)?$/.test(limpio)) return { ok: false, error: "Escribe un número, por ejemplo 2,5" };
  const [, decimales = ""] = limpio.split(".");
  if (decimales.length > 4) return { ok: false, error: "Usa hasta cuatro decimales" };
  const valor = Number(limpio);
  if (valor > 100) return { ok: false, error: "No puede pasar de 100 %" };
  return { ok: true, valor };
}
