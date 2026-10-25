/**
 * El pago y su estado. Las transiciones las hace la base (funciones de
 * `pagos` en Postgres, que validan rol y estado anterior); acá se repiten
 * para saber qué botones mostrar y avisar antes de llamar.
 *
 *   por_validar ──aceptar──▶ aceptado ──revertir──▶ por_validar
 *   por_validar ──rechazar (con motivo)──▶ rechazado   (final)
 *
 * Supuesto: un pago rechazado no se vuelve a abrir; el residente reporta otro.
 */
import type { Centimos } from "./money";

export const ESTADOS_DEL_PAGO = ["por_validar", "aceptado", "rechazado"] as const;
export type EstadoDelPago = (typeof ESTADOS_DEL_PAGO)[number];

export function esEstadoDelPago(valor: unknown): valor is EstadoDelPago {
  return typeof valor === "string" && (ESTADOS_DEL_PAGO as readonly string[]).includes(valor);
}

/** El estado en la palabra que lee la persona (glosario: "aceptado" se dice "Validado"). */
export const TEXTO_DEL_ESTADO: Record<EstadoDelPago, string> = {
  por_validar: "Por validar",
  aceptado: "Validado",
  rechazado: "Rechazado",
};

export type TonoDelPago = "warning" | "success" | "danger";

export const TONO_DEL_ESTADO: Record<EstadoDelPago, TonoDelPago> = {
  por_validar: "warning",
  aceptado: "success",
  rechazado: "danger",
};

export type OrigenDelPago = "reportado" | "registrado";

export function esOrigenDelPago(valor: unknown): valor is OrigenDelPago {
  return valor === "reportado" || valor === "registrado";
}

export interface CuentaDelPago {
  id: string;
  banco: string;
  numero: string;
}

export interface Pago {
  id: string;
  orgId: string;
  edificioId: string;
  edificioNombre: string;
  unidadId: string;
  unidadNumero: string;
  monto: Centimos;
  /** La fecha del depósito, ISO. */
  fecha: string;
  operacion: string | null;
  cuenta: CuentaDelPago | null;
  origen: OrigenDelPago;
  estado: EstadoDelPago;
  motivoRechazo: string | null;
  /** Ruta en el bucket privado `comprobantes`. */
  comprobante: string | null;
  reportadoEn: string;
  validadoEn: string | null;
}

export type AccionDelPago = "aceptar" | "rechazar" | "revertir";

/** Lo que se puede hacer con un pago en su estado. */
export function accionesDelPago(estado: EstadoDelPago): AccionDelPago[] {
  switch (estado) {
    case "por_validar":
      return ["aceptar", "rechazar"];
    case "aceptado":
      return ["revertir"];
    case "rechazado":
      return [];
  }
}

/** Solo el administrador valida y registra pagos; el personal mira. */
export function puedeGestionarPagos(rol: string): boolean {
  return rol === "administrador";
}

/** El estado al que lleva cada acción, para repetir la transición sin volver a leer. */
export function estadoTrasLaAccion(accion: AccionDelPago): EstadoDelPago {
  return accion === "aceptar" ? "aceptado" : accion === "rechazar" ? "rechazado" : "por_validar";
}

/** Los de la cola primero por antigüedad: el que más espera, arriba. */
export function ordenarCola(pagos: readonly Pago[]): Pago[] {
  return [...pagos].sort((a, b) => a.reportadoEn.localeCompare(b.reportadoEn) || a.id.localeCompare(b.id));
}

/** Los de una unidad, del más reciente al más viejo. */
export function ordenarDeLaUnidad(pagos: readonly Pago[]): Pago[] {
  return [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.reportadoEn.localeCompare(a.reportadoEn));
}

/** "<org_id>/<unidad_id>/<clave>.<ext>": la base exige que empiece por la administradora y la unidad. */
export function rutaDeComprobante(orgId: string, unidadId: string, clave: string, extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "jpg";
  return `${orgId}/${unidadId}/${clave}.${ext}`;
}
