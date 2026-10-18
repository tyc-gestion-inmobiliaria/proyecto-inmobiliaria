/**
 * El contexto de trabajo: toda la cartera de la administradora o un solo
 * edificio (PB-10). Es el "Edificio A ▾" del menú de los wireframes.
 *
 * Reglas puras, sin React ni Supabase. Lo que una sección muestra se filtra
 * con `edificioId`; la RLS sigue siendo la que impide ver otra administradora.
 */

export interface EdificioDelContexto {
  id: string;
  nombre: string;
}

/** El valor del selector que significa "sin elegir edificio". */
export const TODA_LA_CARTERA = "cartera";

/**
 * El edificio en el que se trabaja: el elegido si sigue en la lista; si no
 * (lo borraron, cambió la administradora), ninguno, que es la cartera entera.
 */
export function edificioEnCurso(
  edificios: readonly EdificioDelContexto[],
  elegido: string | null,
): EdificioDelContexto | null {
  if (!elegido || elegido === TODA_LA_CARTERA) return null;
  return edificios.find((e) => e.id === elegido) ?? null;
}

/** Lo que el puerto necesita de afuera: los edificios de la administradora. */
export interface EdificiosDelContextoPuerto {
  listar(orgId: string): Promise<EdificioDelContexto[]>;
}
