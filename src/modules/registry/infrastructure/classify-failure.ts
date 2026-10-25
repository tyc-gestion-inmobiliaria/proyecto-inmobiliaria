/**
 * Lo que responde PostgREST al escribir un edificio, en las categorías del
 * puerto. Va aparte del adaptador para probarlo sin Supabase.
 */
import type { FalloAlGuardar, FalloDelPadron } from "../application/ports";

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

/**
 * Lo mismo para unidades, personas, vínculos y cuentas bancarias. Códigos:
 * 23505 único, 23503 clave foránea, 23514 check, 42501 permiso (RLS), P0002
 * y PGRST116 sin fila. El índice del responsable de pago se reconoce por su
 * nombre en el mensaje.
 */
export function clasificarFalloDelPadron(error: ErrorPostgrest | null | undefined): FalloDelPadron {
  if (!error) return "desconocido";
  switch (error.code) {
    case "23505":
      return (error.message ?? "").includes("unidad_persona_un_responsable_uq") ? "otro-responsable" : "repetido";
    case "23503":
    case "P0002":
    case "PGRST116":
      return "no-existe";
    case "23514":
    case "22P02":
      return "invalido";
    case "42501":
      return "sin-permiso";
  }
  if (SIN_RED.test(error.message ?? "")) return "sin-conexion";
  return "desconocido";
}
