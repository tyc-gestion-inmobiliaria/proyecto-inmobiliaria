/**
 * Montos en soles. En el cliente el dinero se muestra; el que vale es el que
 * calcula la base. Lo que se suma acá se suma en céntimos enteros, para no
 * arrastrar errores de coma flotante.
 */

const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

/** "S/ 1,234.50". */
export function textoDeSoles(monto: number): string {
  return SOLES.format(monto).replace(/ /g, " ");
}

export function aCentimos(monto: number): number {
  return Math.round(monto * 100);
}

export function deCentimos(centimos: number): number {
  return centimos / 100;
}

export function sumar(montos: readonly number[]): number {
  return deCentimos(montos.reduce((n, m) => n + aCentimos(m), 0));
}

/**
 * Lee un monto escrito: "1,234.50", "1234.5" o "1234,5". Devuelve null si no
 * es un número o si tiene más de dos decimales.
 */
export function leerMonto(texto: string): number | null {
  let t = texto
    .trim()
    .replace(/^S\/\s*/i, "")
    .replace(/\s/g, "");
  if (t === "") return null;
  // "1,234.50": la coma separa miles. "1234,5": la coma es el decimal.
  if (t.includes(".") && t.includes(",")) t = t.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,(?=\d{3}(\D|$))/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}
