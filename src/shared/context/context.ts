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

/** Lo que el selector necesita de afuera: los edificios de la administradora (los da el padrón). */
export interface EdificiosDelContextoPuerto {
  listar(orgId: string): Promise<EdificioDelContexto[]>;
}

/**
 * El edificio que nombra la dirección: `/buildings/<id>/…`. Cuando se entra a
 * un edificio por un enlace, la ficha manda sobre lo que había quedado
 * elegido arriba; si no, el selector diría un edificio y la pantalla otro.
 * `/buildings/new` es el alta, no un edificio.
 */
export function edificioDeLaRuta(ruta: string): string | null {
  const m = /^\/buildings\/([^/]+)/.exec(ruta);
  if (!m || m[1] === "new") return null;
  return decodeURIComponent(m[1]);
}

/**
 * Adónde lleva cambiar el edificio de arriba estando dentro de uno: al mismo
 * lugar del otro edificio si existe en todos (el cierre, las unidades), y si
 * no (una unidad, una cuenta, que son de ese edificio), a sus unidades. Con
 * toda la cartera, a la lista de edificios. Fuera de un edificio, no se
 * navega: la sección se recorta sola. `null` es quedarse donde se está.
 */
export function rutaAlCambiarDeEdificio(ruta: string, id: string | null): string | null {
  const actual = edificioDeLaRuta(ruta);
  if (!actual) return null;
  if (!id) return "/buildings";
  if (id === actual) return null;
  const resto = ruta.slice(`/buildings/${encodeURIComponent(actual)}`.length);
  const destino = encodeURIComponent(id);
  if (resto === "/closing") return `/buildings/${destino}/closing`;
  return `/buildings/${destino}/units`;
}
