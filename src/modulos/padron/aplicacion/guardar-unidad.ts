/**
 * Caso de uso: dar de alta o editar una unidad de un edificio (PB-08).
 *
 * Valida antes de mandar (el error va junto al campo, H9) y traduce el
 * rechazo de la base: el número repetido cae en el campo Número; lo demás
 * (permiso, red) va como mensaje general.
 */
import {
  MENSAJE_NUMERO_REPETIDO,
  validarUnidad,
  type DatosUnidad,
  type ErroresUnidad,
  type Unidad,
} from "../dominio/unidad";
import { mensajeDelFallo } from "./mensajes";
import type { UnidadesPuerto } from "./puertos";

export type ResultadoGuardarUnidad = { ok: true; unidad: Unidad } | { ok: false; errores: ErroresUnidad; general?: string };

export async function guardarUnidad(
  unidades: UnidadesPuerto,
  {
    orgId,
    edificioId,
    datos,
    otras = [],
    id,
  }: {
    orgId: string;
    edificioId: string;
    datos: DatosUnidad;
    /** Las unidades del edificio, para avisar del número repetido sin ir a la base. */
    otras?: readonly Pick<Unidad, "id" | "numero">[];
    /** Con `id` se edita esa unidad; sin él, se da de alta una nueva. */
    id?: string;
  },
): Promise<ResultadoGuardarUnidad> {
  const v = validarUnidad(datos, otras, id);
  if (!v.ok) return { ok: false, errores: v.errores };

  const r = id ? await unidades.actualizar(orgId, id, v.unidad) : await unidades.crear(orgId, edificioId, v.unidad);
  if (r.ok) return { ok: true, unidad: r.valor };
  if (r.fallo === "repetido") return { ok: false, errores: { numero: MENSAJE_NUMERO_REPETIDO } };
  return { ok: false, errores: {}, general: mensajeDelFallo(r.fallo) };
}
