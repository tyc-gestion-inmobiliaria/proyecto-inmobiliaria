/**
 * Las reglas del menú de acciones, sin React, para poder probarlas.
 */

export interface ActionMenuItem {
  key: string;
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  /**
   * Si borra, anula o apaga algo: lo que se pregunta antes de hacerlo. Una
   * acción destructiva siempre pregunta; no hay forma de saltarse la pregunta.
   */
  destructive?: { question: string; confirmLabel: string };
}

/** Las destructivas van al final, separadas: lejos de lo que se toca a diario. */
export function orderActions<T extends Pick<ActionMenuItem, "destructive">>(items: readonly T[]): T[] {
  return [...items.filter((i) => !i.destructive), ...items.filter((i) => i.destructive)];
}

export interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Dónde se abre la caja: debajo del botón y alineada a su borde derecho; si
 * no cabe debajo, encima. Nunca se sale de la ventana por los costados.
 */
export function menuPosition(
  anchor: Anchor,
  menu: { width: number; height: number },
  windowSize: { width: number; height: number },
  gap = 4,
  margin = 8,
): { top: number; left: number } {
  const below = anchor.y + anchor.height + gap;
  const top = below + menu.height + margin <= windowSize.height ? below : Math.max(margin, anchor.y - gap - menu.height);
  const rightAligned = anchor.x + anchor.width - menu.width;
  const left = Math.min(Math.max(margin, rightAligned), Math.max(margin, windowSize.width - menu.width - margin));
  return { top, left };
}
