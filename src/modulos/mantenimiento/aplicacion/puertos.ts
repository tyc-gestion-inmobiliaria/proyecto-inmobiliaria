/**
 * Lo que el mantenimiento necesita de afuera. Hoy solo lo implementa la
 * maqueta; la versión con Supabase falta (no hay tablas `equipo`,
 * `proveedor` ni `tarea_de_mantenimiento`).
 */
import type { Equipo, Proveedor, TareaDeMantenimiento } from "../dominio/mantenimiento";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface DelEdificio {
  equipos: Equipo[];
  proveedores: Proveedor[];
  tareas: TareaDeMantenimiento[];
}

export interface MantenimientoPuerto {
  delEdificio(edificioId: string): Promise<DelEdificio>;
  /** Marca la tarea hecha hoy y devuelve la tarea con su fecha siguiente. */
  marcarHecha(tareaId: string): Promise<Resultado<TareaDeMantenimiento>>;
}
