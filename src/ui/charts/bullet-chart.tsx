/**
 * La gráfica de bala: lo real contra lo que se esperaba.
 *
 * Una fila por cosa, con una barra de lo que va, una raya vertical en la meta
 * y, si se pasa, el tramo que sobra en el color de "en contra" **y la palabra
 * "excedido" con la cifra**. Es la forma compacta de ver veinte presupuestos
 * a la vez, que en medidores redondos ocuparía una pantalla entera.
 *
 * `projection` agrega una marca hueca: dónde terminaría al ritmo actual.
 *
 * `overIsGood` invierte el sentido: en un presupuesto pasarse es malo, en una
 * meta de ventas es bueno. El tramo que sobra va entonces en el color de "a
 * favor" y el texto en verde, siempre con su ▲ y su palabra.
 *
 * **Cada fila con su escala**, por defecto: en presupuestos lo que importa es
 * cuánto va de cada uno, y en una escala común el de 150 se vuelve una raya
 * al lado del de 900. `sharedScale` pone todas en la misma, para cuando sí se
 * quieren comparar los montos entre filas.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber } from "./chart-logic";
import { markOpacity, toggleSelection, type SelectableChartProps } from "./chart-parts";

export interface BulletRow {
  key: string;
  label: string;
  value: number;
  target: number;
  /** Dónde terminaría al ritmo de ahora. */
  projection?: number;
}

export function BulletChart({
  rows,
  texts = { over: "excedido", left: "queda", projection: "al ritmo actual" },
  sharedScale = false,
  overIsGood = false,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & {
  rows: BulletRow[];
  texts?: { over: string; left: string; projection: string };
  sharedScale?: boolean;
  overIsGood?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const topeComun = Math.max(1, ...rows.flatMap((r) => [r.value, r.target, r.projection ?? 0])) * 1.05;

  return (
    <View style={s.lista} accessibilityLabel={accessibilityLabel}>
      {rows.map((r) => {
        const tope = sharedScale ? topeComun : Math.max(1, r.value, r.target, r.projection ?? 0) * 1.05;
        const pct = (v: number) => `${Math.min(100, (v / tope) * 100)}%` as const;
        const pasado = r.value > r.target;
        const elegida = selected === r.key;
        const resumen = pasado ? `${texts.over} ${format(r.value - r.target)}` : `${texts.left} ${format(r.target - r.value)}`;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}: ${format(r.value)} de ${format(r.target)}, ${resumen}`}
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
            <View style={s.cabeza}>
              <Text style={[textStyle(t, "body"), s.nombre, elegida && s.negrita]} numberOfLines={1}>
                {elegida ? "✓ " : ""}
                {r.label}
              </Text>
              <Text style={[textStyle(t, "data"), s.cifras]}>
                {format(r.value)} / {format(r.target)}
              </Text>
            </View>
            <View style={s.pista}>
              <View style={[s.barra, { width: pct(Math.min(r.value, r.target)), backgroundColor: t.color.chart.series[0] }]} />
              {pasado ? (
                <View style={[s.exceso, { left: pct(r.target), width: pct(r.value - r.target), backgroundColor: overIsGood ? t.color.chart.positive : t.color.chart.negative }]} />
              ) : null}
              {r.projection !== undefined && r.projection > r.value ? (
                <View style={[s.proyeccion, { left: pct(r.projection), borderColor: r.projection > r.target ? t.color.chart.negative : t.color.text.secondary }]} />
              ) : null}
              <View style={[s.meta, { left: pct(r.target) }]} />
            </View>
            <Text style={textStyle(t, "caption", pasado ? (overIsGood ? t.color.success.fg : t.color.danger.fg) : t.color.text.secondary)}>
              {pasado ? "▲ " : ""}
              {resumen}
              {r.projection !== undefined && r.projection > r.value ? ` · ${format(r.projection)} ${texts.projection}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    lista: { gap: 2 },
    fila: {
      gap: t.space.xxs,
      paddingVertical: t.space.xs,
      paddingHorizontal: t.space.sm,
      minHeight: t.minTouch,
      borderRadius: t.radius.sm,
      borderWidth: 2,
      borderColor: "transparent",
      cursor: "pointer",
    },
    filaEncima: { backgroundColor: t.color.bg.hover },
    filaPresionada: { backgroundColor: t.color.bg.pressed },
    filaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    cabeza: { flexDirection: "row", alignItems: "baseline", gap: t.space.sm },
    nombre: { flex: 1 },
    negrita: { fontWeight: "700" },
    cifras: { fontVariant: ["tabular-nums"] },
    pista: { height: 14, borderRadius: 3, backgroundColor: t.color.chart.neutral, justifyContent: "center" },
    barra: { position: "absolute", left: 0, top: 3, height: 8, borderRadius: 2 },
    exceso: { position: "absolute", top: 3, height: 8, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
    proyeccion: { position: "absolute", top: 1, width: 10, height: 12, marginLeft: -5, borderWidth: 2, borderRadius: 6 },
    meta: { position: "absolute", top: -2, width: 3, height: 18, marginLeft: -1.5, borderRadius: 1, backgroundColor: t.color.text.primary },
  });
