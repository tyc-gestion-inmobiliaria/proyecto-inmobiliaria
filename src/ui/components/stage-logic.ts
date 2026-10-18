/**
 * Lógica pura de los componentes de proceso: en qué estado está cada etapa
 * de un recorrido y cómo se ordena una columna. Sin React Native, para
 * probarla con Node.
 */

export type StageStatus = "done" | "current" | "upcoming" | "lost";

/**
 * El estado de cada etapa, dada la actual.
 *
 * Con `lost`, el recorrido se cortó en la etapa actual: las anteriores
 * quedan hechas, esa se marca como perdida y las siguientes ya no van a
 * pasar (siguen "por venir", pero apagadas por quien las pinta).
 */
export function stageStatuses(keys: string[], current: string, lost = false): StageStatus[] {
  const i = keys.indexOf(current);
  return keys.map((_, j) => {
    if (i < 0) return "upcoming";
    if (j < i) return "done";
    if (j === i) return lost ? "lost" : "current";
    return "upcoming";
  });
}

/** Qué fracción del recorrido va hecha, de 0 a 1. Contando la actual como hecha a medias. */
export function stageProgress(keys: string[], current: string): number {
  const i = keys.indexOf(current);
  if (i < 0 || keys.length === 0) return 0;
  return (i + 0.5) / keys.length;
}

export type SortDirection = "asc" | "desc";

/**
 * El orden que sigue al tocar una cabecera: sin orden → ascendente →
 * descendente → sin orden. Tocar otra columna empieza ascendente.
 */
export function nextSort(
  current: { key: string; direction: SortDirection } | null,
  key: string,
): { key: string; direction: SortDirection } | null {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

/** Ordena una lista por una clave, sin tocar la original. Texto sin tildes ni mayúsculas. */
export function sortBy<T>(rows: T[], value: (r: T) => string | number, direction: SortDirection): T[] {
  const k = direction === "asc" ? 1 : -1;
  const norm = (v: string | number) =>
    typeof v === "number"
      ? v
      : v
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase();
  return [...rows].sort((a, b) => {
    const x = norm(value(a));
    const y = norm(value(b));
    return x < y ? -k : x > y ? k : 0;
  });
}
