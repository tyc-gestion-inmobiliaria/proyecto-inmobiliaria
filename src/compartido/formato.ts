/**
 * Cómo se escriben en pantalla las fechas y los montos de las secciones de
 * operación y gestión. Solo dan formato: los cálculos van en el dominio de
 * cada módulo (y, con base, en el servidor).
 */

const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

/** Céntimos enteros → "S/ 1,234.50". */
export function textoDeSoles(centimos: number): string {
  return SOLES.format(centimos / 100).replace(/[  ]/g, " ");
}

/** "2026-10-24" → "24/10/2026". */
export function textoDeFecha(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

/** "2026-10-24" → "sáb 24 oct". */
export function textoDeDia(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} ${MESES[m - 1]}`;
}

/** "2026-10-24T09:30:00-05:00" → "09:30" en Lima. */
export function textoDeHora(instante: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(instante));
}

/** Hoy en Lima, ISO. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** Cuántos días hay de `desde` a `hasta` (fechas ISO); negativo si `hasta` es antes. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "hoy", "ayer", "hace 3 días". */
export function textoDeHace(fecha: string, hoy: string): string {
  const n = diasEntre(fecha, hoy);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10" o "2026-10-01" → "octubre". */
export function nombreDelMes(periodo: string): string {
  return MESES_LARGOS[Number(periodo.slice(5, 7)) - 1] ?? periodo;
}
