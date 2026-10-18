/**
 * Una celda numérica con la magnitud pintada detrás del número.
 *
 * Convierte una columna de cifras en algo que se compara de un vistazo: la
 * fila más larga se ve antes de leer un dígito.
 *
 * **La barra no sustituye al número, lo acompaña.** Va tenue y detrás del
 * texto, anclada a la derecha —el lado por el que alinean las cifras—, así el
 * borde de la barra queda junto al dígito.
 *
 * Solo lleva barra la columna que se está comparando: dos escalas pintadas a
 * la vez no comparan nada.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { barWidth } from "./number-logic";

export interface CellWithBarProps {
  value: string;
  /** De 0 a 1: este valor contra el mayor de la columna. */
  ratio?: number;
  /** Para bajarle el tono a lo que no es el dato principal de la fila. */
  muted?: boolean;
  flex?: number;
  style?: StyleProp<ViewStyle>;
}

export function CellWithBar({ value, ratio = 0, muted = false, flex, style }: CellWithBarProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const width = barWidth(ratio);
  return (
    <View style={[s.cell, flex !== undefined && { flex }, style]}>
      {width > 0 ? <View style={[s.bar, { width: `${width}%` }]} /> : null}
      <Text style={[textStyle(t, "data", muted ? t.color.text.tertiary : t.color.text.primary), s.value]}>{value}</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    cell: { justifyContent: "center", paddingVertical: t.space.sm + 2, paddingHorizontal: t.space.xs + 2 },
    bar: {
      position: "absolute",
      right: 0,
      top: 4,
      bottom: 4,
      borderRadius: 2,
      backgroundColor: t.color.accent.base,
      opacity: 0.16,
    },
    value: { textAlign: "right" },
  });
