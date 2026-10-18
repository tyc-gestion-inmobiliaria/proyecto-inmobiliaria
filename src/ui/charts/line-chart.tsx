/**
 * Líneas y áreas en el tiempo.
 *
 * - **El puntero busca la fecha, no la línea.** Encima del dibujo hay una
 *   franja tocable por punto, de alto completo y pegadas entre sí: se apunta
 *   a un día, nunca a un trazo de 2 píxeles. Una guía vertical marca dónde
 *   está y la ayuda lista todas las series de ese punto.
 * - **Una sola escala.** Dos medidas de distinta magnitud no comparten
 *   gráfica con dos ejes: van en dos gráficas.
 * - **Área apilada** para la parte de cada serie en el total; área simple
 *   para una sola serie. Con varias series sin apilar, solo líneas: áreas
 *   superpuestas se tapan unas a otras.
 * - **Énfasis.** Con `emphasis`, esa serie va en su color y las demás en gris:
 *   la forma honesta de decir "esta es la noticia, el resto es contexto".
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Y_AXIS_WIDTH, YGrid } from "./axis";
import { areaPath, compactNumber, labelStep, linePath, niceTicks, scaleLinear, type Point } from "./chart-logic";
import {
  ChartLegend,
  ChartTooltip,
  toggleSelection,
  useHoveredMark,
  useMeasuredWidth,
  type SelectableChartProps,
} from "./chart-parts";
import type { ChartCategory, ChartSeries } from "./column-chart";

export interface LineChartProps extends SelectableChartProps {
  categories: ChartCategory[];
  series: ChartSeries[];
  height?: number;
  /** Rellenar debajo de la línea. */
  area?: boolean;
  /** Apilar las áreas (solo con `area`). */
  stacked?: boolean;
  /** La serie que es la noticia: las demás van en gris. */
  emphasis?: string | null;
  /** Una línea de referencia horizontal (una meta, un umbral), con su nombre. */
  reference?: { value: number; label: string };
  selectedSeries?: string | null;
  onSelectSeries?: (key: string | null) => void;
}

const ALTO_ETIQUETA = 22;
const MARGEN = 8;

export function LineChart({
  categories,
  series,
  height = 220,
  area = false,
  stacked = false,
  emphasis,
  reference,
  selected,
  onSelect,
  selectedSeries,
  onSelectSeries,
  format = compactNumber,
  accessibilityLabel,
}: LineChartProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();

  const apilar = area && stacked;
  const n = categories.length;
  // Con apilado, cada serie se dibuja sobre la suma de las anteriores.
  const base = series.map((_, si) =>
    categories.map((__, i) => (apilar ? series.slice(0, si).reduce((acc, se) => acc + Math.max(0, se.values[i] ?? 0), 0) : 0)),
  );
  const techo = series.map((se, si) => categories.map((_, i) => base[si][i] + (apilar ? Math.max(0, se.values[i] ?? 0) : (se.values[i] ?? 0))));
  const todos = techo.flat();
  const { ticks, min, max } = niceTicks(Math.min(0, ...todos, reference?.value ?? 0), Math.max(0, ...todos, reference?.value ?? 0));
  const alto = height - ALTO_ETIQUETA;
  const y = scaleLinear([min, max], [alto - MARGEN, MARGEN]);
  const yGrid = scaleLinear([min, max], [alto - MARGEN, MARGEN]);
  const ancho = Math.max(0, width - Y_AXIS_WIDTH);
  const columna = n ? ancho / n : 0;
  const x = (i: number) => (i + 0.5) * columna;
  const cada = labelStep(n, ancho, 44);
  const iActiva = categories.findIndex((c) => c.key === (hovered ?? selected));
  const iHover = categories.findIndex((c) => c.key === hovered);

  const colorDe = (se: ChartSeries) => (emphasis && emphasis !== se.key ? t.color.chart.muted : se.color);
  // Lo enfatizado se dibuja al final, encima de lo gris.
  const orden = series.map((se, si) => ({ se, si })).sort((a, b) => Number(a.se.key === emphasis) - Number(b.se.key === emphasis));

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      {series.length > 1 ? (
        <ChartLegend
          items={series.map((se) => ({ key: se.key, label: se.label, color: colorDe(se), shape: area ? "rect" : "line" }))}
          selected={selectedSeries}
          onSelect={onSelectSeries}
        />
      ) : null}
      <View style={[s.plano, { height }]} onLayout={onLayout}>
        {width > 0 && n > 0 ? (
          <>
            <View style={[s.ejeY, { height: alto }]}>
              <YGrid ticks={ticks} y={yGrid} format={format} />
            </View>
            <View style={[s.franjas, { left: Y_AXIS_WIDTH, width: ancho }]}>
              {categories.map((c, i) => {
                const elegida = selected === c.key;
                return (
                  <Pressable
                    key={c.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.longLabel ?? c.label}: ${series.map((se) => `${se.label} ${format(se.values[i] ?? 0)}`).join(", ")}`}
                    accessibilityState={{ selected: elegida }}
                    onPress={onSelect ? () => onSelect(toggleSelection(selected, c.key)) : undefined}
                    {...bind(c.key)}
                    style={(estado: EstadoPresionable) => {
                      const it = resolveInteraction(estado, { selected: elegida });
                      return [s.franja, it === "pressed" && s.franjaPresionada, it === "selected" && s.franjaElegida];
                    }}
                  >
                    <View style={{ height: alto }} />
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
            <View style={[s.dibujo, { left: Y_AXIS_WIDTH, height: alto }]} pointerEvents="none">
              <Svg width={ancho} height={alto}>
                {reference ? (
                  <Line x1={0} x2={ancho} y1={y(reference.value)} y2={y(reference.value)} stroke={t.color.text.secondary} strokeWidth={1.5} />
                ) : null}
                {iActiva >= 0 ? (
                  <Line x1={x(iActiva)} x2={x(iActiva)} y1={MARGEN} y2={alto - MARGEN} stroke={t.color.border.strong} strokeWidth={1} />
                ) : null}
                {orden.map(({ se, si }) => {
                  const arriba: Point[] = categories.map((_, i) => ({ x: x(i), y: y(techo[si][i]) }));
                  const abajo: Point[] = categories.map((_, i) => ({ x: x(i), y: y(base[si][i]) }));
                  const apagada = selectedSeries && selectedSeries !== se.key;
                  const color = colorDe(se);
                  return (
                    <G key={se.key}>
                      {area ? (
                        <Path d={areaPath(arriba, abajo)} fill={color} fillOpacity={apagada ? 0.08 : apilar ? 0.55 : 0.16} />
                      ) : null}
                      <Path d={linePath(arriba)} stroke={color} strokeWidth={2} fill="none" strokeOpacity={apagada ? 0.35 : 1} />
                      {iActiva >= 0 ? (
                        <Circle
                          cx={x(iActiva)}
                          cy={y(techo[si][iActiva])}
                          r={4.5}
                          fill={color}
                          stroke={t.color.bg.surface}
                          strokeWidth={2}
                        />
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            </View>
            {reference ? (
              <Text
                pointerEvents="none"
                style={[textStyle(t, "caption", t.color.text.secondary), s.referencia, { top: y(reference.value) - 18, left: Y_AXIS_WIDTH + 4 }]}
              >
                {reference.label}
              </Text>
            ) : null}
            {iHover >= 0 ? (
              <ChartTooltip
                x={Y_AXIS_WIDTH + x(iHover)}
                y={4}
                containerWidth={width}
                title={categories[iHover].longLabel ?? categories[iHover].label}
                rows={[
                  ...series.map((se) => ({ label: se.label, value: format(se.values[iHover] ?? 0), color: colorDe(se) })),
                  ...(apilar && series.length > 1
                    ? [{ label: "Total", value: format(series.reduce((acc, se) => acc + (se.values[iHover] ?? 0), 0)) }]
                    : []),
                ]}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Un área: una serie rellena, o varias apiladas con `stacked`. */
export function AreaChart(props: Omit<LineChartProps, "area">) {
  return <LineChart {...props} area />;
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { gap: t.space.sm },
    plano: { width: "100%" },
    ejeY: { position: "absolute", left: 0, right: 0, top: 0 },
    dibujo: { position: "absolute", top: 0, right: 0 },
    referencia: { position: "absolute" },
    // Las franjas van debajo del dibujo: el fondo de la elegida no tapa la línea.
    franjas: { position: "absolute", top: 0, bottom: 0, flexDirection: "row" },
    franja: { flex: 1, cursor: "pointer" },
    franjaPresionada: { backgroundColor: t.color.bg.pressed },
    // Lo elegido se queda marcado con la guía y el punto; el fondo lo dice
    // también sin puntero, que en un teléfono no hay.
    franjaElegida: { backgroundColor: t.color.accent.subtle },
    etiqueta: { height: ALTO_ETIQUETA, lineHeight: ALTO_ETIQUETA, textAlign: "center", overflow: "visible" },
    etiquetaElegida: { fontWeight: "700" },
  });
