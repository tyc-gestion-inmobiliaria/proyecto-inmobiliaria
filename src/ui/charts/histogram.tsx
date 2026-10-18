/**
 * El histograma: cuántas cosas caen en cada tramo de valor.
 *
 * No muestra cuánto se gastó sino **cómo se reparte**: si casi todo son
 * montos chicos o unos pocos grandes. Las barras van pegadas (con el hueco
 * de 2), porque los tramos son continuos y no categorías sueltas.
 *
 * `highlightBelow` pinta de otro color los tramos que quedan por debajo de un
 * umbral y escribe la cuenta de cuántos son: el color nunca va solo.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Y_AXIS_WIDTH, YGrid } from "./axis";
import { compactNumber, niceTicks, scaleLinear, type Bin } from "./chart-logic";
import { ChartLegend, ChartTooltip, markOpacity, toggleSelection, useHoveredMark, useMeasuredWidth, type SelectableChartProps } from "./chart-parts";

export function binKey(b: Bin): string {
  return `${b.from}:${b.to}`;
}

const ALTO_ETIQUETA = 22;

export function Histogram({
  bins,
  height = 220,
  highlightBelow,
  labels = { below: "Bajo el umbral", above: "Sobre el umbral", count: (n: number) => `${n}` },
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & {
  bins: Bin[];
  height?: number;
  highlightBelow?: number;
  labels?: { below: string; above: string; count: (n: number) => string };
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();
  const { ticks, max } = niceTicks(0, Math.max(0, ...bins.map((b) => b.count)), 3);
  const alto = height - ALTO_ETIQUETA;
  const y = scaleLinear([0, max], [alto, 0]);
  const ancho = Math.max(0, width - Y_AXIS_WIDTH);
  const barra = bins.length ? ancho / bins.length : 0;
  const bajo = (b: Bin) => highlightBelow !== undefined && b.to <= highlightBelow + 1e-9;
  const colorBajo = t.color.chart.series[1];
  const colorSobre = t.color.chart.series[0];
  const iHover = bins.findIndex((b) => binKey(b) === hovered);
  const rango = (b: Bin) => `${format(b.from)} – ${format(b.to)}`;

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      {highlightBelow !== undefined ? (
        <ChartLegend
          items={[
            { key: "bajo", label: labels.below, color: colorBajo, value: labels.count(bins.filter(bajo).reduce((a, b) => a + b.count, 0)) },
            { key: "sobre", label: labels.above, color: colorSobre, value: labels.count(bins.filter((b) => !bajo(b)).reduce((a, b) => a + b.count, 0)) },
          ]}
        />
      ) : null}
      <View style={[s.plano, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <>
            <View style={[s.ejeY, { height: alto }]}>
              <YGrid ticks={ticks} y={y} format={(v) => `${Math.round(v)}`} />
            </View>
            <View style={[s.barras, { left: Y_AXIS_WIDTH }]}>
              {bins.map((b, i) => {
                const k = binKey(b);
                const elegida = selected === k;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityLabel={`De ${rango(b)}: ${b.count}`}
                    accessibilityState={{ selected: elegida }}
                    onPress={onSelect ? () => onSelect(toggleSelection(selected, k)) : undefined}
                    {...bind(k)}
                    style={(estado: EstadoPresionable) => {
                      const it = resolveInteraction(estado, { selected: elegida });
                      return [
                        s.columna,
                        { width: barra },
                        it === "hovered" && s.columnaEncima,
                        it === "pressed" && s.columnaPresionada,
                        it === "selected" && s.columnaElegida,
                      ];
                    }}
                  >
                    <View style={[s.area, { height: alto, opacity: markOpacity(selected, k) }]}>
                      {b.count > 0 ? (
                        <View style={[s.barra, { height: Math.max(2, alto - y(b.count)), backgroundColor: bajo(b) ? colorBajo : colorSobre }]} />
                      ) : null}
                    </View>
                    <Text style={[textStyle(t, "caption", t.color.text.tertiary), s.etiqueta]} numberOfLines={1}>
                      {i % Math.max(1, Math.ceil(bins.length / 6)) === 0 ? format(b.from) : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {highlightBelow !== undefined ? (
              <View
                pointerEvents="none"
                style={[s.umbral, { left: Y_AXIS_WIDTH + bins.filter(bajo).length * barra, height: alto }]}
              />
            ) : null}
            {iHover >= 0 ? (
              <ChartTooltip
                x={Y_AXIS_WIDTH + (iHover + 0.5) * barra}
                y={4}
                containerWidth={width}
                title={rango(bins[iHover])}
                rows={[
                  { label: "cantidad", value: `${bins[iHover].count}` },
                  { label: "suma", value: format(bins[iHover].sum) },
                ]}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { gap: t.space.sm },
    plano: { width: "100%" },
    ejeY: { position: "absolute", left: 0, right: 0, top: 0 },
    barras: { position: "absolute", top: 0, right: 0, bottom: 0, flexDirection: "row" },
    columna: { alignItems: "center", borderRadius: t.radius.sm, borderWidth: 2, borderColor: "transparent", cursor: "pointer" },
    columnaEncima: { backgroundColor: t.color.bg.hover },
    columnaPresionada: { backgroundColor: t.color.bg.pressed },
    columnaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    area: { width: "100%", justifyContent: "flex-end", paddingHorizontal: 1 },
    barra: { width: "100%", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    etiqueta: { height: ALTO_ETIQUETA, lineHeight: ALTO_ETIQUETA, overflow: "visible" },
    umbral: { position: "absolute", top: 0, width: 0, borderLeftWidth: 1.5, borderColor: t.color.text.secondary },
  });
