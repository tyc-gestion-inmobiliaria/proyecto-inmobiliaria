/**
 * Lo que `Select` decide sin pintar nada: qué opciones se ven con lo que se
 * tecleó, adónde va el resalte con las flechas, y si hay un recorte puesto.
 *
 * Puro, para probarlo con `node --test`.
 */

export interface SelectOption {
  id: string;
  label: string;
  /** La segunda línea: lo que distingue a dos opciones que se llaman parecido. */
  detail?: string;
  /**
   * No se puede elegir, pero **se muestra igual, con el motivo en `detail`**.
   * Sacarla deja un hueco que se lee como "no existe".
   */
  disabled?: boolean;
}

/** Sin tildes y en minúsculas: nadie se detiene a poner la tilde al buscar. */
export function normalize(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filterOptions(options: SelectOption[], query: string): SelectOption[] {
  const q = normalize(query);
  if (!q) return options;
  return options.filter(
    (o) => normalize(o.label).includes(q) || (o.detail ? normalize(o.detail).includes(q) : false),
  );
}

/**
 * El índice (dentro de `visible`) al que pasa el resalte con una flecha.
 *
 * Salta las apagadas —están para decir que existen, no para detener a las
 * flechas— y da la vuelta al llegar a un extremo.
 */
export function moveActive(visible: SelectOption[], current: number, step: 1 | -1): number {
  const elegibles = visible.filter((o) => !o.disabled);
  if (elegibles.length === 0) return current;
  const actual = elegibles.findIndex((o) => o.id === visible[current]?.id);
  const desde = actual === -1 ? (step > 0 ? -1 : 0) : actual;
  const siguiente = (desde + step + elegibles.length) % elegibles.length;
  return visible.findIndex((o) => o.id === elegibles[siguiente].id);
}

/**
 * Hay un recorte puesto: ni vacío ni la opción que significa "sin filtrar".
 *
 * Es lo que deja marcar el control **cerrado**: quien mira una cifra rara
 * tiene que saber que está mirando un recorte sin abrir la lista.
 */
export function isFiltering(value: string | undefined, neutro: string | undefined): boolean {
  return neutro !== undefined && value !== undefined && value !== neutro;
}
