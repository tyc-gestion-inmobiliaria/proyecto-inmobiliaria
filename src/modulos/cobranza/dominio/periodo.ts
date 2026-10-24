/**
 * El periodo de un cierre: un mes, guardado como su primer día ("2026-09-01").
 *
 * Supuesto: el periodo en curso es el mes de hoy en Lima, y el vencimiento
 * que se sugiere al emitir es el día 15 del mes siguiente (se puede cambiar).
 */

export type Periodo = string;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-09-17" → "2026-09-01". */
export function periodoDe(fechaIso: string): Periodo {
  return `${fechaIso.slice(0, 7)}-01`;
}

/** Hoy en Lima, como fecha ISO: el mes del cierre lo decide el reloj del edificio, no el del servidor. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    ahora,
  );
}

export function sumarMeses(periodo: Periodo, meses: number): Periodo {
  const [a, m] = periodo.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/** "septiembre de 2026". */
export function textoDePeriodo(periodo: Periodo): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** "Septiembre 2026", para títulos y columnas. */
export function textoCortoDePeriodo(periodo: Periodo): string {
  const [a, m] = periodo.split("-").map(Number);
  const mes = MESES[m - 1];
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${a}`;
}

/** El día 15 del mes siguiente al periodo. */
export function vencimientoSugerido(periodo: Periodo): string {
  return `${sumarMeses(periodo, 1).slice(0, 8)}15`;
}

/** "15/10/2026". */
export function textoDeFecha(fechaIso: string): string {
  const [a, m, d] = fechaIso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Acepta "15/10/2026" o "2026-10-15"; devuelve la fecha ISO, o null si no es una fecha real. */
export function leerFecha(texto: string): string | null {
  const t = texto.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const partes = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;
  if (!partes) return null;
  const [a, m, d] = partes.map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}
