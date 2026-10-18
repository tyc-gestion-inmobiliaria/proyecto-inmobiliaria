/**
 * Recuperar la contraseña: lo que se comprueba antes de pedirla y antes de
 * fijar la nueva, y cómo se lee el enlace que llega por correo.
 *
 * El largo mínimo sale de `minimum_password_length` en `supabase/config.toml`
 * (10). Si cambia allá, cambia acá; el servidor igual rechaza una más corta.
 */
export { validarCorreo } from "./credenciales";

export const LARGO_MINIMO_CONTRASENA = 10;

export interface NuevaContrasena {
  nueva: string;
  repetida: string;
}

export interface ErroresNuevaContrasena {
  nueva?: string;
  repetida?: string;
}

export function validarNuevaContrasena({ nueva, repetida }: NuevaContrasena): ErroresNuevaContrasena {
  const errores: ErroresNuevaContrasena = {};
  if (!nueva) errores.nueva = "Escribe la contraseña nueva.";
  else if (nueva.length < LARGO_MINIMO_CONTRASENA)
    errores.nueva = `Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  if (!repetida) errores.repetida = "Repite la contraseña.";
  else if (nueva && repetida !== nueva) errores.repetida = "No coincide con la de arriba.";
  return errores;
}

/**
 * Lo que trae el enlace del correo. Supabase Auth redirige a la app con los
 * datos en el fragmento (`#access_token=…&type=recovery`), o con un error si
 * el enlace venció o ya se usó.
 */
export type EnlaceDeRecuperacion =
  | { tipo: "recuperacion"; tokenDeAcceso: string; tokenDeRenovacion: string }
  | { tipo: "vencido" };

export function leerEnlaceDeRecuperacion(url: string | null | undefined): EnlaceDeRecuperacion | null {
  if (!url) return null;
  const almohadilla = url.indexOf("#");
  const interrogacion = url.indexOf("?");
  const partes: string[] = [];
  if (almohadilla >= 0) partes.push(url.slice(almohadilla + 1));
  if (interrogacion >= 0) partes.push(url.slice(interrogacion + 1, almohadilla > interrogacion ? almohadilla : undefined));
  const datos = new Map<string, string>();
  for (const parte of partes) {
    for (const [clave, valor] of new URLSearchParams(parte)) datos.set(clave, valor);
  }
  if (datos.get("type") === "recovery") {
    const tokenDeAcceso = datos.get("access_token");
    const tokenDeRenovacion = datos.get("refresh_token");
    if (tokenDeAcceso && tokenDeRenovacion) return { tipo: "recuperacion", tokenDeAcceso, tokenDeRenovacion };
  }
  // Un enlace de recuperación vencido vuelve con `error_code=otp_expired`.
  if (datos.has("error_code") || datos.has("error")) return { tipo: "vencido" };
  return null;
}

export function hayErroresNuevaContrasena(errores: ErroresNuevaContrasena): boolean {
  return Boolean(errores.nueva || errores.repetida);
}
