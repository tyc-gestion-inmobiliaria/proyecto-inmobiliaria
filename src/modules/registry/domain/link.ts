/**
 * El vínculo de una persona con una unidad (tabla `unidad_persona`).
 *
 * Supuestos de PB-06, a confirmar con el cliente:
 * - Una persona tiene un solo vínculo con cada unidad: propietario, inquilino
 *   o residente (vive ahí sin ser ninguno de los dos).
 * - Ser responsable de pago es una marca del vínculo, no una relación más, y
 *   hay uno solo por unidad. Mientras se arma el padrón puede faltar.
 */

export const RELACIONES = ["propietario", "inquilino", "residente"] as const;
export type Relacion = (typeof RELACIONES)[number];

const NOMBRE_DE_LA_RELACION: Record<Relacion, string> = {
  propietario: "Propietario",
  inquilino: "Inquilino",
  residente: "Residente",
};

export interface Vinculo {
  id: string;
  orgId: string;
  unidadId: string;
  personaId: string;
  relacion: Relacion;
  responsablePago: boolean;
}

export function esRelacion(valor: unknown): valor is Relacion {
  return typeof valor === "string" && (RELACIONES as readonly string[]).includes(valor);
}

export function nombreDeLaRelacion(relacion: Relacion): string {
  return NOMBRE_DE_LA_RELACION[relacion];
}

/** Quién paga en esta unidad, si ya se eligió. */
export function responsableDePago(vinculos: readonly Vinculo[], unidadId: string): Vinculo | null {
  return vinculos.find((v) => v.unidadId === unidadId && v.responsablePago) ?? null;
}

/** Las unidades que todavía no tienen a nadie que pague. */
export function unidadesSinResponsable(unidadIds: readonly string[], vinculos: readonly Vinculo[]): string[] {
  const conResponsable = new Set(vinculos.filter((v) => v.responsablePago).map((v) => v.unidadId));
  return unidadIds.filter((id) => !conResponsable.has(id));
}

/** ¿Esta persona ya está vinculada a la unidad? La base rechaza el segundo vínculo. */
export function yaVinculada(vinculos: readonly Vinculo[], unidadId: string, personaId: string): boolean {
  return vinculos.some((v) => v.unidadId === unidadId && v.personaId === personaId);
}
