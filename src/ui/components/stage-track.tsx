/**
 * El recorrido de algo por sus etapas: prospecto → visita → oferta → cierre,
 * pedido → preparado → enviado → entregado.
 *
 * - Cada etapa dice su estado **con un signo y no solo con color**: ✓ hecha,
 *   el número en un círculo lleno la actual, el número en un círculo vacío
 *   las que vienen, ✕ donde se perdió.
 * - La actual va en negrita y con su nombre siempre escrito; en angosto, las
 *   demás pueden quedar solo con el círculo (`compact`).
 * - Con `onSelect`, cada etapa es un botón (para moverla a mano, o para
 *   filtrar por etapa) con sus cuatro estados.
 */
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { stageStatuses, type StageStatus } from "./stage-logic";

export interface Stage {
  key: string;
  label: string;
}

export interface StageTrackProps {
  stages: Stage[];
  current: string;
  /** El recorrido se cortó en la etapa actual. */
  lost?: boolean;
  onSelect?: (key: string) => void;
  /** Solo el nombre de la actual: para columnas angostas. */
  compact?: boolean;
  accessibilityLabel: string;
  texts?: { done: string; current: string; upcoming: string; lost: string };
}

const TEXTOS = { done: "hecha", current: "actual", upcoming: "por venir", lost: "perdida aquí" };

export function StageTrack({ stages, current, lost = false, onSelect, compact = false, accessibilityLabel, texts = TEXTOS }: StageTrackProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const estados = stageStatuses(
    stages.map((x) => x.key),
    current,
    lost,
  );

  const circulo = (estado: StageStatus, i: number) => {
    const signo = estado === "done" ? "✓" : estado === "lost" ? "✕" : String(i + 1);
    const lleno = estado === "done" || estado === "current" || estado === "lost";
    const fondo = estado === "lost" ? t.color.danger.fg : estado === "upcoming" ? t.color.bg.surface : t.color.accent.base;
    return (
      <View
        style={[
          s.circulo,
          { backgroundColor: fondo, borderColor: estado === "upcoming" ? t.color.border.strong : fondo },
          estado === "current" && s.circuloActual,
        ]}
      >
        <Text style={[textStyle(t, "caption", lleno ? t.color.text.onAccent : t.color.text.secondary), s.signo]}>{signo}</Text>
      </View>
    );
  };

  return (
    <View style={s.fila} accessibilityLabel={accessibilityLabel}>
      {stages.map((st, i) => {
        const estado = estados[i];
        const nombre = !compact || estado === "current" || estado === "lost";
        const contenido = (
          <>
            {circulo(estado, i)}
            {nombre ? (
              <Text
                style={[
                  textStyle(t, "bodySmall", estado === "upcoming" ? t.color.text.tertiary : estado === "lost" ? t.color.danger.fg : t.color.text.primary),
                  (estado === "current" || estado === "lost") && s.negrita,
                ]}
                numberOfLines={1}
              >
                {st.label}
              </Text>
            ) : null}
          </>
        );
        const etiqueta = `${st.label}: ${texts[estado]}`;
        return (
          <Fragment key={st.key}>
            {i > 0 ? <View style={[s.tramo, { backgroundColor: estado === "upcoming" || estado === "lost" ? t.color.border.default : t.color.accent.base }]} /> : null}
            {onSelect ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={etiqueta}
                accessibilityState={{ selected: estado === "current" }}
                onPress={() => onSelect(st.key)}
                style={(e: EstadoPresionable) => {
                  const r = resolveInteraction(e, { selected: estado === "current" });
                  return [s.etapa, s.tocable, r === "hovered" && s.encima, r === "pressed" && s.presionada];
                }}
              >
                {contenido}
              </Pressable>
            ) : (
              <View style={s.etapa} accessibilityLabel={etiqueta}>
                {contenido}
              </View>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", rowGap: t.space.xs },
    etapa: { flexDirection: "row", alignItems: "center", gap: t.space.xs, minHeight: t.minTouch, paddingHorizontal: t.space.xs, borderRadius: t.radius.md },
    tocable: { cursor: "pointer" },
    encima: { backgroundColor: t.color.bg.hover },
    presionada: { backgroundColor: t.color.bg.pressed },
    circulo: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    circuloActual: { width: 28, height: 28, borderRadius: 14, boxShadow: `0 0 0 3px ${t.color.accent.subtle}` },
    signo: { fontWeight: "700" },
    negrita: { fontWeight: "700" },
    tramo: { width: 18, height: 2, borderRadius: 1 },
  });
