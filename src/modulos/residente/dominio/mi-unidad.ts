/**
 * Las unidades del residente: las que tienen a su persona vinculada, como
 * propietario, inquilino o residente. Es su alcance (PB-04): la base, por
 * `private.mis_unidades()`, no le deja ver otras.
 */

export interface MiUnidad {
  id: string;
  numero: string;
  edificioId: string;
  edificioNombre: string;
}

const NUMEROS = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Por edificio y, dentro, por número: así no cambia de orden de una vez a otra. */
export function ordenarMisUnidades(unidades: readonly MiUnidad[]): MiUnidad[] {
  return [...unidades].sort((a, b) => NUMEROS.compare(a.edificioNombre, b.edificioNombre) || NUMEROS.compare(a.numero, b.numero));
}

/** "101 · Edificio Los Olivos": para elegir entre varias. */
export function nombreDeMiUnidad(u: Pick<MiUnidad, "numero" | "edificioNombre">): string {
  return `${u.numero} · ${u.edificioNombre}`;
}

/** La que se abre: la elegida si sigue siendo suya; si no, la primera. */
export function unidadElegida(unidades: readonly MiUnidad[], elegida: string | null): MiUnidad | null {
  return unidades.find((u) => u.id === elegida) ?? unidades[0] ?? null;
}
