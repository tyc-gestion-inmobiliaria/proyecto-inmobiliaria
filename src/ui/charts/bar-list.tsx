/**
 * Un ranking en barras horizontales: nombre, barra y cifra, de mayor a menor.
 *
 * Es la forma correcta para muchas categorías o nombres largos, donde una
 * dona tendría porciones que no se distinguen. **Un solo tono** para todas
 * las barras: ordenar por tamaño ya dice cuál es mayor, y pintar cada una de
 * un color gastaría el color en repetir lo que dice el largo.
 *
 * La fila entera es el control (44 de alto). Pasadas `limit` filas, el resto
 * se abre con "Ver N más", que es mejor que una lista de cuarenta barras.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/button";
import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber } from "./chart-logic";
import { markOpacity, toggleSelection, type SelectableChartProps } from "./chart-parts";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** Lo que completa la cifra: "12 movimientos", "18 %". */
  detail?: string;
  /** Solo si cada fila es una serie con su color propio en el resto del tablero. */
  color?: string;
}

export function BarList({
  items,
  limit = 8,
  color,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & { items: BarListItem[]; limit?: number; color?: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [todas, setTodas] = useState(false);
  const max = Math.max(0, ...items.map((i) => i.value));
  // Lo elegido se ve aunque esté más abajo del corte.
  const visibles = todas ? items : items.filter((it, i) => i < limit || it.key === selected);
  const ocultas = items.length - visibles.length;

  return (
    <View style={s.lista} accessibilityLabel={accessibilityLabel}>
      {visibles.map((it) => {
        const elegida = selected === it.key;
        const ratio = max > 0 ? it.value / max : 0;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityLabel={`${it.label}: ${format(it.value)}${it.detail ? `, ${it.detail}` : ""}`}
            accessibilityState={{ selected: elegida }}
            onPress={onSelect ? () => onSelect(toggleSelection(selected, it.key)) : undefined}
            style={(estado: EstadoPresionable) => {
              const i = resolveInteraction(estado, { selected: elegida });
              return [
                s.fila,
                { opacity: markOpacity(selected, it.key) },
                i === "hovered" && s.filaEncima,
                i === "pressed" && s.filaPresionada,
                i === "selected" && s.filaElegida,
              ];
            }}
          >
            <View style={s.nombre}>
              <Text style={[textStyle(t, "body"), elegida && s.negrita]} numberOfLines={1}>
                {elegida ? "✓ " : ""}
                {it.label}
              </Text>
              {it.detail ? <Text style={textStyle(t, "caption", t.color.text.secondary)}>{it.detail}</Text> : null}
            </View>
            <View style={s.pista}>
              <View
                style={[
                  s.barra,
                  { width: `${Math.max(ratio * 100, it.value > 0 ? 1.5 : 0)}%`, backgroundColor: it.color ?? color ?? t.color.chart.series[0] },
                ]}
              />
            </View>
            <Text style={[textStyle(t, "data"), s.cifra, elegida && s.negrita]}>{format(it.value)}</Text>
          </Pressable>
        );
      })}
      {ocultas > 0 || todas ? (
        <View style={s.mas}>
          <Button
            label={todas ? "Ver menos" : `Ver ${ocultas} más`}
            variant="ghost"
            size="sm"
            onPress={() => setTodas((v) => !v)}
          />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    lista: { gap: 2 },
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
    nombre: { flex: 1, minWidth: 0 },
    pista: { flex: 1.3, height: 10, justifyContent: "center" },
    barra: { height: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cifra: { minWidth: 64, textAlign: "right", fontVariant: ["tabular-nums"] },
    negrita: { fontWeight: "700" },
    mas: { flexDirection: "row" },
  });
