/**
 * Caso de uso: entrar con correo y contraseña.
 *
 * Valida la forma antes de llamar a Auth, para no gastar una petición en un
 * formulario incompleto, y traduce el fallo a un mensaje que no revela si el
 * correo existe.
 */
import {
  hayErrores,
  normalizarCorreo,
  validarCredenciales,
  type Credenciales,
  type ErroresCredenciales,
} from "../domain/credentials";
import type { Cuenta, FalloDeAcceso, SesionPuerto } from "./ports";

export type ResultadoIniciarSesion =
  | { ok: true; cuenta: Cuenta }
  | { ok: false; campos: ErroresCredenciales; general?: string };

const MENSAJE: Record<FalloDeAcceso, string> = {
  credenciales: "El correo o la contraseña no coinciden.",
  "correo-sin-confirmar": "Tu correo todavía no está confirmado. Abre el enlace que te llegó y vuelve a entrar.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo iniciar sesión. Inténtalo de nuevo en un momento.",
};

export function mensajeDeFallo(fallo: FalloDeAcceso): string {
  return MENSAJE[fallo];
}

export async function iniciarSesion(sesion: SesionPuerto, credenciales: Credenciales): Promise<ResultadoIniciarSesion> {
  const campos = validarCredenciales(credenciales);
  if (hayErrores(campos)) return { ok: false, campos };
  const r = await sesion.iniciar({ correo: normalizarCorreo(credenciales.correo), contrasena: credenciales.contrasena });
  if (r.ok) return r;
  // Con credenciales malas el error va junto a la contraseña, que es lo que la persona corrige.
  if (r.fallo === "credenciales") return { ok: false, campos: { contrasena: MENSAJE.credenciales } };
  return { ok: false, campos: {}, general: MENSAJE[r.fallo] };
}
