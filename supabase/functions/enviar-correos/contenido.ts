/**
 * Qué dice cada correo, a partir de lo que el disparador copió en `datos`.
 * Puro: sin red ni base, para poder leerlo y probarlo solo.
 *
 * Texto corto, en el tono de la app: qué pasó, cuánto y hasta cuándo. El
 * monto con dos decimales y punto, como en la app ("S/ 1,234.50").
 */

export type TipoDeEnvio = "recibo" | "pago_validado" | "pago_rechazado";

export interface Datos {
  nombre?: string | null;
  edificio?: string;
  unidad?: string;
  numero?: number;
  periodo?: string;
  total?: number | string;
  vence?: string;
  monto?: number | string;
  fecha?: string;
  motivo?: string | null;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const SOLES = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function soles(valor: number | string | undefined): string {
  return `S/ ${SOLES.format(Number(valor ?? 0))}`;
}

/** "2026-10-28" → "28/10/2026". */
export function fecha(iso: string | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-10-01" → "octubre de 2026". */
export function periodo(iso: string | undefined): string {
  if (!iso) return "";
  const [a, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export function cuerpo(tipo: TipoDeEnvio, d: Datos): string {
  const saludo = d.nombre ? `Hola, ${d.nombre}:` : "Hola:";
  switch (tipo) {
    case "recibo":
      return [
        saludo,
        "",
        `Ya está tu recibo de ${periodo(d.periodo)} de la unidad ${d.unidad} (${d.edificio}).`,
        `Total a pagar: ${soles(d.total)}. Vence el ${fecha(d.vence)}.`,
        "",
        "Puedes verlo y descargarlo en la app, y avisar ahí cuando pagues.",
      ].join("\n");
    case "pago_validado":
      return [
        saludo,
        "",
        `Validamos tu pago de ${soles(d.monto)} del ${fecha(d.fecha)} para la unidad ${d.unidad}.`,
        "Ya está aplicado a tu estado de cuenta.",
      ].join("\n");
    case "pago_rechazado":
      return [
        saludo,
        "",
        `No pudimos validar tu pago de ${soles(d.monto)} del ${fecha(d.fecha)} para la unidad ${d.unidad}.`,
        `Motivo: ${d.motivo ?? "sin detalle"}.`,
        "",
        "Si fue un error, vuelve a reportarlo en la app con el comprobante.",
      ].join("\n");
  }
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** El mismo texto en HTML simple: un párrafo por bloque. */
export function html(texto: string): string {
  return texto
    .split("\n\n")
    .map((p) => `<p>${escapar(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

/** Cuándo reintentar: 5, 10, 20, 40 minutos. Al quinto intento fallido, se deja. */
export const MAXIMO_DE_INTENTOS = 5;

export function proximoIntento(intentos: number, ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + 5 * 60_000 * 2 ** Math.max(0, intentos - 1));
}
