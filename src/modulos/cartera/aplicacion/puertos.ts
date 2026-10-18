/**
 * Lo que la vista de cartera necesita de afuera, además de la lista de
 * edificios que da el padrón (`EdificiosPuerto`). Se lee para toda la
 * administradora de una vez, no edificio por edificio.
 *
 * Leer rechaza si no se pudo: decir "sin cuenta bancaria" cuando no se pudo
 * leer sería mentir.
 */
import type { EstadoDelPadron } from "../dominio/cartera";

export interface EstadoDeLaCarteraPuerto {
  /** Unidades y suma de participaciones de cada edificio, por id de edificio. */
  padronPorEdificio(orgId: string): Promise<Map<string, EstadoDelPadron>>;
  /** Los ids de los edificios que tienen al menos una cuenta bancaria. */
  edificiosConCuenta(orgId: string): Promise<Set<string>>;
}
