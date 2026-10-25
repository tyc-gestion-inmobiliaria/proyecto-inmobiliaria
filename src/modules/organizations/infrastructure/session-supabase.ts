/**
 * `SesionPuerto` sobre Supabase Auth.
 */
import { isAuthApiError, isAuthRetryableFetchError, type User } from "@supabase/supabase-js";

import { clienteSupabase } from "@/shared/supabase/client";

import type {
  Cuenta,
  FalloDeAcceso,
  FalloDeContrasena,
  FalloDeRecuperacion,
  Resultado,
  ResultadoAcceso,
  SesionPuerto,
} from "../application/ports";
import type { Credenciales } from "../domain/credentials";

function aCuenta(usuario: User | null | undefined): Cuenta | null {
  return usuario ? { id: usuario.id, correo: usuario.email ?? "" } : null;
}

function clasificar(error: unknown): FalloDeAcceso {
  if (isAuthRetryableFetchError(error)) return "sin-conexion";
  if (isAuthApiError(error)) {
    if (error.code === "invalid_credentials") return "credenciales";
    if (error.code === "email_not_confirmed") return "correo-sin-confirmar";
  }
  return "desconocido";
}

function clasificarRecuperacion(error: unknown): FalloDeRecuperacion {
  if (isAuthRetryableFetchError(error)) return "sin-conexion";
  if (isAuthApiError(error) && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
    return "demasiados-pedidos";
  }
  return "desconocido";
}

const ENLACE_VENCIDO = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
]);

function clasificarContrasena(error: unknown): FalloDeContrasena {
  if (isAuthRetryableFetchError(error)) return "sin-conexion";
  if (isAuthApiError(error)) {
    if (error.code === "weak_password") return "debil";
    if (error.code === "same_password") return "igual-a-la-anterior";
    if (error.code && ENLACE_VENCIDO.has(error.code)) return "enlace-vencido";
  }
  return "desconocido";
}

export const sesionSupabase: SesionPuerto = {
  async cuentaActual() {
    const cliente = clienteSupabase();
    if (!cliente) return null;
    const { data } = await cliente.auth.getSession();
    return aCuenta(data.session?.user);
  },

  async iniciar({ correo, contrasena }: Credenciales): Promise<ResultadoAcceso> {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { data, error } = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
      if (error) return { ok: false, fallo: clasificar(error) };
      const cuenta = aCuenta(data.user);
      return cuenta ? { ok: true, cuenta } : { ok: false, fallo: "desconocido" };
    } catch (error) {
      return { ok: false, fallo: clasificar(error) };
    }
  },

  async cerrar() {
    await clienteSupabase()?.auth.signOut();
  },

  async pedirRecuperacion(correo: string, volverA: string): Promise<Resultado<FalloDeRecuperacion>> {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { error } = await cliente.auth.resetPasswordForEmail(correo, { redirectTo: volverA });
      return error ? { ok: false, fallo: clasificarRecuperacion(error) } : { ok: true };
    } catch (error) {
      return { ok: false, fallo: clasificarRecuperacion(error) };
    }
  },

  async abrirRecuperacion(tokenDeAcceso: string, tokenDeRenovacion: string): Promise<Resultado<FalloDeContrasena>> {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { error } = await cliente.auth.setSession({ access_token: tokenDeAcceso, refresh_token: tokenDeRenovacion });
      return error ? { ok: false, fallo: clasificarContrasena(error) } : { ok: true };
    } catch (error) {
      return { ok: false, fallo: clasificarContrasena(error) };
    }
  },

  async fijarContrasena(nueva: string): Promise<Resultado<FalloDeContrasena>> {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { error } = await cliente.auth.updateUser({ password: nueva });
      return error ? { ok: false, fallo: clasificarContrasena(error) } : { ok: true };
    } catch (error) {
      return { ok: false, fallo: clasificarContrasena(error) };
    }
  },

  alCambiar(aviso) {
    const cliente = clienteSupabase();
    if (!cliente) return () => {};
    const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => aviso(aCuenta(sesion?.user)));
    return () => data.subscription.unsubscribe();
  },
};
