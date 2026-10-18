/**
 * Lo que se comprueba del formulario de inicio de sesión antes de mandarlo.
 *
 * Solo forma: que haya correo y contraseña, y que el correo lo parezca. Si la
 * cuenta existe lo decide Supabase Auth, y el error que vuelve no dice si el
 * correo está registrado (PB-05).
 */

export interface Credenciales {
  correo: string;
  contrasena: string;
}

export interface ErroresCredenciales {
  correo?: string;
  contrasena?: string;
}

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** El error del campo de correo, o nada si tiene la forma de un correo. */
export function validarCorreo(correo: string): string | undefined {
  const limpio = normalizarCorreo(correo);
  if (!limpio) return "Escribe tu correo.";
  if (!FORMATO_CORREO.test(limpio)) return "Revisa el correo: debe tener la forma nombre@empresa.pe.";
  return undefined;
}

export function validarCredenciales({ correo, contrasena }: Credenciales): ErroresCredenciales {
  const errores: ErroresCredenciales = {};
  const errorCorreo = validarCorreo(correo);
  if (errorCorreo) errores.correo = errorCorreo;
  if (!contrasena) errores.contrasena = "Escribe tu contraseña.";
  return errores;
}

export function hayErrores(errores: ErroresCredenciales): boolean {
  return Boolean(errores.correo || errores.contrasena);
}
