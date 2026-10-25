/**
 * Lecturas de la semilla que comparten los adaptadores de maqueta de las
 * secciones sin tabla (reservas, incidencias, accesos, finanzas,
 * mantenimiento, comunicados, reportes). Solo leen `mundo`: el padrón sigue
 * siendo de `padron`.
 */
import { hoyEnLima } from "@/shared/format";

import { mundo } from "./world";

/** Las unidades de un edificio, por número. */
export function unidadesDe(edificioId: string): { id: string; numero: string }[] {
  return mundo.unidades
    .filter((u) => u.edificioId === edificioId)
    .map((u) => ({ id: u.id, numero: u.numero }))
    .sort((a, b) => a.numero.localeCompare(b.numero, "es", { numeric: true }));
}

export function numeroDeUnidad(unidadId: string): string {
  return mundo.unidades.find((u) => u.id === unidadId)?.numero ?? "—";
}

/**
 * Lo que una unidad debe de recibos vencidos, en céntimos: el cargo propio
 * (cuota más agua) de sus recibos ya vencidos menos los pagos aceptados,
 * igual que el saldo de la ficha. Con base, lo diría una vista de `cobranza`
 * y `pagos`.
 */
export function deudaVencidaDe(unidadId: string, hoy: string = hoyEnLima()): number {
  const vencido = mundo.recibos.filter((r) => r.unidadId === unidadId && r.vence < hoy).reduce((n, r) => n + Math.round((r.cuota + r.agua) * 100), 0);
  const pagado = mundo.pagos.filter((p) => p.unidadId === unidadId && p.estado === "aceptado").reduce((n, p) => n + Math.round(p.monto * 100), 0);
  return Math.max(0, vencido - pagado);
}

/** La fecha ISO de hoy en Lima desplazada `dias` (negativo: antes). */
export function fechaDesdeHoy(dias: number): string {
  const [a, m, d] = hoyEnLima().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Un instante de Lima, `dias` desde hoy a esa hora ("09:30"). */
export function instanteDesdeHoy(dias: number, hora: string): string {
  return `${fechaDesdeHoy(dias)}T${hora}:00-05:00`;
}
