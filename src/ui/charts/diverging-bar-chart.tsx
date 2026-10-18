/**
 * Barras que suben o bajan desde el cero: lo que importa es el signo.
 *
 * - **Polaridad, no magnitud.** La posición (arriba o abajo del cero) dice si
 *   el periodo dejó o costó; el color lo repite, no lo sostiene solo. Quien
 *   no distingue los dos colores lo lee igual.
 * - **Una escala para los dos lados**: una pérdida de 50 mide lo mismo que
 *   una ganancia de 50.
 * - Cada periodo es una columna entera de alto, no solo su barra.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Y_AXIS_WIDTH, YGrid } from "./axis";
import { compactNumber, labelStep, niceTicks, scaleLinear } from "./chart-logic";
import {
  ChartLegend,
  ChartTooltip,
  markOpacity,
  toggleSelection,
  useHoveredMark,
  useMeasuredWidth,
  type SelectableChartProps,
} from "./chart-parts";
import type { ChartCategory } from "./column-chart";

export interface DivergingBarChartProps extends SelectableChartProps {
  categories: ChartCategory[];
  values: number[];
  height?: number;
  positiveLabel?: string;
  negativeLabel?: string;
}

const ALTO_ETIQUETA = 22;

export function DivergingBarChart({
  categories,
  values,
  height = 220,
  positiveLabel = "A favor",
  negativeLabel = "En contra",
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: DivergingBarChartProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();
  const { ticks, min, max } = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const alto = height - ALTO_ETIQUETA;
  const y = scaleLinear([min, max], [alto, 0]);
  const cero = y(0);
  const area = Math.max(0, width - Y_AXIS_WIDTH);
  const lienzo = Math.max(area, categories.length * 22);
  const columna = categories.length ? lienzo / categories.length : 0;
  const cada = labelStep(categories.length, lienzo, 36);
  const iHover = categories.findIndex((c) => c.key === hovered);

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      <ChartLegend
        items={[
          { key: "pos", label: positiveLabel, color: t.color.chart.positive },
          { key: "neg", label: negativeLabel, color: t.color.chart.negative },
        ]}
      />
      <View style={[s.plano, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <>
            <View style={[s.ejeY, { height: alto }]}>
              <YGrid ticks={ticks} y={y} format={format} />
            </View>
            <ScrollView horizontal style={[s.desliza, { left: Y_AXIS_WIDTH }]} contentContainerStyle={{ width: lienzo }}>
              <View style={s.columnas}>
                {categories.map((c, i) => {
                  const v = values[i] ?? 0;
                  const positivo = v >= 0;
                  const h = v === 0 ? 0 : Math.max(2, Math.abs(y(v) - cero));
                  const elegida = selected === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.longLabel ?? c.label}: ${positivo ? positiveLabel : negativeLabel} ${format(Math.abs(v))}`}
                      accessibilityState={{ selected: elegida }}
                      onPress={onSelect ? () => onSelect(toggleSelection(selected, c.key)) : undefined}
                      {...bind(c.key)}
                      style={(estado: EstadoPresionable) => {
                        const it = resolveInteraction(estado, { selected: elegida });
                        return [
                          s.columna,
                          { width: columna },
                          it === "hovered" && s.columnaEncima,
                          it === "pressed" && s.columnaPresionada,
                          it === "selected" && s.columnaElegida,
                        ];
                      }}
                    >
                      <View style={[s.area, { height: alto, opacity: markOpacity(selected, c.key) }]}>
                        {h > 0 ? (
                          <View
                            style={[
                              s.barra,
                              positivo ? { top: cero - h, height: h, ...s.puntaArriba } : { top: cero, height: h, ...s.puntaAbajo },
                              { backgroundColor: positivo ? t.color.chart.positive : t.color.chart.negative },
                            ]}
                          />
                        ) : null}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          textStyle(t, "caption", elegida ? t.color.text.primary : t.color.text.tertiary),
                          s.etiqueta,
                          elegida && s.etiquetaElegida,
                        ]}
                      >
                        {elegida || i % cada === 0 ? c.label : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            {iHover >= 0 ? (
              <ChartTooltip
                x={Y_AXIS_WIDTH + (iHover + 0.5) * columna}
                y={4}
                containerWidth={width}
                title={categories[iHover].longLabel ?? categories[iHover].label}
                rows={[
                  {
                    label: (values[iHover] ?? 0) >= 0 ? positiveLabel : negativeLabel,
                    value: format(values[iHover] ?? 0),
                    color: (values[iHover] ?? 0) >= 0 ? t.color.chart.positive : t.color.chart.negative,
                  },
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
    desliza: { position: "absolute", top: 0, right: 0, bottom: 0 },
    columnas: { flexDirection: "row" },
    columna: { alignItems: "center", borderRadius: t.radius.sm, borderWidth: 2, borderColor: "transparent", cursor: "pointer" },
    columnaEncima: { backgroundColor: t.color.bg.hover },
    columnaPresionada: { backgroundColor: t.color.bg.pressed },
    columnaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    area: { width: "100%", alignItems: "center" },
    barra: { position: "absolute", width: "60%", maxWidth: 18 },
    puntaArriba: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    puntaAbajo: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
    etiqueta: { height: ALTO_ETIQUETA - 4, lineHeight: ALTO_ETIQUETA - 4, textAlign: "center" },
    etiquetaElegida: { fontWeight: "700" },
  });
