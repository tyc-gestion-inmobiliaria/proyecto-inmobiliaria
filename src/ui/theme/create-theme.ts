/**
 * Un tema nuevo a partir del neutro, cambiando solo lo que cambia.
 *
 * Un proyecto casi nunca quiere otro sistema de diseño: quiere su color de
 * marca, a veces su fuente, a veces otro radio. Escribir el tema entero para
 * eso es copiar doscientas líneas y que la próxima mejora del kit no le
 * llegue. Con `crearTema` se escribe la diferencia y el resto se hereda.
 *
 * ```ts
 * const temaAcme = crearTema({
 *   name: "acme",
 *   color: { accent: { base: "#0a7d5a", hover: "#086a4c", pressed: "#06573e", subtle: "#e6f4ef", text: "#086a4c" } },
 *   radius: { md: 4 },
 * });
 * ```
 *
 * Puro y sin React Native, para poder probarlo con `node --test`.
 */
import { lightTheme, type Tema } from "../tokens";

/** Como `Partial`, pero hacia adentro: cualquier hoja se puede omitir. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Mezcla `changes` sobre `base` sin tocar ninguno de los dos.
 *
 * Un `undefined` en `changes` no borra lo heredado: se lee como "no lo toco",
 * que es lo que significa en un objeto parcial.
 */
export function deepMerge<T>(base: T, changes: DeepPartial<T> | undefined): T {
  if (!changes) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    const prev = out[key];
    out[key] =
      isPlainObject(prev) && isPlainObject(value) ? deepMerge(prev, value as DeepPartial<typeof prev>) : value;
  }
  return out as T;
}

/** El tema neutro con los cambios encima. `base` puede ser el oscuro. */
export function crearTema(changes: DeepPartial<Tema> = {}, base: Tema = lightTheme): Tema {
  return deepMerge(base, changes);
}
