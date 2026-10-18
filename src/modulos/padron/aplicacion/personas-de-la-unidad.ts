/**
 * Casos de uso: agregar una persona a una unidad y editar a quien ya está
 * (PB-08). En la misma pantalla se elige su vínculo (propietario, inquilino o
 * residente) y si es la responsable de pago.
 *
 * Son varios pedidos seguidos (persona, vínculo, responsable) y cualquiera
 * puede fallar después de que el anterior quedó guardado. Por eso el
 * resultado devuelve lo que sí quedó (`persona`, `vinculo`): la pantalla lo
 * toma y el siguiente intento sigue desde ahí, sin registrar dos veces a la
 * misma persona.
 */
import { validarPersona, type DatosPersona, type ErroresPersona, type Persona } from "../dominio/persona";
import { yaVinculada, type Relacion, type Vinculo } from "../dominio/vinculo";
import { guardarPersona } from "./guardar-persona";
import { mensajeDelFallo } from "./mensajes";
import type { PersonasPuerto, VinculosPuerto } from "./puertos";

export type ErroresPersonaEnUnidad = ErroresPersona & { personaId?: string; relacion?: string };

export type ResultadoPersonaEnUnidad =
  | { ok: true; vinculo: Vinculo }
  | { ok: false; errores: ErroresPersonaEnUnidad; general?: string; persona?: Persona; vinculo?: Vinculo };

export interface PuertosPersonaEnUnidad {
  personas: PersonasPuerto;
  vinculos: VinculosPuerto;
}

/** Una persona nueva, con lo que se escribió, o una que ya está en el padrón. */
export type QuienSeAgrega = { modo: "nueva"; datos: DatosPersona } | { modo: "existente"; personaId: string };

export const MENSAJE_SIN_RELACION = "Elige si es propietario, inquilino o residente";
export const MENSAJE_YA_ESTA = "Esta persona ya está en la unidad";

function hay(errores: object): boolean {
  return Object.keys(errores).length > 0;
}

async function marcarResponsable(
  vinculos: VinculosPuerto,
  orgId: string,
  vinculo: Vinculo,
  responsable: boolean,
): Promise<ResultadoPersonaEnUnidad> {
  if (!responsable || vinculo.responsablePago) return { ok: true, vinculo };
  const r = await vinculos.elegirResponsable(orgId, vinculo.id);
  if (r.ok) return { ok: true, vinculo: { ...vinculo, responsablePago: true } };
  return {
    ok: false,
    errores: {},
    vinculo,
    general: `Quedó en la unidad, pero no se marcó como responsable de pago. ${mensajeDelFallo(r.fallo)}`,
  };
}

export async function agregarPersonaALaUnidad(
  { personas, vinculos }: PuertosPersonaEnUnidad,
  {
    orgId,
    unidadId,
    quien,
    relacion,
    responsable,
    vinculosDeLaUnidad,
  }: {
    orgId: string;
    unidadId: string;
    quien: QuienSeAgrega;
    relacion: Relacion | undefined;
    responsable: boolean;
    /** Los vínculos que ya tiene la unidad, para avisar sin ir a la base. */
    vinculosDeLaUnidad: readonly Vinculo[];
  },
): Promise<ResultadoPersonaEnUnidad> {
  const errores: ErroresPersonaEnUnidad = {};
  if (quien.modo === "nueva") {
    const v = validarPersona(quien.datos);
    if (!v.ok) Object.assign(errores, v.errores);
  } else if (!quien.personaId) {
    errores.personaId = "Elige a la persona";
  } else if (yaVinculada(vinculosDeLaUnidad, unidadId, quien.personaId)) {
    errores.personaId = MENSAJE_YA_ESTA;
  }
  if (!relacion) errores.relacion = MENSAJE_SIN_RELACION;
  if (hay(errores) || !relacion) return { ok: false, errores };

  let persona: Persona | undefined;
  let personaId: string;
  if (quien.modo === "nueva") {
    const alta = await guardarPersona(personas, orgId, quien.datos);
    if (!alta.ok) return { ok: false, errores: alta.errores, general: alta.fallo && !hay(alta.errores) ? mensajeDelFallo(alta.fallo) : undefined };
    persona = alta.persona;
    personaId = alta.persona.id;
  } else {
    personaId = quien.personaId;
  }

  const v = await vinculos.vincular(orgId, { unidadId, personaId, relacion });
  if (!v.ok) {
    if (v.fallo === "repetido") return { ok: false, persona, errores: { personaId: MENSAJE_YA_ESTA } };
    const general = persona
      ? `${persona.nombre} quedó registrada, pero no se agregó a la unidad. ${mensajeDelFallo(v.fallo)}`
      : mensajeDelFallo(v.fallo);
    return { ok: false, persona, errores: {}, general };
  }

  const r = await marcarResponsable(vinculos, orgId, v.valor, responsable);
  return r.ok ? r : { ...r, persona };
}

export async function editarPersonaDeLaUnidad(
  { personas, vinculos }: PuertosPersonaEnUnidad,
  {
    orgId,
    vinculo,
    datos,
    relacion,
    responsable,
  }: {
    orgId: string;
    vinculo: Vinculo;
    /** Los datos de la persona como quedaron en el formulario. */
    datos: DatosPersona;
    relacion: Relacion | undefined;
    responsable: boolean;
  },
): Promise<ResultadoPersonaEnUnidad> {
  const errores: ErroresPersonaEnUnidad = {};
  const v = validarPersona(datos);
  if (!v.ok) Object.assign(errores, v.errores);
  if (!relacion) errores.relacion = MENSAJE_SIN_RELACION;
  if (hay(errores) || !relacion) return { ok: false, errores };

  const p = await guardarPersona(personas, orgId, datos, vinculo.personaId);
  if (!p.ok) return { ok: false, errores: p.errores, general: p.fallo && !hay(p.errores) ? mensajeDelFallo(p.fallo) : undefined };

  let actual = vinculo;
  if (relacion !== vinculo.relacion) {
    const c = await vinculos.cambiarRelacion(orgId, vinculo.id, relacion);
    if (!c.ok) return { ok: false, errores: {}, general: mensajeDelFallo(c.fallo) };
    actual = c.valor;
  }
  return marcarResponsable(vinculos, orgId, actual, responsable);
}
