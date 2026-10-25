/**
 * La foto de portada de un edificio en las tarjetas (como la grilla con foto
 * del portal actual).
 *
 * Supuesto: el edificio todavía no tiene foto propia en la base (falta el
 * campo y dónde subirla; está en las preguntas pendientes). Mientras tanto
 * va una foto genérica de edificio de departamentos (Unsplash, ver
 * `assets/fotos/LICENCIA.md`), elegida por el id para que cada edificio
 * tenga siempre la misma. No representa al edificio real.
 */
import type { ImageSourcePropType } from "react-native";

const FOTOS: readonly ImageSourcePropType[] = [
  require("../../../assets/fotos/edificio-1.jpg"),
  require("../../../assets/fotos/edificio-2.jpg"),
  require("../../../assets/fotos/edificio-3.jpg"),
];

export function fotoDeEdificio(edificioId: string): ImageSourcePropType {
  let n = 1;
  for (const c of edificioId) n = (n * 17 + c.charCodeAt(0)) >>> 0;
  return FOTOS[n % FOTOS.length];
}
