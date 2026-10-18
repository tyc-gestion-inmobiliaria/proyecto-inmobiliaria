/**
 * La rejilla horizontal y las cifras del eje Y, compartidas por las gráficas
 * de columnas, líneas y cascada.
 *
 * Líneas finas y continuas, un tono por encima de la superficie: una rejilla
 * punteada se lee como "proyección" o como un umbral, y no es ninguna de las
 * dos cosas. El cero va un tono más fuerte, porque es el que se compara.
 */
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import type { ChartFormat } from "./chart-parts";

/** El ancho que se reserva a la izquierda para las cifras del eje. */
export const Y_AXIS_WIDTH = 48;

export function YGrid({
  ticks,
  y,
  format,
}: {
  ticks: number[];
  /** De valor a píxel, ya con el alto del área de dibujo. */
  y: (v: number) => number;
  format: ChartFormat;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ticks.map((v) => (
        <View key={v} style={[s.fila, { top: y(v) }]}>
          <Text style={[textStyle(t, "caption", t.color.text.tertiary), s.cifra]} numberOfLines={1}>
            {format(v)}
          </Text>
          <View style={[s.linea, v === 0 && s.cero]} />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { position: "absolute", left: 0, right: 0, height: 1, flexDirection: "row", alignItems: "center" },
    cifra: { width: Y_AXIS_WIDTH - 6, textAlign: "right", marginRight: 6, marginTop: -1, fontVariant: ["tabular-nums"] },
    linea: { flex: 1, height: 1, backgroundColor: t.color.chart.grid },
    cero: { backgroundColor: t.color.chart.axis },
  });
