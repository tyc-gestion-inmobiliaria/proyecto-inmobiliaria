/**
 * Un comunicado de la administración a los residentes de un edificio.
 *
 * - Se escribe como borrador y se publica cuando está listo. Un borrador se
 *   puede seguir editando.
 * - Supuesto: uno publicado no se edita (los residentes ya lo leyeron); si
 *   algo cambió, se publica otro. Sin confirmar con el cliente.
 * - Supuesto: va a todos los residentes o solo a los propietarios (lo que
 *   toca a la junta). Sin confirmar.
 */

export type EstadoDelComunicado = "borrador" | "publicado";
export type Audiencia = "todos" | "propietarios";

export interface Comunicado {
  id: string;
  edificioId: string;
  titulo: string;
  cuerpo: string;
  audiencia: Audiencia;
  estado: EstadoDelComunicado;
  /** Fecha ISO de la última edición del borrador o de su creación. */
  editadoEl: string;
  publicadoEl: string | null;
}

export const TEXTO_DE_AUDIENCIA: Record<Audiencia, string> = {
  todos: "Todos los residentes",
  propietarios: "Solo propietarios",
};

export const TITULO_MAXIMO = 90;
export const CUERPO_MAXIMO = 2000;

export interface DatosDelComunicado {
  titulo: string;
  cuerpo: string;
  audiencia: Audiencia | undefined;
}

export type ErroresDelComunicado = Partial<Record<keyof DatosDelComunicado, string>>;

/**
 * Para guardar un borrador basta el título; para publicar, todo. Así se
 * puede dejar a medias sin perder lo escrito.
 */
export function validarComunicado(d: DatosDelComunicado, para: "borrador" | "publicar"): ErroresDelComunicado {
  const e: ErroresDelComunicado = {};
  const titulo = d.titulo.trim();
  const cuerpo = d.cuerpo.trim();
  if (titulo === "") e.titulo = "Escribe el título.";
  else if (titulo.length > TITULO_MAXIMO) e.titulo = `Usa ${TITULO_MAXIMO} caracteres o menos.`;
  if (cuerpo.length > CUERPO_MAXIMO) e.cuerpo = `Usa ${CUERPO_MAXIMO} caracteres o menos.`;
  if (para === "publicar") {
    if (cuerpo === "") e.cuerpo = "Escribe el texto del comunicado.";
    if (!d.audiencia) e.audiencia = "Elige a quién va.";
  }
  return e;
}

export function puedeEditarse(c: Comunicado): boolean {
  return c.estado === "borrador";
}

/** Publicados: el último publicado arriba. Borradores: el último editado arriba. */
export function ordenarComunicados(lista: readonly Comunicado[]): Comunicado[] {
  return [...lista].sort((a, b) => (b.publicadoEl ?? b.editadoEl).localeCompare(a.publicadoEl ?? a.editadoEl));
}

/** El comienzo del texto, para la lista: una línea limpia de saltos. */
export function extracto(cuerpo: string, largo = 140): string {
  const plano = cuerpo.replace(/\s+/g, " ").trim();
  return plano.length <= largo ? plano : `${plano.slice(0, largo - 1).trimEnd()}…`;
}
