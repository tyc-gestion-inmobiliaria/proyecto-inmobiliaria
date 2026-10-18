/**
 * El botón del kit, con sus cuatro estados y sus tres tamaños.
 *
 * - **Reposo**: fondo y borde de su variante.
 * - **Encima**: el lleno se oscurece (aclararlo se lee como "se está
 *   apagando"); los de borde marcan el borde y tiñen el fondo.
 * - **Presionado**: un paso más oscuro que el encima.
 * - **Apagado**: gris, sin reacción, y lo dice a quien no ve
 *   (`accessibilityState.disabled`).
 * - **Cargando**: el texto se queda (el botón no cambia de ancho) y un
 *   indicador al lado; no se puede volver a tocar mientras tanto.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import {
  hitSlopFor,
  pickByInteraction,
  resolveInteraction,
  type EstadoPresionable,
  type ForcedInteraction,
} from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import { TouchArea } from "./touch-area";
import type { Tema } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Ocupa todo el ancho de su contenedor. */
  full?: boolean;
  accessibilityLabel?: string;
  /** Solo para vitrina, Storybook y Figma: pinta un estado sin el puntero. */
  forcedState?: ForcedInteraction;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  full = false,
  accessibilityLabel,
  forcedState,
  style,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const inactive = disabled || loading;
  const height = t.control[size];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={hitSlopFor(height, t.minTouch)}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { disabled, forced: forcedState });
        return [
          s.base,
          { minHeight: height, paddingHorizontal: size === "sm" ? t.space.md : t.space.lg + 4 },
          full && s.full,
          pickByInteraction(i, containerByVariant(t)[variant]),
          style,
        ];
      }}
    >
      <View style={s.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? t.color.text.onAccent : t.color.text.secondary}
            accessibilityElementsHidden
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            textStyle(t, size === "lg" ? "subtitle" : "body"),
            size === "sm" && s.labelSm,
            s.label,
            { color: disabled ? t.color.text.disabled : labelColor(t, variant) },
          ]}
        >
          {label}
        </Text>
      </View>
      <TouchArea height={height} />
    </Pressable>
  );
}

function labelColor(t: Tema, variant: ButtonVariant): string {
  switch (variant) {
    case "primary":
      return t.color.text.onAccent;
    case "secondary":
      return t.color.text.primary;
    case "danger":
      return t.color.danger.fg;
    case "ghost":
      return t.color.text.secondary;
  }
}

type PorEstado = { rest: ViewStyle } & Partial<Record<"hovered" | "pressed" | "selected" | "disabled", ViewStyle>>;

function containerByVariant(t: Tema): Record<ButtonVariant, PorEstado> {
  const apagado: ViewStyle = { backgroundColor: t.color.bg.disabled, borderColor: t.color.bg.disabled };
  return {
    primary: {
      rest: { backgroundColor: t.color.accent.base, borderColor: t.color.accent.base },
      hovered: { backgroundColor: t.color.accent.hover, borderColor: t.color.accent.hover },
      pressed: { backgroundColor: t.color.accent.pressed, borderColor: t.color.accent.pressed },
      disabled: apagado,
    },
    secondary: {
      rest: { backgroundColor: t.color.bg.surface, borderColor: t.color.border.strong },
      hovered: { backgroundColor: t.color.bg.hover, borderColor: t.color.border.focus },
      pressed: { backgroundColor: t.color.bg.pressed, borderColor: t.color.border.focus },
      disabled: apagado,
    },
    danger: {
      rest: { backgroundColor: t.color.bg.surface, borderColor: t.color.danger.fg },
      hovered: { backgroundColor: t.color.danger.bg, borderColor: t.color.danger.fg },
      pressed: { backgroundColor: t.color.danger.hoverBg, borderColor: t.color.danger.fg },
      disabled: apagado,
    },
    ghost: {
      rest: { backgroundColor: "transparent", borderColor: "transparent" },
      hovered: { backgroundColor: t.color.bg.hover, borderColor: "transparent" },
      pressed: { backgroundColor: t.color.bg.pressed, borderColor: "transparent" },
      disabled: { backgroundColor: "transparent", borderColor: "transparent" },
    },
  };
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.sm,
      borderWidth: 1,
      cursor: "pointer",
    },
    full: { width: "100%" },
    content: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    label: { fontWeight: "600", textAlign: "center" },
    labelSm: { fontSize: 13, fontWeight: "500" },
  });
