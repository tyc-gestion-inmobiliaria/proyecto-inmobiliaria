/**
 * El anillo de foco del teclado, en web.
 *
 * Sin esto el foco es el del navegador: un contorno fino que sobre un botón
 * lleno o un fondo oscuro no se ve, y quien trabaja con Tab no sabe dónde
 * está. Es una sola regla y no un estilo por componente porque el problema es
 * el mismo en todo lo que se toca.
 *
 * - **Dos tonos:** el color de foco por fuera y la superficie por dentro, para
 *   que se vea tanto sobre fondo claro como sobre un botón lleno.
 * - **`:focus-visible` y no `:focus`:** sale al llegar con el teclado, no al
 *   hacer clic, que ya tiene su estado de presionado.
 * - **Los campos de texto quedan fuera:** `TextField` marca el suyo con el
 *   borde.
 */
import type { Tema } from "../tokens";

const ID = "jtm-focus-visible";

export function focusVisibleRule(theme: Tema): string {
  return `
:focus-visible:not(input):not(textarea) {
  outline: 2px solid ${theme.color.border.focus} !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 2px ${theme.color.bg.surface} !important;
}
`;
}

/** Se puede llamar las veces que haga falta: hay una sola regla y se reescribe. */
export function installFocusVisible(theme: Tema): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById(ID);
  if (!style) {
    style = document.createElement("style");
    style.id = ID;
    document.head.appendChild(style);
  }
  style.textContent = focusVisibleRule(theme);
}
