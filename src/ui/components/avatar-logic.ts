/**
 * Las iniciales de un nombre, para `Avatar`. Puro, para probarlo sin React
 * Native.
 */

/**
 * Dos letras: la primera del primer nombre y la del último. Con un solo
 * nombre, sus dos primeras. Sin nada, "?" para que el círculo no quede vacío,
 * que se lee como "cargando".
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("es");
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toLocaleUpperCase("es");
}
