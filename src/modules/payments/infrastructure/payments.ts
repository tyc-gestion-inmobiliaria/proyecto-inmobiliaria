/**
 * Los pagos como los piden las rutas: Supabase o, en la maqueta, en memoria
 * sobre los datos compartidos (`mundo.pagos`).
 *
 * La maqueta imita a las funciones de `pagos` en Postgres en lo que la
 * pantalla tiene que saber decir: la clave del envío no duplica, la fecha no
 * puede ser futura, la cuenta tiene que ser del edificio, cada transición
 * valida el estado anterior y repetirla devuelve el estado en que ya está. Lo
 * que un pago aceptado cubre de cada recibo lo calcula la cobranza de la
 * maqueta al leer, como la vista `recibo_con_saldo`.
 *
 * El rol no se valida acá: en la maqueta la pantalla ya decide qué botones
 * mostrar con `puedeGestionarPagos`, y la base real lo vuelve a validar.
 */
import { demora, EN_MAQUETA } from "@/shared/mock/mode";
import { mundo, nuevoId, type PagoM } from "@/shared/mock/world";

import type { EnvioDePago, PagosPuerto, Resultado } from "../application/ports";
import { centimosDeSoles, solesDe } from "../domain/money";
import type { EstadoDelPago, Pago } from "../domain/payment";
import { pagosSupabase } from "./payments-supabase";

/** Los comprobantes subidos en esta pestaña: ruta → dirección local del archivo. */
const comprobantes = new Map<string, string>();

function hoyEnLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function aPago(p: PagoM): Pago {
  const cuenta = p.cuentaId ? mundo.cuentas.find((c) => c.id === p.cuentaId) : undefined;
  return {
    id: p.id,
    orgId: p.orgId,
    edificioId: p.edificioId,
    edificioNombre: mundo.edificios.find((e) => e.id === p.edificioId)?.nombre ?? "—",
    unidadId: p.unidadId,
    unidadNumero: mundo.unidades.find((u) => u.id === p.unidadId)?.numero ?? "—",
    monto: centimosDeSoles(p.monto),
    fecha: p.fecha,
    operacion: p.operacion,
    cuenta: cuenta ? { id: cuenta.id, banco: cuenta.banco, numero: cuenta.numero } : null,
    origen: p.origen,
    estado: p.estado,
    motivoRechazo: p.motivoRechazo,
    comprobante: p.comprobante,
    reportadoEn: p.reportadoEn,
    validadoEn: p.validadoEn,
  };
}

function alta(envio: EnvioDePago, origen: PagoM["origen"]): Promise<Resultado<string>> {
  const unidad = mundo.unidades.find((u) => u.id === envio.unidadId);
  if (!unidad) return demora({ ok: false, fallo: "sin-permiso" });
  const ya = mundo.pagos.find((p) => p.orgId === unidad.orgId && p.clave === envio.clave);
  if (ya) return demora(ya.unidadId === unidad.id ? { ok: true, valor: ya.id } : { ok: false, fallo: "invalido", campo: "clave" });
  if (envio.fecha > hoyEnLima()) return demora({ ok: false, fallo: "invalido", campo: "fecha" });
  if (envio.cuentaId && !mundo.cuentas.some((c) => c.id === envio.cuentaId && c.edificioId === unidad.edificioId)) {
    return demora({ ok: false, fallo: "invalido", campo: "cuenta" });
  }
  const ahora = new Date().toISOString();
  const id = nuevoId("pago");
  mundo.pagos.push({
    id,
    orgId: unidad.orgId,
    edificioId: unidad.edificioId,
    unidadId: unidad.id,
    monto: solesDe(envio.monto),
    fecha: envio.fecha,
    operacion: envio.operacion,
    cuentaId: envio.cuentaId,
    origen,
    estado: origen === "registrado" ? "aceptado" : "por_validar",
    motivoRechazo: null,
    comprobante: envio.comprobante,
    clave: envio.clave,
    reportadoEn: ahora,
    validadoEn: origen === "registrado" ? ahora : null,
  });
  return demora({ ok: true, valor: id });
}

function cambiar(pagoId: string, de: EstadoDelPago, a: EstadoDelPago, extra: Partial<PagoM> = {}): Promise<Resultado<EstadoDelPago>> {
  const p = mundo.pagos.find((x) => x.id === pagoId);
  if (!p) return demora({ ok: false, fallo: "no-existe" });
  if (p.estado === a) return demora({ ok: true, valor: a });
  if (p.estado !== de) return demora({ ok: false, fallo: "estado" });
  Object.assign(p, { estado: a, validadoEn: a === "por_validar" ? null : new Date().toISOString(), ...extra });
  return demora({ ok: true, valor: a });
}

const pagosDeMaqueta: PagosPuerto = {
  cola: (orgId, filtro) =>
    demora(
      mundo.pagos
        .filter((p) => p.orgId === orgId && p.estado === filtro.estado && (filtro.edificioId === null || p.edificioId === filtro.edificioId))
        .sort((a, b) => a.reportadoEn.localeCompare(b.reportadoEn))
        .map(aPago),
    ),
  deLaUnidad: (orgId, unidadId) =>
    demora(
      mundo.pagos
        .filter((p) => p.orgId === orgId && p.unidadId === unidadId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map(aPago),
    ),
  cuentasDelEdificio: (orgId, edificioId) =>
    demora(
      mundo.cuentas
        .filter((c) => c.orgId === orgId && c.edificioId === edificioId)
        .map((c) => ({ id: c.id, nombre: c.nombre, banco: c.banco, numero: c.numero })),
    ),
  reportar(envio) {
    if (!envio.operacion) return demora({ ok: false, fallo: "invalido", campo: "operacion" });
    if (!envio.cuentaId) return demora({ ok: false, fallo: "invalido", campo: "cuenta" });
    return alta(envio, "reportado");
  },
  registrar: (envio) => alta(envio, "registrado"),
  aceptar: (pagoId) => cambiar(pagoId, "por_validar", "aceptado"),
  rechazar(pagoId, motivo) {
    if (motivo.trim() === "") return demora({ ok: false, fallo: "invalido", campo: "motivo" });
    return cambiar(pagoId, "por_validar", "rechazado", { motivoRechazo: motivo.trim() });
  },
  revertir: (pagoId) => cambiar(pagoId, "aceptado", "por_validar"),
  subirComprobante(orgId, unidadId, clave, archivo) {
    const ruta = `${orgId}/${unidadId}/${clave}.${archivo.extension}`;
    comprobantes.set(ruta, archivo.uri);
    return demora({ ok: true, valor: ruta });
  },
  urlDeComprobante: (ruta) => demora(comprobantes.get(ruta) ?? null),
};

export const pagos: PagosPuerto = EN_MAQUETA ? pagosDeMaqueta : pagosSupabase;
