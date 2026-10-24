/**
 * Los reportes como los piden las rutas. Solo existe la maqueta: lee los
 * recibos y pagos de la semilla (que escriben `cobranza` y `pagos`) y arma
 * cada tabla con las cuentas del dominio, como lo haría el servidor. La
 * versión con Supabase falta: serían vistas o funciones de Postgres.
 */
import { hoyEnLima } from "@/compartido/formato";
import { demora } from "@/compartido/maqueta/modo";
import { mundo } from "@/compartido/maqueta/mundo";

import type { ReportesPuerto } from "../aplicacion/puertos";
import { generar, type Datos } from "../dominio/reportes";

const centimos = (soles: number) => Math.round(soles * 100);

function datos(): Datos {
  return {
    edificios: mundo.edificios.map((e) => ({ id: e.id, nombre: e.nombre })),
    unidades: mundo.unidades.map((u) => ({ id: u.id, edificioId: u.edificioId, numero: u.numero, deudaAnterior: 0 })),
    // El cargo propio de cada recibo (cuota más agua): la deuda previa ya está en los recibos anteriores.
    recibos: mundo.recibos.map((r) => ({ edificioId: r.edificioId, unidadId: r.unidadId, periodo: r.periodo, total: centimos(r.cuota + r.agua), vence: r.vence })),
    pagos: mundo.pagos.map((p) => ({ edificioId: p.edificioId, unidadId: p.unidadId, monto: centimos(p.monto), fecha: p.fecha, estado: p.estado })),
  };
}

export const reportesMaqueta: ReportesPuerto = {
  generar(id, edificioId) {
    const hoy = hoyEnLima();
    return demora(generar(id, datos(), { hoy, edificioId }));
  },
};

export const reportesAdaptador: ReportesPuerto = reportesMaqueta;
