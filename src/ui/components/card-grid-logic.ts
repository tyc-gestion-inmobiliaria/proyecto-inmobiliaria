/**
 * Cuántas columnas entran en una rejilla de tarjetas y cuánto mide cada una.
 *
 * Las tarjetas de una rejilla miden todas lo mismo: la última de una fila
 * impar se queda del ancho de las demás en vez de estirarse hasta la otra
 * punta, que la hace leer como otra cosa.
 */
export function columnasDeRejilla(
  ancho: number,
  minimo: number,
  separacion: number,
  maximo = Number.POSITIVE_INFINITY,
): { columnas: number; anchoDeCelda: number } {
  if (ancho <= 0) return { columnas: 1, anchoDeCelda: 0 };
  const entran = Math.floor((ancho + separacion) / (minimo + separacion));
  const columnas = Math.max(1, Math.min(maximo, entran));
  const anchoDeCelda = Math.floor((ancho - separacion * (columnas - 1)) / columnas);
  return { columnas, anchoDeCelda };
}
