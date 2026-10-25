/**
 * Un correo de la bandeja de salida (PB-30) y cómo se cuenta para el
 * administrador: cuántos salieron y cuáles no, con el motivo.
 */

export type EstadoDelEnvio = "pendiente" | "enviado" | "fallido" | "sin_correo";

export const TEXTO_DEL_ESTADO: Record<EstadoDelEnvio, string> = {
  pendiente: "Por enviar",
  enviado: "Enviado",
  fallido: "No se pudo enviar",
  sin_correo: "Sin correo",
};

export interface Envio {
  id: string;
  estado: EstadoDelEnvio;
  unidad: string;
  /** El nombre de la persona, si hay a quién mandarlo. */
  destinatario: string | null;
  correo: string | null;
  /** Por qué no salió (o el último error, si se va a reintentar). */
  motivo: string | null;
}

export interface ResumenDeEnvios {
  total: number;
  enviados: number;
  porEnviar: number;
  /** Los que no van a salir solos: sin correo o fallidos. Necesitan que alguien haga algo. */
  conProblema: Envio[];
}

const NUMEROS = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export function resumenDeEnvios(envios: readonly Envio[]): ResumenDeEnvios {
  return {
    total: envios.length,
    enviados: envios.filter((e) => e.estado === "enviado").length,
    porEnviar: envios.filter((e) => e.estado === "pendiente").length,
    conProblema: envios.filter((e) => e.estado === "sin_correo" || e.estado === "fallido").sort((a, b) => NUMEROS.compare(a.unidad, b.unidad)),
  };
}
