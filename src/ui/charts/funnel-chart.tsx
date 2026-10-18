/**
 * El embudo: cuántos llegan a cada etapa y cuántos se quedan en el camino.
 *
 * - **Barras horizontales centradas**, de ancho proporcional a la etapa. No
 *   trapecios: un trapecio inventa una pendiente que los datos no tienen.
 * - **Entre etapa y etapa, la conversión escrita** ("40 % pasa"), que es lo
 *   que se busca en un embudo. La peor conversión va marcada con la palabra
 *   "la que más pierde" además del color.
 * - Un solo tono de la rampa, de claro arriba a oscuro abajo: las etapas son
 *   un orden, no categorías.
 * - Cada barra es una fila de 44 que se elige tocándola.
 */
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber, funnelSteps } from "./chart-logic";
import { markOpacity, toggleSelection, type SelectableChartProps } from "./chart-parts";

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

export function FunnelChart({
  stages,
  texts = { pass: (p: string) => `${p} pasa`, worst: "la que más pierde", ofFirst: (p: string) => `${p} del inicio` },
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & {
  stages: FunnelStage[];
  texts?: { pass: (pct: string) => string; worst: string; ofFirst: (pct: string) => string };
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const pasos = funnelSteps(stages.map((x) => x.value));
  const max = Math.max(1, ...stages.map((x) => x.value));
  const ramp = t.color.chart.sequential;
  // La rampa desde el tercer paso: los dos primeros son casi la superficie.
  const color = (i: number) => ramp[Math.min(ramp.length - 1, 2 + Math.round((i / Math.max(1, stages.length - 1)) * (ramp.length - 3)))];
  const conversiones = pasos.map((p) => p.fromPrevious).filter((x): x is number => x !== null);
  const peor = conversiones.length > 1 ? Math.min(...conversiones) : null;
  const pct = (x: number) => `${Math.round(x * 100)} %`;

  return (
    <View accessibilityLabel={accessibilityLabel} style={s.lista}>
      {stages.map((st, i) => {
        const paso = pasos[i];
        const elegida = selected === st.key;
        const esPeor = paso.fromPrevious !== null && paso.fromPrevious === peor;
        return (
          <Fragment key={st.key}>
            {paso.fromPrevious !== null ? (
              <Text style={[textStyle(t, "caption", esPeor ? t.color.danger.fg : t.color.text.secondary), s.conversion]}>
                ↓ {texts.pass(pct(paso.fromPrevious))}
                {esPeor ? ` · ${texts.worst}` : ""}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${st.label}: ${format(st.value)}${paso.fromPrevious !== null ? `, ${texts.pass(pct(paso.fromPrevious))}` : ""}`}
              accessibilityState={{ selected: elegida }}
              onPress={onSelect ? () => onSelect(toggleSelection(selected, st.key)) : undefined}
              style={(e: EstadoPresionable) => {
                const r = resolveInteraction(e, { selected: elegida });
                return [s.fila, { opacity: markOpacity(selected, st.key) }, r === "hovered" && s.encima, r === "pressed" && s.presionada, r === "selected" && s.elegida];
              }}
            >
              <Text style={[textStyle(t, "bodySmall"), s.nombre, elegida && s.negrita]} numberOfLines={1}>
                {elegida ? "✓ " : ""}
                {st.label}
              </Text>
              <View style={s.pista}>
                <View style={[s.barra, { width: `${Math.max(2, (st.value / max) * 100)}%`, backgroundColor: color(i) }]} />
              </View>
              <View style={s.cifras}>
                <Text style={[textStyle(t, "data"), s.negrita]}>{format(st.value)}</Text>
                {paso.fromFirst !== null ? <Text style={textStyle(t, "caption", t.color.text.tertiary)}>{texts.ofFirst(pct(paso.fromFirst))}</Text> : null}
              </View>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    lista: { gap: 0 },
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
    encima: { backgroundColor: t.color.bg.hover },
    presionada: { backgroundColor: t.color.bg.pressed },
    elegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    nombre: { width: 110 },
    negrita: { fontWeight: "700" },
    pista: { flex: 1, alignItems: "center" },
    barra: { height: 22, borderRadius: 4 },
    cifras: { width: 96, alignItems: "flex-end" },
    conversion: { paddingLeft: 130, paddingVertical: 1 },
  });
