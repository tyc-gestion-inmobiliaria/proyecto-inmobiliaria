/**
 * `SesionPuerto` sobre Supabase Auth.
 */
import { isAuthApiError, isAuthRetryableFetchError, type User } from "@supabase/supabase-js";

import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { Cuenta, FalloDeAcceso, ResultadoAcceso, SesionPuerto } from "../aplicacion/puertos";
import type { Credenciales } from "../dominio/credenciales";

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

  alCambiar(aviso) {
    const cliente = clienteSupabase();
    if (!cliente) return () => {};
    const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => aviso(aCuenta(sesion?.user)));
    return () => data.subscription.unsubscribe();
  },
};
