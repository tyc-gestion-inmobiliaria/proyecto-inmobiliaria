/**
 * Lo que el padrón necesita de afuera. Supabase lo implementa en
 * `infraestructura/`; las pruebas, con un falso.
 */
import type { Edificio, EdificioLimpio } from "../dominio/edificio";

/** Por qué no se pudo guardar, en categorías que la pantalla sabe decir. */
export type FalloAlGuardar = "nombre-repetido" | "sin-permiso" | "no-existe" | "sin-conexion" | "sin-configurar" | "desconocido";

export type ResultadoGuardado = { ok: true; edificio: Edificio } | { ok: false; fallo: FalloAlGuardar };

export interface EdificiosPuerto {
  /** Cuántos edificios tiene registrados la administradora. */
  contar(orgId: string): Promise<number>;
  /** Los edificios de la administradora. Si no se pudieron leer, rechaza. */
  listar(orgId: string): Promise<Edificio[]>;
  crear(orgId: string, datos: EdificioLimpio): Promise<ResultadoGuardado>;
  actualizar(orgId: string, id: string, datos: EdificioLimpio): Promise<ResultadoGuardado>;
}
