/**
 * En la web la sesión va en `localStorage`. Al exportar no hay `window`, y
 * entonces no se guarda nada.
 */
import type { AlmacenSesion } from "./types";

export const almacenSesion: AlmacenSesion | undefined =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : undefined;
