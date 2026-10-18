/**
 * Columnas por periodo: agrupadas (comparar series lado a lado) o apiladas
 * (la parte de cada una en el total).
 *
 * - **Toda la columna es tocable**, de arriba abajo, no solo la barra: una
 *   barra de un día flojo mide tres píxeles y nadie le acierta.
 * - **La ayuda lista todas las series** del periodo, para no tener que
 *   apuntarle a cada segmento.
 * - **Con muchos periodos se desliza de costado** en vez de comprimir las
 *   columnas hasta volverlas rayas.
 * - Entre segmentos apilados y entre barras vecinas hay un hueco de 2 del
 *   color de la superficie: separa sin dibujar un borde.
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

export interface ChartCategory {
  key: string;
  label: string;
  /** Un nombre más largo para la ayuda y el lector de pantalla. */
  longLabel?: string;
}

export interface ChartSeries {
  key: string;
  label: string;
  /** Un valor por categoría, en el mismo orden. */
  values: number[];
  color: string;
}

export interface ColumnChartProps extends SelectableChartProps {
  categories: ChartCategory[];
  series: ChartSeries[];
  stacked?: boolean;
  height?: number;
  /** Debajo de este ancho por columna, la gráfica se desliza. */
  minColumnWidth?: number;
  /** Elegir una serie desde la leyenda. */
  selectedSeries?: string | null;
  onSelectSeries?: (key: string | null) => void;
}

const ALTO_ETIQUETA = 22;

export function ColumnChart({
  categories,
  series,
  stacked = false,
  height = 220,
  minColumnWidth,
  selected,
  onSelect,
  selectedSeries,
  onSelectSeries,
  format = compactNumber,
  accessibilityLabel,
}: ColumnChartProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();

  const minimo = minColumnWidth ?? (stacked ? 26 : 14 + series.length * 8);
  const totales = categories.map((_, i) => series.reduce((acc, se) => acc + Math.max(0, se.values[i] ?? 0), 0));
  const maximo = stacked ? Math.max(0, ...totales) : Math.max(0, ...series.flatMap((se) => se.values));
  const { ticks, max } = niceTicks(0, maximo);
  const alto = height - ALTO_ETIQUETA;
  const y = scaleLinear([0, max], [alto, 0]);
  const area = Math.max(0, width - Y_AXIS_WIDTH);
  const lienzo = Math.max(area, categories.length * minimo);
  const columna = categories.length ? lienzo / categories.length : 0;
  const cada = labelStep(categories.length, lienzo, 40);
  const activa = hovered ?? null;
  const iActiva = categories.findIndex((c) => c.key === activa);

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      {series.length > 1 ? (
        <ChartLegend
          items={series.map((se) => ({ key: se.key, label: se.label, color: se.color, shape: "rect" }))}
          selected={selectedSeries}
          onSelect={onSelectSeries}
        />
      ) : null}
      <View style={[s.plano, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <>
            <View style={[s.ejeY, { height: alto }]}>
              <YGrid ticks={ticks} y={y} format={format} />
            </View>
            <ScrollView horizontal style={[s.desliza, { left: Y_AXIS_WIDTH }]} contentContainerStyle={{ width: lienzo }}>
              <View style={[s.columnas, { height }]}>
                {categories.map((c, i) => {
                  const elegida = selected === c.key;
                  const etiqueta = series
                    .map((se) => `${se.label} ${format(se.values[i] ?? 0)}`)
                    .join(", ");
                  return (
                    <Pressable
                      key={c.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.longLabel ?? c.label}: ${etiqueta}`}
                      accessibilityState={{ selected: elegida }}
                      onPress={() => onSelect?.(toggleSelection(selected, c.key))}
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
                        {stacked ? (
                          <View style={s.pila}>
                            {series.map((se) => {
                              const v = Math.max(0, se.values[i] ?? 0);
                              if (v <= 0) return null;
                              const h = Math.max(1, alto - y(v));
                              return (
                                <View
                                  key={se.key}
                                  style={[
                                    s.segmento,
                                    { height: h, backgroundColor: se.color, opacity: markOpacity(selectedSeries, se.key) },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        ) : (
                          <View style={s.grupo}>
                            {series.map((se) => {
                              const v = Math.max(0, se.values[i] ?? 0);
                              const h = v > 0 ? Math.max(2, alto - y(v)) : 0;
                              return (
                                <View
                                  key={se.key}
                                  style={[
                                    s.barra,
                                    { height: h, backgroundColor: se.color, opacity: markOpacity(selectedSeries, se.key) },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        )}
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
            {iActiva >= 0 ? (
              <ChartTooltip
                x={Y_AXIS_WIDTH + (iActiva + 0.5) * columna}
                y={4}
                containerWidth={width}
                title={categories[iActiva].longLabel ?? categories[iActiva].label}
                rows={[
                  ...series.map((se) => ({ label: se.label, value: format(se.values[iActiva] ?? 0), color: se.color })),
                  ...(stacked && series.length > 1 ? [{ label: "Total", value: format(totales[iActiva]) }] : []),
                ]}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Las mismas columnas, apiladas: la parte de cada serie en el total. */
export function StackedColumnChart(props: Omit<ColumnChartProps, "stacked">) {
  return <ColumnChart {...props} stacked />;
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
    area: { width: "100%", justifyContent: "flex-end", alignItems: "center" },
    pila: { width: "62%", maxWidth: 40, flexDirection: "column-reverse", gap: 2 },
    segmento: { width: "100%", borderRadius: 2 },
    grupo: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: "100%", width: "80%", justifyContent: "center" },
    barra: { flex: 1, maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    etiqueta: { height: ALTO_ETIQUETA - 4, lineHeight: ALTO_ETIQUETA - 4, textAlign: "center" },
    etiquetaElegida: { fontWeight: "700" },
  });
