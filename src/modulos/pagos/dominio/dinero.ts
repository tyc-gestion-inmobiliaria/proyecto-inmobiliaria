/**
 * El dinero de un pago, en céntimos enteros. Así un monto escrito, comparado
 * o sumado no arrastra errores de coma flotante; a la base va en soles con
 * dos decimales (`numeric(12,2)`), que es la que manda.
 */

declare const marca: unique symbol;

/** Un monto en céntimos: entero y no negativo. Se crea con `centimos` o `leerCentimos`. */
export type Centimos = number & { readonly [marca]: "centimos" };

/** El tope de `numeric(12,2)`: 9 999 999 999,99. */
const TOPE = 999_999_999_999;

export function centimos(n: number): Centimos {
  if (!Number.isInteger(n) || n < 0 || n > TOPE) throw new RangeError(`No es un monto en céntimos: ${n}`);
  return n as Centimos;
}

/** Soles como los devuelve la base ("150.5" o 150.5) → céntimos. */
export function centimosDeSoles(soles: number | string): Centimos {
  return centimos(Math.round(Number(soles) * 100));
}

/** Céntimos → soles, para mandarlos a la base. */
export function solesDe(c: Centimos): number {
  return c / 100;
}

/**
 * Lee un monto escrito: "1,234.50", "1234.5", "1234,5" o "S/ 80". Devuelve
 * null si no es un número, si tiene más de dos decimales o si se pasa del tope.
 */
export function leerCentimos(texto: string): Centimos | null {
  let t = texto
    .trim()
    .replace(/^S\/\s*/i, "")
    .replace(/\s/g, "");
  if (t === "") return null;
  // "1,234.50": la coma separa miles. "1234,5": la coma es el decimal.
  if (t.includes(".") && t.includes(",")) t = t.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,(?=\d{3}(\D|$))/g, "");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return n > TOPE ? null : (n as Centimos);
}

const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

/** "S/ 1,234.50". */
export function textoDeCentimos(c: Centimos): string {
  return SOLES.format(c / 100).replace(/ /g, " ");
}
