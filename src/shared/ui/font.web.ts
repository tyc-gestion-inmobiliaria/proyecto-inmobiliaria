/**
 * La fuente del proyecto en la web: una regla `@font-face` por peso, todas
 * con el mismo nombre de familia (`FUENTE`).
 *
 * `expo-font` registra en web una familia por archivo, sin peso: con eso un
 * `fontWeight: "600"` sobre la regular sale en negrita falsa. Declarando los
 * cuatro pesos bajo una sola familia, el navegador elige el archivo que
 * corresponde a cada peso.
 *
 * `font-display: swap`: mientras baja la fuente se lee con la del sistema, en
 * vez de dejar la pantalla sin texto.
 */
import { Asset } from "expo-asset";

import { FUENTE, FUENTE_DE_TITULOS } from "@/theme";

const ID = "proyecto-fuente";

const PESOS: [familia: string, peso: number, archivo: number][] = [
  [FUENTE, 400, require("../../../assets/fonts/Heebo_400.ttf")],
  [FUENTE, 500, require("../../../assets/fonts/Heebo_500.ttf")],
  [FUENTE, 600, require("../../../assets/fonts/Heebo_600.ttf")],
  [FUENTE, 700, require("../../../assets/fonts/Heebo_700.ttf")],
  [FUENTE_DE_TITULOS, 700, require("../../../assets/fonts/Lato_700.ttf")],
  [FUENTE_DE_TITULOS, 900, require("../../../assets/fonts/Lato_900.ttf")],
];

export function cargarFuente(): void {
  if (typeof document === "undefined" || document.getElementById(ID)) return;
  const reglas = PESOS.map(
    ([familia, peso, archivo]) =>
      `@font-face{font-family:${JSON.stringify(familia)};src:url(${JSON.stringify(Asset.fromModule(archivo).uri)}) format("truetype");font-weight:${peso};font-style:normal;font-display:swap}`,
  ).join("\n");
  const style = document.createElement("style");
  style.id = ID;
  style.textContent = reglas;
  document.head.appendChild(style);
}
