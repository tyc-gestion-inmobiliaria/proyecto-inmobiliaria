/**
 * La pertenencia de una persona a una administradora (organización), con su
 * rol. Una persona puede estar en varias.
 *
 * Los roles son un supuesto del Sprint 1 (PB-04): administrador, personal y
 * residente. La lista final es una pregunta abierta con el cliente; si cambia,
 * cambia acá y en el `check` de la tabla `membresia`.
 */

export const ROLES = ["administrador", "personal", "residente"] as const;
export type Rol = (typeof ROLES)[number];

export interface Membresia {
  orgId: string;
  orgNombre: string;
  rol: Rol;
}

const NOMBRE_DEL_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  personal: "Personal",
  residente: "Residente",
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

export function nombreDelRol(rol: Rol): string {
  return NOMBRE_DEL_ROL[rol];
}

/**
 * La administradora en la que se trabaja: la que se eligió si sigue entre las
 * de la persona; si no, la primera por nombre. Sin membresías, ninguna.
 */
export function organizacionEnCurso(membresias: Membresia[], elegida?: string | null): Membresia | null {
  if (membresias.length === 0) return null;
  const encontrada = elegida ? membresias.find((m) => m.orgId === elegida) : undefined;
  if (encontrada) return encontrada;
  return [...membresias].sort((a, b) => a.orgNombre.localeCompare(b.orgNombre, "es"))[0];
}
