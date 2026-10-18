/**
 * Traduce el error de PostgREST o de Postgres a un `FalloDelPadron`.
 *
 * Códigos: 23505 único, 23503 clave foránea, 23514 check, 42501 permiso
 * (RLS), P0002 y PGRST116 sin fila. El índice del responsable de pago se
 * reconoce por su nombre en el mensaje.
 */
import type { FalloDelPadron } from "../aplicacion/puertos-padron";

interface ErrorConCodigo {
  code?: string;
  message?: string;
}

export function falloDePostgres(error: ErrorConCodigo | null | undefined): FalloDelPadron {
  if (!error) return "desconocido";
  const mensaje = error.message ?? "";
  switch (error.code) {
    case "23505":
      return mensaje.includes("unidad_persona_un_responsable_uq") ? "otro-responsable" : "repetido";
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
  if (/fetch|network|failed to fetch/i.test(mensaje)) return "sin-conexion";
  return "desconocido";
}
