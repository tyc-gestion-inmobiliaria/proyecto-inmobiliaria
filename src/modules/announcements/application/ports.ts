/**
 * Lo que los comunicados necesitan de afuera. Hoy solo lo implementa la
 * maqueta; la versión con Supabase falta (no hay tabla `comunicado`). Con
 * base, publicar sería una función que valida el rol y el estado anterior.
 */
import type { Audiencia, Comunicado } from "../domain/announcement";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface ComunicadoAGuardar {
  /** Sin id: uno nuevo. */
  id?: string;
  edificioId: string;
  titulo: string;
  cuerpo: string;
  audiencia: Audiencia;
}

export interface ComunicadosPuerto {
  delEdificio(edificioId: string): Promise<Comunicado[]>;
  /** Guarda como borrador o publica; uno ya publicado no se toca. */
  guardar(c: ComunicadoAGuardar, publicar: boolean): Promise<Resultado<Comunicado>>;
}
