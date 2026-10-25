/**
 * Casos de uso de las invitaciones (PB-23): invitar, reenviar, cancelar y
 * aceptar.
 *
 * Como en el resto del módulo, se valida la forma antes de llamar al servidor
 * y el fallo vuelve en palabras: junto al campo lo que la persona corrige
 * ahí, arriba del botón lo demás.
 */
import {
  esMotivoDeRechazo,
  limpiarInvitacion,
  listaDeErrores,
  mensajeDeRechazo,
  validarInvitacion,
  type DatosInvitacion,
  type ErroresInvitacion,
  type MotivoDeRechazo,
} from "../domain/invitation";
import {
  hayErroresNuevaContrasena,
  validarNuevaContrasena,
  type ErroresNuevaContrasena,
  type NuevaContrasena,
} from "../domain/recovery";
import type { FalloAlAceptar, FalloDeInvitacion, InvitacionesPuerto, SesionPuerto } from "./ports";
import { mensajeDeContrasena } from "./recover-password";

const MENSAJE: Record<FalloDeInvitacion, string> = {
  "ya-invitada": "Ya hay una invitación abierta para ese correo. Reenvíala desde la lista.",
  "ya-usada": "Esa invitación ya se aceptó.",
  "sin-permiso": "Tu rol no permite invitar. Pídeselo a un administrador de tu empresa.",
  "no-existe": "Esa invitación ya no está. Vuelve a la lista.",
  invalido: "La unidad o la persona elegida ya no está en el padrón. Elige otra.",
  "correo-no-enviado": "No se pudo mandar el correo. Espera unos minutos y reenvíala desde la lista.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo completar. Inténtalo de nuevo en un momento.",
};

export function mensajeDeInvitacion(f: FalloDeInvitacion): string {
  return MENSAJE[f];
}

export type ResultadoInvitar = { ok: true } | { ok: false; campos: ErroresInvitacion; general?: string };

export async function invitar(
  puerto: InvitacionesPuerto,
  { orgId, datos, volverA }: { orgId: string; datos: DatosInvitacion; volverA: string },
): Promise<ResultadoInvitar> {
  const campos = validarInvitacion(datos);
  const limpia = limpiarInvitacion(datos);
  if (listaDeErrores(campos).length > 0 || !limpia) return { ok: false, campos };
  const r = await puerto.invitar(orgId, limpia, volverA);
  if (r.ok) return r;
  // Una invitación repetida es del correo: la persona lo ve junto al campo.
  if (r.fallo === "ya-invitada") return { ok: false, campos: { correo: MENSAJE["ya-invitada"] } };
  return { ok: false, campos: {}, general: MENSAJE[r.fallo] };
}

export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

export async function reenviar(
  puerto: InvitacionesPuerto,
  { orgId, id, volverA }: { orgId: string; id: string; volverA: string },
): Promise<ResultadoAccion> {
  const r = await puerto.reenviar(orgId, id, volverA);
  return r.ok ? r : { ok: false, mensaje: MENSAJE[r.fallo] };
}

export async function cancelar(puerto: InvitacionesPuerto, { orgId, id }: { orgId: string; id: string }): Promise<ResultadoAccion> {
  const r = await puerto.cancelar(orgId, id);
  return r.ok ? r : { ok: false, mensaje: MENSAJE[r.fallo] };
}

// Aceptar ---------------------------------------------------------------------------

const MENSAJE_AL_ACEPTAR: Record<Exclude<FalloAlAceptar, MotivoDeRechazo>, string> = {
  "sin-sesion": "El enlace venció o ya se usó. Pide a tu administración que te envíe otra invitación.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo aceptar la invitación. Inténtalo de nuevo en un momento.",
};

export function mensajeAlAceptar(f: FalloAlAceptar): string {
  return esMotivoDeRechazo(f) ? mensajeDeRechazo(f) : MENSAJE_AL_ACEPTAR[f];
}

/** Lo que cierra la invitación: ya no hay nada que hacer en esta pantalla. */
export function esDefinitivo(f: FalloAlAceptar): boolean {
  return f !== "sin-conexion" && f !== "desconocido";
}

export type ResultadoAceptar =
  | { ok: true; orgId: string }
  | { ok: false; campos: ErroresNuevaContrasena; general?: string; definitivo: boolean };

/**
 * Acepta con la sesión que abrió el enlace. Si la cuenta es nueva, además fija
 * la contraseña con la que entrará después.
 *
 * Primero acepta y después fija la contraseña: si la invitación ya no sirve,
 * la persona se entera sin haber elegido una contraseña para nada. Aceptar es
 * idempotente, así que si la contraseña falla (muy débil) se puede volver a
 * mandar todo.
 */
export async function aceptar(
  sesion: SesionPuerto,
  invitaciones: InvitacionesPuerto,
  { token, contrasena }: { token: string; contrasena?: NuevaContrasena },
): Promise<ResultadoAceptar> {
  if (contrasena) {
    const campos = validarNuevaContrasena(contrasena);
    if (hayErroresNuevaContrasena(campos)) return { ok: false, campos, definitivo: false };
  }
  const r = await invitaciones.aceptar(token);
  if (!r.ok) return { ok: false, campos: {}, general: mensajeAlAceptar(r.fallo), definitivo: esDefinitivo(r.fallo) };
  if (contrasena) {
    const c = await sesion.fijarContrasena(contrasena.nueva);
    if (!c.ok) {
      if (c.fallo === "debil" || c.fallo === "igual-a-la-anterior") {
        return { ok: false, campos: { nueva: mensajeDeContrasena(c.fallo) }, definitivo: false };
      }
      return { ok: false, campos: {}, general: mensajeDeContrasena(c.fallo), definitivo: false };
    }
  }
  return r;
}
