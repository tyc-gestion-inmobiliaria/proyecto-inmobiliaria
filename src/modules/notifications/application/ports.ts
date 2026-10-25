/**
 * Lo que las notificaciones necesitan de afuera. Leer rechaza si no se pudo:
 * decir "todo enviado" cuando no se pudo leer sería mentir.
 */
import type { Envio } from "../domain/delivery";

export interface NotificacionesPuerto {
  /** Los correos de los recibos de un cierre. */
  delCierre(orgId: string, cierreId: string): Promise<Envio[]>;
}
