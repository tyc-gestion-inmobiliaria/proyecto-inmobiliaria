/**
 * Caso de uso: dar de alta o editar un edificio (PB-07).
 *
 * Valida antes de mandar, para no gastar una petición en un formulario con
 * errores, y traduce lo que responde la base: el nombre repetido va junto al
 * campo Nombre, que es lo que la persona corrige; lo demás (permiso, red) no
 * es de ningún campo y va como mensaje general.
 */
import {
  hayErrores,
  limpiarEdificio,
  MENSAJE_NOMBRE_REPETIDO,
  validarEdificio,
  type DatosEdificio,
  type Edificio,
  type ErroresEdificio,
} from "../dominio/edificio";
import type { EdificiosPuerto, FalloAlGuardar } from "./puertos";

export type ResultadoGuardarEdificio =
  | { ok: true; edificio: Edificio }
  | { ok: false; campos: ErroresEdificio; general?: string };

const MENSAJE: Record<Exclude<FalloAlGuardar, "nombre-repetido">, string> = {
  "sin-permiso": "Tu rol no permite registrar ni editar edificios. Pídeselo a un administrador.",
  "no-existe": "Este edificio ya no está en la cartera. Vuelve a la lista y ábrelo otra vez.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo guardar el edificio. Inténtalo de nuevo en un momento.",
};

export async function guardarEdificio(
  puerto: EdificiosPuerto,
  {
    orgId,
    datos,
    existentes = [],
    id,
  }: {
    orgId: string;
    datos: DatosEdificio;
    /** Los edificios ya registrados, para avisar del nombre repetido sin ir a la base. */
    existentes?: readonly Pick<Edificio, "id" | "nombre">[];
    /** Con `id` se edita ese edificio; sin él, se da de alta uno nuevo. */
    id?: string;
  },
): Promise<ResultadoGuardarEdificio> {
  const campos = validarEdificio(datos, existentes, id);
  if (hayErrores(campos)) return { ok: false, campos };

  const limpio = limpiarEdificio(datos);
  const r = id ? await puerto.actualizar(orgId, id, limpio) : await puerto.crear(orgId, limpio);
  if (r.ok) return r;
  if (r.fallo === "nombre-repetido") return { ok: false, campos: { nombre: MENSAJE_NOMBRE_REPETIDO } };
  return { ok: false, campos: {}, general: MENSAJE[r.fallo] };
}
