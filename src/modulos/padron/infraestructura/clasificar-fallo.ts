/**
 * Lo que responde PostgREST al escribir un edificio, en las categorías del
 * puerto. Va aparte del adaptador para probarlo sin Supabase.
 */
import type { FalloAlGuardar } from "../aplicacion/puertos";

export interface ErrorPostgrest {
  code?: string;
  message?: string;
}

/** Lo que dice `fetch` cuando no llega al servidor, según el entorno. */
const SIN_RED = /failed to fetch|network request failed|fetch failed|networkerror|load failed/i;

export function clasificarFallo(error: ErrorPostgrest | null | undefined): FalloAlGuardar {
  if (!error) return "desconocido";
  switch (error.code) {
    // unique (org_id, nombre)
    case "23505":
      return "nombre-repetido";
    // La política de alta (with check) rechazó la fila.
    case "42501":
      return "sin-permiso";
    // `.single()` sin filas: el edificio no existe o la RLS no deja tocarlo.
    case "PGRST116":
      return "no-existe";
  }
  if (SIN_RED.test(error.message ?? "")) return "sin-conexion";
  return "desconocido";
}
