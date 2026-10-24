/**
 * El mantenimiento preventivo del edificio: sus equipos, quién los atiende y
 * cada cuánto toca cada tarea.
 *
 * - Una tarea vence en su fecha próxima. Está "por vencer" si faltan
 *   `DIAS_DE_AVISO` días o menos (supuesto: 15 días, sin confirmar).
 * - Supuesto: al marcarla hecha, la siguiente fecha se cuenta desde el día
 *   en que se hizo, no desde la que estaba programada. Sin confirmar.
 * - El cronograma va por fecha próxima: lo vencido primero.
 */

export interface Proveedor {
  id: string;
  nombre: string;
  rubro: string;
  telefono: string | null;
}

export interface Equipo {
  id: string;
  edificioId: string;
  nombre: string;
  ubicacion: string;
  proveedorId: string | null;
}

export interface TareaDeMantenimiento {
  id: string;
  edificioId: string;
  equipoId: string;
  tarea: string;
  frecuenciaMeses: number;
  /** Fecha ISO de la última vez que se hizo; null si nunca. */
  ultima: string | null;
  /** Fecha ISO en que toca. */
  proxima: string;
}

export type EstadoDeTarea = "vencida" | "por_vencer" | "al_dia";

export const DIAS_DE_AVISO = 15;

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** Cuántos días faltan para que toque (negativo: cuántos lleva vencida). */
export function diasParaLaTarea(t: TareaDeMantenimiento, hoy: string): number {
  return dias(hoy, t.proxima);
}

export function estadoDeLaTarea(t: TareaDeMantenimiento, hoy: string): EstadoDeTarea {
  const n = diasParaLaTarea(t, hoy);
  if (n < 0) return "vencida";
  if (n <= DIAS_DE_AVISO) return "por_vencer";
  return "al_dia";
}

/** Suma meses a una fecha ISO; si el día no existe en el mes de llegada, el último del mes. */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

export function marcarHecha(t: TareaDeMantenimiento, el: string): TareaDeMantenimiento {
  return { ...t, ultima: el, proxima: sumarMeses(el, t.frecuenciaMeses) };
}

export function ordenarCronograma(lista: readonly TareaDeMantenimiento[]): TareaDeMantenimiento[] {
  return [...lista].sort((a, b) => a.proxima.localeCompare(b.proxima));
}

export function contarPorEstado(lista: readonly TareaDeMantenimiento[], hoy: string): Record<EstadoDeTarea, number> {
  const n: Record<EstadoDeTarea, number> = { vencida: 0, por_vencer: 0, al_dia: 0 };
  for (const t of lista) n[estadoDeLaTarea(t, hoy)]++;
  return n;
}

export function textoDeFrecuencia(meses: number): string {
  if (meses === 1) return "Mensual";
  if (meses === 3) return "Trimestral";
  if (meses === 6) return "Semestral";
  if (meses === 12) return "Anual";
  return `Cada ${meses} meses`;
}
