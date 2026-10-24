/**
 * La cobranza como la piden las rutas: Supabase o, en la maqueta, en memoria
 * sobre los datos compartidos.
 *
 * La maqueta imita a la base en lo que la pantalla tiene que saber decir:
 * el prorrateo al céntimo, que no se emite dos veces, que la lectura no baja
 * y que sin participación completa o sin cuenta no hay emisión. El dinero
 * sigue saliendo de "fuera" de la pantalla, como saldrá del servidor.
 */
import { demora, EN_MAQUETA } from "@/compartido/maqueta/modo";
import { mundo, NOMBRE_ORG_DEMO, nuevoId } from "@/compartido/maqueta/mundo";

import type { CobranzaPuerto, Resultado } from "../aplicacion/puertos";
import type { Cierre } from "../dominio/cierre";
import { sumar } from "../dominio/dinero";
import { sumarMeses } from "../dominio/periodo";
import { repartir } from "../dominio/prorrateo";
import type { FilaPrevia } from "../dominio/recibo";
import { cobranzaSupabase } from "./cobranza-supabase";

const bien = <T>(valor: T): Promise<Resultado<T>> => demora({ ok: true, valor });
const mal = <T>(fallo: Exclude<Resultado<T>, { ok: true }>["fallo"]): Promise<Resultado<T>> => demora({ ok: false, fallo });

function unidadesDe(edificioId: string) {
  return mundo.unidades.filter((u) => u.edificioId === edificioId);
}

function estadoDelPadron(edificioId: string) {
  const unidades = unidadesDe(edificioId);
  const total = Math.round(sumar(unidades.map((u) => u.participacion ?? 0)) * 100) / 100;
  return {
    unidades: unidades.length,
    sinParticipacion: unidades.filter((u) => u.participacion === null).length,
    total,
    sumaCien: total === 100,
    cuentas: mundo.cuentas.filter((c) => c.edificioId === edificioId).length,
  };
}

/** Las lecturas del cierre, creadas al abrirlo con la actual del mes anterior como anterior. */
function asegurarLecturas(cierre: Cierre) {
  for (const u of unidadesDe(cierre.edificioId)) {
    if (mundo.lecturas.some((l) => l.cierreId === cierre.id && l.unidadId === u.id)) continue;
    mundo.lecturas.push({ id: nuevoId("lectura"), cierreId: cierre.id, unidadId: u.id, unidadNumero: u.numero, anterior: null, actual: null, foto: null });
  }
}

function previa(cierreId: string): FilaPrevia[] {
  const cierre = mundo.cierres.find((c) => c.id === cierreId);
  if (!cierre) return [];
  const unidades = unidadesDe(cierre.edificioId);
  const lecturas = new Map(mundo.lecturas.filter((l) => l.cierreId === cierreId).map((l) => [l.unidadId, l]));
  const consumos = new Map(
    unidades.map((u) => {
      const l = lecturas.get(u.id);
      const c = l && l.anterior !== null && l.actual !== null ? l.actual - l.anterior : null;
      return [u.id, c] as const;
    }),
  );
  const conConsumo = [...consumos.values()].filter((c): c is number => c !== null);
  const promedio = conConsumo.length ? sumar(conConsumo) / conConsumo.length : 0;
  const presupuesto = sumar(mundo.partidas.filter((p) => p.cierreId === cierreId).map((p) => p.monto));
  const cuotas = repartir(presupuesto, unidades.map((u) => ({ clave: u.id, peso: u.participacion ?? 0 })));
  const agua = repartir(cierre.montoAgua, unidades.map((u) => ({ clave: u.id, peso: consumos.get(u.id) ?? 0 })));
  return unidades.map((u) => {
    const l = lecturas.get(u.id);
    const consumo = consumos.get(u.id) ?? null;
    const deudaPrevia = sumar(
      mundo.recibos.filter((r) => r.unidadId === u.id && r.periodo < cierre.periodo).map((r) => r.total),
    );
    const cuota = cuotas.get(u.id) ?? 0;
    const delAgua = agua.get(u.id) ?? 0;
    return {
      unidadId: u.id,
      unidadNumero: u.numero,
      participacion: u.participacion ?? 0,
      anterior: l?.anterior ?? null,
      actual: l?.actual ?? null,
      consumo,
      cuota,
      agua: delAgua,
      deudaPrevia,
      total: sumar([cuota, delAgua, deudaPrevia]),
      sinLectura: consumo === null,
      atipico: consumo !== null && promedio > 0 && consumo > promedio * (1 + cierre.umbralAtipico / 100),
    };
  });
}

/**
 * Los recibos que trae la semilla se rehacen con el mismo prorrateo que la
 * vista previa, para que lo emitido cuadre con lo que se revisó: la semilla
 * no sabe repartir el agua al céntimo, y no tiene por qué saber.
 */
function cuadrarLaSemilla() {
  for (const cierre of mundo.cierres.filter((c) => c.estado === "emitido")) {
    const filas = new Map(previa(cierre.id).map((f) => [f.unidadId, f]));
    for (const r of mundo.recibos.filter((x) => x.cierreId === cierre.id)) {
      const f = filas.get(r.unidadId);
      if (f) Object.assign(r, { consumo: f.consumo, cuota: f.cuota, agua: f.agua, deudaPrevia: f.deudaPrevia, total: f.total });
    }
  }
}

if (EN_MAQUETA) cuadrarLaSemilla();

const cobranzaDeMaqueta: CobranzaPuerto = {
  cierreDelPeriodo: (orgId, edificioId, periodo) =>
    demora(mundo.cierres.find((c) => c.orgId === orgId && c.edificioId === edificioId && c.periodo === periodo) ?? null),

  abrirCierre(edificioId, periodo) {
    const edificio = mundo.edificios.find((e) => e.id === edificioId);
    if (!edificio) return mal("no-existe");
    let cierre = mundo.cierres.find((c) => c.edificioId === edificioId && c.periodo === periodo);
    if (!cierre) {
      cierre = { id: nuevoId("cierre"), orgId: edificio.orgId, edificioId, periodo, estado: "borrador", paso: 1, montoAgua: 0, umbralAtipico: 50, vence: null };
      mundo.cierres.push(cierre);
    }
    asegurarLecturas(cierre);
    return bien(cierre.id);
  },

  cierre: (orgId, cierreId) => demora(mundo.cierres.find((c) => c.orgId === orgId && c.id === cierreId) ?? null),

  edificio(orgId, edificioId) {
    const e = mundo.edificios.find((x) => x.orgId === orgId && x.id === edificioId);
    return demora(e ? { id: e.id, nombre: e.nombre, direccion: e.direccion } : null);
  },

  padron: (_orgId, edificioId) => demora(estadoDelPadron(edificioId)),

  cuentas: (_orgId, edificioId) =>
    demora(mundo.cuentas.filter((c) => c.edificioId === edificioId).map((c) => ({ banco: c.banco, numero: c.numero, cci: c.cci, moneda: c.moneda }))),

  guardarCierre(_orgId, cierreId, cambios) {
    const cierre = mundo.cierres.find((c) => c.id === cierreId);
    if (!cierre) return mal("no-existe");
    if (cierre.estado === "emitido") return mal("ya-emitido");
    Object.assign(cierre, cambios);
    return bien(null);
  },

  lecturas(_orgId, cierreId) {
    const cierre = mundo.cierres.find((c) => c.id === cierreId);
    if (cierre) asegurarLecturas(cierre);
    return demora(
      mundo.lecturas
        .filter((l) => l.cierreId === cierreId)
        .map(({ id, unidadId, unidadNumero, anterior, actual, foto }) => ({ id, unidadId, unidadNumero, anterior, actual, foto }))
        .sort((a, b) => a.unidadNumero.localeCompare(b.unidadNumero, "es", { numeric: true })),
    );
  },

  guardarLectura(_orgId, lecturaId, valores) {
    const l = mundo.lecturas.find((x) => x.id === lecturaId);
    if (!l) return mal("no-existe");
    if (valores.anterior !== null && valores.actual !== null && valores.actual < valores.anterior) return mal("invalido");
    Object.assign(l, valores);
    return bien(null);
  },

  subirFoto(_orgId, lectura, _cierreId, archivo) {
    const l = mundo.lecturas.find((x) => x.id === lectura.id);
    if (!l) return mal("no-existe");
    l.foto = archivo.uri;
    return bien(archivo.uri);
  },

  urlDeFoto: (ruta) => demora(ruta),

  partidas: (_orgId, cierreId) =>
    demora(mundo.partidas.filter((p) => p.cierreId === cierreId).map(({ concepto, monto }) => ({ concepto, monto }))),

  guardarPartidas(_orgId, cierreId, partidas) {
    mundo.partidas = [...mundo.partidas.filter((p) => p.cierreId !== cierreId), ...partidas.map((p) => ({ cierreId, ...p }))];
    return bien(null);
  },

  partidasDelPeriodoAnterior(_orgId, edificioId, periodo) {
    const anterior = mundo.cierres.find((c) => c.edificioId === edificioId && c.periodo === sumarMeses(periodo, -1));
    return demora(anterior ? mundo.partidas.filter((p) => p.cierreId === anterior.id).map(({ concepto, monto }) => ({ concepto, monto })) : []);
  },

  vistaPrevia: (cierreId) => demora(previa(cierreId)),

  emitir(cierreId, vence) {
    const cierre = mundo.cierres.find((c) => c.id === cierreId);
    if (!cierre) return mal("no-existe");
    const yaEmitidos = mundo.recibos.filter((r) => r.cierreId === cierreId).length;
    if (cierre.estado === "emitido") return bien(yaEmitidos);
    const padron = estadoDelPadron(cierre.edificioId);
    if (!padron.sumaCien || padron.sinParticipacion > 0) return mal("participacion");
    if (padron.cuentas === 0) return mal("sin-cuenta");
    const ahora = new Date().toISOString();
    let numero = Math.max(0, ...mundo.recibos.map((r) => r.numero));
    for (const f of previa(cierreId)) {
      mundo.recibos.push({
        id: nuevoId("recibo"),
        numero: ++numero,
        cierreId,
        edificioId: cierre.edificioId,
        unidadId: f.unidadId,
        unidadNumero: f.unidadNumero,
        periodo: cierre.periodo,
        participacion: f.participacion,
        consumo: f.consumo,
        cuota: f.cuota,
        agua: f.agua,
        deudaPrevia: f.deudaPrevia,
        total: f.total,
        vence,
        emitidoEn: ahora,
      });
    }
    Object.assign(cierre, { estado: "emitido", paso: 4, vence });
    return bien(mundo.recibos.filter((r) => r.cierreId === cierreId).length);
  },

  recibosDelCierre: (_orgId, cierreId) => demora(mundo.recibos.filter((r) => r.cierreId === cierreId)),
  recibosDeLaUnidad: (_orgId, unidadId) =>
    demora(mundo.recibos.filter((r) => r.unidadId === unidadId).sort((a, b) => b.periodo.localeCompare(a.periodo))),
  recibo: (_orgId, reciboId) => demora(mundo.recibos.find((r) => r.id === reciboId) ?? null),
  nombreDeLaAdministradora: () => demora(NOMBRE_ORG_DEMO),

  cierresDelPeriodo(orgId, periodo) {
    const cierres = mundo.cierres.filter((c) => c.orgId === orgId && c.periodo === periodo);
    return demora(new Map(cierres.map((c) => [c.edificioId, { id: c.id, estado: c.estado, paso: c.paso }])));
  },
};

export const cobranza: CobranzaPuerto = EN_MAQUETA ? cobranzaDeMaqueta : cobranzaSupabase;
