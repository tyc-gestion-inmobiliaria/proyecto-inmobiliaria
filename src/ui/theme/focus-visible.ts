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
 *
 * Va también la transición de lo que se toca: el paso de reposo a encima o
 * presionado dura 150 ms en vez de saltar, y desaparece para quien pidió
 * menos movimiento en su sistema (`prefers-reduced-motion`).
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
[role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="checkbox"], [role="radio"], [role="option"] {
  transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
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
