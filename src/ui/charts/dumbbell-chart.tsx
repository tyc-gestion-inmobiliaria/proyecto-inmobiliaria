/**
 * Antes y después, por cosa: dos puntos unidos por una línea.
 *
 * Contesta "¿qué cambió y cuánto?" mejor que dos barras pegadas: el largo de
 * la línea es el cambio, y el lado hacia el que va dice si subió o bajó. El
 * antes va en gris (es la referencia) y el ahora en color; además el cambio
 * va escrito con ▲ o ▼ y su cifra, así que nada depende del tono.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber } from "./chart-logic";
import { ChartLegend, markOpacity, toggleSelection, type SelectableChartProps } from "./chart-parts";

export interface DumbbellRow {
  key: string;
  label: string;
  before: number;
  after: number;
}

export function DumbbellChart({
  rows,
  beforeLabel = "Antes",
  afterLabel = "Ahora",
  /** Si subir es malo (un gasto), el ▲ va en el tono de "en contra". */
  increaseIsBad = false,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & { rows: DumbbellRow[]; beforeLabel?: string; afterLabel?: string; increaseIsBad?: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tope = Math.max(1, ...rows.flatMap((r) => [r.before, r.after])) * 1.04;
  const pct = (v: number) => (v / tope) * 100;
  const antes = t.color.chart.muted;
  const ahora = t.color.chart.series[0];

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      <ChartLegend
        items={[
          { key: "antes", label: beforeLabel, color: antes, shape: "dot" },
          { key: "ahora", label: afterLabel, color: ahora, shape: "dot" },
        ]}
      />
      {rows.map((r) => {
        const delta = r.after - r.before;
        const sube = delta > 0;
        const malo = delta !== 0 && sube === increaseIsBad;
        const elegida = selected === r.key;
        const izq = Math.min(pct(r.before), pct(r.after));
        const der = Math.max(pct(r.before), pct(r.after));
        const cambio = delta === 0 ? "sin cambio" : `${sube ? "▲" : "▼"} ${format(Math.abs(delta))}`;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}: ${beforeLabel} ${format(r.before)}, ${afterLabel} ${format(r.after)}, ${cambio}`}
            accessibilityState={{ selected: elegida }}
            onPress={onSelect ? () => onSelect(toggleSelection(selected, r.key)) : undefined}
            style={(estado: EstadoPresionable) => {
              const it = resolveInteraction(estado, { selected: elegida });
              return [
                s.fila,
                { opacity: markOpacity(selected, r.key) },
                it === "hovered" && s.filaEncima,
                it === "pressed" && s.filaPresionada,
                it === "selected" && s.filaElegida,
              ];
            }}
          >
            <Text style={[textStyle(t, "bodySmall"), s.nombre, elegida && s.negrita]} numberOfLines={1}>
              {elegida ? "✓ " : ""}
              {r.label}
            </Text>
            <View style={s.pista}>
              <View style={[s.linea, { left: `${izq}%`, width: `${der - izq}%` }]} />
              <View style={[s.punto, { left: `${pct(r.before)}%`, backgroundColor: antes, borderColor: t.color.bg.surface }]} />
              <View style={[s.punto, s.puntoAhora, { left: `${pct(r.after)}%`, backgroundColor: ahora, borderColor: t.color.bg.surface }]} />
            </View>
            <Text style={[textStyle(t, "caption", malo ? t.color.danger.fg : t.color.text.secondary), s.cambio]}>{cambio}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { gap: 2 },
    fila: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      minHeight: t.minTouch,
      paddingHorizontal: t.space.sm,
      borderRadius: t.radius.sm,
      borderWidth: 2,
      borderColor: "transparent",
      cursor: "pointer",
    },
    filaEncima: { backgroundColor: t.color.bg.hover },
    filaPresionada: { backgroundColor: t.color.bg.pressed },
    filaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    nombre: { width: 120 },
    negrita: { fontWeight: "700" },
    pista: { flex: 1, height: 20, justifyContent: "center" },
    linea: { position: "absolute", height: 2, backgroundColor: t.color.chart.axis },
    punto: { position: "absolute", width: 12, height: 12, marginLeft: -6, borderRadius: 6, borderWidth: 2 },
    puntoAhora: { width: 14, height: 14, marginLeft: -7, borderRadius: 7 },
    cambio: { width: 88, textAlign: "right", fontVariant: ["tabular-nums"] },
  });
