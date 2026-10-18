/**
 * Puntos en dos ejes: cada uno es una cosa con dos medidas.
 *
 * - **Hasta tres grupos de color.** Con más, en una nube de puntos todos los
 *   pares de colores se tocan y dejan de distinguirse; un cuarto grupo se
 *   junta en "Otros" o va en otra gráfica.
 * - **El punto mide 8; lo que se toca, 28.** Nadie le acierta a un punto de 8
 *   píxeles. La zona es transparente y centrada en él.
 * - Una línea de umbral opcional, con su nombre escrito, para leer de un
 *   golpe qué queda por debajo.
 * - Los puntos se separan con un anillo del color de la superficie, no con
 *   un borde: así se ven aunque se encimen.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Y_AXIS_WIDTH, YGrid } from "./axis";
import { compactNumber, niceTicks, scaleLinear } from "./chart-logic";
import {
  ChartLegend,
  ChartTooltip,
  toggleSelection,
  useHoveredMark,
  useMeasuredWidth,
  type ChartFormat,
  type SelectableChartProps,
} from "./chart-parts";

export interface ScatterPoint {
  key: string;
  x: number;
  y: number;
  label: string;
  group: string;
}

export interface ScatterGroup {
  key: string;
  label: string;
  color: string;
}

const ZONA = 28;
const ALTO_EJE_X = 24;

export function ScatterChart({
  points,
  groups,
  height = 240,
  xFormat = compactNumber,
  threshold,
  selected,
  onSelect,
  selectedGroup,
  onSelectGroup,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & {
  points: ScatterPoint[];
  groups: ScatterGroup[];
  height?: number;
  xFormat?: ChartFormat;
  threshold?: { value: number; label: string };
  selectedGroup?: string | null;
  onSelectGroup?: (key: string | null) => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();
  const alto = height - ALTO_EJE_X;
  const { ticks, min, max } = niceTicks(0, Math.max(0, ...points.map((p) => p.y), threshold?.value ?? 0));
  const y = scaleLinear([min, max], [alto - 6, 6]);
  const xs = points.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const ancho = Math.max(0, width - Y_AXIS_WIDTH);
  const x = scaleLinear([x0, x1 === x0 ? x0 + 1 : x1], [ZONA / 2, ancho - ZONA / 2]);
  const color = (g: string) => groups.find((gr) => gr.key === g)?.color ?? t.color.chart.muted;
  const enHover = points.find((p) => p.key === hovered);
  const marcasX = [x0, x0 + (x1 - x0) / 2, x1];

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      <ChartLegend
        items={groups.map((g) => ({ key: g.key, label: g.label, color: g.color, shape: "dot" }))}
        selected={selectedGroup}
        onSelect={onSelectGroup}
      />
      <View style={[s.plano, { height }]} onLayout={onLayout}>
        {width > 0 && points.length ? (
          <>
            <View style={[s.ejeY, { height: alto }]}>
              <YGrid ticks={ticks} y={y} format={format} />
            </View>
            {threshold ? (
              <View pointerEvents="none" style={[s.umbral, { top: y(threshold.value), left: Y_AXIS_WIDTH }]}>
                <Text style={[textStyle(t, "caption", t.color.text.secondary), s.umbralTexto]}>{threshold.label}</Text>
              </View>
            ) : null}
            <View style={[s.nube, { left: Y_AXIS_WIDTH, height: alto }]}>
              {points.map((p) => {
                const elegido = selected === p.key;
                const fuera = selectedGroup && selectedGroup !== p.group;
                return (
                  <Pressable
                    key={p.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label}: ${format(p.y)}`}
                    accessibilityState={{ selected: elegido }}
                    onPress={onSelect ? () => onSelect(toggleSelection(selected, p.key)) : undefined}
                    {...bind(p.key)}
                    style={(estado: EstadoPresionable) => {
                      const it = resolveInteraction(estado, { selected: elegido });
                      return [
                        s.zona,
                        { left: x(p.x) - ZONA / 2, top: y(p.y) - ZONA / 2, opacity: fuera ? 0.25 : selected && !elegido ? 0.55 : 1 },
                        it === "hovered" && s.zonaEncima,
                        it === "pressed" && s.zonaPresionada,
                      ];
                    }}
                  >
                    <View
                      style={[
                        s.punto,
                        { backgroundColor: color(p.group), borderColor: t.color.bg.surface },
                        elegido && [s.puntoElegido, { borderColor: t.color.border.focus }],
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={[s.ejeX, { left: Y_AXIS_WIDTH, top: alto }]}>
              {marcasX.map((v, i) => (
                <Text key={i} style={textStyle(t, "caption", t.color.text.tertiary)}>
                  {xFormat(v)}
                </Text>
              ))}
            </View>
            {enHover ? (
              <ChartTooltip
                x={Y_AXIS_WIDTH + x(enHover.x)}
                y={Math.max(0, y(enHover.y) - 70)}
                containerWidth={width}
                title={enHover.label}
                rows={[{ label: groups.find((g) => g.key === enHover.group)?.label ?? "", value: format(enHover.y), color: color(enHover.group) }]}
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
    nube: { position: "absolute", top: 0, right: 0 },
    zona: { position: "absolute", width: ZONA, height: ZONA, borderRadius: ZONA / 2, alignItems: "center", justifyContent: "center", cursor: "pointer" },
    zonaEncima: { backgroundColor: t.color.bg.hover },
    zonaPresionada: { backgroundColor: t.color.bg.pressed },
    punto: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
    puntoElegido: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
    umbral: { position: "absolute", right: 0, height: 0, borderTopWidth: 1.5, borderColor: t.color.text.secondary },
    umbralTexto: { position: "absolute", right: 0, top: -18 },
    ejeX: { position: "absolute", right: 0, height: ALTO_EJE_X, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  });
