/**
 * Lo que los reportes necesitan de afuera: la tabla ya calculada. Con base,
 * la calcularía una vista o función de Postgres; en la maqueta, el
 * adaptador con las mismas cuentas del dominio. La pantalla solo la muestra.
 * Qué reportes hay lo dice el dominio (`REPORTES`).
 */
import type { ReporteId, TablaDeReporte } from "../dominio/reportes";

export interface ReportesPuerto {
  /** `edificioId` null: toda la cartera. */
  generar(id: ReporteId, edificioId: string | null): Promise<TablaDeReporte>;
}
