/**
 * Una casilla: marcar algo como hecho, incluir algo en un grupo.
 *
 * - **Marcada** se llena con el acento y lleva un ✓ dibujado; el ✓ es la
 *   señal que no depende del color. El lector de pantalla dice "marcada" por
 *   `accessibilityState`, así que el ✓ va oculto para él.
 * - Lo que se toca es la fila entera, casilla y texto, y mide al menos 44 de
 *   alto: una casilla de 20 sola no se acierta con el dedo.
 * - Sin `label` visible hace falta `accessibilityLabel`: una casilla suelta en
 *   una tarjeta tiene que decir qué marca.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** El texto al lado. Sin él, la casilla va sola y pide `accessibilityLabel`. */
  label?: string;
  disabled?: boolean;
  /** Tacha el texto cuando está marcada, para lo que se da por hecho. */
  strikeWhenChecked?: boolean;
  accessibilityLabel?: string;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
}

const BOX = 20;

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  strikeWhenChecked = false,
  accessibilityLabel,
  forcedState,
}: CheckboxProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={(state: EstadoPresionable) => {
        // "Elegido" no aplica: marcada es el valor, no la selección. El hover y
        // el presionado se ven igual sobre una marcada que sobre una vacía.
        const i = resolveInteraction(state, { disabled, forced: forcedState });
        return [s.row, !label && s.alone, i === "disabled" && s.rowDisabled];
      }}
    >
      {(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { disabled, forced: forcedState });
        return (
          <>
            <View
              style={[
                s.box,
                i === "hovered" && s.boxHovered,
                i === "pressed" && s.boxPressed,
                checked && s.boxChecked,
                checked && i === "hovered" && s.boxCheckedHovered,
                checked && i === "pressed" && s.boxCheckedPressed,
                i === "disabled" && s.boxDisabled,
              ]}
            >
              {checked ? (
                <Text
                  style={[textStyle(t, "bodySmall", disabled ? t.color.text.disabled : t.color.text.onAccent), s.check]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  ✓
                </Text>
              ) : null}
            </View>
            {label ? (
              <Text
                style={[
                  textStyle(t, "body", disabled ? t.color.text.disabled : t.color.text.primary),
                  s.label,
                  checked && strikeWhenChecked && s.struck,
                ]}
              >
                {label}
              </Text>
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.sm + 2,
      minHeight: t.minTouch,
      cursor: "pointer",
    },
    alone: { minWidth: t.minTouch, justifyContent: "center" },
    rowDisabled: { cursor: "auto" },
    box: {
      width: BOX,
      height: BOX,
      borderRadius: t.radius.sm,
      borderWidth: 2,
      borderColor: t.color.border.strong,
      backgroundColor: t.color.bg.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    boxHovered: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.hover },
    boxPressed: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.pressed },
    boxChecked: { borderColor: t.color.accent.base, backgroundColor: t.color.accent.base },
    boxCheckedHovered: { borderColor: t.color.accent.hover, backgroundColor: t.color.accent.hover },
    boxCheckedPressed: { borderColor: t.color.accent.pressed, backgroundColor: t.color.accent.pressed },
    boxDisabled: { borderColor: t.color.bg.disabled, backgroundColor: t.color.bg.disabled },
    check: { fontWeight: "700", lineHeight: BOX - 4 },
    label: { flexShrink: 1 },
    struck: { textDecorationLine: "line-through", color: t.color.text.tertiary },
  });
