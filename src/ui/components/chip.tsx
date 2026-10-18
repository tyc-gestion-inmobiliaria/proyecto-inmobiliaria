/**
 * Una ficha que se toca: un filtro, una opción entre pocas.
 *
 * - **Elegida** se ve llena, con la letra más gruesa y un ✓ dibujado. El ✓ va
 *   oculto para el lector de pantalla —que ya dice "seleccionado" por
 *   `accessibilityState`— para no ensuciar el nombre del botón.
 * - **`tone="alert"`** es para lo que hay que atender, y se pinta así **en
 *   reposo**, no solo elegida: quien barre la pantalla con la vista tiene que
 *   encontrarla sin leer las fichas una por una. Lleva un punto además del
 *   rojo, porque el color no puede ser la única señal.
 * - **Apagada** se queda en su sitio: sacarla deja un hueco que se lee como
 *   "no existe".
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  hitSlopFor,
  resolveInteraction,
  type EstadoPresionable,
  type ForcedInteraction,
} from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import { TouchArea } from "./touch-area";
import type { Tema } from "../tokens";

export type ChipTone = "neutral" | "alert";

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  tone?: ChipTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
}

export function Chip({
  label,
  selected = false,
  disabled = false,
  tone = "neutral",
  onPress,
  accessibilityLabel,
  forcedState,
}: ChipProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const alert = tone === "alert";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlopFor(t.control.sm, t.minTouch)}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { selected, disabled, forced: forcedState });
        return [
          s.chip,
          alert && s.alert,
          i === "hovered" && (alert ? s.alertHovered : s.hovered),
          i === "pressed" && (alert ? s.alertPressed : s.pressed),
          i === "selected" && (alert ? s.alertSelected : s.selected),
          i === "disabled" && s.disabled,
        ];
      }}
    >
      {alert && !disabled ? (
        <View
          style={[s.dot, { backgroundColor: selected ? t.color.text.onAccent : t.color.danger.fg }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      {selected && !alert ? (
        <Text
          style={[textStyle(t, "bodySmall", t.color.text.onAccent), s.check]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          ✓
        </Text>
      ) : null}
      <Text
        style={[
          textStyle(t, "bodySmall", t.color.text.secondary),
          alert && { color: t.color.danger.fg, fontWeight: "500" },
          selected && { color: t.color.text.onAccent, fontWeight: "600" },
          disabled && { color: t.color.text.disabled },
        ]}
      >
        {label}
      </Text>
      <TouchArea height={t.control.sm} />
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space.xs + 2,
      minHeight: t.control.sm,
      paddingHorizontal: t.space.lg,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.color.border.strong,
      backgroundColor: t.color.bg.surface,
      cursor: "pointer",
    },
    hovered: { backgroundColor: t.color.bg.hover, borderColor: t.color.border.focus },
    pressed: { backgroundColor: t.color.bg.pressed, borderColor: t.color.border.focus },
    selected: { backgroundColor: t.color.accent.base, borderColor: t.color.accent.base },
    alert: { backgroundColor: t.color.danger.bg, borderColor: t.color.danger.fg },
    alertHovered: { backgroundColor: t.color.danger.hoverBg },
    alertPressed: { backgroundColor: t.color.danger.hoverBg, borderWidth: 2 },
    alertSelected: { backgroundColor: t.color.danger.fg, borderColor: t.color.danger.fg },
    disabled: { backgroundColor: t.color.bg.disabled, borderColor: t.color.bg.disabled, cursor: "auto" },
    dot: { width: 7, height: 7, borderRadius: 4 },
    check: { fontWeight: "700" },
  });
