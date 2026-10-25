/**
 * `PagosPuerto` en memoria, para las pruebas y para otras ramas (portal del
 * residente) que necesitan un pago sin base. Imita lo que hace la base: la
 * clave del envío no duplica, cada transición valida el estado anterior y
 * repetirla devuelve el estado en que ya está. La aplicación a recibos y los
 * saldos no se imitan: son de la base y los prueba pgTAP (06_pagos.sql).
 */
import { centimos } from "../dominio/dinero";
import type { EstadoDelPago, Pago } from "../dominio/pago";
import type { ArchivoDeComprobante, CuentaDestino, EnvioDePago, PagosPuerto, Resultado } from "../aplicacion/puertos";

export interface UnidadDelFalso {
  id: string;
  orgId: string;
  edificioId: string;
  edificioNombre: string;
  numero: string;
}

export interface OpcionesDelFalso {
  unidades: UnidadDelFalso[];
  cuentas?: (CuentaDestino & { edificioId: string })[];
  pagos?: Pago[];
  /** Las unidades del residente con sesión, para `reportar`. */
  misUnidades?: string[];
  /** Si quien llama es administrador (registrar, aceptar, rechazar, revertir). */
  administrador?: boolean;
  /** Hace fallar la próxima escritura con este fallo (para probar los mensajes). */
  fallarCon?: Resultado<never>;
  hoy?: string;
}

export function pagosFalso(opciones: OpcionesDelFalso) {
  const pagos = new Map<string, Pago>((opciones.pagos ?? []).map((p) => [p.id, { ...p }]));
  const claves = new Map<string, string>();
  const subidas: string[] = [];
  const llamadas: string[] = [];
  let fallo: Resultado<never> | undefined = opciones.fallarCon;
  let siguiente = 1;

  function tomarFallo(): Resultado<never> | null {
    const f = fallo;
    fallo = undefined;
    return f ?? null;
  }

  function alta(envio: EnvioDePago, origen: "reportado" | "registrado"): Resultado<string> {
    const unidad = opciones.unidades.find((u) => u.id === envio.unidadId);
    if (!unidad) return { ok: false, fallo: "sin-permiso" };
    const ya = claves.get(`${unidad.orgId}:${envio.clave}`);
    if (ya) {
      if (pagos.get(ya)?.unidadId !== envio.unidadId) return { ok: false, fallo: "invalido", campo: "clave" };
      return { ok: true, valor: ya };
    }
    if (envio.fecha > (opciones.hoy ?? "9999-12-31")) return { ok: false, fallo: "invalido", campo: "fecha" };
    const cuenta = envio.cuentaId ? opciones.cuentas?.find((c) => c.id === envio.cuentaId && c.edificioId === unidad.edificioId) : null;
    if (envio.cuentaId && !cuenta) return { ok: false, fallo: "invalido", campo: "cuenta" };
    const id = `pago-${siguiente++}`;
    const ahora = new Date().toISOString();
    pagos.set(id, {
      id,
      orgId: unidad.orgId,
      edificioId: unidad.edificioId,
      edificioNombre: unidad.edificioNombre,
      unidadId: unidad.id,
      unidadNumero: unidad.numero,
      monto: centimos(envio.monto),
      fecha: envio.fecha,
      operacion: envio.operacion,
      cuenta: cuenta ? { id: cuenta.id, banco: cuenta.banco, numero: cuenta.numero } : null,
      origen,
      estado: origen === "registrado" ? "aceptado" : "por_validar",
      motivoRechazo: null,
      comprobante: envio.comprobante,
      reportadoEn: ahora,
      validadoEn: origen === "registrado" ? ahora : null,
    });
    claves.set(`${unidad.orgId}:${envio.clave}`, id);
    return { ok: true, valor: id };
  }

  function cambiar(pagoId: string, de: EstadoDelPago, a: EstadoDelPago, extra: Partial<Pago> = {}): Resultado<EstadoDelPago> {
    if (!opciones.administrador) return { ok: false, fallo: "sin-permiso" };
    const p = pagos.get(pagoId);
    if (!p) return { ok: false, fallo: "sin-permiso" };
    if (p.estado === a) return { ok: true, valor: a };
    if (p.estado !== de) return { ok: false, fallo: "estado" };
    pagos.set(pagoId, { ...p, estado: a, validadoEn: a === "por_validar" ? null : new Date().toISOString(), ...extra });
    return { ok: true, valor: a };
  }

  const puerto: PagosPuerto = {
    async cola(orgId, filtro) {
      return [...pagos.values()].filter(
        (p) => p.orgId === orgId && p.estado === filtro.estado && (filtro.edificioId === null || p.edificioId === filtro.edificioId),
      );
    },
    async deLaUnidad(orgId, unidadId) {
      return [...pagos.values()].filter((p) => p.orgId === orgId && p.unidadId === unidadId);
    },
    async cuentasDelEdificio(_orgId, edificioId) {
      return (opciones.cuentas ?? []).filter((c) => c.edificioId === edificioId).map(({ edificioId: _e, ...c }) => c);
    },
    async reportar(envio) {
      llamadas.push("reportar");
      const f = tomarFallo();
      if (f) return f;
      if (!(opciones.misUnidades ?? []).includes(envio.unidadId)) return { ok: false, fallo: "sin-permiso" };
      if (!envio.operacion) return { ok: false, fallo: "invalido", campo: "operacion" };
      if (!envio.cuentaId) return { ok: false, fallo: "invalido", campo: "cuenta" };
      return alta(envio, "reportado");
    },
    async registrar(envio) {
      llamadas.push("registrar");
      const f = tomarFallo();
      if (f) return f;
      if (!opciones.administrador) return { ok: false, fallo: "sin-permiso" };
      return alta(envio, "registrado");
    },
    async aceptar(pagoId) {
      llamadas.push("aceptar");
      return tomarFallo() ?? cambiar(pagoId, "por_validar", "aceptado");
    },
    async rechazar(pagoId, motivo) {
      llamadas.push("rechazar");
      const f = tomarFallo();
      if (f) return f;
      if (motivo.trim() === "") return { ok: false, fallo: "invalido", campo: "motivo" };
      return cambiar(pagoId, "por_validar", "rechazado", { motivoRechazo: motivo.trim() });
    },
    async revertir(pagoId) {
      llamadas.push("revertir");
      return tomarFallo() ?? cambiar(pagoId, "aceptado", "por_validar");
    },
    async subirComprobante(orgId, unidadId, clave, archivo: ArchivoDeComprobante) {
      llamadas.push("subir");
      const f = tomarFallo();
      if (f) return f;
      const ruta = `${orgId}/${unidadId}/${clave}.${archivo.extension}`;
      subidas.push(ruta);
      return { ok: true, valor: ruta };
    },
    async urlDeComprobante(ruta) {
      return `memoria://${ruta}`;
    },
  };

  return { puerto, pagos, subidas, llamadas, fallarLaProxima: (r: Resultado<never>) => (fallo = r) };
}
