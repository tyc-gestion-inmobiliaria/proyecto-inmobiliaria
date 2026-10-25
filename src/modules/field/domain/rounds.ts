/**
 * El recorrido de lecturas del personal en el edificio (PB-29). Reglas puras:
 * en qué orden se pasa por las unidades, cuál sigue y cuánto falta.
 *
 * El personal camina el edificio piso por piso: las unidades van en el orden
 * de su número ("101", "102", "201"…, con los números comparados como
 * números), y "la siguiente" es la próxima sin lectura después de la que se
 * acaba de guardar; al llegar al final vuelve a la primera que falte.
 *
 * Las formas son las mínimas que necesita cada regla: este módulo no define
 * la lectura, que es de la cobranza.
 */

export interface PasoDelRecorrido {
  id: string;
  unidadNumero: string;
  actual: number | null;
}

const NUMEROS = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Las unidades en el orden en que se recorren. */
export function ordenDelRecorrido<T extends Pick<PasoDelRecorrido, "unidadNumero">>(lecturas: readonly T[]): T[] {
  return [...lecturas].sort((a, b) => NUMEROS.compare(a.unidadNumero, b.unidadNumero));
}

export const tieneLectura = (l: Pick<PasoDelRecorrido, "actual">) => l.actual !== null;

/**
 * La próxima sin lectura después de `desdeId`, dando la vuelta si hace
 * falta; `null` si ya no falta ninguna. Sin `desdeId`, la primera que falte.
 */
export function siguientePendiente<T extends PasoDelRecorrido>(lecturas: readonly T[], desdeId?: string): T | null {
  const orden = ordenDelRecorrido(lecturas);
  const desde = desdeId ? orden.findIndex((l) => l.id === desdeId) : -1;
  for (let i = 1; i <= orden.length; i++) {
    const l = orden[(desde + i + orden.length) % orden.length];
    if (l && !tieneLectura(l) && l.id !== desdeId) return l;
  }
  return null;
}

export interface AvanceDelRecorrido {
  hechas: number;
  total: number;
  faltan: number;
  /** "9 de 18". */
  texto: string;
}

export function avanceDelRecorrido(lecturas: readonly Pick<PasoDelRecorrido, "actual">[]): AvanceDelRecorrido {
  const hechas = lecturas.filter(tieneLectura).length;
  return { hechas, total: lecturas.length, faltan: lecturas.length - hechas, texto: `${hechas} de ${lecturas.length}` };
}
