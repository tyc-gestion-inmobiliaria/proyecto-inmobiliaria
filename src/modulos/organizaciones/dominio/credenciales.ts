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

export function validarCredenciales({ correo, contrasena }: Credenciales): ErroresCredenciales {
  const errores: ErroresCredenciales = {};
  const limpio = normalizarCorreo(correo);
  if (!limpio) errores.correo = "Escribe tu correo.";
  else if (!FORMATO_CORREO.test(limpio)) errores.correo = "Revisa el correo: debe tener la forma nombre@empresa.pe.";
  if (!contrasena) errores.contrasena = "Escribe tu contraseña.";
  return errores;
}

export function hayErrores(errores: ErroresCredenciales): boolean {
  return Boolean(errores.correo || errores.contrasena);
}
