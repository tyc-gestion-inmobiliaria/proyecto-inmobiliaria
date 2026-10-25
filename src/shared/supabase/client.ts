/**
 * El único cliente de Supabase de la app.
 *
 * Solo usa la URL y la clave pública (`anon`): lo que cada persona ve lo
 * decide la RLS de la base, no este cliente. La clave de servicio nunca llega
 * acá. Las variables `EXPO_PUBLIC_*` se fijan al construir.
 *
 * Se crea al primer uso y no al importar, para que exportar la web no intente
 * conectarse, y devuelve `null` si faltan las variables: quien lo usa le dice
 * a la persona que la app no tiene conexión configurada en vez de romperse.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { almacenSesion } from "./session-storage";

let cliente: SupabaseClient | null | undefined;

export function clienteSupabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !claveAnon) {
    cliente = null;
    return cliente;
  }
  cliente = createClient(url, claveAnon, {
    auth: {
      storage: almacenSesion,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== "web") {
    // En el teléfono el token se renueva solo mientras la app está al frente.
    AppState.addEventListener("change", (estado) => {
      if (estado === "active") cliente?.auth.startAutoRefresh();
      else cliente?.auth.stopAutoRefresh();
    });
  }
  return cliente;
}
