/**
 * Lo que las incidencias necesitan de afuera. Hoy solo lo implementa la
 * maqueta; la versión con Supabase falta (no hay tabla todavía).
 *
 * Leer rechaza si no se pudo. Escribir devuelve el fallo como texto que la
 * pantalla puede decir.
 */
import type { EstadoDeIncidencia, Incidencia, Prioridad } from "../domain/incident";

export interface UnidadCorta {
  id: string;
  numero: string;
}

export interface IncidenciaNueva {
  edificioId: string;
  unidadId: string | null;
  titulo: string;
  detalle: string | null;
  prioridad: Prioridad;
}

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface IncidenciasPuerto {
  delEdificio(edificioId: string): Promise<Incidencia[]>;
  unidades(edificioId: string): Promise<UnidadCorta[]>;
  registrar(nueva: IncidenciaNueva): Promise<Resultado<Incidencia>>;
  cambiarEstado(id: string, estado: EstadoDeIncidencia): Promise<Resultado<Incidencia>>;
}
