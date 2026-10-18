/**
 * Las cuentas del calendario, sin pintar nada. Puro, para `node --test`.
 *
 * Las fechas viajan como texto `AAAA-MM-DD`: se comparan como texto (el orden
 * alfabético es el cronológico) y no arrastran zona horaria.
 */

export interface YearMonth {
  year: number;
  /** De 0 (enero) a 11. */
  month: number;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** `AAAA-MM-DD` → año y mes. Si no se entiende, el mes de hoy. */
export function parseYearMonth(iso: string, fallback: Date = new Date()): YearMonth {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return { year: fallback.getFullYear(), month: fallback.getMonth() };
  return { year: Number(m[1]), month: Math.min(11, Math.max(0, Number(m[2]) - 1)) };
}

/**
 * Los días de un mes colocados en su columna, con huecos (`null`) al
 * principio para que el 1 caiga bajo su día de la semana.
 *
 * Todo en UTC a propósito: construirlo en hora local corre el día 1 en zonas
 * con desfase negativo y el mes empieza en la columna equivocada.
 *
 * @param weekStartsOn 1 = lunes (por defecto), 0 = domingo.
 */
export function daysOfMonth(year: number, month: number, weekStartsOn: 0 | 1 = 1): (number | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const offset = (first - weekStartsOn + 7) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= count; d++) cells.push(d);
  return cells;
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Quien toca el 5 y después el 1 quiere del 1 al 5: se ordena, no se rechaza. */
export function orderRange(a: string, b: string): { from: string; to: string } {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export function isInside(date: string, min?: string, max?: string): boolean {
  return (min === undefined || date >= min) && (max === undefined || date <= max);
}

/** Hoy en `AAAA-MM-DD`, en hora local del equipo. */
export function todayIso(now: Date = new Date()): string {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}
