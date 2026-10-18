/**
 * Casos de uso: pedir el correo para recuperar la contraseña y fijar la nueva.
 *
 * Como al entrar, se valida la forma antes de llamar a Auth, y el resultado
 * de pedir el correo es el mismo exista o no la cuenta (PB-05).
 */
import { normalizarCorreo, validarCorreo } from "../dominio/credenciales";
import {
  hayErroresNuevaContrasena,
  validarNuevaContrasena,
  type ErroresNuevaContrasena,
  type NuevaContrasena,
} from "../dominio/recuperacion";
import type { FalloDeContrasena, FalloDeRecuperacion, SesionPuerto } from "./puertos";

export type ResultadoPedirRecuperacion = { ok: true } | { ok: false; correo?: string; general?: string };

const MENSAJE_RECUPERACION: Record<FalloDeRecuperacion, string> = {
  "demasiados-pedidos": "Ya pediste un enlace hace muy poco. Espera un minuto y vuelve a pedirlo.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo enviar el correo. Inténtalo de nuevo en un momento.",
};

export async function pedirRecuperacion(
  sesion: SesionPuerto,
  correo: string,
  volverA: string,
): Promise<ResultadoPedirRecuperacion> {
  const error = validarCorreo(correo);
  if (error) return { ok: false, correo: error };
  const r = await sesion.pedirRecuperacion(normalizarCorreo(correo), volverA);
  if (r.ok) return r;
  return { ok: false, general: MENSAJE_RECUPERACION[r.fallo] };
}

export type ResultadoFijarContrasena = { ok: true } | { ok: false; campos: ErroresNuevaContrasena; general?: string };

const MENSAJE_CONTRASENA: Record<FalloDeContrasena, string> = {
  debil: "Esa contraseña es muy fácil de adivinar. Elige otra más larga.",
  "igual-a-la-anterior": "Es la misma que tenías. Elige una distinta.",
  "enlace-vencido": "El enlace venció o ya se usó. Pide otro desde «¿Olvidaste tu contraseña?».",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo guardar la contraseña. Inténtalo de nuevo en un momento.",
};

export function mensajeDeContrasena(fallo: FalloDeContrasena): string {
  return MENSAJE_CONTRASENA[fallo];
}

export async function fijarContrasena(sesion: SesionPuerto, datos: NuevaContrasena): Promise<ResultadoFijarContrasena> {
  const campos = validarNuevaContrasena(datos);
  if (hayErroresNuevaContrasena(campos)) return { ok: false, campos };
  const r = await sesion.fijarContrasena(datos.nueva);
  if (r.ok) return r;
  // Lo que la persona corrige en el campo va junto al campo; lo demás, arriba del botón.
  if (r.fallo === "debil" || r.fallo === "igual-a-la-anterior") {
    return { ok: false, campos: { nueva: MENSAJE_CONTRASENA[r.fallo] } };
  }
  return { ok: false, campos: {}, general: MENSAJE_CONTRASENA[r.fallo] };
}
