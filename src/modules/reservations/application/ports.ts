/**
 * Lo que las reservas necesitan de afuera. Hoy solo lo implementa la
 * maqueta; la versión con Supabase falta (no hay tablas todavía). Con base,
 * "al día" lo diría una vista de `cobranza` y `pagos`, y la regla la
 * volvería a validar la función que reserva.
 */
import type { AreaComun, EstadoDeReserva, Reserva, Turno } from "../domain/reservation";

export interface UnidadParaReservar {
  id: string;
  numero: string;
  /** Sin deuda vencida. */
  alDia: boolean;
}

export interface ReservaNueva {
  edificioId: string;
  areaId: string;
  unidadId: string;
  fecha: string;
  turno: Turno;
}

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface ReservasPuerto {
  areas(edificioId: string): Promise<AreaComun[]>;
  delEdificio(edificioId: string): Promise<Reserva[]>;
  unidades(edificioId: string): Promise<UnidadParaReservar[]>;
  reservar(nueva: ReservaNueva): Promise<Resultado<Reserva>>;
  cambiarEstado(id: string, estado: EstadoDeReserva): Promise<Resultado<Reserva>>;
}
