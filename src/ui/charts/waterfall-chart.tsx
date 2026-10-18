/**
 * La cascada: de un total a otro, paso por paso.
 *
 * Cuenta una resta como una historia: de lo cobrado se va la comisión,
 * luego el impuesto, luego los fijos… y al final queda el resultado. Cada
 * paso flota donde terminó el anterior, y una línea fina los une para que el
 * ojo siga la cuenta.
 *
 * - Los **totales** (el de partida, los subtotales, el final) salen del cero
 *   en gris oscuro: son referencias, no movimientos.
 * - Los **pasos** suben o bajan en el color de a favor o en contra, y la
 *   cifra lleva su signo escrito: el color nunca es la única señal.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Y_AXIS_WIDTH, YGrid } from "./axis";
import { compactNumber, niceTicks, scaleLinear } from "./chart-logic";
import { markOpacity, toggleSelection, useMeasuredWidth, type SelectableChartProps } from "./chart-parts";

export interface WaterfallStep {
  key: string;
  label: string;
  /** En un paso, lo que suma o resta. En un total, el valor acumulado. */
  value: number;
  kind: "total" | "step";
}

const ALTO_ETIQUETA = 36;

export function WaterfallChart({
  steps,
  height = 240,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & { steps: WaterfallStep[]; height?: number }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();

  // Dónde empieza y termina cada barra.
  const tramos: { st: WaterfallStep; desde: number; hasta: number }[] = [];
  for (const st of steps) {
    const previo = tramos.length ? tramos[tramos.length - 1].hasta : 0;
    tramos.push(st.kind === "total" ? { st, desde: 0, hasta: st.value } : { st, desde: previo, hasta: previo + st.value });
  }
  const extremos = tramos.flatMap((tr) => [tr.desde, tr.hasta]);
  const { ticks, min, max } = niceTicks(Math.min(0, ...extremos), Math.max(0, ...extremos));
  const alto = height - ALTO_ETIQUETA;
  const y = scaleLinear([min, max], [alto, 0]);
  const ancho = Math.max(0, width - Y_AXIS_WIDTH);
  const columna = steps.length ? ancho / steps.length : 0;

  return (
    <View style={[s.plano, { height }]} onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <>
          <View style={[s.ejeY, { height: alto }]}>
            <YGrid ticks={ticks} y={y} format={format} />
          </View>
          <View style={[s.columnas, { left: Y_AXIS_WIDTH }]}>
            {tramos.map(({ st, desde, hasta }, i) => {
              const arriba = Math.min(y(desde), y(hasta));
              const h = Math.max(2, Math.abs(y(desde) - y(hasta)));
              const color =
                st.kind === "total" ? t.color.text.secondary : st.value >= 0 ? t.color.chart.positive : t.color.chart.negative;
              const cifra = st.kind === "total" ? format(st.value) : `${st.value >= 0 ? "+" : "−"}${format(Math.abs(st.value))}`;
              const elegida = selected === st.key;
              const siguiente = tramos[i + 1];
              return (
                <Pressable
                  key={st.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${st.label}: ${cifra}`}
                  accessibilityState={{ selected: elegida }}
                  onPress={onSelect ? () => onSelect(toggleSelection(selected, st.key)) : undefined}
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
                  <View style={[s.area, { height: alto, opacity: markOpacity(selected, st.key) }]}>
                    {/* La cifra va del lado al que apunta la barra: encima si sube, debajo si baja. */}
                    <Text
                      style={[textStyle(t, "caption"), s.cifra, { top: hasta < desde || (st.kind === "total" && st.value < 0) ? arriba + h + 2 : Math.max(0, arriba - 18) }]}
                      numberOfLines={1}
                    >
                      {cifra}
                    </Text>
                    <View style={[s.barra, { top: arriba, height: h, backgroundColor: color }]} />
                    {/* El conector: de donde termina este al siguiente. */}
                    {siguiente && siguiente.st.kind === "step" ? (
                      <View pointerEvents="none" style={[s.conector, { top: y(hasta) }]} />
                    ) : null}
                  </View>
                  <Text numberOfLines={2} style={[textStyle(t, "caption", t.color.text.secondary), s.etiqueta, elegida && s.etiquetaElegida]}>
                    {st.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    plano: { width: "100%" },
    ejeY: { position: "absolute", left: 0, right: 0, top: 0 },
    columnas: { position: "absolute", top: 0, right: 0, bottom: 0, flexDirection: "row" },
    columna: { alignItems: "center", borderRadius: t.radius.sm, borderWidth: 2, borderColor: "transparent", cursor: "pointer" },
    columnaEncima: { backgroundColor: t.color.bg.hover },
    columnaPresionada: { backgroundColor: t.color.bg.pressed },
    columnaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    area: { width: "100%", alignItems: "center" },
    barra: { position: "absolute", width: "56%", maxWidth: 48, borderRadius: 3 },
    conector: { position: "absolute", left: "78%", right: "-22%", height: 1, backgroundColor: t.color.chart.axis },
    cifra: { position: "absolute", fontWeight: "700", fontVariant: ["tabular-nums"] },
    etiqueta: { height: ALTO_ETIQUETA - 4, textAlign: "center", paddingTop: 2 },
    etiquetaElegida: { fontWeight: "700", color: t.color.text.primary },
  });
