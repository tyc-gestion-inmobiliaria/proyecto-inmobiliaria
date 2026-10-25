/**
 * Una incidencia del edificio: algo que se malogró o que hay que atender,
 * en una unidad o en un área común, con su prioridad y su estado.
 *
 * - Estados: Abierta → En curso → Resuelta. Una resuelta se puede reabrir.
 * - Supuesto: también se puede resolver una abierta sin pasar por "en
 *   curso" (lo que se arregla en el momento). Sin confirmar con el cliente.
 * - Supuesto: tres prioridades (alta, media, baja); "alta" es lo que no
 *   puede esperar al día siguiente (agua, luz, ascensor). Sin confirmar.
 * - La cola va por prioridad y, dentro de la misma, la más antigua primero.
 */

export const ESTADOS = ["abierta", "en_curso", "resuelta"] as const;
export type EstadoDeIncidencia = (typeof ESTADOS)[number];

export const PRIORIDADES = ["alta", "media", "baja"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export interface Incidencia {
  id: string;
  edificioId: string;
  /** `null`: en un área común. */
  unidadId: string | null;
  unidadNumero: string | null;
  titulo: string;
  detalle: string | null;
  prioridad: Prioridad;
  estado: EstadoDeIncidencia;
  /** Fecha ISO en que se registró. */
  reportadaEl: string;
  /** Fecha ISO del último cambio de estado. */
  actualizadaEl: string;
}

export const TEXTO_DEL_ESTADO: Record<EstadoDeIncidencia, string> = {
  abierta: "Abierta",
  en_curso: "En curso",
  resuelta: "Resuelta",
};

export const TEXTO_DE_PRIORIDAD: Record<Prioridad, string> = { alta: "Alta", media: "Media", baja: "Baja" };

const PESO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export type AccionDeIncidencia = "empezar" | "resolver" | "reabrir";

export function accionesDeLaIncidencia(estado: EstadoDeIncidencia): AccionDeIncidencia[] {
  switch (estado) {
    case "abierta":
      return ["empezar", "resolver"];
    case "en_curso":
      return ["resolver"];
    case "resuelta":
      return ["reabrir"];
  }
}

export function estadoTrasLaAccion(accion: AccionDeIncidencia): EstadoDeIncidencia {
  return accion === "empezar" ? "en_curso" : accion === "resolver" ? "resuelta" : "abierta";
}

export function puedeCambiar(de: EstadoDeIncidencia, a: EstadoDeIncidencia): boolean {
  return accionesDeLaIncidencia(de).some((x) => estadoTrasLaAccion(x) === a);
}

/** Prioridad primero; en la misma, la que más espera arriba. Las resueltas, la última atendida arriba. */
export function ordenarIncidencias(lista: readonly Incidencia[]): Incidencia[] {
  return [...lista].sort((a, b) => {
    if (a.estado === "resuelta" && b.estado === "resuelta") return b.actualizadaEl.localeCompare(a.actualizadaEl);
    return PESO[a.prioridad] - PESO[b.prioridad] || a.reportadaEl.localeCompare(b.reportadaEl);
  });
}

export function contarPorEstado(lista: readonly Incidencia[]): Record<EstadoDeIncidencia, number> {
  const n: Record<EstadoDeIncidencia, number> = { abierta: 0, en_curso: 0, resuelta: 0 };
  for (const i of lista) n[i.estado]++;
  return n;
}

export interface DatosDeIncidencia {
  titulo: string;
  /** `""`: área común. */
  unidadId: string | undefined;
  prioridad: Prioridad | undefined;
  detalle: string;
}

export type ErroresDeIncidencia = Partial<Record<"titulo" | "unidadId" | "prioridad", string>>;

export const TITULO_MAXIMO = 80;

export function validarIncidencia(d: DatosDeIncidencia): ErroresDeIncidencia {
  const e: ErroresDeIncidencia = {};
  const titulo = d.titulo.trim();
  if (titulo === "") e.titulo = "Escribe qué pasó.";
  else if (titulo.length > TITULO_MAXIMO) e.titulo = `Usa ${TITULO_MAXIMO} caracteres o menos.`;
  if (d.unidadId === undefined) e.unidadId = "Elige dónde pasó.";
  if (!d.prioridad) e.prioridad = "Elige la prioridad.";
  return e;
}
