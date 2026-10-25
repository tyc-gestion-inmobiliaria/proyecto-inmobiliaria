/**
 * Lo que la vista de cartera necesita de afuera, además de la lista de
 * edificios que da el padrón (`EdificiosPuerto`). Se lee para toda la
 * administradora de una vez, no edificio por edificio.
 *
 * Leer rechaza si no se pudo: decir "sin cuenta bancaria" cuando no se pudo
 * leer sería mentir.
 */
import type { CierreDelMes, EstadoDelPadron } from "../domain/portfolio";

export interface EstadoDeLaCarteraPuerto {
  /** Unidades y suma de participaciones de cada edificio, por id de edificio. */
  padronPorEdificio(orgId: string): Promise<Map<string, EstadoDelPadron>>;
  /** Los ids de los edificios que tienen al menos una cuenta bancaria. */
  edificiosConCuenta(orgId: string): Promise<Set<string>>;
  /** El cierre del periodo de cada edificio que ya lo abrió, por id de edificio. */
  cierresDelPeriodo(orgId: string, periodo: string): Promise<Map<string, CierreDelMes>>;
}
