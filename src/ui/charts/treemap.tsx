/**
 * El mapa de árbol: el total partido en cajas, cada una del área de su parte.
 *
 * Aguanta muchas más categorías que una dona —quince, veinte— y deja ver de
 * un golpe cuáles pesan. Las cajas van tan cuadradas como se pueda (algoritmo
 * *squarified*), porque comparar áreas de tiras finas no funciona.
 *
 * El nombre y la cifra van dentro de la caja **solo si caben** con su margen;
 * si no, quedan en la ayuda, en el nombre accesible y en la tabla. Un texto
 * cortado a la mitad es peor que ninguno.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber, squarify } from "./chart-logic";
import { ChartTooltip, markOpacity, toggleSelection, useHoveredMark, useMeasuredWidth, type SelectableChartProps } from "./chart-parts";

export interface TreemapItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Treemap({
  items,
  height = 260,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & { items: TreemapItem[]; height?: number }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();
  const total = items.reduce((acc, i) => acc + Math.max(0, i.value), 0);
  const cajas = squarify(items, (i) => i.value, width, height);
  const enHover = cajas.find((c) => c.item.key === hovered);

  return (
    <View style={[s.plano, { height }]} onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      {cajas.map(({ item, x, y, w, h }) => {
        const elegida = selected === item.key;
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const caben = w >= 72 && h >= 40;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${format(item.value)}, ${pct} %`}
            accessibilityState={{ selected: elegida }}
            onPress={onSelect ? () => onSelect(toggleSelection(selected, item.key)) : undefined}
            {...bind(item.key)}
            style={(estado: EstadoPresionable) => {
              const it = resolveInteraction(estado, { selected: elegida });
              return [
                s.caja,
                // El hueco de 2 entre cajas sale de achicar cada una, no de un borde.
                { left: x + 1, top: y + 1, width: Math.max(0, w - 2), height: Math.max(0, h - 2), backgroundColor: item.color },
                { opacity: markOpacity(selected, item.key) },
                it === "hovered" && s.cajaEncima,
                it === "pressed" && s.cajaPresionada,
                it === "selected" && s.cajaElegida,
              ];
            }}
          >
            {caben ? (
              <View style={s.rotulo}>
                <Text style={[textStyle(t, "bodySmall", t.color.text.primary), s.nombre]} numberOfLines={1}>
                  {elegida ? "✓ " : ""}
                  {item.label}
                </Text>
                <Text style={[textStyle(t, "caption", t.color.text.primary)]} numberOfLines={1}>
                  {format(item.value)} · {pct} %
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      {enHover ? (
        <ChartTooltip
          x={enHover.x + enHover.w / 2}
          y={enHover.y + 6}
          containerWidth={width}
          title={enHover.item.label}
          rows={[{ label: total > 0 ? `${Math.round((enHover.item.value / total) * 100)} % del total` : "", value: format(enHover.item.value), color: enHover.item.color }]}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    plano: { width: "100%" },
    caja: { position: "absolute", borderRadius: 4, borderWidth: 2, borderColor: "transparent", overflow: "hidden", cursor: "pointer" },
    cajaEncima: { borderColor: t.color.border.strong },
    cajaPresionada: { opacity: 0.75 },
    cajaElegida: { borderColor: t.color.border.focus, borderWidth: 3 },
    // El rótulo va sobre una placa de superficie: la tinta no depende del color de la caja.
    rotulo: {
      margin: t.space.xs,
      paddingHorizontal: t.space.xs,
      paddingVertical: 2,
      borderRadius: 3,
      backgroundColor: t.color.bg.surface,
      alignSelf: "flex-start",
      maxWidth: "92%",
    },
    nombre: { fontWeight: "600" },
  });
