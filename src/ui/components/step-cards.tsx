/**
 * Los pasos de un proceso guiado como fichas: cada una dice su estado y deja
 * mirar ese paso. Para cierres, asistentes, alta en varios pasos.
 *
 * Se diferencia de `StageTrack` en dos cosas:
 *
 * - **El estado de cada paso es suyo**, no sale de la posición: un paso
 *   puede estar trabado ("con bloqueos") y otro de antes, hecho.
 * - **El paso que se mira (`value`) es aparte del que está en curso**: se
 *   puede volver a revisar un paso hecho sin perder de vista cuál sigue.
 *
 * Cada estado lleva **tres señales**: el signo del círculo (✓, !, número),
 * la palabra ("Con bloqueos") y el color. El elegido suma un borde de 2 y el
 * nombre en negrita. La ficha entera es el blanco del toque, de 64 de alto.
 *
 * **Si no caben las fichas** (menos de 520 de ancho, el teléfono), los pasos
 * van en una fila de círculos de 44 unidos por una línea, y debajo el nombre
 * y el estado del paso que se mira: apiladas, cuatro fichas ocupan media
 * pantalla antes de llegar al trabajo.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { STEP_CARD_TEXTS, stepAccessibilityLabel, stepSign, type StepCardStatus, type StepCardTexts } from "./step-cards-logic";

export interface StepCardItem<K extends string = string> {
  key: K;
  label: string;
  /** Una línea con lo que hay en el paso: "12 de 14 cargadas". */
  detail?: string;
  status: StepCardStatus;
  disabled?: boolean;
}

export interface StepCardsProps<K extends string> {
  steps: StepCardItem<K>[];
  /** El paso que se está mirando. */
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel: string;
  texts?: Partial<StepCardTexts>;
  /** Solo para vitrina, Storybook y Figma: pinta la primera en este estado. */
  forcedState?: ForcedInteraction;
}

export function StepCards<K extends string>({ steps, value, onChange, accessibilityLabel, texts, forcedState }: StepCardsProps<K>) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const x = { ...STEP_CARD_TEXTS, ...texts };
  const [ancho, setAncho] = useState(0);

  if (ancho > 0 && ancho < ANCHO_COMPACTO) {
    const i = Math.max(0, steps.findIndex((st) => st.key === value));
    const actual = steps[i];
    return (
      <View style={s.compacto} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        <View style={s.circulos} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
          <View style={s.linea} aria-hidden />
          {steps.map((st, j) => {
            const elegido = st.key === value;
            const fondo = st.status === "blocked" ? t.color.danger.fg : st.status === "upcoming" ? t.color.bg.surface : t.color.accent.base;
            const lleno = st.status !== "upcoming";
            return (
              <Pressable
                key={st.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: elegido, disabled: st.disabled }}
                accessibilityLabel={stepAccessibilityLabel(st.label, j, steps.length, st.status, st.detail, x)}
                disabled={st.disabled}
                onPress={() => onChange(st.key)}
                style={(estado: EstadoPresionable) => {
                  const r = resolveInteraction(estado, { selected: elegido, disabled: st.disabled });
                  return [s.toque, r === "hovered" && s.toqueEncima, r === "pressed" && s.toquePresionado];
                }}
              >
                <View
                  style={[
                    s.circulo,
                    s.circuloCompacto,
                    { backgroundColor: fondo, borderColor: lleno ? fondo : t.color.border.strong },
                    elegido && { borderColor: t.color.text.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={[textStyle(t, "bodySmall", lleno ? t.color.text.onAccent : t.color.text.secondary), s.negrita]}>
                    {stepSign(st.status, j)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {actual ? (
          <View style={s.texto}>
            <Text style={[textStyle(t, "subtitle"), s.negrita]}>{`${i + 1} de ${steps.length} · ${actual.label}`}</Text>
            <Text style={textStyle(t, "caption", actual.status === "blocked" ? t.color.danger.fg : t.color.text.secondary)}>
              {actual.detail ? `${x[actual.status]} · ${actual.detail}` : x[actual.status]}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={s.fila}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      {steps.map((st, i) => {
        const elegido = st.key === value;
        const fondo = st.status === "blocked" ? t.color.danger.fg : st.status === "upcoming" ? t.color.bg.surface : t.color.accent.base;
        const lleno = st.status !== "upcoming";
        const tono = st.status === "blocked" ? t.color.danger.fg : t.color.text.secondary;
        return (
          <Pressable
            key={st.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: elegido, disabled: st.disabled }}
            accessibilityLabel={stepAccessibilityLabel(st.label, i, steps.length, st.status, st.detail, x)}
            disabled={st.disabled}
            onPress={() => onChange(st.key)}
            style={(estado: EstadoPresionable) => {
              const r = resolveInteraction(estado, { selected: elegido, disabled: st.disabled, forced: i === 0 ? forcedState : undefined });
              return [s.ficha, r === "hovered" && s.encima, r === "pressed" && s.presionada, r === "selected" && s.elegida, r === "disabled" && s.apagada];
            }}
          >
            <View style={[s.circulo, { backgroundColor: fondo, borderColor: lleno ? fondo : t.color.border.strong }]}>
              <Text style={[textStyle(t, "bodySmall", lleno ? t.color.text.onAccent : t.color.text.secondary), s.negrita]}>{stepSign(st.status, i)}</Text>
            </View>
            <View style={s.texto}>
              <Text style={[textStyle(t, "body", st.disabled ? t.color.text.disabled : t.color.text.primary), elegido && s.negrita]} numberOfLines={1}>
                {`${i + 1}. ${st.label}`}
              </Text>
              <Text style={textStyle(t, "caption", st.disabled ? t.color.text.disabled : tono)} numberOfLines={2}>
                {st.detail ? `${x[st.status]} · ${st.detail}` : x[st.status]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const ANCHO_COMPACTO = 520;

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
    ficha: {
      flexGrow: 1,
      flexBasis: 190,
      minWidth: 0,
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.sm,
      paddingHorizontal: t.space.md,
      paddingVertical: t.space.sm,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.bg.surface,
      cursor: "pointer",
    },
    encima: { backgroundColor: t.color.bg.hover, borderColor: t.color.border.focus },
    presionada: { backgroundColor: t.color.bg.pressed, borderColor: t.color.border.focus },
    // Elegida: borde de 2 en el color de acento, sin cambiar el fondo (el texto sigue sobre la superficie).
    elegida: { borderColor: t.color.accent.base, borderWidth: 2, paddingHorizontal: t.space.md - 1, paddingVertical: t.space.sm - 1 },
    apagada: { backgroundColor: t.color.bg.disabled, cursor: "auto" },
    circulo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    texto: { flex: 1, minWidth: 0, gap: 2 },
    negrita: { fontWeight: "700" },
    compacto: { gap: t.space.sm },
    circulos: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    linea: { position: "absolute", left: 22, right: 22, height: 2, backgroundColor: t.color.border.default },
    toque: { width: 44, height: 44, borderRadius: t.radius.full, alignItems: "center", justifyContent: "center", cursor: "pointer" },
    toqueEncima: { backgroundColor: t.color.bg.hover },
    toquePresionado: { backgroundColor: t.color.bg.pressed },
    circuloCompacto: { width: 32, height: 32, borderRadius: 16 },
  });
