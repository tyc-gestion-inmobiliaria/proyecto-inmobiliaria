/**
 * Los casos de uso de los pagos, uno por intención. Reciben el puerto por
 * parámetro, validan antes de llamar y traducen el rechazo de la base a algo
 * que la pantalla sabe decir (el error junto al campo cuando se sabe cuál).
 *
 * `reportarPago` es del residente: lo usa el portal del residente, que vive
 * en otra rama; queda listo y probado acá.
 */
import { validarMotivo, validarPago, type CampoDelPago, type DatosDelPago, type ErroresDelPago } from "../dominio/formulario";
import { ordenarCola, ordenarDeLaUnidad, type EstadoDelPago, type OrigenDelPago, type Pago } from "../dominio/pago";
import type { ArchivoDeComprobante, CuentaDestino, FalloDePago, FiltroDeLaCola, PagosPuerto, Resultado } from "./puertos";

const MENSAJE: Record<FalloDePago, string> = {
  "sin-permiso": "Tu rol no permite hacer esto. Pídeselo a un administrador.",
  "no-existe": "Ese pago ya no está. Vuelve a abrir la lista.",
  invalido: "Algún dato no se aceptó. Revisa lo marcado e inténtalo de nuevo.",
  estado: "El pago cambió mientras tanto. Vuelve a abrir la lista para verlo como está.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo guardar. Inténtalo de nuevo en un momento.",
};

export function mensajeDePago(fallo: FalloDePago): string {
  return MENSAJE[fallo];
}

/** El mensaje de la base para el campo que marcó, si es de los del formulario. */
const CAMPOS: readonly CampoDelPago[] = ["monto", "fecha", "cuenta", "operacion"];

const MENSAJE_DEL_CAMPO: Record<CampoDelPago, string> = {
  monto: "La base no aceptó el monto: mayor que cero y con dos decimales como mucho.",
  fecha: "La fecha no puede ser posterior a hoy.",
  cuenta: "Elige una cuenta del edificio de la unidad.",
  operacion: "Escribe el número de operación.",
};

// Enviar un pago -----------------------------------------------------------------

export type ResultadoDeEnvio =
  | { ok: true; pagoId: string }
  | { ok: false; errores: ErroresDelPago; general?: undefined }
  | { ok: false; errores?: undefined; general: string };

interface PedidoDeEnvio {
  orgId: string;
  unidadId: string;
  datos: DatosDelPago;
  /** Una por formulario: si la red se corta y se reintenta, la base no duplica. */
  clave: string;
  /** Las cuentas del edificio de la unidad. */
  cuentas: readonly CuentaDestino[];
  /** Hoy en Lima, ISO. */
  hoy: string;
  archivo?: ArchivoDeComprobante | null;
}

async function enviar(puerto: PagosPuerto, origen: OrigenDelPago, pedido: PedidoDeEnvio): Promise<ResultadoDeEnvio> {
  const v = validarPago(pedido.datos, { origen, hoy: pedido.hoy, cuentas: pedido.cuentas });
  if (!v.ok) return { ok: false, errores: v.errores };

  let comprobante: string | null = null;
  if (pedido.archivo) {
    const subida = await puerto.subirComprobante(pedido.orgId, pedido.unidadId, pedido.clave, pedido.archivo);
    if (!subida.ok) {
      return {
        ok: false,
        general:
          subida.fallo === "sin-conexion" ? mensajeDePago("sin-conexion") : "No se pudo subir la foto del comprobante. Inténtalo de nuevo.",
      };
    }
    comprobante = subida.valor;
  }

  const envio = { ...v.pago, unidadId: pedido.unidadId, clave: pedido.clave, comprobante };
  const r = origen === "reportado" ? await puerto.reportar(envio) : await puerto.registrar(envio);
  if (r.ok) return { ok: true, pagoId: r.valor };
  const campo = CAMPOS.find((c) => c === r.campo);
  if (r.fallo === "invalido" && campo) return { ok: false, errores: { [campo]: MENSAJE_DEL_CAMPO[campo] } };
  return { ok: false, general: mensajeDePago(r.fallo) };
}

/** El residente reporta un pago de su unidad (PB-26): queda "Por validar". */
export function reportarPago(puerto: PagosPuerto, pedido: PedidoDeEnvio): Promise<ResultadoDeEnvio> {
  return enviar(puerto, "reportado", pedido);
}

/** El administrador registra un pago desde la ficha (PB-28): queda validado y aplicado. */
export function registrarPago(puerto: PagosPuerto, pedido: PedidoDeEnvio): Promise<ResultadoDeEnvio> {
  return enviar(puerto, "registrado", pedido);
}

// Validar -------------------------------------------------------------------------

export type ResultadoDeTransicion = { ok: true; estado: EstadoDelPago } | { ok: false; mensaje: string };

function transicion(r: Resultado<EstadoDelPago>): ResultadoDeTransicion {
  return r.ok ? { ok: true, estado: r.valor } : { ok: false, mensaje: mensajeDePago(r.fallo) };
}

/** Acepta y aplica a los recibos pendientes, el más antiguo primero (lo hace la base). */
export async function aceptarPago(puerto: PagosPuerto, pagoId: string): Promise<ResultadoDeTransicion> {
  return transicion(await puerto.aceptar(pagoId));
}

export type ResultadoDeRechazo = ResultadoDeTransicion | { ok: false; errorDelMotivo: string };

/** Rechaza con su motivo, que el residente lee. Sin motivo no llama. */
export async function rechazarPago(puerto: PagosPuerto, pagoId: string, motivo: string): Promise<ResultadoDeRechazo> {
  const v = validarMotivo(motivo);
  if (!v.ok) return { ok: false, errorDelMotivo: v.error };
  return transicion(await puerto.rechazar(pagoId, v.motivo));
}

/** Un pago aceptado por error vuelve a "Por validar" y se quitan sus aplicaciones. */
export async function revertirPago(puerto: PagosPuerto, pagoId: string): Promise<ResultadoDeTransicion> {
  return transicion(await puerto.revertir(pagoId));
}

// Leer ----------------------------------------------------------------------------

/** La cola de un estado, en la cartera entera o en un edificio, la que más espera arriba. */
export async function listarCola(puerto: PagosPuerto, orgId: string, filtro: FiltroDeLaCola): Promise<Pago[]> {
  return ordenarCola(await puerto.cola(orgId, filtro));
}

export async function pagosDeLaUnidad(puerto: PagosPuerto, orgId: string, unidadId: string): Promise<Pago[]> {
  return ordenarDeLaUnidad(await puerto.deLaUnidad(orgId, unidadId));
}

/** Una clave de envío nueva (uuid v4). La genera el formulario al abrirse y la conserva en cada reintento. */
export function nuevaClave(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Sin crypto.randomUUID (algunos motores nativos): basta con que no se repita.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
