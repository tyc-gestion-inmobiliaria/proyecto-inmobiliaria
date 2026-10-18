/**
 * Los cuatro estados de lo que se toca, en un solo sitio.
 *
 * Todo control clicable del kit tiene que decir cuatro cosas: **reposo**
 * ("esto se puede tocar"), **encima** ("vas a tocar este"), **presionado**
 * ("el toque entró") y **elegido** ("esto es lo que está puesto"). Más el
 * quinto, **apagado**, que manda sobre los otros.
 *
 * React Native declara solo `pressed`, porque en un teléfono no hay puntero.
 * En web, React Native Web pasa además `hovered` y `focused`. Por eso el
 * estilo de un `Pressable` se escribe como **función** y no como arreglo: la
 * función recibe el estado y elige.
 *
 * El hover nunca es la única señal: todo sigue funcionando con toque y con
 * teclado, y el hover solo agrega el aviso previo.
 *
 * Este archivo es puro (no importa React Native) para poder probarlo con
 * `node --test`.
 */

/** Lo que un `Pressable` le pasa a su `style` y a sus hijos. */
export type EstadoPresionable = {
  pressed: boolean;
  hovered?: boolean;
  focused?: boolean;
};

/** El estado que se pinta, ya resuelto. */
export type Interaction = "rest" | "hovered" | "pressed" | "selected" | "disabled";

/**
 * Un estado forzado desde fuera.
 *
 * Existe para la vitrina, Storybook y el armado del Figma: para mostrar el
 * botón "encima" sin tener el ratón encima. En una pantalla real no se usa.
 */
export type ForcedInteraction = Exclude<Interaction, "rest" | "disabled">;

export interface InteractionFlags {
  selected?: boolean;
  disabled?: boolean;
  forced?: ForcedInteraction;
}

/**
 * Qué estado pintar.
 *
 * El orden es una decisión, no un accidente:
 *
 * 1. **Apagado** gana siempre: un control apagado no reacciona a nada.
 * 2. **Elegido** gana al hover y al presionado: pasar el ratón por lo que ya
 *    está puesto no tiene que hacerlo parecer otra cosa.
 * 3. **Presionado** gana al hover: con el dedo abajo el ratón también está
 *    encima, y lo que importa es que el toque entró.
 */
export function resolveInteraction(
  state: EstadoPresionable,
  { selected = false, disabled = false, forced }: InteractionFlags = {},
): Interaction {
  if (disabled) return "disabled";
  if (selected || forced === "selected") return "selected";
  if (state.pressed || forced === "pressed") return "pressed";
  if (state.hovered || forced === "hovered") return "hovered";
  return "rest";
}

/**
 * Un valor por estado, con el reposo como respaldo.
 *
 * Así cada componente declara solo los estados que cambian algo, y un estado
 * que no declaró cae en el reposo en vez de en `undefined`.
 */
export function pickByInteraction<T>(
  interaction: Interaction,
  values: { rest: T } & Partial<Record<Exclude<Interaction, "rest">, T>>,
): T {
  return values[interaction] ?? values.rest;
}

/**
 * El `hitSlop` que lleva un control chico hasta el mínimo tocable.
 *
 * Lo que se ve puede medir 38 para caber en una tabla; lo que responde al
 * dedo tiene que medir 44. La diferencia se reparte arriba y abajo.
 */
export function hitSlopFor(height: number, minTouch = 44): number {
  return Math.max(0, Math.ceil((minTouch - height) / 2));
}

/**
 * Cuánto sobresale `TouchArea` por lado para llevar un control hasta `min`.
 * Suma el borde porque un hijo absoluto se mide desde dentro de él.
 */
export function touchOutset(size: number | undefined, min: number, border = 1): number {
  return size == null || size >= min ? 0 : (min - size) / 2 + border;
}
