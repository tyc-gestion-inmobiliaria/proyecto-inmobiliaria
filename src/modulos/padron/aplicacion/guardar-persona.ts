/**
 * Alta y edición de una persona del padrón. Valida antes de mandar (el error
 * va junto al campo, H9) y traduce el rechazo de la base al campo que lo
 * causó: un documento repetido se dice en el número de documento.
 */
import { validarPersona, type DatosPersona, type ErroresPersona, type Persona } from "../dominio/persona";
import type { FalloDelPadron, PersonasPuerto } from "./puertos";

export type ResultadoGuardarPersona =
  | { ok: true; persona: Persona }
  | { ok: false; errores: ErroresPersona; fallo?: FalloDelPadron };

export async function guardarPersona(
  personas: PersonasPuerto,
  orgId: string,
  datos: DatosPersona,
  id?: string,
): Promise<ResultadoGuardarPersona> {
  const validacion = validarPersona(datos);
  if (!validacion.ok) return { ok: false, errores: validacion.errores };

  const r = id
    ? await personas.actualizar(orgId, id, validacion.persona)
    : await personas.crear(orgId, validacion.persona);
  if (r.ok) return { ok: true, persona: r.valor };

  if (r.fallo === "repetido") {
    return { ok: false, fallo: r.fallo, errores: { documentoNumero: "Ya hay otra persona con este documento" } };
  }
  return { ok: false, fallo: r.fallo, errores: {} };
}
