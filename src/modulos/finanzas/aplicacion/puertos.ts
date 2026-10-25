/**
 * Lo que las finanzas necesitan de afuera. El resumen llega calculado: con
 * base lo haría una función de Postgres; en la maqueta, el adaptador. La
 * pantalla solo lo muestra. La versión con Supabase falta (no hay tablas
 * `fondo` ni `movimiento` todavía).
 */
import type { EgresoNuevo, Movimiento, ResumenDelMes } from "../dominio/finanzas";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface FinanzasPuerto {
  /** El mes en curso del edificio. */
  resumen(edificioId: string): Promise<ResumenDelMes>;
  registrarEgreso(edificioId: string, egreso: EgresoNuevo): Promise<Resultado<Movimiento>>;
}
