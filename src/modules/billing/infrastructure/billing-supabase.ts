/**
 * `CobranzaPuerto` sobre Supabase: tablas `cierre`, `lectura`, `partida` y
 * `recibo` (que se lee por la vista `recibo_con_saldo`, con lo pagado), la
 * vista `saldo_de_la_unidad`, las funciones `abrir_cierre`, `recibos_del_cierre` y
 * `emitir_cierre`, y el bucket privado `lecturas`.
 *
 * El dinero lo calcula la base; acá solo se lee. La RLS decide qué se ve y
 * quién escribe; el filtro por `org_id` la acompaña.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { clienteSupabase } from "@/shared/supabase/client";

import type { CobranzaPuerto, FalloDeCobranza, Resultado } from "../application/ports";
import { esNumeroDePaso, type Cierre } from "../domain/closing";
import { rutaDeFoto, type Lectura } from "../domain/reading";
import type { FilaPrevia, Recibo } from "../domain/receipt";

interface ErrorPg {
  code?: string;
  message?: string;
  hint?: string | null;
}

const SIN_RED = /failed to fetch|network request failed|fetch failed|networkerror|load failed/i;

/** Lo que responde PostgREST, en las categorías del puerto. */
export function clasificarFalloDeCobranza(error: ErrorPg | null | undefined): FalloDeCobranza {
  if (!error) return "desconocido";
  if (error.code === "P0001" && error.hint === "participacion") return "participacion";
  if (error.code === "P0001" && error.hint === "cuenta") return "sin-cuenta";
  switch (error.code) {
    case "42501":
      return "sin-permiso";
    case "23514":
    case "22023":
    case "22P02":
      return "invalido";
    case "P0002":
    case "PGRST116":
      return "no-existe";
  }
  if (SIN_RED.test(error.message ?? "")) return "sin-conexion";
  return "desconocido";
}

function cliente(): SupabaseClient {
  const c = clienteSupabase();
  if (!c) throw new Error("Supabase sin configurar");
  return c;
}

async function escribir<T>(pedido: (c: SupabaseClient) => PromiseLike<{ data: unknown; error: ErrorPg | null }>, valor: (data: unknown) => T): Promise<Resultado<T>> {
  const c = clienteSupabase();
  if (!c) return { ok: false, fallo: "sin-configurar" };
  try {
    const { data, error } = await pedido(c);
    if (error) return { ok: false, fallo: clasificarFalloDeCobranza(error) };
    return { ok: true, valor: valor(data) };
  } catch (error) {
    return { ok: false, fallo: clasificarFalloDeCobranza(error as ErrorPg) };
  }
}

// numeric llega como número o como texto según el tamaño: se normaliza.
const num = (v: number | string | null): number | null => (v === null ? null : Number(v));
const monto = (v: number | string | null): number => Number(v ?? 0);

interface FilaCierre {
  id: string;
  org_id: string;
  edificio_id: string;
  periodo: string;
  estado: "borrador" | "emitido";
  paso: number;
  monto_agua: number | string;
  umbral_atipico: number | string;
  vence: string | null;
}

const COLUMNAS_CIERRE = "id, org_id, edificio_id, periodo, estado, paso, monto_agua, umbral_atipico, vence";

function aCierre(f: FilaCierre): Cierre {
  return {
    id: f.id,
    orgId: f.org_id,
    edificioId: f.edificio_id,
    periodo: f.periodo,
    estado: f.estado,
    paso: esNumeroDePaso(f.paso) ? f.paso : 1,
    montoAgua: monto(f.monto_agua),
    umbralAtipico: monto(f.umbral_atipico),
    vence: f.vence,
  };
}

interface FilaRecibo {
  id: string;
  numero: number;
  cierre_id: string;
  edificio_id: string;
  unidad_id: string;
  unidad_numero: string;
  periodo: string;
  participacion: number | string;
  consumo: number | string | null;
  cuota: number | string;
  agua: number | string;
  deuda_previa: number | string;
  total: number | string;
  vence: string;
  emitido_en: string;
  pagado: number | string;
  pendiente: number | string;
}

const COLUMNAS_RECIBO =
  "id, numero, cierre_id, edificio_id, unidad_id, unidad_numero, periodo, participacion, consumo, cuota, agua, deuda_previa, total, vence, emitido_en, pagado, pendiente";

function aRecibo(f: FilaRecibo): Recibo {
  return {
    id: f.id,
    numero: f.numero,
    cierreId: f.cierre_id,
    edificioId: f.edificio_id,
    unidadId: f.unidad_id,
    unidadNumero: f.unidad_numero,
    periodo: f.periodo,
    participacion: monto(f.participacion),
    consumo: num(f.consumo),
    cuota: monto(f.cuota),
    agua: monto(f.agua),
    deudaPrevia: monto(f.deuda_previa),
    total: monto(f.total),
    vence: f.vence,
    emitidoEn: f.emitido_en,
    pagado: monto(f.pagado),
    pendiente: monto(f.pendiente),
  };
}

interface FilaPreviaPg {
  unidad_id: string;
  unidad_numero: string;
  participacion: number | string;
  anterior: number | string | null;
  actual: number | string | null;
  consumo: number | string | null;
  cuota: number | string;
  agua: number | string;
  deuda_previa: number | string;
  total: number | string;
  sin_lectura: boolean;
  atipico: boolean;
}

/** El orden natural de los números de unidad: 2 antes que 10. */
const porNumero = (a: { unidadNumero: string }, b: { unidadNumero: string }) =>
  a.unidadNumero.localeCompare(b.unidadNumero, "es", { numeric: true });

export const cobranzaSupabase: CobranzaPuerto = {
  async cierreDelPeriodo(orgId, edificioId, periodo) {
    const { data, error } = await cliente()
      .from("cierre")
      .select(COLUMNAS_CIERRE)
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .eq("periodo", periodo)
      .maybeSingle<FilaCierre>();
    if (error) throw error;
    return data ? aCierre(data) : null;
  },

  abrirCierre(edificioId, periodo) {
    return escribir(
      (c) => c.rpc("abrir_cierre", { p_edificio_id: edificioId, p_periodo: periodo }),
      (data) => data as string,
    );
  },

  async cierre(orgId, cierreId) {
    const { data, error } = await cliente().from("cierre").select(COLUMNAS_CIERRE).eq("org_id", orgId).eq("id", cierreId).maybeSingle<FilaCierre>();
    if (error) throw error;
    return data ? aCierre(data) : null;
  },

  async edificio(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("edificio")
      .select("id, nombre, direccion")
      .eq("org_id", orgId)
      .eq("id", edificioId)
      .maybeSingle<{ id: string; nombre: string; direccion: string | null }>();
    if (error) throw error;
    return data;
  },

  async padron(orgId, edificioId) {
    const [participacion, cuentas] = await Promise.all([
      cliente()
        .from("participacion_por_edificio")
        .select("unidades, sin_participacion, total, suma_cien")
        .eq("org_id", orgId)
        .eq("edificio_id", edificioId)
        .maybeSingle<{ unidades: number; sin_participacion: number; total: number | string; suma_cien: boolean }>(),
      cliente().from("cuenta_bancaria").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("edificio_id", edificioId),
    ]);
    if (participacion.error) throw participacion.error;
    if (cuentas.error) throw cuentas.error;
    const p = participacion.data;
    return {
      unidades: p?.unidades ?? 0,
      sinParticipacion: p?.sin_participacion ?? 0,
      total: monto(p?.total ?? 0),
      sumaCien: p?.suma_cien ?? false,
      cuentas: cuentas.count ?? 0,
    };
  },

  async cuentas(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("cuenta_bancaria")
      .select("banco, numero, cci, moneda")
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .order("creado_en")
      .returns<{ banco: string; numero: string; cci: string | null; moneda: string }[]>();
    if (error) throw error;
    return data ?? [];
  },

  guardarCierre(orgId, cierreId, cambios) {
    const fila: Record<string, number> = {};
    if (cambios.paso !== undefined) fila.paso = cambios.paso;
    if (cambios.montoAgua !== undefined) fila.monto_agua = cambios.montoAgua;
    if (cambios.umbralAtipico !== undefined) fila.umbral_atipico = cambios.umbralAtipico;
    return escribir(
      (c) => c.from("cierre").update(fila).eq("org_id", orgId).eq("id", cierreId).select("id").single(),
      () => null,
    ).then((r) => (!r.ok && r.fallo === "no-existe" ? { ok: false as const, fallo: "ya-emitido" as const } : r));
  },

  async lecturas(orgId, cierreId) {
    const { data, error } = await cliente()
      .from("lectura")
      .select("id, unidad_id, anterior, actual, foto, tomada_en, unidad(numero)")
      .eq("org_id", orgId)
      .eq("cierre_id", cierreId)
      .returns<
        {
          id: string;
          unidad_id: string;
          anterior: number | string | null;
          actual: number | string | null;
          foto: string | null;
          tomada_en: string | null;
          unidad: { numero: string } | null;
        }[]
      >();
    if (error) throw error;
    return (data ?? [])
      .map(
        (f): Lectura => ({
          id: f.id,
          unidadId: f.unidad_id,
          unidadNumero: f.unidad?.numero ?? "—",
          anterior: num(f.anterior),
          actual: num(f.actual),
          foto: f.foto,
          // Falta el correo de quién la tomó: la base guarda `tomada_por`, pero
          // el correo de otra cuenta solo lo da `miembros_de_la_organizacion`
          // (organizaciones), que es solo para el administrador.
          tomadaPor: null,
          tomadaEn: f.tomada_en,
        }),
      )
      .sort(porNumero);
  },

  guardarLectura(orgId, lecturaId, valores) {
    return escribir(
      (c) =>
        c
          .from("lectura")
          .update({ anterior: valores.anterior, actual: valores.actual, actualizado_en: new Date().toISOString() })
          .eq("org_id", orgId)
          .eq("id", lecturaId)
          .select("id")
          .single(),
      () => null,
    );
  },

  async subirFoto(orgId, lectura, cierreId, archivo) {
    const c = clienteSupabase();
    if (!c) return { ok: false, fallo: "sin-configurar" };
    const ruta = rutaDeFoto(orgId, cierreId, lectura.unidadId, archivo.extension);
    try {
      const cuerpo = await (await fetch(archivo.uri)).arrayBuffer();
      const subida = await c.storage.from("lecturas").upload(ruta, cuerpo, { contentType: archivo.tipo, upsert: true });
      if (subida.error) return { ok: false, fallo: subida.error.message.includes("row-level") ? "sin-permiso" : "desconocido" };
    } catch (error) {
      return { ok: false, fallo: clasificarFalloDeCobranza(error as ErrorPg) };
    }
    return escribir(
      (cl) => cl.from("lectura").update({ foto: ruta }).eq("org_id", orgId).eq("id", lectura.id).select("id").single(),
      () => ruta,
    );
  },

  async urlDeFoto(ruta) {
    const { data, error } = await cliente().storage.from("lecturas").createSignedUrl(ruta, 600);
    return error ? null : data.signedUrl;
  },

  async partidas(orgId, cierreId) {
    const { data, error } = await cliente()
      .from("partida")
      .select("concepto, monto")
      .eq("org_id", orgId)
      .eq("cierre_id", cierreId)
      .order("orden")
      .returns<{ concepto: string; monto: number | string }[]>();
    if (error) throw error;
    return (data ?? []).map((p) => ({ concepto: p.concepto, monto: monto(p.monto) }));
  },

  async guardarPartidas(orgId, cierreId, partidas) {
    const borrado = await escribir(
      (c) => c.from("partida").delete().eq("org_id", orgId).eq("cierre_id", cierreId),
      () => null,
    );
    if (!borrado.ok || partidas.length === 0) return borrado;
    return escribir(
      (c) =>
        c.from("partida").insert(partidas.map((p, orden) => ({ org_id: orgId, cierre_id: cierreId, concepto: p.concepto, monto: p.monto, orden }))),
      () => null,
    );
  },

  async partidasDelPeriodoAnterior(orgId, edificioId, periodo) {
    const { data, error } = await cliente()
      .from("cierre")
      .select("id")
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .lt("periodo", periodo)
      .order("periodo", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (error) throw error;
    return data ? this.partidas(orgId, data.id) : [];
  },

  async vistaPrevia(cierreId) {
    const { data, error } = await cliente().rpc("recibos_del_cierre", { p_cierre_id: cierreId });
    if (error) throw error;
    return ((data ?? []) as FilaPreviaPg[]).map(
      (f): FilaPrevia => ({
        unidadId: f.unidad_id,
        unidadNumero: f.unidad_numero,
        participacion: monto(f.participacion),
        anterior: num(f.anterior),
        actual: num(f.actual),
        consumo: num(f.consumo),
        cuota: monto(f.cuota),
        agua: monto(f.agua),
        deudaPrevia: monto(f.deuda_previa),
        total: monto(f.total),
        sinLectura: f.sin_lectura,
        atipico: f.atipico,
      }),
    );
  },

  emitir(cierreId, vence) {
    return escribir(
      (c) => c.rpc("emitir_cierre", { p_cierre_id: cierreId, p_vence: vence }),
      (data) => Number(data),
    );
  },

  async recibosDelCierre(orgId, cierreId) {
    const { data, error } = await cliente()
      .from("recibo_con_saldo")
      .select(COLUMNAS_RECIBO)
      .eq("org_id", orgId)
      .eq("cierre_id", cierreId)
      .order("numero")
      .returns<FilaRecibo[]>();
    if (error) throw error;
    return (data ?? []).map(aRecibo);
  },

  async recibosDeLaUnidad(orgId, unidadId) {
    const { data, error } = await cliente()
      .from("recibo_con_saldo")
      .select(COLUMNAS_RECIBO)
      .eq("org_id", orgId)
      .eq("unidad_id", unidadId)
      .order("periodo", { ascending: false })
      .returns<FilaRecibo[]>();
    if (error) throw error;
    return (data ?? []).map(aRecibo);
  },

  async saldoDeLaUnidad(orgId, unidadId) {
    const { data, error } = await cliente()
      .from("saldo_de_la_unidad")
      .select("saldo, por_validar")
      .eq("org_id", orgId)
      .eq("unidad_id", unidadId)
      .maybeSingle<{ saldo: number | string; por_validar: number | string }>();
    if (error) throw error;
    return { saldo: monto(data?.saldo ?? 0), porValidar: monto(data?.por_validar ?? 0) };
  },

  async recibo(orgId, reciboId) {
    const { data, error } = await cliente().from("recibo_con_saldo").select(COLUMNAS_RECIBO).eq("org_id", orgId).eq("id", reciboId).maybeSingle<FilaRecibo>();
    if (error) throw error;
    return data ? aRecibo(data) : null;
  },

  async nombreDeLaAdministradora(orgId) {
    const { data, error } = await cliente().from("organizacion").select("nombre").eq("id", orgId).maybeSingle<{ nombre: string }>();
    if (error) throw error;
    return data?.nombre ?? "";
  },

  async cierresDelPeriodo(orgId, periodo) {
    const { data, error } = await cliente()
      .from("cierre_por_edificio")
      .select("edificio_id, cierre_id, estado, paso")
      .eq("org_id", orgId)
      .eq("periodo", periodo)
      .returns<{ edificio_id: string; cierre_id: string; estado: "borrador" | "emitido"; paso: number }[]>();
    if (error) throw error;
    return new Map(
      (data ?? []).map((f) => [f.edificio_id, { id: f.cierre_id, estado: f.estado, paso: esNumeroDePaso(f.paso) ? f.paso : 1 }] as const),
    );
  },
};
