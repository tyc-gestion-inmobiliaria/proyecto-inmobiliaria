/**
 * Cómo se reparte un total entre pocos estados: una barra apilada fina y,
 * debajo, cada estado con su número.
 *
 * Es la parte de un todo con tres o cuatro porciones que se leen en orden
 * (listo, en curso, por atender): una dona de tres porciones obliga a
 * comparar ángulos, y la barra se lee de una pasada.
 *
 * - Cada tramo mide lo que vale y va separado del vecino por un hueco de 2;
 *   el que vale cero no se dibuja, pero su fila sigue debajo con su 0, así
 *   la tarjeta no cambia de alto de un mes a otro.
 * - Los colores salen de `chart.status`, validados como vecinos para quien
 *   no distingue colores. El texto va en tinta de texto, nunca del color de
 *   la serie, y cada fila lleva su palabra: el color no es la única señal.
 */
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export interface StatusBarItem {
  key: string;
  label: string;
  value: number;
  tone: "done" | "progress" | "attention";
}

export function StatusBar({ items, accessibilityLabel }: { items: StatusBarItem[]; accessibilityLabel: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const total = items.reduce((n, i) => n + i.value, 0);
  const color = (tone: StatusBarItem["tone"]) => t.color.chart.status[tone];
  return (
    <View style={s.bloque} accessible accessibilityRole="summary" accessibilityLabel={accessibilityLabel}>
      <View style={s.barra}>
        {total === 0 ? (
          <View style={[s.tramo, s.vacia]} />
        ) : (
          items
            .filter((i) => i.value > 0)
            .map((i) => <View key={i.key} style={[s.tramo, { flexGrow: i.value, backgroundColor: color(i.tone) }]} />)
        )}
      </View>
      <View style={s.leyenda}>
        {items.map((i) => (
          <View key={i.key} style={s.fila}>
            <View style={[s.marca, { backgroundColor: color(i.tone) }]} />
            <Text style={[textStyle(t, "body", t.color.text.secondary), s.etiqueta]}>{i.label}</Text>
            <Text style={[textStyle(t, "data"), s.valor]}>{String(i.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ALTO = 10;

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { gap: t.space.md },
    barra: { flexDirection: "row", gap: 2, height: ALTO },
    tramo: { flexBasis: 0, flexShrink: 1, borderRadius: ALTO / 2 },
    vacia: { flexGrow: 1, backgroundColor: t.color.border.strong },
    leyenda: { gap: t.space.xs },
    fila: { flexDirection: "row", alignItems: "center", gap: t.space.sm, minHeight: 24 },
    marca: { width: 10, height: 10, borderRadius: 3 },
    etiqueta: { flex: 1 },
    valor: { fontWeight: "600" },
  });
