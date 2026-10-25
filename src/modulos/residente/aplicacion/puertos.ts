/**
 * Lo que el portal del residente necesita de afuera, además de los puertos
 * de la cobranza (su estado de cuenta) y de los pagos (reportar y ver los
 * suyos), que le pasa la ruta.
 *
 * Leer rechaza si no se pudo: decir "no tienes unidades" cuando no se pudo
 * leer sería mentir.
 */
import type { MiUnidad } from "../dominio/mi-unidad";

export interface ResidentePuerto {
  /** Las unidades de la cuenta con sesión en esa administradora. */
  misUnidades(orgId: string): Promise<MiUnidad[]>;
}
