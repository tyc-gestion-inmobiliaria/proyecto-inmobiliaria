/**
 * El formulario de un pago: lo que escribe el residente al reportarlo (PB-26)
 * y el administrador al registrarlo desde la ficha (PB-28). Valida antes de
 * llamar para poner el error junto al campo; la base vuelve a validar.
 *
 * - Reportado: monto, fecha, cuenta destino y número de operación,
 *   obligatorios. La foto del comprobante es opcional (supuesto).
 * - Registrado: monto y fecha obligatorios; cuenta y operación opcionales,
 *   porque se puede haber pagado en efectivo en la oficina (supuesto).
 * - La fecha es la del depósito: no puede ser posterior a hoy.
 */
import { leerCentimos, type Centimos } from "./money";
import type { OrigenDelPago } from "./payment";

export type CampoDelPago = "monto" | "fecha" | "cuenta" | "operacion";

export interface DatosDelPago {
  monto: string;
  fecha: string;
  cuentaId: string | undefined;
  operacion: string;
}

export interface PagoNuevo {
  monto: Centimos;
  fecha: string;
  cuentaId: string | null;
  operacion: string | null;
}

export type ErroresDelPago = Partial<Record<CampoDelPago, string>>;

export type Validacion = { ok: true; pago: PagoNuevo } | { ok: false; errores: ErroresDelPago };

const ETIQUETA: Record<CampoDelPago, string> = { monto: "Monto", fecha: "Fecha", cuenta: "Cuenta", operacion: "Número de operación" };
const ORDEN: readonly CampoDelPago[] = ["monto", "fecha", "cuenta", "operacion"];
const OPERACION_MAXIMA = 40;

export function datosVacios(hoy: string): DatosDelPago {
  return { monto: "", fecha: textoDeFecha(hoy), cuentaId: undefined, operacion: "" };
}

/** Acepta "15/10/2026" o "2026-10-15"; devuelve la fecha ISO, o null si no es una fecha real. */
export function leerFecha(texto: string): string | null {
  const t = texto.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const partes = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;
  if (!partes) return null;
  const [a, m, d] = partes.map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}

/** Hoy en Lima, ISO: el límite de la fecha del pago lo pone el reloj del edificio. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** "2026-10-15" → "15/10/2026". */
export function textoDeFecha(fechaIso: string): string {
  const [a, m, d] = fechaIso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function validarPago(
  datos: DatosDelPago,
  contexto: { origen: OrigenDelPago; hoy: string; cuentas: readonly { id: string }[] },
): Validacion {
  const errores: ErroresDelPago = {};
  const exige = contexto.origen === "reportado";

  const monto = leerCentimos(datos.monto);
  if (datos.monto.trim() === "") errores.monto = "Escribe el monto.";
  else if (monto === null) errores.monto = "Escribe un monto válido, como 350,50.";
  else if (monto <= 0) errores.monto = "El monto tiene que ser mayor que cero.";

  const fecha = leerFecha(datos.fecha);
  if (datos.fecha.trim() === "") errores.fecha = "Escribe la fecha del pago.";
  else if (fecha === null) errores.fecha = "Escribe una fecha válida, como 15/10/2026.";
  else if (fecha > contexto.hoy) errores.fecha = "La fecha no puede ser posterior a hoy.";

  const cuentaId = datos.cuentaId && contexto.cuentas.some((c) => c.id === datos.cuentaId) ? datos.cuentaId : null;
  if (datos.cuentaId && !cuentaId) errores.cuenta = "Elige una cuenta del edificio.";
  else if (exige && !cuentaId) errores.cuenta = "Elige la cuenta donde se depositó.";

  const operacion = datos.operacion.trim();
  if (exige && operacion === "") errores.operacion = "Escribe el número de operación.";
  else if (operacion.length > OPERACION_MAXIMA) errores.operacion = `Hasta ${OPERACION_MAXIMA} caracteres.`;

  if (Object.keys(errores).length > 0 || monto === null || fecha === null) return { ok: false, errores };
  return { ok: true, pago: { monto, fecha, cuentaId, operacion: operacion === "" ? null : operacion } };
}

/** Los errores en el orden del formulario, para el resumen de arriba. */
export function listaDeErrores(errores: ErroresDelPago): { campo: CampoDelPago; etiqueta: string; mensaje: string }[] {
  return ORDEN.filter((c) => errores[c]).map((c) => ({ campo: c, etiqueta: ETIQUETA[c], mensaje: errores[c] as string }));
}

const MOTIVO_MAXIMO = 500;

/** El motivo del rechazo: obligatorio, porque el residente lo lee. */
export function validarMotivo(texto: string): { ok: true; motivo: string } | { ok: false; error: string } {
  const motivo = texto.trim();
  if (motivo === "") return { ok: false, error: "Escribe el motivo: el residente lo va a leer." };
  if (motivo.length > MOTIVO_MAXIMO) return { ok: false, error: `Hasta ${MOTIVO_MAXIMO} caracteres.` };
  return { ok: true, motivo };
}
