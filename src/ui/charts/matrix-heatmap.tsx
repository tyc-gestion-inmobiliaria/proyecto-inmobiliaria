/**
 * Una matriz de calor: filas por columnas, cada cruce del tono de su valor.
 *
 * Contesta "¿qué pasa en qué momento?": qué categoría pesa qué día de la
 * semana, qué semana de qué mes. Un solo tono, y la cifra escrita dentro de
 * la celda cuando cabe (con la tinta que contrasta con ese paso), porque en
 * una matriz la cifra es lo que se busca y el tono solo guía al ojo.
 *
 * Tocar una celda elige el cruce (`fila|columna`); tocar el nombre de una
 * fila elige la fila entera (`fila|`).
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber, sequentialStep } from "./chart-logic";
import { markOpacity, toggleSelection, useMeasuredWidth, type SelectableChartProps } from "./chart-parts";

export interface MatrixAxisItem {
  key: string;
  label: string;
}

export function matrixKey(row: string, col = ""): string {
  return `${row}|${col}`;
}

export function MatrixHeatmap({
  rows,
  columns,
  value,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & {
  rows: MatrixAxisItem[];
  columns: MatrixAxisItem[];
  value: (row: string, col: string) => number;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const ramp = t.color.chart.sequential;
  const max = Math.max(0, ...rows.flatMap((r) => columns.map((c) => value(r.key, c.key))));
  const NOMBRE = 120;
  const ancho = Math.max(40, Math.floor((width - NOMBRE) / Math.max(1, columns.length)) - 2);
  const filaElegida = selected?.endsWith("|") ? selected.slice(0, -1) : null;

  return (
    <View onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal>
        <View style={s.tabla}>
          <View style={s.fila}>
            <View style={{ width: NOMBRE }} />
            {columns.map((c) => (
              <Text key={c.key} style={[textStyle(t, "caption", t.color.text.secondary), s.cabeza, { width: ancho }]} numberOfLines={1}>
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((r) => {
            const rowKey = matrixKey(r.key);
            const filaPuesta = filaElegida === r.key;
            return (
              <View key={r.key} style={s.fila}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${r.label}, la fila entera`}
                  accessibilityState={{ selected: filaPuesta }}
                  onPress={onSelect ? () => onSelect(toggleSelection(selected, rowKey)) : undefined}
                  style={(estado: EstadoPresionable) => {
                    const it = resolveInteraction(estado, { selected: filaPuesta });
                    return [
                      s.nombre,
                      { width: NOMBRE },
                      it === "hovered" && s.nombreEncima,
                      it === "pressed" && s.nombrePresionado,
                      it === "selected" && s.nombreElegido,
                    ];
                  }}
                >
                  <Text style={[textStyle(t, "bodySmall"), filaPuesta && s.negrita]} numberOfLines={1}>
                    {filaPuesta ? "✓ " : ""}
                    {r.label}
                  </Text>
                </Pressable>
                {columns.map((c) => {
                  const v = value(r.key, c.key);
                  const paso = sequentialStep(ramp, v, max);
                  const iPaso = paso ? ramp.indexOf(paso) : -1;
                  // La tinta que pasa 4.5:1 sobre ese paso. En claro, del quinto paso
                  // para arriba el fondo ya es oscuro; en oscuro la rampa va al revés
                  // y desde el cuarto el fondo es claro. En los dos casos, `onAccent`.
                  const tintaInvertida = iPaso >= (t.scheme === "light" ? 4 : 3);
                  const k = matrixKey(r.key, c.key);
                  const elegida = selected === k;
                  const atenuada = filaElegida ? (filaPuesta ? 1 : 0.55) : markOpacity(selected, k);
                  return (
                    <Pressable
                      key={c.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.label}, ${c.label}: ${format(v)}`}
                      accessibilityState={{ selected: elegida }}
                      onPress={onSelect ? () => onSelect(toggleSelection(selected, k)) : undefined}
                      style={(estado: EstadoPresionable) => {
                        const it = resolveInteraction(estado, { selected: elegida });
                        return [
                          s.celda,
                          { width: ancho, backgroundColor: paso ?? t.color.chart.neutral, opacity: atenuada },
                          it === "hovered" && s.celdaEncima,
                          it === "pressed" && s.celdaPresionada,
                          it === "selected" && s.celdaElegida,
                        ];
                      }}
                    >
                      {ancho >= 52 && v > 0 ? (
                        <Text
                          style={[
                            textStyle(t, "caption", tintaInvertida ? t.color.text.onAccent : t.color.text.primary),
                            s.cifra,
                            elegida && s.negrita,
                          ]}
                          numberOfLines={1}
                        >
                          {format(v)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    tabla: { gap: 2 },
    fila: { flexDirection: "row", gap: 2, alignItems: "stretch" },
    cabeza: { textAlign: "center", paddingVertical: t.space.xxs },
    nombre: {
      minHeight: t.minTouch,
      justifyContent: "center",
      paddingHorizontal: t.space.xs,
      borderRadius: t.radius.sm,
      borderWidth: 2,
      borderColor: "transparent",
      cursor: "pointer",
    },
    nombreEncima: { backgroundColor: t.color.bg.hover },
    nombrePresionado: { backgroundColor: t.color.bg.pressed },
    nombreElegido: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    celda: {
      minHeight: t.minTouch,
      borderRadius: 3,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    celdaEncima: { borderColor: t.color.border.strong },
    celdaPresionada: { opacity: 0.7 },
    celdaElegida: { borderColor: t.color.border.focus },
    cifra: { fontVariant: ["tabular-nums"] },
    negrita: { fontWeight: "700" },
  });
