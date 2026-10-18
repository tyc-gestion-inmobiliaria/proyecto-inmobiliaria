/**
 * La superficie tocable que le falta a un control chico, sin agrandar lo que
 * se ve.
 *
 * El kit tiene controles por debajo de 44 a propósito: el tamaño `sm` mide
 * 38 para caber en una tabla densa, la ✕ de un diálogo mide 32. Lo que se ve
 * se queda así; lo que responde al dedo tiene que llegar a 44.
 *
 * `hitSlop` era la respuesta y **en la web no hace nada**: React Native Web
 * solo lo lee en los `Touchable` viejos, y `Pressable` lo ignora. Se descubrió
 * en la app de Ysique midiendo en el navegador (2026-10-14): la zona de un
 * control de 38 seguía en 38. Los controles siguen pasando `hitSlop`, que en
 * el teléfono sí funciona; esto cubre la web.
 *
 * Es un hijo transparente y absoluto que sobresale lo que falta. En la web el
 * clic y el puntero sobre un hijo cuentan para el `Pressable` que lo
 * contiene. Dos detalles medidos, no supuestos:
 *
 * - Un hijo absoluto se mide **desde dentro del borde**: sin sumar el borde
 *   del control, la zona quedaba 2 píxeles corta.
 * - **No sirve subirle el `zIndex`**: React Native Web le pone `z-index: 0` a
 *   toda vista, así que el vecino de después se pinta encima igual. Donde la
 *   zona toca a otro control, el toque es del vecino, que es lo correcto.
 *
 * No sirve para lo que va apilado sin hueco (las opciones de una lista): las
 * zonas se pisarían.
 */
import { StyleSheet, View } from "react-native";

import { touchOutset } from "../pressable-state";
import { useTheme } from "../theme/theme-provider";

export function TouchArea({ height, width, border = 1 }: { height: number; width?: number; border?: number }) {
  const t = useTheme();
  const v = touchOutset(height, t.minTouch, border);
  const h = touchOutset(width, t.minTouch, border);
  if (!v && !h) return null;
  return <View aria-hidden pointerEvents="auto" style={[styles.zona, { top: -v, bottom: -v, left: -h, right: -h }]} />;
}

const styles = StyleSheet.create({
  zona: { position: "absolute" },
});
