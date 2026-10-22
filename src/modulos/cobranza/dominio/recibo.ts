/**
 * El recibo: la vista previa del paso 3, el emitido, y lo que dice el estado
 * de cuenta de la unidad (PB-16, PB-18, PB-19, PB-20).
 *
 * Supuesto: hasta que existan los pagos (Sprint 3) ningún cargo está pagado;
 * el estado de cada uno es "por vencer" o "vencido" según su vencimiento.
 */
import { sumar, textoDeSoles } from "./dinero";
import { textoDeMetros } from "./lectura";
import { textoCortoDePeriodo, textoDeFecha, type Periodo } from "./periodo";

/** Una fila de la vista previa, como la calcula la base (`recibos_del_cierre`). */
export interface FilaPrevia {
  unidadId: string;
  unidadNumero: string;
  participacion: number;
  anterior: number | null;
  actual: number | null;
  consumo: number | null;
  cuota: number;
  agua: number;
  deudaPrevia: number;
  total: number;
  sinLectura: boolean;
  atipico: boolean;
}

export interface Recibo {
  id: string;
  numero: number;
  cierreId: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  periodo: Periodo;
  participacion: number;
  consumo: number | null;
  cuota: number;
  agua: number;
  deudaPrevia: number;
  total: number;
  vence: string;
  emitidoEn: string;
}

export interface AlertaDeFila {
  tipo: "sin-lectura" | "atipico";
  texto: string;
}

export function alertasDeFila(f: Pick<FilaPrevia, "sinLectura" | "atipico">): AlertaDeFila[] {
  const alertas: AlertaDeFila[] = [];
  if (f.sinLectura) alertas.push({ tipo: "sin-lectura", texto: "Sin lectura" });
  if (f.atipico) alertas.push({ tipo: "atipico", texto: "Consumo atípico" });
  return alertas;
}

export function resumenDePrevia(filas: readonly FilaPrevia[]) {
  return {
    unidades: filas.length,
    cuotas: sumar(filas.map((f) => f.cuota)),
    agua: sumar(filas.map((f) => f.agua)),
    deudaPrevia: sumar(filas.map((f) => f.deudaPrevia)),
    total: sumar(filas.map((f) => f.total)),
    conAlerta: filas.filter((f) => alertasDeFila(f).length > 0).length,
  };
}

/** "N.º 000042". */
export function textoDeNumero(numero: number): string {
  return `N.º ${String(numero).padStart(6, "0")}`;
}

// Estado de cuenta ---------------------------------------------------------------

export type EstadoDelCargo = "por-vencer" | "vencido" | "pagado";

export const TEXTO_DEL_ESTADO: Record<EstadoDelCargo, string> = { "por-vencer": "Por vencer", vencido: "Vencido", pagado: "Pagado" };

export function estadoDelCargo(vence: string, hoy: string): EstadoDelCargo {
  return hoy > vence ? "vencido" : "por-vencer";
}

export interface Cargo {
  reciboId: string;
  concepto: string;
  periodo: Periodo;
  monto: number;
  vence: string;
  estado: EstadoDelCargo;
}

/** Los cargos de cada recibo, del más nuevo al más viejo. La deuda previa no es un cargo: ya está en los anteriores. */
export function cargosDeLaUnidad(recibos: readonly Recibo[], hoy: string): Cargo[] {
  return [...recibos]
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.numero - a.numero)
    .flatMap((r) => {
      const estado = estadoDelCargo(r.vence, hoy);
      const cargos: Cargo[] = [{ reciboId: r.id, concepto: "Mantenimiento", periodo: r.periodo, monto: r.cuota, vence: r.vence, estado }];
      if (r.agua > 0) cargos.push({ reciboId: r.id, concepto: "Agua", periodo: r.periodo, monto: r.agua, vence: r.vence, estado });
      return cargos;
    });
}

export function saldoDeLaUnidad(recibos: readonly Recibo[]): number {
  return sumar(recibos.flatMap((r) => [r.cuota, r.agua]));
}

export type TonoDeEstado = "success" | "warning" | "danger" | "neutral";

/** El estado de la unidad en palabras, para el título de la ficha (PB-19). */
export function estadoDeLaUnidad(recibos: readonly Recibo[], hoy: string): { texto: string; tono: TonoDeEstado } {
  if (recibos.length === 0) return { texto: "Sin recibos", tono: "neutral" };
  const cargos = cargosDeLaUnidad(recibos, hoy).filter((c) => c.monto > 0);
  if (cargos.length === 0) return { texto: "Al día", tono: "success" };
  if (cargos.some((c) => c.estado === "vencido")) return { texto: "Con deuda vencida", tono: "danger" };
  return { texto: "Con deuda por vencer", tono: "warning" };
}

// El recibo como lo recibe el propietario --------------------------------------

export interface DatosDelRecibo {
  edificio: string;
  direccion: string | null;
  administradora: string;
  cuentas: readonly { banco: string; numero: string; cci: string | null; moneda: string }[];
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** El recibo en HTML, para imprimir o guardar como PDF. Solo usa datos del recibo emitido. */
export function htmlDelRecibo(r: Recibo, d: DatosDelRecibo): string {
  const fila = (concepto: string, monto: number) =>
    `<tr><td>${escapar(concepto)}</td><td class="monto">${escapar(textoDeSoles(monto))}</td></tr>`;
  const cuentas = d.cuentas
    .map(
      (c) =>
        `<li>${escapar(c.banco)} · ${escapar(c.moneda === "USD" ? "Dólares" : "Soles")} · Cuenta ${escapar(c.numero)}${
          c.cci ? ` · CCI ${escapar(c.cci)}` : ""
        }</li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Recibo ${escapar(textoDeNumero(r.numero))} · Unidad ${escapar(r.unidadNumero)}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d1d1f;margin:40px;font-size:14px;line-height:1.5}
h1{font-size:22px;margin:0 0 4px}
.sub{color:#55565c;margin:0 0 24px}
.datos{display:flex;flex-wrap:wrap;gap:8px 32px;margin-bottom:24px}
.datos div span{display:block;color:#55565c;font-size:12px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
td{padding:8px 0;border-bottom:1px solid #d9d9de}
.monto{text-align:right;font-variant-numeric:tabular-nums}
tr.total td{font-weight:700;border-bottom:none;font-size:16px}
ul{padding-left:18px}
</style></head><body>
<h1>Recibo de mantenimiento ${escapar(textoDeNumero(r.numero))}</h1>
<p class="sub">${escapar(d.edificio)}${d.direccion ? ` · ${escapar(d.direccion)}` : ""} · ${escapar(d.administradora)}</p>
<div class="datos">
<div><span>Unidad</span>${escapar(r.unidadNumero)}</div>
<div><span>Periodo</span>${escapar(textoCortoDePeriodo(r.periodo))}</div>
<div><span>Vence</span>${escapar(textoDeFecha(r.vence))}</div>
<div><span>Consumo de agua</span>${escapar(textoDeMetros(r.consumo))}</div>
</div>
<table>
${fila("Cuota de mantenimiento", r.cuota)}
${fila("Agua", r.agua)}
${fila("Deuda anterior", r.deudaPrevia)}
<tr class="total"><td>Total a pagar</td><td class="monto">${escapar(textoDeSoles(r.total))}</td></tr>
</table>
${cuentas ? `<p>Dónde pagar:</p><ul>${cuentas}</ul>` : ""}
</body></html>`;
}
