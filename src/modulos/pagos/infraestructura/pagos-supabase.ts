/**
 * `PagosPuerto` sobre Supabase: la tabla `pago` (solo lectura para el
 * cliente), las funciones `reportar_pago`, `registrar_pago`, `aceptar_pago`,
 * `rechazar_pago` y `revertir_pago`, y el bucket privado `comprobantes`.
 *
 * La RLS decide qué se ve; el filtro por `org_id` la acompaña. El dinero va a
 * la base en soles con dos decimales y vuelve a céntimos al leer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { CampoRechazado, FalloDePago, PagosPuerto, Resultado } from "../aplicacion/puertos";
import { centimosDeSoles, solesDe } from "../dominio/dinero";
import { esEstadoDelPago, esOrigenDelPago, rutaDeComprobante, type EstadoDelPago, type Pago } from "../dominio/pago";

interface ErrorPg {
  code?: string;
  message?: string;
  hint?: string | null;
}

const SIN_RED = /failed to fetch|network request failed|fetch failed|networkerror|load failed/i;
const CAMPOS: readonly CampoRechazado[] = ["monto", "fecha", "cuenta", "operacion", "motivo", "comprobante", "clave"];

/** Lo que responde PostgREST, en las categorías del puerto. */
export function clasificarFalloDePago(error: ErrorPg | null | undefined): { fallo: FalloDePago; campo?: CampoRechazado } {
  if (!error) return { fallo: "desconocido" };
  const campo = CAMPOS.find((c) => c === error.hint);
  switch (error.code) {
    case "42501":
      return { fallo: "sin-permiso" };
    case "22023":
    case "23514":
    case "22P02":
      return campo ? { fallo: "invalido", campo } : { fallo: "invalido" };
    case "P0001":
      return error.hint === "estado" ? { fallo: "estado" } : { fallo: "desconocido" };
    case "P0002":
    case "PGRST116":
      return { fallo: "no-existe" };
  }
  if (SIN_RED.test(error.message ?? "")) return { fallo: "sin-conexion" };
  return { fallo: "desconocido" };
}

function cliente(): SupabaseClient {
  const c = clienteSupabase();
  if (!c) throw new Error("Supabase sin configurar");
  return c;
}

async function rpc<T>(funcion: string, args: Record<string, unknown>, valor: (data: unknown) => T): Promise<Resultado<T>> {
  const c = clienteSupabase();
  if (!c) return { ok: false, fallo: "sin-configurar" };
  try {
    const { data, error } = await c.rpc(funcion, args);
    if (error) return { ok: false, ...clasificarFalloDePago(error) };
    return { ok: true, valor: valor(data) };
  } catch (error) {
    return { ok: false, ...clasificarFalloDePago(error as ErrorPg) };
  }
}

const aEstado = (data: unknown): EstadoDelPago => {
  if (!esEstadoDelPago(data)) throw new Error(`Estado de pago desconocido: ${String(data)}`);
  return data;
};

interface FilaPago {
  id: string;
  org_id: string;
  edificio_id: string;
  unidad_id: string;
  monto: number | string;
  fecha: string;
  operacion: string | null;
  origen: string;
  estado: string;
  motivo_rechazo: string | null;
  comprobante: string | null;
  reportado_en: string;
  validado_en: string | null;
  unidad: { numero: string } | null;
  edificio: { nombre: string } | null;
  cuenta_bancaria: { id: string; banco: string; numero: string } | null;
}

const COLUMNAS =
  "id, org_id, edificio_id, unidad_id, monto, fecha, operacion, origen, estado, motivo_rechazo, comprobante, reportado_en, validado_en, " +
  "unidad(numero), edificio(nombre), cuenta_bancaria(id, banco, numero)";

function aPago(f: FilaPago): Pago {
  return {
    id: f.id,
    orgId: f.org_id,
    edificioId: f.edificio_id,
    edificioNombre: f.edificio?.nombre ?? "—",
    unidadId: f.unidad_id,
    unidadNumero: f.unidad?.numero ?? "—",
    monto: centimosDeSoles(f.monto),
    fecha: f.fecha,
    operacion: f.operacion,
    cuenta: f.cuenta_bancaria,
    origen: esOrigenDelPago(f.origen) ? f.origen : "reportado",
    estado: esEstadoDelPago(f.estado) ? f.estado : "por_validar",
    motivoRechazo: f.motivo_rechazo,
    comprobante: f.comprobante,
    reportadoEn: f.reportado_en,
    validadoEn: f.validado_en,
  };
}

function argumentos(e: Parameters<PagosPuerto["reportar"]>[0]) {
  return {
    p_unidad_id: e.unidadId,
    p_monto: solesDe(e.monto),
    p_fecha: e.fecha,
    p_operacion: e.operacion,
    p_cuenta_id: e.cuentaId,
    p_comprobante: e.comprobante,
    p_clave: e.clave,
  };
}

export const pagosSupabase: PagosPuerto = {
  async cola(orgId, filtro) {
    let consulta = cliente().from("pago").select(COLUMNAS).eq("org_id", orgId).eq("estado", filtro.estado);
    if (filtro.edificioId) consulta = consulta.eq("edificio_id", filtro.edificioId);
    const { data, error } = await consulta.order("reportado_en").limit(500).returns<FilaPago[]>();
    if (error) throw error;
    return (data ?? []).map(aPago);
  },

  async deLaUnidad(orgId, unidadId) {
    const { data, error } = await cliente()
      .from("pago")
      .select(COLUMNAS)
      .eq("org_id", orgId)
      .eq("unidad_id", unidadId)
      .order("fecha", { ascending: false })
      .returns<FilaPago[]>();
    if (error) throw error;
    return (data ?? []).map(aPago);
  },

  async cuentasDelEdificio(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("cuenta_bancaria")
      .select("id, nombre, banco, numero")
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .order("creado_en")
      .returns<{ id: string; nombre: string; banco: string; numero: string }[]>();
    if (error) throw error;
    return data ?? [];
  },

  reportar(envio) {
    return rpc("reportar_pago", argumentos(envio), (data) => data as string);
  },

  registrar(envio) {
    return rpc("registrar_pago", argumentos(envio), (data) => data as string);
  },

  aceptar(pagoId) {
    return rpc("aceptar_pago", { p_pago_id: pagoId }, aEstado);
  },

  rechazar(pagoId, motivo) {
    return rpc("rechazar_pago", { p_pago_id: pagoId, p_motivo: motivo }, aEstado);
  },

  revertir(pagoId) {
    return rpc("revertir_pago", { p_pago_id: pagoId }, aEstado);
  },

  async subirComprobante(orgId, unidadId, clave, archivo) {
    const c = clienteSupabase();
    if (!c) return { ok: false, fallo: "sin-configurar" };
    const ruta = rutaDeComprobante(orgId, unidadId, clave, archivo.extension);
    try {
      const cuerpo = await (await fetch(archivo.uri)).arrayBuffer();
      const subida = await c.storage.from("comprobantes").upload(ruta, cuerpo, { contentType: archivo.tipo, upsert: true });
      if (subida.error) return { ok: false, fallo: /row-level|unauthorized|403/i.test(subida.error.message) ? "sin-permiso" : "desconocido" };
      return { ok: true, valor: ruta };
    } catch (error) {
      return { ok: false, ...clasificarFalloDePago(error as ErrorPg) };
    }
  },

  async urlDeComprobante(ruta) {
    const { data, error } = await cliente().storage.from("comprobantes").createSignedUrl(ruta, 600);
    return error ? null : data.signedUrl;
  },
};
