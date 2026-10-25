/**
 * Lo que pasa por la portería: las visitas que entran a una unidad y los
 * paquetes que llegan para ella.
 *
 * - Un paquete queda en portería hasta que alguien lo recoge; al entregarlo
 *   se anota quién se lo llevó (supuesto: basta el nombre, sin documento).
 * - Supuesto: un paquete con más de `DIAS_DE_AVISO` días en portería se
 *   marca para avisar a la unidad. Sin confirmar.
 * - Una visita entra con su nombre y la unidad que visita; el documento es
 *   opcional (supuesto). Se marca la salida cuando se va.
 * - Los instantes llegan con su zona; "hoy" es el día de Lima.
 */

export interface Paquete {
  id: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  /** Quién lo trae: la empresa de reparto o la persona. */
  remitente: string;
  descripcion: string | null;
  recibidoEn: string;
  entregadoEn: string | null;
  entregadoA: string | null;
}

export interface Visita {
  id: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  visitante: string;
  documento: string | null;
  entrada: string;
  salida: string | null;
}

export const DIAS_DE_AVISO = 3;

/** El día de Lima de un instante, ISO. */
export function diaDeLima(instante: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instante));
}

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** Cuántos días lleva un paquete en portería (0: llegó hoy). */
export function diasEnPorteria(p: Paquete, hoy: string): number {
  return Math.max(0, dias(diaDeLima(p.recibidoEn), hoy));
}

export function debeAvisarse(p: Paquete, hoy: string): boolean {
  return p.entregadoEn === null && diasEnPorteria(p, hoy) > DIAS_DE_AVISO;
}

/** Los que siguen en portería, el más antiguo primero. */
export function paquetesPendientes(lista: readonly Paquete[]): Paquete[] {
  return lista.filter((p) => p.entregadoEn === null).sort((a, b) => a.recibidoEn.localeCompare(b.recibidoEn));
}

/** Los entregados hoy, el último arriba. */
export function entregadosHoy(lista: readonly Paquete[], hoy: string): Paquete[] {
  return lista
    .filter((p) => p.entregadoEn !== null && diaDeLima(p.entregadoEn) === hoy)
    .sort((a, b) => (b.entregadoEn ?? "").localeCompare(a.entregadoEn ?? ""));
}

/** Las visitas de hoy: primero las que siguen adentro, luego por hora de entrada, la última arriba. */
export function visitasDeHoy(lista: readonly Visita[], hoy: string): Visita[] {
  return lista
    .filter((v) => diaDeLima(v.entrada) === hoy || v.salida === null)
    .sort((a, b) => Number(a.salida !== null) - Number(b.salida !== null) || b.entrada.localeCompare(a.entrada));
}

export const NOMBRE_MAXIMO = 80;

function nombre(texto: string, vacio: string): string | undefined {
  const t = texto.trim();
  if (t === "") return vacio;
  if (t.length > NOMBRE_MAXIMO) return `Usa ${NOMBRE_MAXIMO} caracteres o menos.`;
  return undefined;
}

function limpiar<T extends object>(e: T): T {
  for (const k of Object.keys(e) as (keyof T)[]) if (e[k] === undefined) delete e[k];
  return e;
}

export function validarEntrega(recibe: string): string | undefined {
  return nombre(recibe, "Escribe quién lo recoge.");
}

export type ErroresDePaquete = Partial<Record<"unidadId" | "remitente", string>>;

export function validarPaquete(d: { unidadId: string | undefined; remitente: string }): ErroresDePaquete {
  return limpiar({ unidadId: d.unidadId ? undefined : "Elige la unidad.", remitente: nombre(d.remitente, "Escribe quién lo trae.") });
}

export type ErroresDeVisita = Partial<Record<"unidadId" | "visitante", string>>;

export function validarVisita(d: { unidadId: string | undefined; visitante: string }): ErroresDeVisita {
  return limpiar({ unidadId: d.unidadId ? undefined : "Elige la unidad.", visitante: nombre(d.visitante, "Escribe el nombre de la visita.") });
}
